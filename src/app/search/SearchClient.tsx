"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ArticleIndexItem } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/categories";
import { ArticleCard } from "@/components/ArticleCard";
import { SearchIcon } from "@/components/icons";

/** 인덱스는 탭 수명 동안 1회만 받아 모듈에 캐시한다(검색어를 바꿔도 재요청 없음).
 *  SearchOverlay와 같은 파일을 쓰지만 캐시는 각자 들고 있어도 브라우저 HTTP 캐시가 중복 요청을 막는다. */
let _index: ArticleIndexItem[] | null = null;

export function SearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get("q") || "").trim();
  const [input, setInput] = useState(q);
  const [index, setIndex] = useState<ArticleIndexItem[] | null>(_index);
  const [failed, setFailed] = useState(false);

  // URL ?q가 바뀌면(뒤로가기·링크 이동 등) 입력창도 동기화
  useEffect(() => {
    setInput(q);
  }, [q]);

  // 검색어가 있을 때만 인덱스를 받는다 — 빈 검색 화면에서는 아무것도 내려받지 않는다.
  useEffect(() => {
    if (!q || _index) return;
    let alive = true;
    fetch("/articles-index.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((list: ArticleIndexItem[]) => {
        _index = list;
        if (alive) setIndex(list);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [q]);

  const loading = Boolean(q) && !index && !failed;
  const results =
    q && index
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
            {loading ? (
              <span className="text-ink-500 dark:text-ink-400">불러오는 중…</span>
            ) : (
              <>
                <span className="font-semibold text-ink-800 dark:text-ink-100">{results.length}</span>건
              </>
            )}
          </p>
          {failed ? (
            <p className="mt-16 text-center text-ink-500 dark:text-ink-400">
              검색 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          ) : loading ? (
            <div className="mt-4 divide-y divide-ink-100 dark:divide-ink-800" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 py-5">
                  <div className="h-20 w-28 shrink-0 animate-pulse rounded bg-ink-100 dark:bg-ink-800 sm:w-40" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
                    <div className="h-3 w-full animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length ? (
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
