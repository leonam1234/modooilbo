"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 속보 마키(클라이언트) — 흐르는 헤드라인 + 일시정지 버튼.
 * hover 정지는 터치 기기에서 무용지물이라(QA 4인 공통 지적) 명시적 정지/재생 버튼을 둔다.
 */
export function BreakingMarquee({ items }: { items: { slug: string; title: string }[] }) {
  const [paused, setPaused] = useState(false);

  return (
    <>
      <div className="fade-mask-x group relative min-w-0 flex-1 overflow-hidden">
        <ul
          className={cn(
            "flex w-max animate-marquee items-center gap-10 group-hover:[animation-play-state:paused]",
            paused && "[animation-play-state:paused]",
          )}
        >
          {items.map((a, i) => (
            <li key={`${a.slug}-${i}`} className="shrink-0">
              <Link
                href={`/article/${a.slug}`}
                className="text-sm text-ink-600 transition-colors hover:text-signal-600 dark:hover:text-signal-400 dark:text-ink-300"
              >
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? "속보 흐름 재생" : "속보 흐름 일시정지"}
        className="-my-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 dark:text-ink-400 transition-colors hover:text-ink-700 dark:hover:text-ink-200"
      >
        {paused ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M8 5.5v13l11-6.5-11-6.5z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <rect x="7" y="5" width="3.5" height="14" rx="1" />
            <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
          </svg>
        )}
      </button>
    </>
  );
}
