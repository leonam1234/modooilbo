"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Trending = { tags: string[]; label: string };

/**
 * 실시간 인기 스트립 — 속보 티커 바로 위(사이트 전체 상단).
 * /api/trending-tags(Pages Function)에서 시간당 갱신되는 상위 10개를 받는다.
 * - PC(sm+): 가로 나열 + 기준시각은 맨 우측.
 * - 모바일: 포털식 세로 롤링 티커(순위+키워드 1개씩, 3.5초) + 탭하면 전체 순위 패널.
 * 정적 미리보기/개발 서버엔 API가 없으므로 조용히 숨는다(graceful).
 */
export function TrendingTags() {
  const [data, setData] = useState<Trending | null>(null);
  const [idx, setIdx] = useState(0); // 모바일 롤링 현재 순위
  const [open, setOpen] = useState(false); // 모바일 전체 패널
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

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

  // 모바일 롤링 — 패널이 열려 있거나 탭이 숨겨져 있으면 정지
  useEffect(() => {
    if (!data || open) return;
    const t = setInterval(() => {
      if (!document.hidden) setIdx((i) => (i + 1) % data.tags.length);
    }, 3500);
    return () => clearInterval(t);
  }, [data, open]);

  // ESC로 닫기 (바깥 탭은 아래 백드롭이 흡수 — 뒤 요소 클릭 관통 방지)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!data) return null;
  const cur = data.tags[idx % data.tags.length];

  return (
    <div className="relative border-b border-ink-100 bg-white/95 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/65 dark:border-ink-800 dark:bg-ink-950/95 dark:supports-[backdrop-filter]:bg-ink-950/60">
      <div className="container-page flex items-center gap-3 py-1.5">
        <span className="shrink-0 text-xs font-bold text-ink-800 dark:text-ink-100">
          <span className="tw-live mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-breaking align-middle" />
          실시간 인기
        </span>

        {/* 모바일: 포털식 롤링 티커 — 1개씩 크게, 탭하면 전체 펼침 */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="실시간 인기 전체 보기"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left sm:hidden"
        >
          <span key={idx} className="flex min-w-0 animate-fade-up items-baseline gap-1.5">
            <span className="shrink-0 text-[15px] font-extrabold tabular-nums text-ink-900 dark:text-ink-100">
              {(idx % data.tags.length) + 1}
            </span>
            <span className="tw-chip truncate text-[15px] font-bold text-ink-800 dark:text-ink-100">#{cur}</span>
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`ml-auto h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* PC: 가로 나열(스크롤) */}
        <div className="relative hidden min-w-0 flex-1 sm:block">
          <div className="no-scrollbar fade-mask-r flex items-baseline gap-3 overflow-x-auto whitespace-nowrap">
            {data.tags.map((t, i) => (
              <Link
                prefetch={false}
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                style={{ animationDelay: `${(i % 5) * 0.35}s` }}
                className="tw-chip shrink-0 text-sm font-bold text-ink-700 transition-colors hover:text-signal-700 dark:text-ink-200"
              >
                <span className="text-xs font-semibold text-ink-300 dark:text-ink-500">{i + 1}</span>
                <span className="ml-0.5">#{t}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 기준 시각 — 맨 우측(PC 전용, 모바일은 펼침 패널 안에) */}
        <span className="hidden shrink-0 text-[11px] text-ink-400 sm:block">{data.label}</span>
      </div>

      {/* 모바일 전체 순위 패널 (+투명 백드롭: 바깥 탭 닫기, 클릭 관통 차단) */}
      {open && (
        <button
          type="button"
          aria-label="실시간 인기 닫기"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-transparent sm:hidden"
        />
      )}
      {open && (
        <div
          ref={panelRef}
          className="absolute inset-x-0 top-full z-50 border-b border-ink-100 bg-white/95 shadow-lg backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/95 sm:hidden"
        >
          <div className="container-page pb-3 pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-ink-800 dark:text-ink-100">
                실시간 인기 TOP {data.tags.length}
              </span>
              <span className="text-[11px] text-ink-400">{data.label}</span>
            </div>
            <ol className="grid grid-cols-2 gap-x-4">
              {data.tags.map((t, i) => (
                <li key={t}>
                  <Link
                    prefetch={false}
                    href={`/search?q=${encodeURIComponent(t)}`}
                    onClick={() => setOpen(false)}
                    style={{ animationDelay: `${(i % 5) * 0.35}s` }}
                    className="tw-chip flex items-baseline gap-2 py-1.5"
                  >
                    <span className="w-5 shrink-0 whitespace-nowrap text-right text-sm font-extrabold tabular-nums text-ink-900 dark:text-white">
                      {i + 1}
                    </span>
                    <span className="truncate text-[15px] font-bold text-ink-800 dark:text-ink-100">#{t}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
