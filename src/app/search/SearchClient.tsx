"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ArticleListItem } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/categories";
import { ArticleCard } from "@/components/ArticleCard";
import { SearchIcon } from "@/components/icons";

export function SearchClient({ index }: { index: ArticleListItem[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get("q") || "").trim();
  const [input, setInput] = useState(q);

  // URL ?q가 바뀌면(뒤로가기·링크 이동 등) 입력창도 동기화
  useEffect(() => {
    setInput(q);
  }, [q]);

  const results = q
    ? index
        .filter((a) => {
          const hay =
            `${a.title} ${a.summary} ${a.tags.join(" ")} ${a.author.name} ${CATEGORY_MAP[a.category]?.name ?? ""}`.toLowerCase();
          return hay.includes(q.toLowerCase());
        })
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    router.push(v ? `/search?q=${encodeURIComponent(v)}` : "/search");
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 focus-within:border-signal-500 dark:border-ink-700 dark:bg-ink-900"
      >
        <SearchIcon className="h-5 w-5 shrink-0 text-ink-500 dark:text-ink-400" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="검색어를 입력하세요"
          aria-label="검색어"
          className="h-12 flex-1 bg-transparent text-ink-900 outline-none placeholder:text-ink-500 dark:placeholder:text-ink-400 dark:text-white"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-signal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-signal-700"
        >
          검색
        </button>
      </form>


      {q ? (
        <>
          <p className="mt-6 text-sm text-ink-500">
            &lsquo;<span className="font-semibold text-signal-600 dark:text-signal-400">{q}</span>&rsquo; 검색결과{" "}
            <span className="font-semibold text-ink-800 dark:text-ink-100">{results.length}</span>건
          </p>
          {results.length ? (
            <div className="mt-4 divide-y divide-ink-100 dark:divide-ink-800">
              {results.map((a) => (
                <ArticleCard key={a.id} article={a} variant="horizontal" className="py-5" />
              ))}
            </div>
          ) : (
            <p className="mt-16 text-center text-ink-500 dark:text-ink-400">
              검색 결과가 없습니다. 다른 검색어를 입력해 보세요.
            </p>
          )}
        </>
      ) : (
        <p className="mt-16 text-center text-ink-500 dark:text-ink-400">검색어를 입력하면 결과가 표시됩니다.</p>
      )}
    </div>
  );
}
