"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 스크롤 진입 페이드업 래퍼 — 뷰포트 아래에 있던 블록이 화면에 들어올 때 한 번 fade-up.
 * 서버 렌더/JS 미동작 시엔 항상 보이는 상태가 기본(숨김은 마운트 후에만 적용) → SEO·no-JS 안전.
 * prefers-reduced-motion은 globals.css 전역 규칙이 자동 커버.
 */
export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // 이미 화면 안(또는 위)이면 그대로 두고, 화면 아래 블록만 숨겼다가 등장시킨다.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    setState("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        state === "hidden" && "opacity-0",
        state === "shown" && "animate-fade-up",
        className
      )}
    >
      {children}
    </div>
  );
}
