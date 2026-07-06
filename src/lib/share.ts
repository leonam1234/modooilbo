/** 기사 공유 유틸 — 컴포넌트(ArticleActions)에서 로직 분리(관심사 분리). */

// 카카오 JavaScript 키 — 공개용(브라우저 노출 전제 설계, 카카오 콘솔의 플랫폼 도메인 등록으로 보호).
// 비밀키(REST/Client Secret)는 서버 시크릿에만 있음.
const KAKAO_JS_KEY = "dcba680be763b1980fab764f42acf6b6";
const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

/** 카카오톡 공유 — SDK 지연 로드 후 현재 페이지 스크랩 공유. */
export function shareKakao(): void {
  const w = window as any;
  const doShare = () => {
    try {
      if (!w.Kakao.isInitialized()) w.Kakao.init(KAKAO_JS_KEY);
      w.Kakao.Share.sendScrap({ requestUrl: window.location.href });
    } catch {
      /* 팝업 차단 등 — 조용히 무시 */
    }
  };
  if (w.Kakao?.Share) {
    doShare();
    return;
  }
  const s = document.createElement("script");
  s.src = KAKAO_SDK_URL;
  s.async = true;
  s.onload = doShare;
  document.head.appendChild(s);
}

/** X(트위터)/페이스북 공유 팝업. */
export function shareSns(network: "x" | "f", title: string): void {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(title);
  const href =
    network === "x"
      ? `https://twitter.com/intent/tweet?text=${text}&url=${url}`
      : `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  window.open(href, "_blank", "noopener,width=600,height=500");
}
