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
 *   node scripts/deploy.mjs prod --dry-run   # 빌드/배포 없이 실행될 내용만 확인
 *
 * 다른 프로젝트로 복제 시: 아래 상수 3개(PROJECT/PROD_BRANCH/OUT_DIR)만 바꾸면 됩니다.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readdirSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ── 프로젝트 설정 ────────────────────────────────────────────
const PROJECT = "modooilbo"; // Cloudflare Pages project name
const PROD_BRANCH = "master"; // Cloudflare Pages production 브랜치
const OUT_DIR = "out"; // 빌드 산출물 디렉터리
// ────────────────────────────────────────────────────────────

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(REPO, "node_modules", ".bin");
const LOG_PATH = join(REPO, "deployments", "deploy-log.jsonl");

const args = process.argv.slice(2);
const env = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

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

const isProd = env === "prod";
const cfEnv = isProd ? "Production" : "Preview";
const cfBranch = isProd ? PROD_BRANCH : sanitizeBranch(gitBranch);

console.log(`\n■ 모두일보 배포 (${cfEnv}${dryRun ? " · DRY-RUN" : ""})`);
console.log(`  git 브랜치 : ${gitBranch}`);
console.log(`  커밋       : ${shortCommit}  ${commitMsg}`);
console.log(`  Cloudflare : ${cfEnv}  (--branch ${cfBranch})`);

const deployArgs = [
  "pages", "deploy", OUT_DIR,
  "--project-name", PROJECT,
  "--branch", cfBranch,
  "--commit-hash", commit,
  "--commit-message", commitMsg,
];

if (dryRun) {
  if (porcelain) {
    console.log("\n⚠ 미커밋 변경이 있습니다 — 실제 실행 시엔 여기서 중단됩니다 (dry-run이라 계속 표시).");
  }
  console.log(`\n[DRY-RUN] 빌드/배포/로그 기록 안 함. 실행될 명령:`);
  console.log(`  next build`);
  console.log(`  wrangler ${deployArgs.join(" ")}\n`);
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

// 2) 빌드 ─────────────────────────────────────────────────────
console.log(`\n▶ WebP 변환 (public/stock) ...`);
execFileSync("node", [join(REPO, "scripts", "convert-webp.mjs")], { cwd: REPO, stdio: "inherit" });
console.log(`\n▶ 콘텐츠 생성 (content/articles/*.md → data) ...`);
execFileSync("node", [join(REPO, "scripts", "build-content.mjs")], { cwd: REPO, stdio: "inherit" });
console.log(`\n▶ 인기태그 데이터 생성 (build-trending-data) ...`);
execFileSync("node", [join(REPO, "scripts", "build-trending-data.mjs")], { cwd: REPO, stdio: "inherit" });
console.log(`\n▶ next build ...`);
execFileSync(join(BIN, "next"), ["build"], { cwd: REPO, stdio: "inherit" });
console.log(`\n▶ 신규 스톡 이미지 R2 업로드 ...`);
// prune 이전에 실행한다 — out/에서 지우기 전에 R2에 올려둬야 신규 기사 이미지가 404가 나지 않는다.
execFileSync("node", [join(REPO, "scripts", "sync-stock-r2.mjs")], { cwd: REPO, stdio: "inherit" });
console.log(`\n▶ 스톡 이미지 제외 (R2에서 서빙) ...`);
execFileSync("node", [join(REPO, "scripts", "prune-stock.mjs")], { cwd: REPO, stdio: "inherit" });

// 2-b) 파일 수 한도 점검 ──────────────────────────────────────
// Cloudflare Pages는 배포 1건당 파일 20,000개가 상한이다. 기사 1편이 약 4개
// (HTML 1 + jpg 1 + webp 2)를 더하므로 발행이 쌓이면 어느 날 갑자기 배포가 실패한다.
// 실패한 뒤 원인을 찾는 대신, 여유가 줄면 미리 경고하고 위험 수위에서 끊는다.
{
  const FILE_LIMIT = 20000;
  const WARN_AT = 0.8; // 80% 넘으면 경고, 95% 넘으면 중단
  const count = countFiles(join(REPO, OUT_DIR));
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
};
mkdirSync(dirname(LOG_PATH), { recursive: true });
appendFileSync(LOG_PATH, JSON.stringify(record) + "\n");

console.log(`\n✔ 배포 완료 (${cfEnv})`);
console.log(`  URL    : ${url ?? "(파싱 실패 — 위 wrangler 출력에서 확인)"}`);
console.log(`  commit : ${shortCommit}`);
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
