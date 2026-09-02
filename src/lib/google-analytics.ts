export const GA4_MEASUREMENT_ID = "G-R2MDE3WDFY";
export const GA4_SCRIPT_URL =
  `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;

// 개인정보처리방침 개정 고지(2026-09-02)로부터 7일 뒤에 실제 수집을 시작한다.
// 실제 활성 여부는 Cloudflare Pages Function의 서버 시각으로만 판정한다. 방문자 기기의
// 날짜·시간은 신뢰하지 않는다. 9월 2일 늦은 밤 배포에도 168시간을 온전히 확보한다.
export const GA4_ACTIVATION_AT = "2026-09-10T12:00:00+09:00";
export const GA4_ACTIVATION_STATUS_URL = "/api/analytics-status";
export const GA4_CONSENT_STORAGE_KEY = "modoo-analytics-consent-v1";
export const GA4_CONSENT_OPEN_EVENT = "modoo:analytics-consent-open";
export const GA4_ACTIVATION_SYNC_EVENT = "modoo:analytics-activation";
export const THIRD_PARTY_TOKEN_PATHS = [
  "/reset",
  "/verify-signup",
  "/verify-email",
  "/forgot",
] as const;

export type AnalyticsConsent = "granted" | "denied";

export function isGa4ActiveAt(now: number): boolean {
  return now >= Date.parse(GA4_ACTIVATION_AT);
}

export function isThirdPartyTokenPath(pathname: string): boolean {
  return THIRD_PARTY_TOKEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}
