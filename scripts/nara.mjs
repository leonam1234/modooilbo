/**
 * 나라장터 오픈API 공통 모듈. 세 서비스가 같은 인증키를 쓰지만 규칙이 제각각이라
 * 각 스크립트가 따로 학습하지 않도록 여기 모아 둔다.
 *
 * 이 파일을 만들게 된 함정들(전부 실제로 걸렸다):
 *  1) 인증키를 encodeURIComponent 로 다시 감싸면 이중 인코딩으로 인증이 깨진다.
 *     포털이 주는 값은 이미 URL 인코딩된 형태다. 반대로 Decoding 형태(88자)를 받았다면
 *     반드시 인코딩해야 한다. 그래서 키를 넣을 때 형태를 판별해 한 번만 맞춘다.
 *  2) 서비스마다 경로가 /ad/ 와 /ao/ 로 갈린다. 틀리면 NO_OPENAPI_SERVICE_ERROR 가 뜨는데,
 *     이건 "권한 없음"이 아니라 "그런 주소가 없음"이다. 혼동하면 신청이 안 된 줄 안다.
 *  3) 날짜 파라미터 이름과 자릿수가 서비스마다 다르다.
 *     입찰공고 inqryBgnDt=YYYYMMDDHHmm(12) / 발주계획 inqryBgnDate=YYYYMMDD(8).
 *     틀리면 resultCode=08 "필수값 입력 에러"가 나는데 이것도 권한 문제로 오해하기 쉽다.
 *  4) 입찰공고 목록계 오퍼레이션(...PPSSrch)은 bidNtceNo 를 조용히 무시하고 최근 목록을
 *     돌려준다. 번호가 실제 일치하는 건만 걸러야 한다.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const SERVICES = {
  bid: "https://apis.data.go.kr/1230000/ad/BidPublicInfoService",
  contract: "https://apis.data.go.kr/1230000/ao/CntrctProcssIntgOpenService",
  orderPlan: "https://apis.data.go.kr/1230000/ao/OrderPlanSttusService",
};

/** 업무구분 접미사. 공고번호만으로는 구분을 모르므로 흔한 순서로 훑는다. */
export const BSNS = [
  ["용역", "Servc"],
  ["물품", "Thng"],
  ["공사", "Cnstwk"],
  ["외자", "Frgcpt"],
];

/**
 * .dev.vars 우선, 없으면 환경변수. 값은 어디에도 출력하지 않는다.
 * 포털이 Encoding(%2B 포함, 106자)과 Decoding(88자) 두 형태를 보여주므로 어느 쪽이 와도 되게 한다.
 */
export function readKey() {
  const raw =
    process.env.DATA_GO_KR_KEY?.trim() ||
    (() => {
      try {
        return readFileSync(join(ROOT, ".dev.vars"), "utf8").match(/^DATA_GO_KR_KEY=(\S+)/m)?.[1] ?? null;
      } catch {
        return null;
      }
    })();
  if (!raw) return null;
  // 이미 인코딩된 형태면 그대로, 아니면 한 번만 인코딩한다.
  return /%[0-9A-Fa-f]{2}/.test(raw) ? raw : encodeURIComponent(raw);
}

/** 오류 메시지에 인증키가 섞여 나가지 않게 한다. */
export const mask = (s) => String(s).replace(/serviceKey=[^&"<\s]*/gi, "serviceKey=***");

/**
 * 공통 호출. 성공하면 items 배열을, 실패하면 { error } 를 돌려준다.
 * 나라장터는 오류를 세 가지 봉투로 내보낸다(response.header / cmmMsgHeader / ResponseError).
 * 하나만 보면 "정상인데 결과 0건"과 "권한 없음"을 구분하지 못한다.
 */
export async function call(base, op, params, key) {
  const qs = new URLSearchParams({ type: "json", numOfRows: "50", pageNo: "1", ...params });
  const url = `${base}/${op}?serviceKey=${key}&${qs}`;
  let text;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    text = await res.text();
  } catch (e) {
    return { error: `요청 실패: ${e.name}` };
  }
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    return { error: `비JSON 응답: ${mask(text).replace(/\s+/g, " ").slice(0, 160)}` };
  }
  const bad = j?.OpenAPI_ServiceResponse?.cmmMsgHeader;
  if (bad) return { error: `${bad.errMsg} (${bad.returnAuthMsg ?? ""})` };
  const hdr = j?.response?.header ?? j?.["nkoneps.com.response.ResponseError"]?.header;
  if (hdr && hdr.resultCode !== "00") return { error: `resultCode=${hdr.resultCode} ${hdr.resultMsg ?? ""}` };
  const raw = j?.response?.body?.items;
  return { items: Array.isArray(raw) ? raw : raw ? [raw] : [], total: j?.response?.body?.totalCount ?? 0 };
}

export const won = (v) => (v && Number(v) ? Number(v).toLocaleString() + "원" : "-");
