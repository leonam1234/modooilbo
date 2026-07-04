"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 기사 읽기 진행바 — 화면 최상단 3px, 본문(#article-body) 끝 도달 기준 진행률.
 * sticky 헤더(z-40)보다 위(z-[60])에 얹힌다.
 */
export function ReadingProgress() {
  const [p, setP] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => {
      const body = document.getElementById("article-body");
      if (!body) return;
      const rect = body.getBoundingClientRect();
      const end = rect.top + window.scrollY + rect.height - window.innerHeight;
      setP(end <= 0 ? 1 : Math.min(1, Math.max(0, window.scrollY / end)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!mounted) return null;
  // 본문 컨테이너(z-10) 스태킹 컨텍스트를 벗어나 sticky 헤더(z-40) 위에 얹히도록 body로 포털.
  return createPortal(
    <div aria-hidden className="no-print pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className="h-full bg-signal-600 transition-[width] duration-150 ease-out"
        style={{ width: `${p * 100}%` }}
      />
    </div>,
    document.body
  );
}
