"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import {
  GA4_ACTIVATION_AT,
  GA4_ACTIVATION_STATUS_URL,
  GA4_ACTIVATION_SYNC_EVENT,
  GA4_CONSENT_OPEN_EVENT,
  GA4_CONSENT_STORAGE_KEY,
  GA4_MEASUREMENT_ID,
  GA4_SCRIPT_URL,
  THIRD_PARTY_TOKEN_PATHS,
  isThirdPartyTokenPath,
  type AnalyticsConsent,
} from "@/lib/google-analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

const CONSENT_DENIED = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

const ACTIVATION_RETRY_MS = 5 * 60 * 1000;

function isActivationPayload(value: unknown): value is {
  active: boolean;
  activationAt: string;
  serverNow: string;
} {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.active === "boolean" &&
    record.activationAt === GA4_ACTIVATION_AT &&
    typeof record.serverNow === "string"
  );
}

function publishActivation(active: boolean) {
  document.documentElement.dataset.ga4Active = active ? "true" : "false";
  window.dispatchEvent(new CustomEvent(GA4_ACTIVATION_SYNC_EVENT, { detail: { active } }));
}

function sameOriginUrl(value: string | URL | null | undefined): URL | null {
  if (value == null) return null;
  try {
    const url = new URL(String(value), window.location.href);
    return url.origin === window.location.origin ? url : null;
  } catch {
    return null;
  }
}

function cleanDocumentNavigationUrl(
  value: string | URL | null | undefined,
  tokenDocument: boolean,
): URL | null {
  const url = sameOriginUrl(value);
  if (!url || url.href === window.location.href) return null;

  // Hash-only movement on the same token page does not expose the URL to a new route.
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    return null;
  }

  return tokenDocument || isThirdPartyTokenPath(url.pathname) ? url : null;
}

function eraseGoogleAnalyticsCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=", 1)[0]?.trim();
    if (!name || (name !== "_ga" && !name.startsWith("_ga_"))) continue;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${location.hostname}; SameSite=Lax`;
  }
}

const bootstrap = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied'
});
gtag('consent', 'update', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted'
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
  page_referrer: modooPageReferrer
});
`;

/**
 * Google Analytics 4 — Basic Consent Mode.
 *
 * 방침 시행 시각 전, 동의 전, 거부 후에는 gtag.js 자체를 렌더하지 않는다. 따라서
 * Advanced Consent Mode의 cookieless ping도 전송되지 않는다. 인증 토큰 경로에서는
 * blocked 상태로 유지해 저장된 허용값이 있어도 태그를 로드하지 않는다.
 */
export function GoogleAnalytics({ blocked = false }: { blocked?: boolean }) {
  const [active, setActive] = useState(false);
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [showChoice, setShowChoice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    const syncActivation = async () => {
      let enabled = false;
      try {
        const response = await fetch(GA4_ACTIVATION_STATUS_URL, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        });
        if (response.ok) {
          const payload: unknown = await response.json();
          enabled = isActivationPayload(payload) && payload.active;
        }
      } catch {
        // 서버 게이트를 확인할 수 없으면 수집하지 않는다(fail closed).
      }

      if (cancelled) return;
      setActive(enabled);
      publishActivation(enabled);
      if (!enabled) {
        setShowChoice(false);
        window[`ga-disable-${GA4_MEASUREMENT_ID}`] = true;
        retryTimer = window.setTimeout(() => void syncActivation(), ACTIVATION_RETRY_MS);
        return;
      }

      let stored: string | null = null;
      try {
        stored = localStorage.getItem(GA4_CONSENT_STORAGE_KEY);
      } catch {}
      const next: AnalyticsConsent | null =
        stored === "granted" || stored === "denied" ? stored : null;
      setConsent(next);
      setShowChoice(next === null);
      window[`ga-disable-${GA4_MEASUREMENT_ID}`] = next !== "granted";
    };

    void syncActivation();
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    // A document that originally loaded a reset/verification URL must never later enable
    // third-party code through an SPA transition. Start a clean document in both directions.
    const tokenDocument = isThirdPartyTokenPath(window.location.pathname);
    const disable = () => {
      window[`ga-disable-${GA4_MEASUREMENT_ID}`] = true;
    };
    const hardNavigate = (url: URL) => {
      disable();
      window.location.assign(url.href);
    };

    // Next Link가 토큰 경로를 SPA로 열기 전에 새 문서 탐색으로 전환한다. 이미 실행 중인
    // 분석 코드가 새 URL을 관찰할 수 있는 짧은 경쟁창까지 없애기 위한 보안 경계다.
    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (
        !(target instanceof HTMLAnchorElement) ||
        (target.target && target.target !== "_self") ||
        target.hasAttribute("download")
      ) {
        return;
      }
      const cleanUrl = cleanDocumentNavigationUrl(target.href, tokenDocument);
      if (!cleanUrl) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      hardNavigate(cleanUrl);
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    const guardedPushState: History["pushState"] = (...args) => {
      const cleanUrl = cleanDocumentNavigationUrl(args[2], tokenDocument);
      if (cleanUrl) {
        hardNavigate(cleanUrl);
        return;
      }
      originalPushState.call(window.history, args[0], args[1], args[2]);
    };
    const guardedReplaceState: History["replaceState"] = (...args) => {
      const cleanUrl = cleanDocumentNavigationUrl(args[2], tokenDocument);
      if (cleanUrl) {
        hardNavigate(cleanUrl);
        return;
      }
      originalReplaceState.call(window.history, args[0], args[1], args[2]);
    };
    const onPopState = () => {
      if (!tokenDocument && !isThirdPartyTokenPath(window.location.pathname)) return;
      disable();
      window.location.reload();
    };

    document.addEventListener("click", onDocumentClick, true);
    window.history.pushState = guardedPushState;
    window.history.replaceState = guardedReplaceState;
    window.addEventListener("popstate", onPopState, true);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", onPopState, true);
      if (window.history.pushState === guardedPushState) {
        window.history.pushState = originalPushState;
      }
      if (window.history.replaceState === guardedReplaceState) {
        window.history.replaceState = originalReplaceState;
      }
    };
  }, []);

  useEffect(() => {
    const enabled = active && !blocked && consent === "granted";
    window[`ga-disable-${GA4_MEASUREMENT_ID}`] = !enabled;
    if (!window.gtag) return;
    window.gtag("consent", "update", enabled
      ? { ...CONSENT_DENIED, analytics_storage: "granted" }
      : CONSENT_DENIED);
  }, [active, blocked, consent]);

  useEffect(() => {
    const open = () => {
      if (active && !blocked) setShowChoice(true);
    };
    window.addEventListener(GA4_CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(GA4_CONSENT_OPEN_EVENT, open);
  }, [active, blocked]);

  const choose = (next: AnalyticsConsent) => {
    const hadGrantedConsent = consent === "granted";
    try {
      localStorage.setItem(GA4_CONSENT_STORAGE_KEY, next);
    } catch {}
    setConsent(next);
    setShowChoice(false);
    window[`ga-disable-${GA4_MEASUREMENT_ID}`] = next !== "granted";

    if (next === "denied") {
      window.gtag?.("consent", "update", CONSENT_DENIED);
      eraseGoogleAnalyticsCookies();
      // 이미 로드된 tag를 완전히 제거하려면 새 문서로 다시 시작해야 한다.
      if (hadGrantedConsent) window.location.reload();
    }
  };

  const shouldLoad = active && !blocked && consent === "granted";

  return (
    <>
      {shouldLoad && (
        <>
          <Script id="ga4-consent-bootstrap" strategy="afterInteractive">
            {bootstrap}
          </Script>
          <Script
            id="ga4-loader"
            src={GA4_SCRIPT_URL}
            strategy="afterInteractive"
          />
        </>
      )}

      {active && !blocked && showChoice && (
        <aside
          aria-label="분석 쿠키 선택"
          aria-live="polite"
          className="no-print fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-3xl rounded-xl border border-ink-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-ink-700 dark:bg-ink-950/95 sm:flex sm:items-center sm:gap-5 sm:p-5"
        >
          <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200 sm:flex-1">
            국외이전·분석을 허용하면 방문 URL·유입 경로·브라우저/기기 정보와 IP·쿠키
            식별자가 이용 중 네트워크로 미국 Google LLC에 수시 이전되어 통계·콘텐츠 개선에
            이용되고, 사용자·이벤트 단위 데이터는 14개월 이내 보유됩니다. 거부해도 기사 열람
            등 기본 서비스에는 제한이 없으며, 허용 전에는 Google tag를 불러오지 않습니다.{" "}
            <Link href="/privacy/#analytics-cookies" className="font-medium underline underline-offset-2">
              자세히 보기
            </Link>
          </p>
          <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
            <button
              type="button"
              onClick={() => choose("denied")}
              className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-900"
            >
              거부
            </button>
            <button
              type="button"
              onClick={() => choose("granted")}
              className="rounded-lg bg-signal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-signal-700"
            >
              국외이전·분석 허용
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
