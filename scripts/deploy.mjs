#!/usr/bin/env node
/**
 * 모두일보 — Cloudflare Pages 직접 배포 래퍼 (wrangler)
 *
 * 운영 원칙
 *   - GitHub = 코드 기록용 (push해도 자동배포 없음)
 *   - 실배포 = 이 스크립트로 로컬/Codex 환경에서 wrangler 직접 실행
 *   - 배포 전 git이 깨끗해야 함(미커밋 있으면 중단) → "현재 커밋"을 그대로 올림
 *   - 배포 결과(commit SHA·branch·URL·시간·환경)를 deployments/deploy-log.jsonl 에 기록
 *
 * 사용법
 *   npm run deploy:preview        # Cloudflare Preview 배포 (미리보기 URL)
 *   npm run deploy:prod           # Cloudflare Production 배포 (modooilbo.com)
 *   npm run release:preview       # 한 번 빌드하고 Preview에 올린 out/ 봉인
 *   npm run release:prod -- --reuse-artifact=<release-id>  # 같은 out/ 승급
 *   node scripts/deploy.mjs prod --dry-run   # 빌드/배포 없이 실행될 내용만 확인
 *
 * 다른 프로젝트로 복제 시: 아래 상수 3개(PROJECT/PROD_BRANCH/OUT_DIR)만 바꾸면 됩니다.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readdirSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  recordReleaseDeployment,
  releaseStorePath,
  sealReleaseArtifact,
  verifyReleaseArtifact,
} from "./release-artifact.mjs";

// ── 프로젝트 설정 ────────────────────────────────────────────
const PROJECT = "modooilbo"; // Cloudflare Pages project name
const PROD_BRANCH = "master"; // Cloudflare Pages production 브랜치
const OUT_DIR = "out"; // 빌드 산출물 디렉터리
// ────────────────────────────────────────────────────────────

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(REPO, "node_modules", ".bin");
const LOG_PATH = join(REPO, "deployments", "deploy-log.jsonl");

const args = process.argv.slice(2);
const env = args.find((arg) => arg === "preview" || arg === "prod");
const dryRun = args.includes("--dry-run");
const buildOnce = args.includes("--build-once");
const smokeApproved = args.includes("--smoke-approved");

function optionValue(name) {
  const exact = args.indexOf(name);
  if (exact >= 0) return args[exact + 1];
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}
const reuseArtifactId = optionValue("--reuse-artifact");
const reuseArtifactRequested = args.some((arg) => arg === "--reuse-artifact" || arg.startsWith("--reuse-artifact="));

if (reuseArtifactRequested && (!reuseArtifactId || reuseArtifactId.startsWith("--"))) {
  console.error("\n✖ --reuse-artifact=<release-id> 값을 지정하세요.\n");
  process.exit(1);
}

if (buildOnce && env !== "preview") {
  console.error("\n✖ --build-once 는 preview에서만 사용할 수 있습니다.\n");
  process.exit(1);
}
if (reuseArtifactId && env !== "prod") {
  console.error("\n✖ --reuse-artifact 는 prod에서만 사용할 수 있습니다.\n");
  process.exit(1);
}
if (buildOnce && reuseArtifactId) {
  console.error("\n✖ --build-once 와 --reuse-artifact 를 함께 사용할 수 없습니다.\n");
  process.exit(1);
}
if (reuseArtifactId && !smokeApproved) {
  console.error("\n✖ 동일 산출물 승급에는 외부 스모크 PASS 뒤 --smoke-approved 가 필요합니다.\n");
  process.exit(1);
}
if (smokeApproved && !reuseArtifactId) {
  console.error("\n✖ --smoke-approved 는 --reuse-artifact 와 함께 사용하세요.\n");
  process.exit(1);
}

function git(...a) {
  return execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim();
}
function sanitizeBranch(b) {
  return b.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 28) || "preview";
}
/** 디렉터리 안 파일 개수(재귀) — Cloudflare Pages 배포 상한 점검용. */
function countFiles(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(join(dir, e.name)) : 1;
  }
  return n;
}
function localWranglerVersion() {
  const raw = execFileSync(join(BIN, "wrangler"), ["--version"], { cwd: REPO, encoding: "utf8" }).trim();
  const version = raw.match(/\b(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b/)?.[1];
  if (!version || !version.startsWith("4.")) throw new Error(`Wrangler v4가 필요합니다 (현재 출력: ${raw})`);
  return version;
}

if (env !== "preview" && env !== "prod") {
  console.error("\n✖ 환경을 지정하세요: node scripts/deploy.mjs <preview|prod> [--dry-run]\n");
  process.exit(1);
}

// 1) git 메타 + 깨끗한지 확인 ─────────────────────────────────
const gitBranch = git("rev-parse", "--abbrev-ref", "HEAD");
const commit = git("rev-parse", "HEAD");
const shortCommit = commit.slice(0, 7);
const commitMsg = git("log", "-1", "--pretty=%s");
const porcelain = git("status", "--porcelain");
const gitCommonDir = git("rev-parse", "--git-common-dir");
const releaseRoot = releaseStorePath(REPO, gitCommonDir);

const isProd = env === "prod";
const cfEnv = isProd ? "Production" : "Preview";
const cfBranch = isProd ? PROD_BRANCH : sanitizeBranch(gitBranch);

console.log(`\n■ 모두일보 배포 (${cfEnv}${dryRun ? " · DRY-RUN" : ""})`);
console.log(`  git 브랜치 : ${gitBranch}`);
console.log(`  커밋       : ${shortCommit}  ${commitMsg}`);
console.log(`  Cloudflare : ${cfEnv}  (--branch ${cfBranch})`);
if (buildOnce) console.log("  릴리스     : build once → sealed Preview artifact");
if (reuseArtifactId) console.log(`  릴리스     : sealed artifact ${reuseArtifactId} 재사용`);

function makeDeployArgs(directory) {
  return [
    "pages", "deploy", directory,
    "--project-name", PROJECT,
    "--branch", cfBranch,
    "--commit-hash", commit,
    "--commit-message", commitMsg,
  ];
}

if (dryRun) {
  if (porcelain) {
    console.log("\n⚠ 미커밋 변경이 있습니다 — 실제 실행 시엔 여기서 중단됩니다 (dry-run이라 계속 표시).");
  }
  console.log(`\n[DRY-RUN] 빌드/배포/로그 기록 안 함. 실행될 명령:`);
  if (reuseArtifactId) {
    console.log(`  release manifest/HEAD/age/all-file SHA-256 검증: ${reuseArtifactId}`);
    console.log(`  wrangler ${makeDeployArgs("<sealed-artifact>/artifact").join(" ")}\n`);
  } else {
    console.log(`  tsc -p tsconfig.functions.json   (서버 코드 타입 게이트)`);
    console.log(`  npm run build                    (prebuild 체인 + next build)`);
    if (buildOnce) console.log("  out/ 필수 파일·전 파일 SHA-256 manifest 봉인");
    console.log(`  wrangler ${makeDeployArgs(buildOnce ? "<sealed-artifact>/artifact" : OUT_DIR).join(" ")}\n`);
  }
  process.exit(0);
}

// 미커밋이 있으면 실제 배포 중단
if (porcelain) {
  console.error("\n✖ 커밋되지 않은 변경사항이 있어 배포를 중단합니다.");
  console.error("  대표님 규칙: '먼저 커밋해줘. 그다음 배포해줘.'");
  console.error("  미커밋 목록:");
  console.error(porcelain.split("\n").map((l) => "    " + l).join("\n") + "\n");
  process.exit(1);
}

// prod는 master에서만 — 피처 브랜치 HEAD가 그대로 프로덕션에 올라가는 사고 방지.
// (cfBranch만 master로 강제해서는 Cloudflare 라벨만 바뀔 뿐 내용물은 현재 브랜치다.)
// 의도적으로 다른 브랜치를 올려야 하면 --force-branch 를 명시한다.
if (isProd && gitBranch !== PROD_BRANCH && !args.includes("--force-branch")) {
  console.error(`\n✖ prod 배포는 ${PROD_BRANCH} 브랜치에서만 합니다 (현재: ${gitBranch}).`);
  console.error(`  정말 이 브랜치를 올려야 하면: node scripts/deploy.mjs prod --force-branch\n`);
  process.exit(1);
}

if (buildOnce && gitBranch === PROD_BRANCH) {
  console.error(`\n✖ build-once Preview는 ${PROD_BRANCH}가 아닌 격리 브랜치에서만 실행합니다.\n`);
  process.exit(1);
}

let deployDirectory = join(REPO, OUT_DIR);
let release = null;
let stockRollback = null;
const wranglerVersion = buildOnce || reuseArtifactId ? localWranglerVersion() : null;

if (reuseArtifactId) {
  release = verifyReleaseArtifact({
    releaseRoot,
    releaseId: reuseArtifactId,
    expectedProject: PROJECT,
    expectedCommit: commit,
    expectedWranglerVersion: wranglerVersion,
  });
  deployDirectory = release.artifactDir;
  stockRollback = release.manifest.seal.stockRollback;
  console.log(`\n▶ 봉인 산출물 검증 PASS`);
  console.log(`  release id : ${reuseArtifactId}`);
  console.log(`  artifact   : ${release.actual.artifactHash}`);
  console.log(`  Preview    : ${release.manifest.preview.url}`);
  console.log("  build/R2/prune 생략 — Preview에 올린 동일 out/ 재사용");
} else {
  // functions/는 next build가 타입체크하지 않는다(정적 export + Pages 런타임 로드).
  console.log(`\n▶ functions 타입체크 (tsc -p tsconfig.functions.json) ...`);
  execFileSync(join(BIN, "tsc"), ["-p", "tsconfig.functions.json"], { cwd: REPO, stdio: "inherit" });

  // prebuild 체인은 package.json의 npm run build 하나에 위임한다.
  console.log(`\n▶ npm run build (prebuild 체인 + next build) ...`);
  execFileSync("npm", ["run", "build"], { cwd: REPO, stdio: "inherit" });
  stockRollback = process.env.NEXT_PUBLIC_STOCK_BASE === "";
  if (stockRollback) {
    console.log(`\n▶ R2 롤백 모드(NEXT_PUBLIC_STOCK_BASE="") — R2 업로드·스톡 제외 건너뜀, /stock 로컬 서빙`);
  } else {
    console.log(`\n▶ 신규 스톡 이미지 R2 업로드 ...`);
    execFileSync("node", [join(REPO, "scripts", "sync-stock-r2.mjs")], { cwd: REPO, stdio: "inherit" });
    console.log(`\n▶ 스톡 이미지 제외 (R2에서 서빙) ...`);
    execFileSync("node", [join(REPO, "scripts", "prune-stock.mjs")], { cwd: REPO, stdio: "inherit" });
  }

  if (buildOnce) {
    const afterHead = git("rev-parse", "HEAD");
    const afterStatus = git("status", "--porcelain");
    if (afterHead !== commit || afterStatus) {
      console.error("\n✖ 빌드 중 HEAD 또는 워킹트리가 바뀌어 산출물을 봉인하지 않습니다.\n");
      process.exit(1);
    }
    release = sealReleaseArtifact({
      sourceDir: deployDirectory,
      releaseRoot,
      project: PROJECT,
      commit,
      branch: gitBranch,
      commitMessage: commitMsg,
      wranglerVersion,
      stockRollback,
    });
    deployDirectory = release.artifactDir;
    release = verifyReleaseArtifact({
      releaseRoot,
      releaseId: release.releaseId,
      expectedProject: PROJECT,
      expectedCommit: commit,
      expectedWranglerVersion: wranglerVersion,
      requirePreview: false,
    });
    console.log(`\n▶ Preview용 산출물 봉인 PASS`);
    console.log(`  release id : ${release.manifest.seal.releaseId}`);
    console.log(`  artifact   : ${release.actual.artifactHash}`);
  }
}

// 2-b) 파일 수 한도 점검 ──────────────────────────────────────
// Cloudflare Pages는 배포 1건당 파일 20,000개가 상한이다. 기사 1편이 약 4개
// (HTML 1 + jpg 1 + webp 2)를 더하므로 발행이 쌓이면 어느 날 갑자기 배포가 실패한다.
// 실패한 뒤 원인을 찾는 대신, 여유가 줄면 미리 경고하고 위험 수위에서 끊는다.
{
  const FILE_LIMIT = 20000;
  const WARN_AT = 0.8; // 80% 넘으면 경고, 95% 넘으면 중단
  const count = countFiles(deployDirectory);
  const pct = count / FILE_LIMIT;
  const perArticle = 4;
  const room = Math.max(0, Math.floor((FILE_LIMIT - count) / perArticle));
  const line = `  파일 수    : ${count.toLocaleString()} / ${FILE_LIMIT.toLocaleString()} (${(pct * 100).toFixed(1)}%) · 기사 약 ${room.toLocaleString()}편 여유`;
  if (pct >= 0.95) {
    console.error(`\n✖ Cloudflare Pages 파일 수 한도에 근접했습니다.\n${line}`);
    console.error("  이미지를 R2로 옮기거나 오래된 자산을 정리한 뒤 다시 배포하세요.\n");
    process.exit(1);
  }
  console.log(pct >= WARN_AT ? `\n⚠ 파일 수 한도 임박\n${line}\n` : `\n${line}`);
}

// 3) 배포 (출력 캡처 → URL 파싱) ──────────────────────────────
if (release && (git("rev-parse", "HEAD") !== commit || git("status", "--porcelain"))) {
  console.error("\n✖ 배포 직전 HEAD 또는 워킹트리가 바뀌어 봉인 산출물 배포를 중단합니다.\n");
  process.exit(1);
}
const deployArgs = makeDeployArgs(deployDirectory);
console.log(`\n▶ wrangler pages deploy ...`);
let out = "";
try {
  out = execFileSync(join(BIN, "wrangler"), deployArgs, { cwd: REPO, encoding: "utf8" });
  process.stdout.write(out);
} catch (e) {
  process.stdout.write(e.stdout || "");
  process.stderr.write(e.stderr || "");
  console.error("\n✖ wrangler 배포 실패 (위 출력 확인). 로그 기록 안 함.\n");
  process.exit(1);
}

const urls = [...out.matchAll(/https?:\/\/[^\s]*\.pages\.dev[^\s]*/g)].map((m) => m[0]);
const url = urls[urls.length - 1] || null;

if (release) {
  if (git("rev-parse", "HEAD") !== commit || git("status", "--porcelain")) {
    console.error("\n✖ 배포 중 HEAD 또는 워킹트리가 바뀌었습니다. 이 배포는 승급 영수증으로 기록하지 않습니다.\n");
    process.exit(1);
  }
  const releaseId = release.manifest.seal.releaseId;
  // Wrangler가 읽는 동안에도 파일이 바뀌지 않았는지 다시 전수 확인한다.
  const verified = verifyReleaseArtifact({
    releaseRoot,
    releaseId,
    expectedProject: PROJECT,
    expectedCommit: commit,
    expectedWranglerVersion: wranglerVersion,
    requirePreview: Boolean(reuseArtifactId),
  });
  recordReleaseDeployment({
    releaseRoot,
    releaseId,
    env: isProd ? "production" : "preview",
    url,
    branch: cfBranch,
    commit,
    artifactHash: verified.actual.artifactHash,
  });
}

// 4) deploy-log 기록 ──────────────────────────────────────────
const record = {
  time: new Date().toISOString(),
  env: cfEnv,
  project: PROJECT,
  gitBranch,
  cfBranch,
  commit,
  shortCommit,
  commitMessage: commitMsg,
  url,
  deployedFrom: hostname(),
  releaseId: release?.manifest.seal.releaseId ?? null,
  artifactHash: release?.actual.artifactHash ?? null,
  reusedArtifact: Boolean(reuseArtifactId),
};
mkdirSync(dirname(LOG_PATH), { recursive: true });
appendFileSync(LOG_PATH, JSON.stringify(record) + "\n");

console.log(`\n✔ 배포 완료 (${cfEnv})`);
console.log(`  URL    : ${url ?? "(파싱 실패 — 위 wrangler 출력에서 확인)"}`);
console.log(`  commit : ${shortCommit}`);
if (release) {
  console.log(`  release: ${release.manifest.seal.releaseId}`);
  console.log(`  sha256 : ${release.actual.artifactHash}`);
}
console.log(`  기록   : deployments/deploy-log.jsonl`);
if (isProd) console.log(`  운영   : https://modooilbo.com`);
console.log("");

// 프로덕션 배포 후 IndexNow 핑(네이버·빙 색인 가속) — 실패해도 무해
if (isProd) {
  try {
    execFileSync("node", [join(REPO, "scripts", "ping-indexnow.mjs")], { cwd: REPO, stdio: "inherit" });
  } catch {
    console.warn("[indexnow] 스킵");
  }
}
