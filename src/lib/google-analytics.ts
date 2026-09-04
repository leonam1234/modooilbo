/**
 * Google 태그(gtag.js) / GA4 상수.
 *
 * 태그는 `src/app/layout.tsx` 의 `<head>` 첫 자리에 **조건 없이, 구글이 준 표준 스니펫 그대로**
 * 들어간다(부트스트랩 인라인 → async 로더). 구글의 "태그 감지"는 초기 HTML 과 로드 직후의
 * 히트를 보므로, 동의 게이트·시간 게이트·지연 주입으로 바꾸면 감지에 잡히지 않는다
 * (2026-09-03 실측: 동의 후에만 page_view 를 보내는 Consent Mode 구성은 배포 뒤에도
 * "감지되지 않았습니다"였고, 동의를 누른 방문자만 집계돼 트래픽 근거로도 못 쓴다).
 * 한국 개인정보보호법상 분석 쿠키는 처리방침 고지로 충분하다(/privacy §5·§6·§8).
 *
 * 인증 토큰 착지 경로(비밀번호 재설정·가입 확인·이메일 인증)는 두 겹으로 막는다:
 *   1) Cloudflare Pages middleware(functions/_lib/strip-token-third-party-scripts.ts)가
 *      응답에서 이 두 태그(id 기준)와 Flight 복제 노드를 제거한다 — 운영 경로의 방어선.
 *   2) 아래 부트스트랩이 같은 경로 목록으로 `gtag('config')` 를 건너뛰고 ga-disable 을 켠다 —
 *      middleware 가 없는 로컬 정적 미리보기나 회귀 시의 안전판. GA4 는 page_location 에
 *      전체 URL 을 실어 보내므로 `?token=` 이 그대로 구글로 나가면 안 된다.
 *
 * ⚠️ 태그 id 두 개(`ga4-consent-bootstrap`·`ga4-loader`)는 middleware 선택자에 박혀 있다.
 *    바꾸려면 functions/_lib/strip-token-third-party-scripts.ts 와 테스트를 같이 바꿀 것.
 *    "consent" 라는 이름은 이전 구성의 흔적일 뿐이고 지금은 동의 로직이 없다.
 */
export const GA4_MEASUREMENT_ID = "G-R2MDE3WDFY";
export const GA4_SCRIPT_URL =
  `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
export const GA4_BOOTSTRAP_ID = "ga4-consent-bootstrap";
export const GA4_LOADER_ID = "ga4-loader";

/** 비밀번호 재설정·가입 확인·이메일 인증 등 1회성 토큰이 URL 에 실리는 경로. */
export const THIRD_PARTY_TOKEN_PATHS = [
  "/reset",
  "/verify-signup",
  "/verify-email",
  "/forgot",
] as const;

export function isThirdPartyTokenPath(pathname: string): boolean {
  return THIRD_PARTY_TOKEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}

/**
 * 내부 트래픽 쿠키(2026-09-03). 대표·코덱스·검사 도구의 브라우저가 GA4·Clarity·조회수에 잡히지
 * 않게 한다. GA 관리자의 IP 필터는 IP 가 바뀌면 새는데, 쿠키는 브라우저에 붙어 다닌다.
 * 켜는 법: 아무 페이지나 `?modoo-internal=1` 을 붙여 한 번 열면 1년짜리 쿠키가 생긴다.
 * 스모크 도구(scripts/mobile-smoke.mjs)는 컨텍스트에 이 쿠키를 직접 심는다.
 * 서버(/api/view)도 같은 쿠키를 본다. 비밀값이 아니므로 Secure 없이 두어 로컬 미리보기에서도 동작한다.
 */
export const INTERNAL_TRAFFIC_COOKIE = "modoo_internal";
export function hasInternalTrafficCookie(cookie: string): boolean {
  return new RegExp(`(^|;\\s*)${INTERNAL_TRAFFIC_COOKIE}=1(;|$)`).test(cookie || "");
}

// 구글 표준 스니펫(dataLayer 초기화 → gtag('js') → gtag('config')) + 토큰 경로·내부 트래픽 안전판.
// 광고 신호·광고 개인화 신호는 끈다(GA 는 방문 통계 용도이고 애드센스는 별도 태그다).
// 토큰 경로에서 넘어온 같은 오리진 referrer 는 지운다 — 그 URL 에도 토큰이 붙어 있다.
export const GA4_HEAD_BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
var modooTokenPaths = ${JSON.stringify(THIRD_PARTY_TOKEN_PATHS)};
function modooIsTokenPath(pathname) {
  return modooTokenPaths.some(function (path) {
    return pathname === path || pathname.indexOf(path + '/') === 0;
  });
}
var modooInternal = /(^|;\\s*)${INTERNAL_TRAFFIC_COOKIE}=1(;|$)/.test(document.cookie || '');
if (!modooInternal && /[?&]modoo-internal=1(&|$)/.test(location.search)) {
  document.cookie = '${INTERNAL_TRAFFIC_COOKIE}=1; Max-Age=31536000; Path=/; SameSite=Lax';
  modooInternal = true;
}
if (modooIsTokenPath(location.pathname) || modooInternal) {
  window['ga-disable-${GA4_MEASUREMENT_ID}'] = true;
} else {
  gtag('js', new Date());
  var modooPageReferrer = document.referrer;
  try {
    var modooReferrerUrl = new URL(modooPageReferrer);
    if (modooReferrerUrl.origin === location.origin && modooIsTokenPath(modooReferrerUrl.pathname)) {
      modooPageReferrer = '';
    }
  } catch (error) {}
  gtag('config', '${GA4_MEASUREMENT_ID}', {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_referrer: modooPageReferrer
  });
}
`;
