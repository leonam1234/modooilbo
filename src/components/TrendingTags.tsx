"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Trending = { tags: string[]; label: string };

/**
 * 실시간 인기 해시태그 스트립 — 속보 티커 바로 위(사이트 전체 상단).
 * /api/trending-tags(Pages Function)에서 시간당 갱신되는 상위 10개를 받아
 * 가로 한 줄로 표시(반짝임). 클릭 시 기존 검색(/search?q=)으로.
 * 정적 미리보기/개발 서버엔 API가 없으므로 조용히 숨는다(graceful).
 */
export function TrendingTags() {
  const [data, setData] = useState<Trending | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/trending-tags")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.tags?.length) setData(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;

  return (
    <div className="relative border-b border-ink-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-ink-800 dark:bg-ink-950/95 dark:supports-[backdrop-filter]:bg-ink-950/80">
      {/* 우측 페이드 — 가로 스크롤 가능함을 시각적으로 암시 */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white/90 to-transparent dark:from-ink-950/90" />
      <div className="container-page no-scrollbar flex items-baseline gap-3 overflow-x-auto whitespace-nowrap py-1.5">
        <span className="shrink-0 text-xs font-bold text-ink-800 dark:text-ink-100">
          <span className="tw-live mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-breaking align-middle" />
          실시간 인기
        </span>
        <span className="shrink-0 text-[11px] text-ink-400">{data.label}</span>
        <span className="mx-0.5 hidden h-3 w-px shrink-0 self-center bg-ink-200 dark:bg-ink-700 sm:block" />
        <div className="flex items-baseline gap-3">
          {data.tags.map((t, i) => (
            <Link prefetch={false}
              key={t}
              href={`/search?q=${encodeURIComponent(t)}`}
              style={{ animationDelay: `${(i % 5) * 0.35}s` }}
              className="tw-chip shrink-0 text-sm text-ink-600 transition-colors hover:text-signal-700 dark:text-ink-300"
            >
              <span className="text-xs font-semibold text-ink-300 dark:text-ink-500">{i + 1}</span>
              <span className="ml-0.5">#{t}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
