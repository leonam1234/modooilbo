"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  GA4_ACTIVATION_SYNC_EVENT,
  GA4_CONSENT_OPEN_EVENT,
  isThirdPartyTokenPath,
} from "@/lib/google-analytics";

export function AnalyticsConsentSettings() {
  const [active, setActive] = useState(false);
  const pathname = usePathname() || "/";

  useEffect(() => {
    const syncFromDocument = () => {
      setActive(document.documentElement.dataset.ga4Active === "true");
    };
    const onActivation = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: unknown }>).detail;
      setActive(detail?.active === true);
    };
    syncFromDocument();
    window.addEventListener(GA4_ACTIVATION_SYNC_EVENT, onActivation);
    return () => window.removeEventListener(GA4_ACTIVATION_SYNC_EVENT, onActivation);
  }, []);

  if (!active || isThirdPartyTokenPath(pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(GA4_CONSENT_OPEN_EVENT))}
      className="underline underline-offset-2 hover:text-signal-600 dark:hover:text-signal-400"
    >
      분석 쿠키 설정
    </button>
  );
}
