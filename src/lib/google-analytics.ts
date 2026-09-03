export const GA4_MEASUREMENT_ID = "G-R2MDE3WDFY";
export const GA4_SCRIPT_URL =
  `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;

// 운영자 승인에 따라 2026-09-03 09:30 KST부터 동의 선택창을 활성화한다.
// 실제 활성 여부는 Cloudflare Pages Function의 서버 시각으로만 판정하며, 방문자 기기의
// 날짜·시간은 신뢰하지 않는다. 공개 페이지의 태그는 기본 denied로 로드하고 분석 저장소는
// 이용자가 명시적으로 허용한 뒤에만 granted로 갱신한다.
export const GA4_ACTIVATION_AT = "2026-09-03T09:30:00+09:00";
export const GA4_ACTIVATION_STATUS_URL = "/api/analytics-status";
export const GA4_CONSENT_STORAGE_KEY = "modoo-analytics-consent-v1";
export const GA4_CONSENT_OPEN_EVENT = "modoo:analytics-consent-open";
export const GA4_ACTIVATION_SYNC_EVENT = "modoo:analytics-activation";
export const GA4_BOOTSTRAP_ID = "ga4-consent-bootstrap";
export const GA4_LOADER_ID = "ga4-loader";
export const THIRD_PARTY_TOKEN_PATHS = [
  "/reset",
  "/verify-signup",
  "/verify-email",
  "/forgot",
] as const;

export type AnalyticsConsent = "granted" | "denied";

// Google tag 검사기가 초기 HTML에서 설치를 확인할 수 있도록 공개 페이지의 <head>에
// 직접 삽입한다. Consent Mode v2 기본값은 서버 게이트 확인 전 항상 denied이고,
// 초기 page_view는 클라이언트가 서버 활성 상태와 저장 동의를 확인한 뒤 한 번 보낸다.
// 인증 토큰 경로에서는
// Cloudflare Pages middleware가 이 스크립트와 Flight 복제 노드를 응답에서 제거한다.
export const GA4_HEAD_BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
});
gtag('js', new Date());
var modooPageReferrer = document.referrer;
try {
  var modooReferrerUrl = new URL(modooPageReferrer);
  var modooTokenPaths = ${JSON.stringify(THIRD_PARTY_TOKEN_PATHS)};
  if (modooReferrerUrl.origin === location.origin && modooTokenPaths.some(function(path) {
    return modooReferrerUrl.pathname === path || modooReferrerUrl.pathname.indexOf(path + '/') === 0;
  })) {
    modooPageReferrer = '';
  }
} catch (error) {}
gtag('config', '${GA4_MEASUREMENT_ID}', {
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  page_referrer: modooPageReferrer,
  send_page_view: false
});
`;

export function isGa4ActiveAt(now: number): boolean {
  return now >= Date.parse(GA4_ACTIVATION_AT);
}

export function isThirdPartyTokenPath(pathname: string): boolean {
  return THIRD_PARTY_TOKEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}
