"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, type IndexItem } from "./AccountCard";
import { cn } from "@/lib/utils";

/** 스크랩한 기사 카드 — 카테고리 필터 칩. 상태는 AccountClient가 소유. */
export function ScrapsCard({
  scraps,
  artIndex,
  onRemove,
}: {
  scraps: { article_id: string; created_at: string }[] | null;
  artIndex: Map<string, IndexItem>;
  onRemove: (articleId: string) => void;
}) {
  const [cat, setCat] = useState<string>("전체");

  const cats = useMemo(() => {
    if (!scraps) return [];
    const seen = new Set<string>();
    for (const s of scraps) {
      const a = artIndex.get(s.article_id);
      if (a?.category) seen.add(a.category);
    }
    return ["전체", ...seen];
  }, [scraps, artIndex]);

  // 선택했던 카테고리의 마지막 항목을 해제하면 목록에서 사라짐 — '전체'로 폴백
  const activeCat = cats.includes(cat) ? cat : "전체";
  const list = (scraps ?? []).filter(
    (s) => activeCat === "전체" || artIndex.get(s.article_id)?.category === activeCat,
  );

  return (
    <Card title="스크랩한 기사">
      {scraps === null ? (
        <p className="text-sm text-ink-500 dark:text-ink-400">불러오는 중…</p>
      ) : scraps.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-500 dark:text-ink-300">
          스크랩한 기사가 없습니다. 기사 제목 아래 책갈피 버튼으로 저장해 두고 여기서 다시 볼 수 있어요.
        </p>
      ) : (
        <>
          {cats.length > 2 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {cats.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                    c === activeCat
                      ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                      : "border border-ink-200 text-ink-500 hover:border-ink-400 dark:border-ink-700 dark:text-ink-300",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {list.map((s) => {
              const a = artIndex.get(s.article_id);
              return (
                <li key={s.article_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    {a ? (
                      <Link
                        prefetch={false}
                        href={`/article/${a.slug}`}
                        className="block truncate text-sm font-medium text-ink-900 hover:underline dark:text-white"
                      >
                        {a.title}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm text-ink-500">{s.article_id}</span>
                    )}
                    <span className="text-xs text-ink-500 dark:text-ink-400">
                      {a?.category && <span className="mr-1.5 text-ink-500 dark:text-ink-400">{a.category}</span>}
                      {s.created_at.slice(0, 10).replaceAll("-", ".")}. 저장
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(s.article_id)}
                    className="shrink-0 text-xs text-ink-500 dark:text-ink-400 transition-colors hover:text-ink-700 dark:hover:text-ink-200"
                  >
                    해제
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
