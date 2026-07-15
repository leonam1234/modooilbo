"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/categories";

type IndexItem = { id: string; slug: string; title: string; category: string };

/**
 * 최근 본 기사 — 브라우저 저장(localStorage) 기반, 서버 불필요.
 * ViewBeacon이 쌓은 id 목록을 articles-index.json으로 제목 매핑. 기록 없으면 렌더 안 함.
 */
export function RecentArticles({ excludeId, count = 5 }: { excludeId?: string; count?: number }) {
  const [items, setItems] = useState<IndexItem[]>([]);

  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem("modoo_recent") || "[]");
    } catch {
      /* ignore */
    }
    ids = ids.filter((id) => id !== excludeId);
    if (ids.length === 0) return;
    fetch("/articles-index.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((list: IndexItem[] | null) => {
        if (!list) return;
        const byId = new Map(list.map((a) => [a.id, a]));
        setItems(ids.map((id) => byId.get(id)).filter(Boolean).slice(0, count) as IndexItem[]);
      })
      .catch(() => {});
  }, [excludeId, count]);

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 border-b-2 border-ink-900 pb-2 font-headline text-xl font-extrabold text-ink-900 dark:border-ink-100 dark:text-white">
        최근 본 기사
      </h2>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id}>
            <Link prefetch={false} href={`/article/${a.slug}`} className="group block">
              <h3 className="clamp-2 text-sm font-medium leading-snug text-ink-700 group-hover:text-signal-600 dark:text-ink-200">
                {a.title}
              </h3>
              <span className="mt-0.5 block text-xs text-ink-500 dark:text-ink-400">{CATEGORY_MAP[a.category as keyof typeof CATEGORY_MAP]?.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
