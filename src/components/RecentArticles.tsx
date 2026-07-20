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
    // localStorage는 신뢰할 수 없는 입력이다. `5`·`"abc"`·`{}` 같은 "유효한 JSON 비배열"이
    // 들어 있으면 파싱은 통과하므로, 파싱 성공/실패가 아니라 **모양**을 직접 좁혀야 한다.
    // (예전엔 any로 받아 string[]로 통과시킨 뒤 아래 filter에서 TypeError로 터졌다)
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(localStorage.getItem("modoo_recent") || "[]");
    } catch {
      /* 손상된 값 → 빈 목록으로 처리 */
    }
    const ids = (Array.isArray(parsed) ? parsed : [])
      .filter((id): id is string => typeof id === "string")
      .filter((id) => id !== excludeId);
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
              <h3 className="clamp-2 text-sm font-medium leading-snug text-ink-700 group-hover:text-signal-600 dark:group-hover:text-signal-400 dark:text-ink-200">
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
