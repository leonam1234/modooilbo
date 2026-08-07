#!/usr/bin/env node
/**
 * 발주기관이 등록한 발주계획을 찾는다. 공고가 뜨기 **전** 정보다.
 *
 * 왜 필요한가: 지금 bids 기사는 공고가 뜬 뒤에야 쓸 수 있어서, 준비 기간이 필요한
 * 중소기업 독자에게는 이미 늦은 경우가 많다. 발주계획은 기관이 "올해 이 사업을
 * 이 시기에 이 예산으로 발주하겠다"고 미리 올린 것이라, 기업 독자에게는 이쪽이 더 값어치 있다.
 *
 * 유용한 필드가 하나 있다. bidNtceNoList — 그 계획이 실제로 어떤 공고로 이어졌는지
 * 공고번호가 붙어 온다. 계획만 있고 공고가 없으면 아직 안 나온 건이고,
 * 공고번호가 있으면 check-bid.mjs 로 바로 넘길 수 있다.
 *
 *   node scripts/find-order-plan.mjs --from 20260801 --to 20260807
 *   node scripts/find-order-plan.mjs --from 20260801 --to 20260807 --min 100000000
 *   node scripts/find-order-plan.mjs --from 20260801 --to 20260807 --inst 교육청 --json
 *
 * ⚠️ 날짜는 8자리(YYYYMMDD)다. 입찰공고 API 는 12자리(YYYYMMDDHHmm)라 서로 다르다.
 *    12자리를 넣으면 resultCode=08 "필수값 입력 에러"가 뜨는데, 권한 문제가 아니다.
 * ⚠️ 공개 조회 전용.
 */
import { SERVICES, BSNS, readKey, call, won } from "./nara.mjs";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const asJson = process.argv.includes("--json");

const kst = new Date(Date.now() + 9 * 3600 * 1000); // KST 기준 오늘
const today = kst.toISOString().slice(0, 10).replace(/-/g, "");
const from = arg("from", today);
const to = arg("to", today);
const minAmt = Number(arg("min", "0"));
const instFilter = arg("inst", "");
const bsnsFilter = arg("bsns", ""); // 용역·물품·공사·외자 중 하나로 좁힐 때

if (!/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) {
  console.error("✖ 날짜는 YYYYMMDD 8자리 (입찰공고 API 의 12자리와 다르다)");
  process.exit(2);
}
const key = readKey();
if (!key) {
  console.error("✖ DATA_GO_KR_KEY 없음 — .dev.vars 에 넣을 것");
  process.exit(2);
}

const rows = [];
const errors = [];
for (const [bsns, suffix] of BSNS) {
  if (bsnsFilter && bsns !== bsnsFilter) continue;
  const r = await call(
    SERVICES.orderPlan,
    `getOrderPlanSttusList${suffix}`,
    { inqryDiv: "1", inqryBgnDate: from, inqryEndDate: to, numOfRows: "300" },
    key,
  );
  if (r.error) {
    errors.push(`${bsns}: ${r.error}`);
    continue;
  }
  rows.push(...r.items.map((x) => ({ ...x, __bsns: bsns })));
}

const picked = rows
  .filter((x) => Number(x.sumOrderAmt || 0) >= minAmt)
  .filter((x) => !instFilter || `${x.orderInsttNm ?? ""}${x.totlmngInsttNm ?? ""}`.includes(instFilter))
  .sort((a, b) => Number(b.sumOrderAmt || 0) - Number(a.sumOrderAmt || 0));

const out = picked.map((x) => ({
  사업명: x.bizNm,
  업무구분: x.__bsns,
  세부구분: x.bsnsDivNm,
  발주기관: x.orderInsttNm,
  상위기관: x.totlmngInsttNm,
  관할: x.jrsdctnDivNm,
  발주시기: x.orderYear && x.orderMnth ? `${x.orderYear}-${x.orderMnth}` : null,
  총발주금액: Number(x.sumOrderAmt || 0),
  계약방법: x.cntrctMthdNm,
  조달방식: x.prcrmntMethd,
  담당: [x.deptNm, x.ofclNm, x.telNo].filter(Boolean).join(" / "),
  // 이 계획이 실제 공고로 이어졌는지. 비어 있으면 아직 안 나온 건이다.
  연결공고: String(x.bidNtceNoList || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  계획번호: x.orderPlanUntyNo,
  상세URL: x.orderPlanDtlUrl,
}));

if (asJson) {
  console.log(JSON.stringify({ 기간: `${from}~${to}`, 건수: out.length, 항목: out }, null, 2));
} else {
  console.log(`\n발주계획 ${from} ~ ${to} · ${out.length}건${minAmt ? ` (${won(minAmt)} 이상)` : ""}${instFilter ? ` · 기관 "${instFilter}"` : ""}`);
  out.slice(0, 40).forEach((x, i) => {
    console.log(`\n ${String(i + 1).padStart(2)}. ${x.사업명}`);
    console.log(`     ${x.발주기관 ?? "-"}  ·  ${x.업무구분}/${x.세부구분 ?? "-"}  ·  ${x.발주시기 ?? "-"}`);
    console.log(`     ${won(x.총발주금액)}  ·  ${x.계약방법 ?? "-"}  ·  ${x.조달방식 ?? "-"}`);
    if (x.연결공고.length) console.log(`     연결공고 ${x.연결공고.join(", ")}  → node scripts/check-bid.mjs ${x.연결공고[0].slice(0, 13)}`);
    else console.log(`     연결공고 없음 — 아직 공고 전`);
  });
  if (out.length > 40) console.log(`\n … 외 ${out.length - 40}건 (--json 으로 전체 확인)`);
}
if (errors.length) {
  console.error(`\n✖ 일부 업무구분 조회 실패:\n   ${errors.join("\n   ")}`);
  process.exit(1);
}
