"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Trending = { tags: string[]; label: string };

/**
 * 인기 해시태그 — 검색창 하단. /api/trending-tags(Pages Function)에서
 * 시간당 갱신되는 상위 10개를 받아 표시. 클릭 시 기존 검색(/search?q=)으로.
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
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">인기 해시태그</span>
        <span className="text-xs text-ink-400">{data.label}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {data.tags.map((t, i) => (
          <Link
            key={t}
            href={`/search?q=${encodeURIComponent(t)}`}
            className="inline-flex items-center gap-1 rounded-full border border-ink-200 px-3 py-1 text-sm text-ink-600 transition-colors hover:border-signal-400 hover:text-signal-700 dark:border-ink-700 dark:text-ink-300"
          >
            <span className="text-xs font-semibold text-ink-300 dark:text-ink-500">{i + 1}</span>
            <span>#{t}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
