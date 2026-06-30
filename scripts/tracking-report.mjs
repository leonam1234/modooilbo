#!/usr/bin/env node
/**
 * 모두일보 — 일일 트래킹 리포트 (KST 기준)
 *
 * 원칙
 *   - 실제 데이터 소스가 연동된 지표만 숫자를 낸다. 미연동/미구현은 `unavailable`.
 *   - 데모 버튼 클릭·프론트 상태 변경은 절대 집계하지 않는다.
 *   - 각 숫자는 어느 소스에서 왔는지(또는 왜 unavailable인지) 함께 표기한다.
 *   - PII(이메일·이름·전화·토큰·결제정보)는 출력하지 않는다. 집계 수치만.
 *
 * 사용법
 *   npm run report:tracking
 *   npm run report:tracking -- --date=2026-06-29
 *   npm run report:tracking -- --json
 *
 * 기준 문서: docs/tracking.md
 */
import process from "node:process";

const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
const dateArg = (args.find((a) => a.startsWith("--date=")) || "").split("=")[1];

// ── KST 날짜 계산 ────────────────────────────────────────────
function kstDateString(d = new Date()) {
  // UTC + 9h 후 날짜 부분(YYYY-MM-DD)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}
const reportDate = dateArg || kstDateString();
const kstStart = `${reportDate}T00:00:00+09:00`;
const kstEnd = `${reportDate}T23:59:59+09:00`;

// ── 소스 어댑터 (연동되면 여기서 실제 값 반환) ────────────────
// 각 어댑터는 { value, source } 또는 { unavailable, source, reason } 를 반환.
const env = process.env;

function cfWebAnalytics(metric) {
  const ok = env.CLOUDFLARE_API_TOKEN && env.CF_ACCOUNT_ID && env.CF_WEB_ANALYTICS_SITE_TAG;
  if (!ok) {
    return {
      unavailable: true,
      source: "Cloudflare Web Analytics",
      reason: "미연동 (사이트 beacon + CLOUDFLARE_API_TOKEN/CF_ACCOUNT_ID/CF_WEB_ANALYTICS_SITE_TAG 필요)",
    };
  }
  // TODO: CF GraphQL Analytics API 호출해 metric(pageviews/visits/uniques)을 KST 범위로 집계.
  return { unavailable: true, source: "Cloudflare Web Analytics", reason: "어댑터 미구현(연동값 채움 예정)" };
}

function membersDB(kind) {
  const ok = env.DATABASE_URL || env.MEMBERS_DB;
  if (!ok) {
    return {
      unavailable: true,
      source: "회원 DB",
      reason: "미연동 (백엔드/DB 없음 — 현재 /register는 데모, 저장 안 됨)",
    };
  }
  // TODO: 내부 계정(admin/reporter/editor/test/seed/demo) 제외하고 COUNT만.
  return { unavailable: true, source: "회원 DB", reason: "어댑터 미구현" };
}

function esp(kind) {
  const ok = env.ESP_API_KEY && env.ESP_LIST_ID;
  if (!ok) {
    return {
      unavailable: true,
      source: "뉴스레터 ESP",
      reason: "미연동 (ESP 없음 — 현재 /newsletter는 데모 토글)",
    };
  }
  return { unavailable: true, source: "뉴스레터 ESP", reason: "어댑터 미구현" };
}

function payments() {
  const ok = env.PAY_API_KEY;
  if (!ok) {
    return {
      unavailable: true,
      source: "결제 PG",
      reason: "미연동 (결제 없음 — 현재 /subscribe는 정적 안내)",
    };
  }
  return { unavailable: true, source: "결제 PG", reason: "어댑터 미구현" };
}

// ── 지표 정의 (docs/tracking.md 와 1:1) ──────────────────────
const METRICS = [
  { key: "daily_unique_visitors", label: "일일 유입자(고유 방문자)", group: "트래픽", resolve: () => cfWebAnalytics("uniques") },
  { key: "daily_sessions", label: "일일 방문 세션", group: "트래픽", resolve: () => cfWebAnalytics("visits") },
  { key: "daily_pageviews", label: "일일 페이지뷰", group: "트래픽", resolve: () => cfWebAnalytics("pageviews") },
  { key: "new_members", label: "신규 회원가입자", group: "멤버", resolve: () => membersDB("new") },
  { key: "new_newsletter_subs", label: "신규 뉴스레터 구독자", group: "뉴스레터", resolve: () => esp("new") },
  { key: "new_paid_or_donors", label: "신규 유료 구독/후원자", group: "유료", resolve: () => payments() },
  { key: "active_members_total", label: "누적 활성 회원", group: "멤버", resolve: () => membersDB("active_total") },
  { key: "active_newsletter_total", label: "누적 활성 뉴스레터 구독자", group: "뉴스레터", resolve: () => esp("active_total") },
];

const rows = METRICS.map((m) => {
  const r = m.resolve();
  return {
    key: m.key,
    label: m.label,
    group: m.group,
    value: r.unavailable ? "unavailable" : r.value,
    source: r.source,
    note: r.unavailable ? r.reason : "",
  };
});

// ── 출력 ─────────────────────────────────────────────────────
if (jsonOut) {
  console.log(
    JSON.stringify(
      {
        report: "modooilbo-daily-tracking",
        date_kst: reportDate,
        window: { start: kstStart, end: kstEnd, tz: "Asia/Seoul" },
        generated_at: new Date().toISOString(),
        note: "데모 클릭/프론트 상태는 집계 제외. 미연동 지표는 unavailable.",
        metrics: rows,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

// CJK(한글·한자)는 폭 2로 계산해 정렬을 맞춘다
function dispWidth(s) {
  let w = 0;
  for (const ch of String(s)) w += /[ᄀ-ᇿ⺀-꓏가-힣豈-﫿＀-￯]/.test(ch) ? 2 : 1;
  return w;
}
const pad = (s, n) => String(s) + " ".repeat(Math.max(0, n - dispWidth(s)));
console.log(`\n■ 모두일보 일일 트래킹 리포트`);
console.log(`  날짜(KST) : ${reportDate}  (${kstStart} ~ ${kstEnd})`);
console.log(`  기준 문서 : docs/tracking.md`);
console.log(`  주의      : 페이지뷰≠세션≠유입자≠가입자 / 데모 클릭은 집계 제외\n`);
console.log(`  ${pad("지표", 28)}${pad("값", 12)}${pad("출처", 28)}비고`);
console.log(`  ${"-".repeat(92)}`);
for (const r of rows) {
  const val = r.value === "unavailable" ? "확인 불가" : String(r.value);
  console.log(`  ${pad(r.label, 28)}${pad(val, 12)}${pad(r.source, 28)}${r.note}`);
}
const unavailable = rows.filter((r) => r.value === "unavailable").length;
console.log(`\n  요약: ${rows.length}개 지표 중 ${unavailable}개 unavailable (데이터 소스 미연동).`);
console.log(`  → 연동 방법: docs/tracking.md §4. (env 채우면 자동 실집계)\n`);
