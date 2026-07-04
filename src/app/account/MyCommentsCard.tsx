"use client";

import Link from "next/link";
import { Card, type IndexItem } from "./AccountCard";

/** 내가 쓴 댓글 카드. 상태는 AccountClient가 소유. */
export function MyCommentsCard({
  myComments,
  artIndex,
}: {
  myComments: { article_id: string; body: string; created_at: string }[] | null;
  artIndex: Map<string, IndexItem>;
}) {
  return (
    <Card title="내가 쓴 댓글">
      {myComments === null ? (
        <p className="text-sm text-ink-400">불러오는 중…</p>
      ) : myComments.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-500 dark:text-ink-300">
          아직 쓴 댓글이 없습니다. 기사 하단에서 의견을 남겨 보세요.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {myComments.slice(0, 10).map((c, i) => {
            const a = artIndex.get(c.article_id);
            return (
              <li key={`${c.article_id}-${c.created_at}-${i}`} className="py-3">
                <p className="line-clamp-2 text-sm text-ink-800 dark:text-ink-100">{c.body}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-ink-400">
                  <span className="shrink-0">{c.created_at.slice(0, 10).replaceAll("-", ".")}.</span>
                  {a && (
                    <Link href={`/article/${a.slug}`} className="min-w-0 truncate hover:underline">
                      {a.title}
                    </Link>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
