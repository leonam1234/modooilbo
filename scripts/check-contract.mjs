#!/usr/bin/env node
/**
 * 입찰공고번호로 조달 전 과정(사전규격 → 공고 → 낙찰 → 계약)을 추적한다.
 *
 * 왜 필요한가: bids 기사는 공고 시점만 보도하고 끝난다. 그 공고가 실제로 어떻게
 * 마무리됐는지 — 누가 얼마에 따냈는지, 유찰됐는지, 계약이 바뀌었는지 — 는 독자에게
 * 전달되지 않는다. 이 스크립트가 후속 기사의 출발점이다.
 *
 * 또 하나. 이미 나간 기사가 틀어지는 경우도 여기서 잡힌다. 공고가 유찰돼 재공고로
 * 넘어가면 앞선 기사의 마감·개찰 정보가 죽은 값이 된다.
 *
 *   node scripts/check-contract.mjs R26BK01658065
 *   node scripts/check-contract.mjs --json R26BK01658065 R26BK01668574
 *
 * ⚠️ 이 API는 기간 조회를 지원하지 않는다. 번호를 알고 있을 때만 쓴다.
 *    (inqryDiv=2 + 날짜로 부르면 오류 없이 0건이 와서 "계약이 없다"로 오해하기 쉽다)
 * ⚠️ 공개 조회 전용. 로그인·입찰참여는 하지 않는다.
 */
import { SERVICES, BSNS, readKey, call, won } from "./nara.mjs";

const asJson = process.argv.includes("--json");
const notices = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (!notices.length) {
  console.error("사용법: node scripts/check-contract.mjs <입찰공고번호> [번호…] [--json]");
  process.exit(2);
}
const key = readKey();
if (!key) {
  console.error("✖ DATA_GO_KR_KEY 없음 — .dev.vars 에 넣을 것");
  process.exit(2);
}

const out = [];
for (const no of notices) out.push(await trace(no));

if (asJson) console.log(JSON.stringify(out, null, 2));
else out.forEach(print);
process.exit(out.some((r) => r.error) ? 1 : 0);

// ── ───────────────────────────────────────────────────────

async function trace(bidNtceNo) {
  for (const [bsns, suffix] of BSNS) {
    const r = await call(SERVICES.contract, `getCntrctProcssIntgOpen${suffix}`, { inqryDiv: "1", bidNtceNo }, key);
    if (r.error) return { bidNtceNo, error: r.error };
    // 다른 업무구분에서도 200이 오지만 items 가 비거나 번호가 다르다. 실제 일치만 취한다.
    const hit = r.items.filter((x) => x.bidNtceNo === bidNtceNo);
    if (hit.length) return summarize(bidNtceNo, bsns, hit[0]);
  }
  return { bidNtceNo, error: "네 업무구분 어디에서도 조회되지 않음(번호 오기 또는 비공개)" };
}

function summarize(bidNtceNo, bsns, x) {
  const winners = normalize(x.bidwinrInfoList);
  const contracts = normalize(x.cntrctInfoList);
  return {
    bidNtceNo,
    업무구분: bsns,
    공고명: x.bidNtceNm || null,
    수요기관: x.bidDminsttNm || null,
    입찰방식: x.bidMthdNm || null,
    계약방법: x.cntrctCnclsMthdNm || null,
    공고일시: x.bidNtceDt || null,
    // 앞단(있으면 계획→규격→공고 연결이 확인된다)
    발주계획: x.orderBizNm ? { 사업명: x.orderBizNm, 기관: x.orderInsttNm, 시기: x.orderYm, 조달방식: x.prcrmntMethdNm } : null,
    사전규격: x.bfSpecRgstNo ? { 등록번호: x.bfSpecRgstNo, 사업명: x.bfSpecBizNm, 의견마감: x.opninRgstClseDt } : null,
    // 뒷단 — 개찰 전에는 비어 있는 게 정상이다. 비었다고 오류로 보고하지 말 것.
    낙찰자: winners,
    계약: contracts,
    진행단계: contracts.length ? "계약체결" : winners.length ? "낙찰자결정" : "공고중",
  };
}

/** 응답이 배열/단일객체/문자열 어느 쪽으로도 오므로 배열로 통일한다. */
function normalize(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "object") return [v];
  return String(v).trim() ? [{ 원문: String(v) }] : [];
}

function print(r) {
  console.log(`\n══ ${r.bidNtceNo}${r.error ? "" : ` (${r.업무구분}) · ${r.진행단계}`}`);
  if (r.error) return console.log(`   ✖ ${r.error}`);
  console.log(`   ${r.공고명}`);
  console.log(`   수요기관 ${r.수요기관 ?? "-"}   ${r.입찰방식 ?? ""} ${r.계약방법 ?? ""}`);
  if (r.발주계획) console.log(`   발주계획 ${r.발주계획.사업명} (${r.발주계획.기관 ?? "-"}, ${r.발주계획.시기 ?? "-"})`);
  if (r.사전규격) console.log(`   사전규격 ${r.사전규격.등록번호}  의견마감 ${r.사전규격.의견마감 ?? "-"}`);
  if (!r.낙찰자.length && !r.계약.length) {
    console.log(`   낙찰·계약 정보 없음 — 아직 개찰 전이거나 미체결(정상)`);
    return;
  }
  r.낙찰자.forEach((w) =>
    console.log(`   낙찰 ${w.bidwinnrNm ?? w.corpNm ?? JSON.stringify(w).slice(0, 60)}  ${won(w.sucsfbidAmt ?? w.bidwinnrAmt)}`),
  );
  r.계약.forEach((c) =>
    console.log(`   계약 ${c.cntrctNm ?? c.cntrctInsttNm ?? JSON.stringify(c).slice(0, 60)}  ${won(c.cntrctAmt ?? c.totCntrctAmt)}`),
  );
}
