#!/usr/bin/env node
/**
 * 모두일보 — 일일 트래킹 리포트 (KST 기준)
 *
 * 원칙
 *   - 실제 데이터 소스가 연동된 지표만 숫자를 낸다. 미연동/미구현은 unavailable(확인 불가).
 *   - 데모 버튼 클릭·프론트 상태 변경은 절대 집계하지 않는다.
 *   - 각 숫자는 어느 소스에서 왔는지(또는 왜 unavailable/0인지) 함께 표기한다.
 *   - PII(이메일·이름·전화·토큰·결제정보·chat id)는 출력하지 않는다. 집계 수치만.
 *   - 페이지뷰 ≠ 세션 ≠ 유입자 ≠ 가입자. 서로 섞어 부르지 않는다.
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
const env = process.env;

// ── KST 날짜·범위 ────────────────────────────────────────────
function kstDateString(d = new Date()) {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}
const reportDate = dateArg || kstDateString();
const kstStartLabel = `${reportDate}T00:00:00+09:00`;
const kstEndLabel = `${reportDate}T23:59:59+09:00`;
// CF 등 UTC 기반 소스용: KST 하루 = [date 00:00 +09:00, 다음날 00:00 +09:00)
const startUTC = new Date(`${reportDate}T00:00:00+09:00`).toISOString();
const endUTC = new Date(new Date(`${reportDate}T00:00:00+09:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();

// ── Cloudflare Web Analytics 어댑터 (#1 실제 집계) ───────────
// 한 번만 호출해 캐시. 토큰 없으면 unavailable. 호출/필드 오류 시에도 graceful unavailable.
let _cfCache;
async function getCfTraffic() {
  if (_cfCache) return _cfCache;
  const token = env.CLOUDFLARE_API_TOKEN;
  const account = env.CF_ACCOUNT_ID;
  const siteTag = env.CF_WEB_ANALYTICS_SITE_TAG;
  if (!token || !account || !siteTag) {
    _cfCache = {
      ok: false,
      reason: "미연동 (CLOUDFLARE_API_TOKEN/CF_ACCOUNT_ID/CF_WEB_ANALYTICS_SITE_TAG 미설정)",
    };
    return _cfCache;
  }
  // 변수 대신 안전한 자체 env 값을 인라인(스칼라 타입 선언 불일치 회피). KST→UTC 범위로 필터.
  const q = `{
    viewer {
      accounts(filter: { accountTag: "${account}" }) {
        total: rumPageloadEventsAdaptiveGroups(
          filter: { siteTag: "${siteTag}", datetime_geq: "${startUTC}", datetime_lt: "${endUTC}" }
          limit: 1
        ) { count sum { visits } }
        byHour: rumPageloadEventsAdaptiveGroups(
          filter: { siteTag: "${siteTag}", datetime_geq: "${startUTC}", datetime_lt: "${endUTC}" }
          limit: 24
        ) { uniq { uniques } dimensions { datetimeHour } }
      }
    }
  }`;
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const json = await res.json();
    if (json.errors && json.errors.length) {
      // 토큰은 노출하지 않고 메시지만(메시지에 비밀값 없음)
      _cfCache = { ok: false, reason: `CF GraphQL 오류: ${json.errors[0].message}` };
      return _cfCache;
    }
    const acc = json.data?.viewer?.accounts?.[0];
    if (!acc) {
      _cfCache = { ok: false, reason: "CF 응답에 account 없음(siteTag/토큰 권한 확인)" };
      return _cfCache;
    }
    const total = acc.total?.[0] ?? {};
    const pageviews = total.count ?? 0;
    const sessions = total.sum?.visits ?? 0;
    // 일일 고유 방문자: CF는 쿠키 없는 측정이라 일 단위 dedup을 직접 주지 않음.
    // → 시간별 고유 방문자(uniq.uniques)를 합산한 "상한 추정". 동일인의 다른 시간대 재방문이 중복될 수 있음.
    const uniqueVisitorsHourlySum = (acc.byHour ?? []).reduce(
      (s, g) => s + (g.uniq?.uniques ?? 0),
      0,
    );
    _cfCache = { ok: true, pageviews, sessions, uniqueVisitorsHourlySum };
    return _cfCache;
  } catch (e) {
    _cfCache = { ok: false, reason: `CF 호출 실패: ${e.message}` };
    return _cfCache;
  }
}

const CF_SOURCE = "Cloudflare Web Analytics";

async function cfPageviews() {
  const t = await getCfTraffic();
  return t.ok
    ? { value: t.pageviews, source: CF_SOURCE, note: "KST 일일 합계(페이지뷰=pageload count)" }
    : { unavailable: true, source: CF_SOURCE, note: t.reason };
}
async function cfSessions() {
  const t = await getCfTraffic();
  return t.ok
    ? { value: t.sessions, source: CF_SOURCE, note: "KST 일일 합계(세션=visits)" }
    : { unavailable: true, source: CF_SOURCE, note: t.reason };
}
async function cfUniqueVisitors() {
  const t = await getCfTraffic();
  return t.ok
    ? {
        value: t.uniqueVisitorsHourlySum,
        source: CF_SOURCE,
        note: "시간별 고유 방문자 합산(상한 추정) — 동일인의 다른 시간대 재방문이 중복 집계될 수 있음",
      }
    : { unavailable: true, source: CF_SOURCE, note: t.reason };
}

// ── 회원/뉴스레터/유료 (#2: 현재 데모 → 0명 + 비고) ──────────
// 운영 DB/ESP/PG가 없고 폼이 데모라 실제 레코드가 생성되지 않으므로 값은 0(사실). 비고로 근거 명시.
const DEMO_NOTE_DB = "운영 DB 없음 / 데모 동작 / 실제 레코드 생성 없음";
const DEMO_NOTE_ESP = "운영 ESP 없음 / 데모 동작 / 실제 레코드 생성 없음";
const DEMO_NOTE_PAY = "결제 PG 없음 / 데모 동작 / 실제 레코드 생성 없음";

const zeroMembers = (note) => () => Promise.resolve({ value: 0, source: "회원 DB(미연동)", note });
const zeroEsp = (note) => () => Promise.resolve({ value: 0, source: "뉴스레터 ESP(미연동)", note });
const zeroPay = (note) => () => Promise.resolve({ value: 0, source: "결제 PG(미연동)", note });

// ── 지표 정의 (docs/tracking.md 와 1:1) ──────────────────────
const METRICS = [
  { key: "daily_unique_visitors", label: "일일 유입자(고유 방문자)", unit: "명", resolve: cfUniqueVisitors },
  { key: "daily_sessions", label: "일일 방문 세션", unit: "세션", resolve: cfSessions },
  { key: "daily_pageviews", label: "일일 페이지뷰", unit: "PV", resolve: cfPageviews },
  { key: "new_members", label: "신규 회원가입자", unit: "명", resolve: zeroMembers(DEMO_NOTE_DB) },
  { key: "new_newsletter_subs", label: "신규 뉴스레터 구독자", unit: "명", resolve: zeroEsp(DEMO_NOTE_ESP) },
  { key: "new_paid_or_donors", label: "신규 유료 구독/후원자", unit: "명", resolve: zeroPay(DEMO_NOTE_PAY) },
  { key: "active_members_total", label: "누적 활성 회원", unit: "명", resolve: zeroMembers(DEMO_NOTE_DB) },
  { key: "active_newsletter_total", label: "누적 활성 뉴스레터 구독자", unit: "명", resolve: zeroEsp(DEMO_NOTE_ESP) },
];

const rows = await Promise.all(
  METRICS.map(async (m) => {
    const r = await m.resolve();
    return {
      key: m.key,
      label: m.label,
      unit: m.unit,
      value: r.unavailable ? "unavailable" : r.value,
      source: r.source,
      note: r.note || "",
    };
  }),
);

// ── 출력 ─────────────────────────────────────────────────────
if (jsonOut) {
  console.log(
    JSON.stringify(
      {
        report: "modooilbo-daily-tracking",
        date_kst: reportDate,
        window: { start: kstStartLabel, end: kstEndLabel, tz: "Asia/Seoul" },
        generated_at: new Date().toISOString(),
        note: "데모 클릭/프론트 상태는 집계 제외. 미연동 트래픽은 unavailable. 회원/뉴스레터/유료는 데모라 0.",
        metrics: rows,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

// CJK(한글) 폭 2 계산
function dispWidth(s) {
  let w = 0;
  for (const ch of String(s)) w += /[ᄀ-ᇿ⺀-꓏가-힣豈-﫿＀-￯]/.test(ch) ? 2 : 1;
  return w;
}
const pad = (s, n) => String(s) + " ".repeat(Math.max(0, n - dispWidth(s)));

console.log(`\n■ 모두일보 일일 트래킹 리포트`);
console.log(`  날짜(KST) : ${reportDate}  (${kstStartLabel} ~ ${kstEndLabel})`);
console.log(`  기준 문서 : docs/tracking.md`);
console.log(`  주의      : 페이지뷰≠세션≠유입자≠가입자 / 데모 클릭은 집계 제외\n`);
console.log(`  ${pad("지표", 28)}${pad("값", 12)}${pad("출처", 26)}비고`);
console.log(`  ${"-".repeat(96)}`);
for (const r of rows) {
  const val = r.value === "unavailable" ? "확인 불가" : `${r.value}${r.unit}`;
  console.log(`  ${pad(r.label, 28)}${pad(val, 12)}${pad(r.source, 26)}${r.note}`);
}
const unavailable = rows.filter((r) => r.value === "unavailable").length;
console.log(`\n  요약: ${rows.length}개 지표 중 ${unavailable}개 unavailable.`);
console.log(
  `  → 트래픽: 어댑터 구현 완료. CLOUDFLARE_API_TOKEN/CF_ACCOUNT_ID/CF_WEB_ANALYTICS_SITE_TAG 설정 시 실집계.`,
);
console.log(
  `  → 회원·뉴스레터·유료: 환경변수와 어댑터 구현이 모두 완료되면 실집계(현재 백엔드 없음 → 데모, 0). 기준: docs/tracking.md\n`,
);
