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
 * 이미 확인된 파일은 .r2-synced.json 에 적어두고 다음 배포에서 건너뛴다 —
 * 파일이 수천 개라 매번 전수 HEAD를 돌리면 배포가 느려진다.
 *
 *   node scripts/sync-stock-r2.mjs                       # 누락분만 업로드
 *   node scripts/sync-stock-r2.mjs --dry-run             # 업로드 대상만 표시
 *   node scripts/sync-stock-r2.mjs --verify-all          # 캐시 무시하고 전수 검사
 *   node scripts/sync-stock-r2.mjs --verify-all --force  # 전량 재업로드(캐시 정책 백필)
 *
 * 주의: 같은 파일명으로 이미지를 "교체"하면 이 스크립트는 건너뛴다.
 *       교체 시에는 lib/stock.ts의 STOCK_VERSION을 올리고 해당 키를 직접 덮어쓸 것.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STOCK = join(ROOT, "public", "stock");
const BIN = join(ROOT, "node_modules", ".bin");
const CACHE = join(ROOT, "scripts", ".r2-synced.json");
const BUCKET = "modooilbo-stock";
const BASE = "https://img.modooilbo.com";
const CONCURRENCY = 12;
const execFileAsync = promisify(execFile);

const dryRun = process.argv.includes("--dry-run");
const verifyAll = process.argv.includes("--verify-all");
const force = process.argv.includes("--force");

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

const local = readdirSync(STOCK).filter((f) => CONTENT_TYPE[extOf(f)] && statSync(join(STOCK, f)).size > 0);
const synced = new Set(verifyAll ? [] : readCache());
const candidates = local.filter((f) => !synced.has(f));

if (!candidates.length) {
  console.log(`[r2] 동기화 완료 — 로컬 ${local.length}개 전부 확인됨(캐시)`);
  process.exit(0);
}

let missing;
if (force) {
  // 캐시 정책 백필용. 서빙 여부와 무관하게 전부 다시 올려 메타데이터를 갱신한다
  // (Cache-Control은 업로드 시점에 오브젝트에 굳으므로 덮어쓰기 외엔 방법이 없다).
  missing = candidates;
  console.log(`[r2] FORCE — HEAD 생략, ${missing.length}개 전량 재업로드(메타데이터 갱신)`);
} else {
  console.log(`[r2] 확인 대상 ${candidates.length}개 (전체 ${local.length}개) — ${BASE} HEAD 검사`);
  missing = await filterMissing(candidates);
}

if (!missing.length) {
  writeCache([...synced, ...candidates]);
  console.log(`[r2] 누락 0개 — 전부 서빙 중`);
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
const stillMissing = await filterMissing(missing.filter((f) => !failed.includes(f)));
if (stillMissing.length) {
  console.error(`✖ 업로드했으나 서빙되지 않는 파일 ${stillMissing.length}개: ${stillMissing.slice(0, 5).join(", ")}`);
  console.error("  엣지 캐시에 404가 남아 있을 수 있습니다. 몇 분 뒤 다시 실행하세요.\n");
  process.exit(1);
}
writeCache([...synced, ...candidates.filter((f) => !failed.includes(f))]);
console.log(`[r2] 서빙 확인 완료 — 업로드분 ${missing.length - failed.length}개 200 응답`);

// ── helpers ───────────────────────────────────────────────
function readCache() {
  try {
    return JSON.parse(readFileSync(CACHE, "utf8"));
  } catch {
    return [];
  }
}
function writeCache(list) {
  writeFileSync(CACHE, JSON.stringify([...new Set(list)].sort(), null, 0) + "\n");
}

/** 서빙 URL에 HEAD를 던져 404인 것만 골라낸다. 네트워크 오류는 '누락'으로 보아 재업로드한다. */
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
          if (!r.ok) out.push(f);
        } catch {
          out.push(f);
        }
      }
    }),
  );
  return out;
}
