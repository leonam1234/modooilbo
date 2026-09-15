#!/usr/bin/env node
/**
 * public/stock 의 이미지를 R2 버킷(modooilbo-stock)에 동기화한다.
 *
 * 왜 필요한가: 이미지는 Pages가 아니라 R2(https://img.modooilbo.com)에서 서빙한다.
 * 기사를 새로 올리면 public/stock 에는 파일이 생기지만 R2에는 없으므로, 이 단계가
 * 없으면 신규 기사의 대표 이미지와 og:image가 그대로 404가 된다.
 * (R2 이관 직후 첫 신규 기사에서 실제로 이 문제가 났다 → 배포 파이프라인에 편입)
 *
 * 존재 확인은 버킷 목록 API가 아니라 **실제 서빙 URL에 HTTP HEAD**로 한다.
 * 독자가 받는 경로를 그대로 검사하므로, 버킷에는 있는데 도메인 라우팅이 깨진 경우도 잡힌다.
 * (wrangler 4.105 기준 `r2 object list` 서브커맨드가 없기도 하다)
 *
 * 이미 확인된 파일은 Git common dir의 공용 캐시에 적어 모든 worktree가 함께 쓴다.
 * Git 밖에서는 scripts/.r2-synced.json으로 폴백한다. 파일이 수천 개라 새 worktree마다
 * 전수 HEAD를 되풀이하면 배포가 느려지므로 캐시는 저장 전에 잠금·재병합·원자 교체한다.
 *
 *   node scripts/sync-stock-r2.mjs                       # 누락분만 업로드
 *   node scripts/sync-stock-r2.mjs --dry-run             # 업로드 대상만 표시
 *   node scripts/sync-stock-r2.mjs --verify-all          # 캐시 무시하고 전수 검사
 *   node scripts/sync-stock-r2.mjs --verify-all --force  # 전량 재업로드(캐시 정책 백필)
 *
 * 같은 파일명 교체도 SHA-256 캐시 차이로 자동 감지한다. 레거시 filename 캐시는
 * 조용히 완료 처리하지 않고 실행당 12개씩 원격 바이트 해시를 점진 검증한다.
 */
import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  acquireR2SyncLease,
  assertNoUnversionedStockReplacements,
  assertStockVersionBump,
  discoverR2Cache,
  planR2Sync,
  readMergedR2Cache,
  selectLegacyProbe,
  writeMergedR2Cache,
} from "./r2-sync-cache.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STOCK = join(ROOT, "public", "stock");
const BIN = join(ROOT, "node_modules", ".bin");
const CACHE_CONFIG = discoverR2Cache(ROOT);
const BUCKET = "modooilbo-stock";
const BASE = "https://img.modooilbo.com";
const CONCURRENCY = 12;
const LEGACY_HASH_PROBE_LIMIT = 12;
const execFileAsync = promisify(execFile);

const dryRun = process.argv.includes("--dry-run");
const verifyAll = process.argv.includes("--verify-all");
const force = process.argv.includes("--force");
const preview = process.argv.includes("--preview");

if (preview && force) {
  console.error("✖ Preview에서는 공용 R2 기존 키를 덮어쓰는 --force를 사용할 수 없습니다.");
  process.exit(1);
}

const CONTENT_TYPE = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".png": "image/png" };
const extOf = (f) => f.slice(f.lastIndexOf("."));

/**
 * 오브젝트에 함께 저장하는 캐시 정책.
 *
 * 지정하지 않으면 R2가 Cache-Control을 안 실어보내고, 커스텀 도메인이 존 기본값인
 * max-age=14400(4시간)으로 응답한다 → 재방문자가 4시간마다 이미지를 다시 받는다.
 *
 * immutable이 안전한 이유: 표시 URL에 항상 `?v=STOCK_VERSION`이 붙는다(src/lib/stock.ts).
 * 같은 파일명으로 이미지를 교체할 때는 그 상수를 올리므로 URL이 바뀌어 캐시를 우회한다.
 * → 파일명+버전 조합은 내용이 절대 안 바뀌는 불변 자원이 맞다.
 *
 * 이 값은 **업로드 시점에** 오브젝트 메타데이터로 굳는다. 정책을 바꾸면 기존 오브젝트는
 * 그대로이므로 `--verify-all --force`로 전수 재업로드해야 반영된다.
 */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

if (!existsSync(STOCK)) {
  console.log("[r2] public/stock 없음 — 건너뜀");
  process.exit(0);
}

let releaseSyncLease = () => {};
if (!dryRun) {
  try {
    releaseSyncLease = acquireR2SyncLease(CACHE_CONFIG);
    process.once("exit", releaseSyncLease);
  } catch (error) {
    console.error(`✖ ${error.message}`);
    process.exit(1);
  }
}

const local = readdirSync(STOCK).filter((f) => CONTENT_TYPE[extOf(f)] && statSync(join(STOCK, f)).size > 0);
const cached = readMergedR2Cache(CACHE_CONFIG);
const localFiles = Object.fromEntries(local.map((f) => [
  f,
  createHash("sha256").update(readFileSync(join(STOCK, f))).digest("hex"),
]));
const plan = planR2Sync({
  localFiles,
  cache: cached,
  changedFiles: changedStockFilesInHead(),
});
const verifiedDelta = {};
const expectedFiles = {};
let pendingLegacy = [...plan.legacy];
const upload = new Set(plan.candidates);
const replacements = new Set(plan.replacements);

console.log(`[r2] 캐시 ${CACHE_CONFIG.mode === "git-common" ? "Git 공용(worktree 공유)" : "로컬 폴백"}: ${CACHE_CONFIG.cachePath}`);

if (preview && replacements.size) failPreviewReplacement([...replacements]);

if (!dryRun && pendingLegacy.length) {
  const probe = selectLegacyProbe(pendingLegacy, LEGACY_HASH_PROBE_LIMIT);
  const checked = await verifyRemoteContentHashes(probe, localFiles);
  for (const name of checked.matched) promoteVerified(name);
  for (const name of checked.mismatched) {
    upload.add(name);
    replacements.add(name);
  }
  for (const name of checked.missing) upload.add(name);
  console.log(`[r2] 레거시 해시 점진 검증 ${probe.length}개 — 일치 ${checked.matched.length} · 교체 ${checked.mismatched.length} · 누락 ${checked.missing.length} · 보류 ${checked.unknown.length}`);
} else if (pendingLegacy.length) {
  console.log(`[r2] 레거시 filename 캐시 ${pendingLegacy.length}개는 해시 미검증 상태 유지(DRY-RUN)`);
}

const uncached = plan.candidates.filter((name) => !cached.files[name] && !cached.legacy.includes(name));
if (!dryRun && uncached.length) {
  const checked = await verifyRemoteContentHashes(uncached, localFiles);
  for (const name of checked.matched) {
    promoteVerified(name);
    upload.delete(name);
  }
  for (const name of checked.mismatched) replacements.add(name);
  if (checked.unknown.length) {
    console.error(`✖ 신규 키 원격 바이트 확인 실패 ${checked.unknown.length}개: ${checked.unknown.slice(0, 5).join(", ")}`);
    process.exit(1);
  }
  console.log(`[r2] 캐시 없는 키 원격 확인 ${uncached.length}개 — 동일 ${checked.matched.length} · 충돌 ${checked.mismatched.length} · 404 ${checked.missing.length}`);
}

if (preview && replacements.size) failPreviewReplacement([...replacements]);

let missing;
if (force) {
  // 캐시 정책 백필용. 서빙 여부와 무관하게 전부 다시 올려 메타데이터를 갱신한다
  // (Cache-Control은 업로드 시점에 오브젝트에 굳으므로 덮어쓰기 외엔 방법이 없다).
  missing = verifyAll ? local : [...upload];
  console.log(`[r2] FORCE — HEAD 생략, ${missing.length}개 전량 재업로드(메타데이터 갱신)`);
} else if (verifyAll) {
  console.log(`[r2] 전체 ${local.length}개 서빙 HEAD 검사 + 해시 불일치 강제 업로드`);
  missing = [...new Set([...(await filterMissing(local)), ...upload])];
} else {
  missing = [...upload];
  console.log(`[r2] 신규·교체 ${missing.length}개 — SHA-256 차이로 업로드 대상 확정`);
}

assertReplacementVersionBump([...replacements]);

if (!missing.length) {
  if (!dryRun) writeCacheDelta();
  console.log(`[r2] 업로드 대상 0개 — 이번 해시 확인 ${Object.keys(verifiedDelta).length} · 레거시 미확인 ${pendingLegacy.length}`);
  process.exit(0);
}

if (dryRun) {
  console.log(`[r2] DRY-RUN — ${missing.length}개 업로드 예정: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`);
  process.exit(0);
}

// wrangler 호출 1건당 node 프로세스가 새로 뜨므로 직렬로 돌리면 파일당 1~2초다.
// 신규 기사(하루 24건 → 72파일)는 직렬로도 견디지만, --force 백필은 2천 건이 넘어
// 한 시간을 넘긴다. HEAD 검사와 같은 CONCURRENCY로 묶어 처리한다.
let ok = 0;
const failed = [];
{
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, missing.length) }, async () => {
      while (i < missing.length) {
        const f = missing[i++];
        try {
          await execFileAsync(
            join(BIN, "wrangler"),
            // prettier-ignore
            ["r2", "object", "put", `${BUCKET}/${f}`, "--file", join(STOCK, f),
             "--content-type", CONTENT_TYPE[extOf(f)], "--cache-control", CACHE_CONTROL, "--remote"],
            { cwd: ROOT },
          );
          ok++;
          if (ok % 200 === 0) console.log(`[r2]   … ${ok}/${missing.length}`);
        } catch {
          failed.push(f);
        }
      }
    }),
  );
}

console.log(`[r2] 업로드 ${ok}개 · 실패 ${failed.length}개 (버킷 ${BUCKET})`);
if (failed.length) {
  // 이미지 없는 기사를 배포하는 것보다 배포를 끊는 편이 낫다.
  console.error(`✖ R2 업로드 실패: ${failed.slice(0, 10).join(", ")}`);
  console.error("  이대로 배포하면 해당 기사 이미지와 og:image가 404가 됩니다.\n");
  process.exit(1);
}
// 업로드했다고 끝이 아니다 — 실제 서빙 URL에서 200이 나오는지 확인하고, 그것만 캐시에 남긴다.
const served = await verifyRemoteContentHashes(missing.filter((f) => !failed.includes(f)), localFiles);
const stillMissing = [...served.mismatched, ...served.missing, ...served.unknown];
if (stillMissing.length) {
  console.error(`✖ 업로드 뒤 원격 바이트가 일치하지 않는 파일 ${stillMissing.length}개: ${stillMissing.slice(0, 5).join(", ")}`);
  console.error("  엣지 캐시에 404가 남아 있을 수 있습니다. 몇 분 뒤 다시 실행하세요.\n");
  process.exit(1);
}
for (const name of served.matched) promoteVerified(name);
writeCacheDelta();
console.log(`[r2] 서빙 확인 완료 — 업로드분 ${missing.length - failed.length}개 200 응답`);

function writeCacheDelta() {
  if (!Object.keys(verifiedDelta).length) return;
  const result = writeMergedR2Cache(
    CACHE_CONFIG,
    { files: verifiedDelta, legacy: pendingLegacy },
    { expectedFiles },
  );
  if (result.conflicts.length) {
    console.error(`✖ R2 캐시 동시 갱신 충돌 ${result.conflicts.length}개 — 해시 미검증으로 되돌렸습니다: ${result.conflicts.slice(0, 5).join(", ")}`);
    process.exit(1);
  }
}

function promoteVerified(name) {
  verifiedDelta[name] = localFiles[name];
  expectedFiles[name] = cached.files[name] ?? null;
  pendingLegacy = pendingLegacy.filter((entry) => entry !== name);
}

function failPreviewReplacement(names) {
  console.error(`✖ Preview는 공용 R2 기존 키를 덮어쓸 수 없습니다: ${names.slice(0, 5).join(", ")}`);
  console.error("  이미지에 새 파일명을 사용한 뒤 Preview를 다시 만드세요.\n");
  process.exit(1);
}

function changedStockFilesInHead() {
  try {
    const output = execFileSync(
      "git",
      ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD", "--", "public/stock"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return output
      ? output.split(/\r?\n/).map((path) => path.replace(/^public\/stock\//, "")).filter((path) => !path.includes("/"))
      : [];
  } catch {
    return local;
  }
}

function assertReplacementVersionBump(names) {
  if (!names.length) return;
  assertNoUnversionedStockReplacements({
    replacements: names,
    unversionedNames: bodyStockReferences(),
  });
  let previousSource;
  try {
    previousSource = execFileSync("git", ["show", "HEAD^:src/lib/stock.ts"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    previousSource = "";
  }
  assertStockVersionBump({
    replacements: names,
    currentSource: readFileSync(join(ROOT, "src", "lib", "stock.ts"), "utf8"),
    previousSource,
  });
}

function bodyStockReferences() {
  const directory = join(ROOT, "content", "articles");
  if (!existsSync(directory)) return [];
  const names = new Set();
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".md"))) {
    const source = readFileSync(join(directory, file), "utf8");
    for (const match of source.matchAll(/\]\(\/stock\/([^)?]+)(?:\?[^)]*)?\)/g)) names.add(match[1]);
  }
  return [...names];
}

async function verifyRemoteContentHashes(files, expectedHashes) {
  const result = { matched: [], mismatched: [], missing: [], unknown: [] };
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
    while (i < files.length) {
      const name = files[i++];
      try {
        const response = await fetch(`${BASE}/${encodeURIComponent(name)}?hash-probe=${Date.now()}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        if (response.status === 404) {
          result.missing.push(name);
          continue;
        }
        if (!response.ok) {
          result.unknown.push(name);
          continue;
        }
        const actual = createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex");
        result[actual === expectedHashes[name] ? "matched" : "mismatched"].push(name);
      } catch {
        result.unknown.push(name);
      }
    }
  }));
  return result;
}

/** 서빙 URL에 HEAD를 던져 확정 404만 골라낸다. 네트워크/기타 HTTP 오류는 덮어쓰지 않고 중단한다. */
async function filterMissing(files) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
      while (i < files.length) {
        const f = files[i++];
        try {
          // ⚠️ 캐시버스터 필수. 순수 URL로 HEAD를 치면 "아직 없는 파일"의 404가
          //    엣지에 max-age=14400(4시간)으로 캐시돼, 업로드 직후에도 독자에게 404가 나간다.
          //    (실제로 이 스크립트 첫 실행에서 그 사고가 났다)
          const r = await fetch(`${BASE}/${encodeURIComponent(f)}?probe=${Date.now()}`, {
            method: "HEAD",
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
          });
          if (r.status === 404) out.push(f);
          else if (!r.ok) throw new Error(`HTTP ${r.status}`);
        } catch (error) {
          throw new Error(`R2 HEAD 확인 실패(${f}): ${error.message}`);
        }
      }
    }),
  );
  return out;
}
