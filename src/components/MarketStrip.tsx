"use client";

import { useEffect, useState } from "react";

type MarketItem = { key: string; label: string; value: number; prev: number | null };
type Data = { updated: string; items: MarketItem[] };

function fmt(n: number): string {
  return n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 경제 섹션 상단 증시·환율 스트립 — 무채색 원칙이라 등락은 색이 아닌
 * ▲▼ 기호+굵기로 구분한다. 데이터 실패 시 조용히 사라진다(점진적 향상).
 */
export function MarketStrip() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/market")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Data | null) => {
        if (d && d.items?.length) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <section
      aria-label="시장 지표"
      className="rounded-xl border border-ink-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80"
    >
      <div className="flex items-center gap-5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {data.items.map((it) => {
          const diff = it.prev !== null ? it.value - it.prev : null;
          const pct = diff !== null && it.prev ? (diff / it.prev) * 100 : null;
          const up = diff !== null && diff > 0;
          const down = diff !== null && diff < 0;
          return (
            <div key={it.key} className="flex shrink-0 items-baseline gap-2">
              <span className="text-xs font-medium text-ink-500 dark:text-ink-400">{it.label}</span>
              <span className="text-sm font-bold tabular-nums text-ink-900 dark:text-white">{fmt(it.value)}</span>
              {diff !== null && (
                <span
                  className={`text-xs tabular-nums ${
                    up
                      ? "font-semibold text-ink-900 dark:text-white"
                      : down
                        ? "text-ink-500 dark:text-ink-400"
                        : "text-ink-400"
                  }`}
                >
                  {up ? "▲" : down ? "▼" : "—"} {diff === 0 || pct === null ? "" : `${Math.abs(pct).toFixed(2)}%`}
                </span>
              )}
            </div>
          );
        })}
        <span className="ml-auto shrink-0 text-[11px] text-ink-400">{data.updated} 기준 · 지연시세</span>
      </div>
    </section>
  );
}
