#!/usr/bin/env node
/**
 * 후원사 월간 집행 리포트 생성기.
 *
 * [왜 필요한가]
 * 광고 용역 계약서 제6조 ②가 "매월 종료 후 10일 이내 월간 집행 리포트 제출"을
 * 갑의 의무로 정한다. 5개사분을 손으로 만들면 오래 못 간다. 무엇보다 이 리포트가
 * 250만원이 실제 용역이었다는 세무 증빙이라, 빠뜨리면 실체 없는 거래로 읽힌다.
 *
 * [스냅샷이 필요한 이유]
 * article_views 는 누적값만 들고 있고 시간 축이 없다(article_id, views, updated_at).
 * 그래서 "8월 조회수"를 사후에 계산할 방법이 없다. 매월 실행 시점의 값을
 * reports/snapshots.json 에 남기고, 다음 달에 그 차이로 증감을 낸다.
 * → 첫 달 리포트에는 증감이 비어 있는 게 정상이다. 두 번째 달부터 채워진다.
 *
 * [집행 내역]
 * 그 달에 무엇을 게재했는지는 자동으로 알 수 없다(브랜디드 콘텐츠에 후원사 표시가
 * 아직 없다). reports/<YYYY-MM>/<slug>.json 을 스텁으로 만들어 두고 사람이 채운다.
 * 이미 있으면 덮어쓰지 않는다.
 *
 * 사용법
 *   node scripts/partner-report.mjs              # 지난달 기준(매월 초 실행 가정)
 *   node scripts/partner-report.mjs 2026-08      # 특정 월
 *   node scripts/partner-report.mjs --snapshot   # 스냅샷만 남기고 종료(월말에)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORTS = path.join(ROOT, "reports");
const SNAPSHOT_FILE = path.join(REPORTS, "snapshots.json");
const DB = "modooilbo-members";

/** KST 기준 YYYY-MM. 서버 시간대와 무관하게 한국 달력을 따른다. */
function kstMonth(d = new Date()) {
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}`;
}
function prevMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** D1 원격 조회. wrangler 를 그대로 쓴다(별도 토큰 관리 안 함). */
function d1(sql) {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 32 * 1024 * 1024 },
  );
  return JSON.parse(out)[0].results;
}

/** 발행 기사 수 — content/articles 의 .md 개수가 정본이다. */
function articleCounts() {
  const dir = path.join(ROOT, "content", "articles");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const byMonth = {};
  for (const f of files) {
    const m = f.match(/^(\d{4})-(\d{2})-/);
    if (m) byMonth[`${m[1]}-${m[2]}`] = (byMonth[`${m[1]}-${m[2]}`] || 0) + 1;
  }
  return { total: files.length, byMonth };
}

function collectMetrics() {
  const [r] = d1(`
    SELECT
      (SELECT count(*) FROM users) AS users,
      (SELECT coalesce(sum(views),0) FROM article_views) AS total_views,
      (SELECT count(*) FROM article_views) AS viewed_articles,
      (SELECT count(*) FROM comments) AS comments,
      (SELECT coalesce(sum(n),0) FROM reaction_counts) AS reactions,
      (SELECT count(*) FROM newsletter_subs) AS newsletter,
      (SELECT count(*) FROM inquiries) AS inquiries`);
  const a = articleCounts();
  return { ...r, articles: a.total, articlesByMonth: a.byMonth, at: new Date().toISOString() };
}

function loadSnapshots() {
  if (!fs.existsSync(SNAPSHOT_FILE)) return {};
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
}
function saveSnapshot(ym, metrics) {
  fs.mkdirSync(REPORTS, { recursive: true });
  const all = loadSnapshots();
  all[ym] = metrics;
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(all, null, 2) + "\n");
}

/** 후원사 명단은 src/lib/partners.ts 를 정본으로 읽는다(중복 정의 금지). */
function loadPartners() {
  const src = fs.readFileSync(path.join(ROOT, "src", "lib", "partners.ts"), "utf8");
  const out = [];
  for (const block of src.split(/\{\s*\n\s*slug:/).slice(1)) {
    const g = (k) => (block.match(new RegExp(`${k}:\\s*"([^"]*)"`)) || [])[1];
    const slug = (block.match(/^\s*"([^"]+)"/) || [])[1];
    if (!slug) continue;
    out.push({ slug, name: g("name") || slug, desc: g("desc") || "", url: g("url") || "" });
  }
  return out;
}

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const num = (n) => Number(n ?? 0).toLocaleString("ko-KR");
function delta(cur, prev) {
  if (prev === undefined || prev === null) return "";
  const d = Number(cur) - Number(prev);
  if (d === 0) return `<span class="flat">±0</span>`;
  return d > 0 ? `<span class="up">▲ ${num(d)}</span>` : `<span class="down">▼ ${num(-d)}</span>`;
}

function stubPath(ym, slug) {
  return path.join(REPORTS, ym, `${slug}.json`);
}
/** 집행 내역 스텁 — 이미 있으면 절대 덮어쓰지 않는다(사람이 채운 내용 보호). */
function ensureStub(ym, p) {
  const f = stubPath(ym, p.slug);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const stub = {
    _안내: "이 파일을 채우면 리포트에 실립니다. 비워 두면 '해당 없음'으로 나갑니다.",
    브랜디드콘텐츠: [{ 제목: "", url: "", 게재일: "" }],
    보도자료: [{ 제목: "", url: "", 게재일: "" }],
    배너: { 게재기간: "", 노출: "", 클릭: "" },
    뉴스레터: { 발송횟수: "", 비고: "" },
    비고: "",
  };
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(stub, null, 2) + "\n");
  return stub;
}

function itemRows(list) {
  const rows = (list || []).filter((x) => x && (x.제목 || x.url));
  if (!rows.length) return `<tr><td colspan="3" class="none">해당 없음</td></tr>`;
  return rows
    .map(
      (x) =>
        `<tr><td>${esc(x.제목)}</td><td class="u">${esc(x.url)}</td><td class="c">${esc(x.게재일)}</td></tr>`,
    )
    .join("");
}

function html(ym, p, exec, cur, prev) {
  const row = (label, key, unit = "") =>
    `<tr><td>${label}</td><td class="r">${num(cur[key])}${unit}</td><td class="r">${delta(cur[key], prev?.[key])}</td></tr>`;
  const monthArticles = cur.articlesByMonth?.[ym] ?? 0;

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#1a1a1c;font-size:10pt;line-height:1.7}
.page{width:210mm;min-height:297mm;padding:18mm 19mm}
.mast{font-size:9.5pt;font-weight:800;letter-spacing:5px;color:#b0322a;margin-bottom:6px}
h1{font-size:18pt;font-weight:800;letter-spacing:-.3px}
.sub{margin-top:5px;color:#777;font-size:9pt}
.rule{border-top:2.5px solid #111;margin:11px 0 3px}.rule2{border-top:1px solid #111;margin-bottom:20px}
h2{font-size:11.5pt;font-weight:800;margin:20px 0 8px;padding-bottom:4px;border-bottom:1.5px solid #ddd}
h2 .n{color:#b0322a;font-style:italic;margin-right:7px}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:9.5pt}
th,td{border:1px solid #c7c7c7;padding:7px 9px;text-align:left;vertical-align:top}
th{background:#f4f3f0;font-weight:700}
td.r,th.r{text-align:right}td.c{text-align:center;white-space:nowrap}
td.u{font-size:8.5pt;color:#555;word-break:break-all}
td.none{text-align:center;color:#999}
.up{color:#1a7f37;font-weight:700}.down{color:#b0322a;font-weight:700}.flat{color:#999}
.note{background:#faf9f6;border-left:3px solid #cfc9be;padding:9px 13px;margin:10px 0;font-size:9pt;color:#555}
.foot{margin-top:26px;padding-top:11px;border-top:1px solid #ddd;font-size:8.5pt;color:#777;text-align:center}
</style></head><body><div class="page">
  <div class="mast">모두일보</div>
  <h1>${esc(p.name)} 월간 집행 리포트</h1>
  <div class="sub">${esc(ym.replace("-", "년 "))}월 · 광고 및 콘텐츠 제작 용역 계약 제6조 ②에 따른 보고</div>
  <div class="rule"></div><div class="rule2"></div>

  <h2><span class="n">1</span>귀사 관련 집행</h2>
  <p style="font-size:9.5pt;margin-bottom:4px"><b>브랜디드 콘텐츠</b></p>
  <table><tr><th>제목</th><th style="width:38%">URL</th><th style="width:16%">게재일</th></tr>
    ${itemRows(exec.브랜디드콘텐츠)}</table>
  <p style="font-size:9.5pt;margin:10px 0 4px"><b>보도자료 게재</b></p>
  <table><tr><th>제목</th><th style="width:38%">URL</th><th style="width:16%">게재일</th></tr>
    ${itemRows(exec.보도자료)}</table>
  <table style="margin-top:10px">
    <tr><th style="width:22%">배너 게재기간</th><td>${esc(exec.배너?.게재기간) || "—"}</td>
        <th style="width:14%">노출</th><td class="r">${esc(exec.배너?.노출) || "—"}</td>
        <th style="width:14%">클릭</th><td class="r">${esc(exec.배너?.클릭) || "—"}</td></tr>
    <tr><th>뉴스레터</th><td colspan="5">${esc(exec.뉴스레터?.발송횟수) || "—"}회 ${esc(exec.뉴스레터?.비고)}</td></tr>
  </table>

  <h2><span class="n">2</span>매체 성장 지표</h2>
  <table>
    <tr><th>항목</th><th class="r" style="width:22%">${esc(ym)} 기준</th><th class="r" style="width:22%">전월 대비</th></tr>
    <tr><td>발행 기사(누적)</td><td class="r">${num(cur.articles)}편</td><td class="r">${delta(cur.articles, prev?.articles)}</td></tr>
    <tr><td>당월 발행</td><td class="r">${num(monthArticles)}편</td><td class="r"></td></tr>
    ${row("누적 조회수", "total_views", "회")}
    ${row("조회된 기사 수", "viewed_articles", "편")}
    ${row("회원", "users", "명")}
    ${row("뉴스레터 구독", "newsletter", "명")}
    ${row("댓글", "comments", "건")}
    ${row("기사 반응", "reactions", "건")}
    ${row("접수 문의", "inquiries", "건")}
  </table>
  ${
    prev
      ? ""
      : `<div class="note">전월 스냅샷이 없어 증감을 계산하지 못했습니다. 다음 달 리포트부터 표시됩니다.</div>`
  }

  ${exec.비고 ? `<h2><span class="n">3</span>비고</h2><p>${esc(exec.비고)}</p>` : ""}

  <div class="foot">
    주식회사 모두일보 · 인터넷신문 등록 경기 아54891 · 070-7323-1233 · help@modooilbo.com<br>
    이 리포트는 계약 제6조 ②에 따라 매월 제출되며, 원본 데이터는 모두일보 D1에 보관됩니다.
  </div>
</div></body></html>`;
}

function toPdf(htmlPath, pdfPath) {
  const chrome = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].find((c) => fs.existsSync(c));
  if (!chrome) {
    console.log("   (Chrome 계열 브라우저를 찾지 못해 PDF는 건너뜁니다 — HTML은 생성됨)");
    return false;
  }
  execFileSync(
    chrome,
    ["--headless", "--disable-gpu", "--no-pdf-header-footer", "--no-margins",
     `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`],
    { stdio: "ignore" },
  );
  return true;
}

// ── 실행 ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const snapshotOnly = args.includes("--snapshot");
const ym = args.find((a) => /^\d{4}-\d{2}$/.test(a)) || prevMonth(kstMonth());

console.log(`대상 월: ${ym}${snapshotOnly ? " (스냅샷만)" : ""}`);
const metrics = collectMetrics();

if (snapshotOnly) {
  saveSnapshot(kstMonth(), metrics);
  console.log(`  스냅샷 저장 → reports/snapshots.json [${kstMonth()}]`);
  process.exit(0);
}

const snaps = loadSnapshots();
const prev = snaps[prevMonth(ym)];
saveSnapshot(ym, metrics); // 이번 달 값도 남겨 다음 달 증감의 기준이 된다

const partners = loadPartners();
const outDir = path.join(REPORTS, ym);
fs.mkdirSync(outDir, { recursive: true });

let made = 0;
for (const p of partners) {
  const exec = ensureStub(ym, p);
  const h = html(ym, p, exec, metrics, prev);
  const hp = path.join(outDir, `${p.slug}.html`);
  const pp = path.join(outDir, `${ym}_${p.slug}_월간리포트.pdf`);
  fs.writeFileSync(hp, h);
  const ok = toPdf(hp, pp);
  fs.unlinkSync(hp);
  console.log(`  ${ok ? "✓" : "·"} ${p.name} → ${path.relative(ROOT, ok ? pp : hp)}`);
  made++;
}
console.log(`\n${made}개사 리포트 생성 · reports/${ym}/`);
console.log(`집행 내역을 채우려면 reports/${ym}/<slug>.json 을 수정하고 다시 실행하세요.`);
