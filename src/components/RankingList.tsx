"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TrendingIcon } from "./icons";

type Item = { id: string; slug: string; title: string; category: CategorySlug };
type Counted = Item & { count?: number };
type TabId = "read" | "commented";

// ARIA 탭 계약용 상수 — role="tablist"를 선언했으면 aria-controls로 가리킬 tabpanel과
// 좌우 화살표 이동·roving tabindex까지 갖춰야 실제로 탭처럼 동작한다.
const TABS: { id: TabId; label: string }[] = [
  { id: "read", label: "많이 본" },
  { id: "commented", label: "댓글 많은" },
];
const PANEL_ID = "ranking-panel";
const tabId = (t: TabId) => `ranking-tab-${t}`;

/**
 * 실시간 랭킹 사이드바 — 탭 2개(많이 본 / 댓글 많은).
 * 많이 본: SSR/초기 = 서버가 넘긴 pool 순서(정적 fallback), 마운트 후 /api/most-read로 재정렬.
 * 댓글 많은: /api/most-commented (댓글 수 뱃지 표시). 데이터 없으면 안내 문구.
 */
export function RankingList({ pool, count = 6 }: { pool: Item[]; count?: number }) {
  const [tab, setTab] = useState<TabId>("read");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ranked, setRanked] = useState<Item[] | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [commented, setCommented] = useState<Counted[] | null>(null);

  useEffect(() => {
    let alive = true;
    const byId = new Map(pool.map((p) => [p.id, p]));

    fetch("/api/most-read")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.items?.length) return;
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

    fetch("/api/most-commented")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const ord: Counted[] = (d?.items ?? [])
          .map((x: { id: string; count: number }) => {
            const a = byId.get(x.id);
            return a ? { ...a, count: x.count } : null;
          })
          .filter(Boolean) as Counted[];
        setCommented(ord.slice(0, count));
      })
      .catch(() => setCommented([]));

    return () => {
      alive = false;
    };
  }, [pool, count]);

  const items: Counted[] = tab === "read" ? (ranked ?? pool.slice(0, count)) : (commented ?? []);
  const commentedLoading = tab === "commented" && commented === null;

  const tabCls = (active: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm font-bold transition-colors",
      active
        ? "bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white"
        : "text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100",
    );

  // ←/→(및 Home/End)로 탭 이동 — 탭 목록 안에서는 Tab 키가 아니라 화살표로 움직이는 것이 ARIA 규약
  const onTabKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next === -1) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  return (
    <section>
      <div className="mb-4 flex items-center gap-2.5 border-b-2 border-ink-900 pb-2.5 dark:border-ink-100">
        <TrendingIcon className="h-5 w-5 shrink-0 text-signal-600 dark:text-signal-400" />
        {/* iOS식 유리 세그먼트 탭 */}
        <div className="glass flex rounded-full p-0.5" role="tablist" aria-label="랭킹 종류" onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={tabId(t.id)}
              aria-selected={tab === t.id}
              aria-controls={PANEL_ID}
              // roving tabindex: 탭 목록 전체가 Tab 정지점 1개로 동작해야 한다
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={tabCls(tab === t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "read" && label && <span className="ml-auto text-[11px] font-normal text-ink-500 dark:text-ink-400">{label}</span>}
      </div>
      {/* 선택된 탭의 내용만 이 하나의 패널에 갈아 끼운다(aria-labelledby가 현재 탭을 가리킴) */}
      <div id={PANEL_ID} role="tabpanel" aria-labelledby={tabId(tab)} tabIndex={0}>
        {commentedLoading ? (
          <div className="space-y-3.5" aria-hidden>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex animate-pulse gap-3">
                <span className="h-5 w-6 shrink-0 rounded bg-ink-100 dark:bg-ink-800" />
                <span className="h-5 flex-1 rounded bg-ink-100 dark:bg-ink-800" />
              </div>
            ))}
          </div>
        ) : tab === "commented" && items.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500 dark:text-ink-400">아직 댓글이 충분히 쌓이지 않았어요.</p>
        ) : (
          <ol key={tab} className="animate-fade-up space-y-3.5">
            {items.map((a, i) => (
              <li key={a.id} className="flex gap-3">
                <span
                  className={cn(
                    "w-8 shrink-0 font-headline text-2xl font-black leading-none tracking-tight tabular-nums",
                    // 4위 이하는 의도적으로 옅게 두되 큰 글자(24px black) AA 3:1은 지킨다
                    // (라이트 ink-400=3.25:1 / 다크 ink-500=4.02:1 — 이전 ink-300/ink-600은 2.01·2.68로 미달)
                    i < 3 ? "text-signal-600 dark:text-signal-400" : "text-ink-400 dark:text-ink-500",
                  )}
                >
                  {i + 1}
                </span>
                <Link prefetch={false} href={`/article/${a.slug}`} className="group flex-1">
                  <h3 className="clamp-2 min-h-[2.75em] text-sm font-semibold leading-snug text-ink-800 group-hover:text-signal-600 dark:group-hover:text-signal-400 dark:text-ink-100">
                    {a.title}
                  </h3>
                  <span className="mt-1 block text-xs text-ink-500 dark:text-ink-400">
                    {CATEGORY_MAP[a.category]?.name}
                    {tab === "commented" && a.count ? ` · 댓글 ${a.count}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
