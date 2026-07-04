"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, type IndexItem } from "./AccountCard";
import { cn } from "@/lib/utils";

const KEEP_MONTHS = 6; // 마이페이지 표시 보관 기간(최근 반년)

/** 내가 쓴 댓글 카드 — 월별 탭 + 최근 6개월 표시. 상태는 AccountClient가 소유. */
export function MyCommentsCard({
  myComments,
  artIndex,
}: {
  myComments: { article_id: string; body: string; created_at: string }[] | null;
  artIndex: Map<string, IndexItem>;
}) {
  const [month, setMonth] = useState<string | null>(null); // "2026-07" · null=최신 월

  // 최근 6개월 내 댓글만 월별로 묶는다 (최신 월 먼저)
  const byMonth = useMemo(() => {
    if (!myComments) return null;
    // created_at은 KST 벽시계 문자열("YYYY-MM-DD HH:MM:SS") — timeago.ts 관례대로 정규화해 파싱
    // (Safari는 공백 구분 문자열을 Invalid Date로 처리). 컷오프는 일수 기반(월말 setMonth 롤오버 방지).
    const cutoffMs = Date.now() - KEEP_MONTHS * 30.5 * 86400000;
    const map = new Map<string, typeof myComments>();
    for (const c of myComments) {
      const t = Date.parse(c.created_at.replace(" ", "T") + "+09:00");
      if (!Number.isNaN(t) && t < cutoffMs) continue;
      const key = c.created_at.slice(0, 7);
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return new Map([...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)));
  }, [myComments]);

  const months = byMonth ? [...byMonth.keys()] : [];
  const active = month && months.includes(month) ? month : months[0];
  const list = active && byMonth ? byMonth.get(active)! : [];

  return (
    <Card title="내가 쓴 댓글">
      {byMonth === null ? (
        <p className="text-sm text-ink-400">불러오는 중…</p>
      ) : months.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-500 dark:text-ink-300">
          최근 6개월 안에 쓴 댓글이 없습니다. 기사 하단에서 의견을 남겨 보세요.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {months.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonth(m)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  m === active
                    ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                    : "border border-ink-200 text-ink-500 hover:border-ink-400 dark:border-ink-700 dark:text-ink-300",
                )}
              >
                {Number(m.slice(5))}월
                <span className="ml-1 font-normal opacity-60">{byMonth.get(m)!.length}</span>
              </button>
            ))}
          </div>
          <ul className="mt-2 divide-y divide-ink-100 dark:divide-ink-800">
            {list.map((c, i) => {
              const a = artIndex.get(c.article_id);
              return (
                <li key={`${c.article_id}-${c.created_at}-${i}`} className="py-3">
                  <p className="line-clamp-2 text-sm text-ink-800 dark:text-ink-100">{c.body}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-ink-400">
                    <span className="shrink-0">{c.created_at.slice(0, 10).replaceAll("-", ".")}.</span>
                    {a && (
                      <Link prefetch={false} href={`/article/${a.slug}`} className="min-w-0 truncate hover:underline">
                        {a.title}
                      </Link>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-ink-400">댓글은 최근 {KEEP_MONTHS}개월까지 여기에 보관·표시됩니다.</p>
        </>
      )}
    </Card>
  );
}
