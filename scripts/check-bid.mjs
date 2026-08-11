#!/usr/bin/env node
/**
 * 나라장터 입찰공고를 공고번호로 조회해 발행 직전 게이트 값을 뽑는다.
 *
 * 왜 필요한가: bids 기사는 매일 2편씩 나가는데, 검수 항목이 전부 동적 값이다.
 * 공고 차수가 올라갔는지, 정정·취소 공고가 붙었는지, 마감·개찰 시각이 바뀌었는지,
 * 첨부가 교체됐는지 — 하나라도 놓치면 그대로 오보가 된다.
 *
 * 지금까지는 g2b.go.kr 화면을 직접 열어 확인했다. 그런데 그 페이지는 SPA라
 * curl 로 치면 sso.g2b.go.kr OIDC 로 302 되고, 그리드가 비어 보이는 렌더 아티팩트까지
 * 있어서 "값이 없다"와 "화면이 안 그려졌다"를 구분하기 어려웠다.
 * 실제로 08-06 구미 기사에서는 입찰참가자격등록 마감(bidQlfctRgstDt)을 찾으려고
 * SPA 내부 API 응답을 가로채야 했고, 첨부 PDF에는 그 시각이 아예 없었다.
 * 이 API는 같은 값을 필드로 그냥 준다.
 *
 * 핵심: inqryDiv=2 + bidNtceNo 로 조회하면 **그 공고의 전 차수**가 한 번에 온다.
 *       (-000 등록공고, -001 변경공고, -002 취소공고 …)
 *       최고차수와 정정·취소 표지를 한 번의 호출로 판정할 수 있다.
 *
 *   node scripts/check-bid.mjs R26BK01658065 R26BK01668574
 *   node scripts/check-bid.mjs --json R26BK01658065
 *
 * ⚠️ 공개 조회 전용이다. 로그인·입찰참여·서류제출은 이 스크립트로 하지 않는다.
 */
// 키 읽기·인코딩 정규화·오류 봉투 처리는 공통 모듈에 있다(함정 목록도 그쪽 헤더 참조).
// 과거 이 파일의 자체 readKey는 Decoding(88자) 키를 정규화하지 않아 이 스크립트만
// 인증 실패하는 함정이 있었다 — 반드시 nara.mjs 경유로 유지할 것.
import { SERVICES, BSNS, readKey, call } from "./nara.mjs";

const asJson = process.argv.includes("--json");
const notices = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (!notices.length) {
  console.error("사용법: node scripts/check-bid.mjs <공고번호> [공고번호…] [--json]");
  process.exit(2);
}

const key = readKey();
if (!key) {
  console.error("✖ DATA_GO_KR_KEY 없음 — .dev.vars 에 넣을 것(값은 커밋되지 않는다)");
  process.exit(2);
}

const out = [];
for (const no of notices) out.push(await lookup(no));

if (asJson) {
  console.log(JSON.stringify(out, null, 2));
} else {
  for (const r of out) printReport(r);
}
// 조회 자체가 실패한 건이 있으면 비정상 종료 — 검수 파이프라인이 조용히 넘어가지 않게.
process.exit(out.some((r) => r.error) ? 1 : 0);

// ── helpers ───────────────────────────────────────────────

async function lookup(bidNtceNo) {
  // 업무구분(용역/물품/공사/외자)을 공고번호만으론 모르므로 흔한 순서로 훑는다 — nara.BSNS.
  for (const [bsns, suffix] of BSNS) {
    const r = await call(SERVICES.bid, `getBidPblancListInfo${suffix}`, { inqryDiv: "2", bidNtceNo }, key);
    if (r.error) return { bidNtceNo, error: r.error };
    // 다른 업무구분 조회는 공고번호를 무시하고 최근 목록을 돌려주는 경우가 있다.
    // 번호가 실제로 일치하는 건만 취한다 — 이걸 안 걸러 세 공고가 같은 결과로 보인 적 있다.
    const hit = r.items.filter((x) => x.bidNtceNo === bidNtceNo);
    if (hit.length) return summarize(bidNtceNo, bsns, hit);
  }
  return { bidNtceNo, error: "네 업무구분 어디에서도 조회되지 않음(번호 오기 또는 비공개 공고)" };
}

function summarize(bidNtceNo, bsns, rows) {
  rows.sort((a, b) => String(a.bidNtceOrd).localeCompare(String(b.bidNtceOrd)));
  const latest = rows[rows.length - 1];
  return {
    bidNtceNo,
    업무구분: bsns,
    공고명: latest.bidNtceNm,
    발주기관: latest.ntceInsttNm,
    최고차수: latest.bidNtceOrd,
    차수이력: rows.map((x) => ({ 차수: x.bidNtceOrd, 종류: x.ntceKindNm, 게시: x.bidNtceDt })),
    // 아래 셋이 발행을 막는 신호다.
    취소됨: rows.some((x) => String(x.ntceKindNm).includes("취소")),
    변경있음: rows.some((x) => String(x.ntceKindNm).includes("변경")),
    재공고: latest.reNtceYn === "Y",
    긴급: latest.bidNtceNm?.includes("긴급") || latest.intrbidYn === "Y",
    // ⚠️ 금액 필드는 라벨을 섞지 마라(2026-08-11 정정). 종전에 asignBdgtAmt 를
    //    "기초금액"으로 찍는 바람에 정상 원고 2건이 값 불일치로 오인될 뻔했다.
    //      presmptPrce  추정가격   — 부가세 제외
    //      asignBdgtAmt 배정예산   — 통상 부가세 포함
    //      bssamt       기초금액   — 용역 공고에서는 비어 있는 경우가 많다
    //    공고문이 말하는 "기초금액"은 대개 추정가격+부가세라서 배정예산과 같거나 가깝다.
    //    원고와 대조할 때는 세 값을 다 보고 어느 것을 인용했는지 판단해야 한다.
    추정가격: latest.presmptPrce || null,
    배정예산: latest.asignBdgtAmt || null,
    기초금액: latest.bssamt || null,
    입찰참가자격등록마감: latest.bidQlfctRgstDt || null, // 화면에만 있고 첨부 공고문엔 없는 값
    입찰개시: latest.bidBeginDt || null,
    입찰마감: latest.bidClseDt || null,
    개찰: latest.opengDt || null,
    낙찰방법: latest.sucsfbidMthdNm || null,
    계약방법: latest.cntrctCnclsMthdNm || null,
    공동수급: latest.cmmnSpldmdMethdNm || null,
    첨부: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      .map((i) => latest[`ntceSpecFileNm${i}`])
      .filter((v) => v && String(v).trim()),
    공고URL: latest.bidNtceDtlUrl || latest.bidNtceUrl || null,
  };
}

function printReport(r) {
  console.log(`\n══ ${r.bidNtceNo} ${r.error ? "" : `(${r.업무구분})`}`);
  if (r.error) return console.log(`   ✖ ${r.error}`);
  console.log(`   ${r.공고명}`);
  console.log(`   발주  ${r.발주기관}`);
  const flags = [
    r.취소됨 ? "🚩 취소공고 있음" : null,
    r.변경있음 ? "🚩 변경공고 있음" : null,
    r.재공고 ? "재공고" : null,
    r.긴급 ? "긴급" : null,
  ].filter(Boolean);
  console.log(`   최고차수 ${r.최고차수}${flags.length ? "  ·  " + flags.join(" · ") : ""}`);
  if (r.차수이력.length > 1) {
    console.log(`   차수이력 ${r.차수이력.map((h) => `-${h.차수}(${h.종류})`).join(" → ")}`);
  }
  console.log(`   자격등록마감 ${r.입찰참가자격등록마감 ?? "-"}`);
  console.log(`   입찰 ${r.입찰개시 ?? "-"} ~ ${r.입찰마감 ?? "-"}   개찰 ${r.개찰 ?? "-"}`);
  const won = (v) => (v ? Number(v).toLocaleString() + "원" : "-");
  console.log(`   추정가격(VAT제외) ${won(r.추정가격)}   배정예산 ${won(r.배정예산)}   기초금액 ${won(r.기초금액)}`);
  console.log(`   ${r.계약방법 ?? ""} ${r.공동수급 ?? ""}`);
  console.log(`   첨부 ${r.첨부.length}건${r.첨부.length ? ": " + r.첨부.map((f) => f.slice(0, 30)).join(" / ") : ""}`);
}
