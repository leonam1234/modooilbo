"use client";

import { useEffect, useState } from "react";

/** 기자 구독 버튼 — 기자 프로필 헤더용. 비로그인 클릭 시 로그인 안내. */
export function SubscribeButton({ slug }: { slug: string }) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/reporter-subs?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSubscribed(!!d?.subscribed))
      .catch(() => setSubscribed(false));
  }, [slug]);

  async function toggle() {
    try {
      const r = await fetch("/api/reporter-subs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const d = await r.json();
      if (r.ok) {
        setSubscribed(!!d.subscribed);
        setMsg(null);
      } else {
        setMsg("로그인 후 구독할 수 있습니다.");
        setTimeout(() => setMsg(null), 2000);
      }
    } catch {
      /* noop */
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        disabled={subscribed === null}
        aria-pressed={!!subscribed}
        className={
          subscribed
            ? "rounded-full border border-ink-300 px-4 py-1.5 text-sm font-semibold text-ink-500 transition-colors hover:border-ink-400 dark:border-ink-600 dark:text-ink-300"
            : "rounded-full bg-ink-900 px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40 dark:bg-white dark:text-ink-900"
        }
      >
        {subscribed === null ? "…" : subscribed ? "구독중 ✓" : "+ 구독"}
      </button>
      {msg && (
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-xs text-white">
          {msg}
        </span>
      )}
    </span>
  );
}
