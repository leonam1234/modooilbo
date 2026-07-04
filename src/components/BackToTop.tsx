"use client";

import { useEffect, useState } from "react";

/** 맨 위로 버튼 — 한 화면(700px) 이상 스크롤하면 우하단에 나타난다. */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="맨 위로"
      className="glass no-print fixed bottom-6 right-5 z-50 grid h-11 w-11 animate-[overlay-in_.2s_ease-out] place-items-center rounded-full text-ink-700 transition-colors hover:text-signal-600 dark:text-ink-100"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );
}
