"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TrendingIcon } from "./icons";

type Item = { id: string; slug: string; title: string; category: CategorySlug };

/**
 * 실시간 많이 본 뉴스.
 * SSR/초기 = 서버가 넘긴 pool 순서(정적 fallback). 마운트 후 /api/most-read(실제 조회수)로
 * 재정렬. API 없거나 실패하면 초기 순서 유지(graceful).
 */
export function RankingList({ pool, count = 6 }: { pool: Item[]; count?: number }) {
  const [ranked, setRanked] = useState<Item[] | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/most-read")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.items?.length) return;
        const byId = new Map(pool.map((p) => [p.id, p]));
        const ord: Item[] = d.items.map((x: { id: string }) => byId.get(x.id)).filter(Boolean);
        const seen = new Set(ord.map((p) => p.id));
        for (const p of pool) {
          if (ord.length >= count) break;
          if (!seen.has(p.id)) {
            ord.push(p);
            seen.add(p.id);
          }
        }
        setRanked(ord.slice(0, count));
        if (d.label) setLabel(d.label);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pool, count]);

  const items = ranked ?? pool.slice(0, count);

  return (
    <section>
      <div className="mb-4 flex items-center gap-2 border-b-2 border-ink-900 pb-2 dark:border-ink-100">
        <TrendingIcon className="h-5 w-5 text-signal-600" />
        <h2 className="font-headline text-xl font-extrabold text-ink-900 dark:text-white">많이 본 뉴스</h2>
        {label && <span className="ml-auto text-[11px] font-normal text-ink-400">{label}</span>}
      </div>
      <ol className="space-y-3.5">
        {items.map((a, i) => (
          <li key={a.id} className="flex gap-3">
            <span
              className={cn(
                "w-6 shrink-0 font-headline text-xl font-black leading-none",
                i < 3 ? "text-signal-600" : "text-ink-300 dark:text-ink-600",
              )}
            >
              {i + 1}
            </span>
            <Link href={`/article/${a.slug}`} className="group flex-1">
              <h3 className="clamp-2 text-sm font-semibold leading-snug text-ink-800 group-hover:text-signal-600 dark:text-ink-100">
                {a.title}
              </h3>
              <span className="mt-1 block text-xs text-ink-400">{CATEGORY_MAP[a.category]?.name}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
