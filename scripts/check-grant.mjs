#!/usr/bin/env node
/**
 * 중소기업 지원사업 공고를 조회한다(중소벤처기업부 = 기업마당 bizinfo 원천).
 *
 * 왜 필요한가: grants 기사는 매일 2편이고 대부분 기업마당·지자체 지원사업 공고다.
 * 그런데 공고 본문이 스캔 이미지이거나 첨부 PDF의 폰트 인코딩이 깨진 경우가 많다.
 * 08-07 예산 뿌리산업 기사가 그랬다 — 게시 본문이 스캔 JPG 6장이라 텍스트가 0건이었고,
 * 첨부 PDF는 pdftotext 로 뽑으니 숫자 글리프가 통째로 빠져 "단 전년도 매출액 [ ]억원
 * 미만일시 [ ] 부담"으로 나왔다. 결국 해당 영역을 4배율로 렌더링해 눈으로 읽었다.
 * 그 과정에서 "10억원 미만이면 5%"라는 조건절이 원고에서 누락된 걸 발견했다.
 *
 * 이 스크립트는 신청기간·지원대상·신청방법·문의처를 구조화된 값으로 준다.
 * 본문 조건절까지는 못 주지만(그건 여전히 공고문 원문 확인), 최소한 기사가 말하는
 * 기간·대상·방법이 원자료와 맞는지는 즉시 대조된다.
 *
 * 특히 updtPnttm(수정일시)이 있어 **발행 이후 공고가 정정됐는지** 알 수 있다.
 * 기사 발행 시각보다 수정일시가 뒤면 그 사이 공고가 바뀐 것이다.
 *
 *   node scripts/check-grant.mjs --id PBLN_000000000125183
 *   node scripts/check-grant.mjs 예산 뿌리산업
 *   node scripts/check-grant.mjs --tag 수출 --json
 *   node scripts/check-grant.mjs 창업 --since 2026-08-07     # 그 시각 이후 수정분만
 *
 * ⚠️ 공개 조회 전용.
 */
import { readKey, mask } from "./nara.mjs";

const API = "https://apis.data.go.kr/1421000/bizinfo/pblancBsnsService";

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const has = (n) => argv.includes(`--${n}`);

const id = flag("id", "");
const tag = flag("tag", "");
const since = flag("since", "");
const asJson = has("json");
const optVals = new Set(["id", "tag", "since"].map((n) => flag(n, " ")));
const keywords = argv.filter((a) => !a.startsWith("--") && !optVals.has(a));

const key = readKey();
if (!key) {
  console.error("✖ DATA_GO_KR_KEY 없음 — .dev.vars 에 넣을 것");
  process.exit(2);
}
if (!id && !tag && !keywords.length) {
  console.error("사용법: node scripts/check-grant.mjs <검색어> [--tag 해시태그] [--since YYYY-MM-DD] [--json]");
  console.error("        node scripts/check-grant.mjs --id PBLN_000000000125183");
  process.exit(2);
}

const fetched = await load();
if (fetched.error) {
  console.error(`✖ ${fetched.error}`);
  process.exit(1);
}

// ⚠️ pblancId 와 hashtags 는 서버 필터가 실제로 동작하지만, 분야(pldirSportRealmLclasCodeNm)
//    같은 파라미터는 **조용히 무시된다**(넣어도 전체 1599건이 그대로 온다).
//    나라장터 bidNtceNo·채용 instNm 과 같은 함정이라, 나머지는 여기서 거른다.
let rows = fetched.items;
if (keywords.length) {
  const re = new RegExp(keywords.join("|"));
  rows = rows.filter((x) => re.test(`${x.pblancNm ?? ""}${x.jrsdInsttNm ?? ""}${x.excInsttNm ?? ""}${x.hashtags ?? ""}`));
}
if (since) rows = rows.filter((x) => (x.updtPnttm ?? "") >= since);

console.error(`[조회] 전체 ${fetched.total}건 중 ${rows.length}건 매칭`);

const out = rows.map(shape);
if (asJson) console.log(JSON.stringify(out, null, 2));
else out.forEach(print);
process.exit(out.length ? 0 : 1);

// ── ───────────────────────────────────────────────────────

async function load() {
  const items = [];
  let total = 0;
  // id 지정이면 1건이라 한 번, 아니면 넉넉히 넘긴다(전체 1,600건 규모).
  const perPage = id ? 5 : 500;
  const maxPage = id ? 1 : 10;
  for (let page = 1; page <= maxPage; page++) {
    const q = new URLSearchParams({ dataType: "json", numOfRows: String(perPage), pageNo: String(page) });
    if (id) q.set("pblancId", id);
    if (tag) q.set("hashtags", tag);
    let j;
    try {
      const res = await fetch(`${API}?serviceKey=${key}&${q}`, { signal: AbortSignal.timeout(20000) });
      const text = await res.text();
      try {
        j = JSON.parse(text);
      } catch {
        return { error: `비JSON 응답: ${mask(text).replace(/\s+/g, " ").slice(0, 160)}` };
      }
    } catch (e) {
      return { error: `요청 실패: ${e.name}` };
    }
    const bad = j?.OpenAPI_ServiceResponse?.cmmMsgHeader;
    if (bad) return { error: `${bad.errMsg} (${bad.returnAuthMsg ?? ""})` };
    const hdr = j?.response?.header;
    if (hdr && hdr.resultCode !== "00") return { error: `resultCode=${hdr.resultCode} ${hdr.resultMsg ?? ""}` };
    const body = j?.response?.body;
    total = body?.totalCount ?? total;
    const raw = body?.items?.item;
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    items.push(...arr);
    if (arr.length < perPage) break;
  }
  return { items, total };
}

/** 사업개요가 HTML로 온다. 태그를 걷어내고 공백을 정리한다. */
function plain(s) {
  return String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function shape(x) {
  return {
    공고ID: x.pblancId,
    공고명: x.pblancNm,
    소관: x.jrsdInsttNm,
    수행기관: x.excInsttNm,
    // ⚠️ "2026-08-07 ~ 2026-08-12" 형태 문자열이며 **시각은 없다**.
    //    기사가 마감 시각(예: 18시)을 말하면 공고문 원문에서 확인해야 한다.
    신청기간: x.reqstBeginEndDe,
    지원분야: x.pldirSportRealmLclasCodeNm,
    지원대상: x.trgetNm,
    신청방법: plain(x.reqstMthPapersCn),
    문의처: x.refrncNm,
    등록일시: x.creatPnttm,
    수정일시: x.updtPnttm,
    // 등록 후 수정된 공고. 기사 발행 시각보다 뒤면 그 사이 바뀐 것이다.
    수정됨: Boolean(x.updtPnttm && x.creatPnttm && x.updtPnttm > x.creatPnttm),
    조회수: x.inqireCo ?? null,
    사업개요: plain(x.bsnsSumryCn).slice(0, 300),
    공고문: x.printFileNm || x.fileNm || null,
    공고URL: x.pblancUrl,
    신청URL: x.rceptEngnHmpgUrl || null,
  };
}

function print(r) {
  console.log(`\n══ ${r.공고ID}`);
  console.log(`   ${r.공고명}`);
  console.log(`   ${r.소관 ?? "-"} / ${r.수행기관 ?? "-"}`);
  console.log(`   신청 ${r.신청기간 ?? "-"}   분야 ${r.지원분야 ?? "-"}   대상 ${r.지원대상 ?? "-"}`);
  console.log(`   방법 ${r.신청방법 || "-"}`);
  console.log(`   문의 ${r.문의처 ?? "-"}`);
  console.log(`   등록 ${r.등록일시 ?? "-"}${r.수정됨 ? `   🚩 수정 ${r.수정일시}` : ""}`);
  if (r.공고문) console.log(`   공고문 ${r.공고문.slice(0, 56)}`);
  console.log(`   ⓘ 신청기간에 '시각'은 없다. 기사가 마감 시각을 말하면 공고문 원문 확인 필요`);
  console.log(`   ${r.공고URL}`);
}
