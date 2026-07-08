"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, CloseIcon } from "./icons";

// 검색 자동완성용 기사 인덱스 — 최초 오픈 시 1회만 로드해 모듈에 캐시
type IndexItem = { id: string; slug: string; title: string; category: string; tags?: string[] };
let _searchIndex: IndexItem[] | null = null;

/** 헤더 검색 오버레이 — 입력창 + 제목·태그 자동완성(상위 7) + 전체 검색 이동. */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<IndexItem[]>([]);
  const [indexReady, setIndexReady] = useState(false);

  // 첫 오픈 때 인덱스 로드 — 로드 완료를 state로 알려 이미 입력된 검색어도 즉시 추천되게 한다
  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    inputRef.current?.focus();
    if (_searchIndex) {
      setIndexReady(true);
      return;
    }
    fetch("/articles-index.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((list: IndexItem[] | null) => {
        if (list) {
          _searchIndex = list;
          setIndexReady(true);
        }
      })
      .catch(() => {});
  }, [open]);

  // 입력에 따라 제목·태그 매칭 상위 7개
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q || !_searchIndex) {
      setSuggestions([]);
      return;
    }
    const titleHit: IndexItem[] = [];
    const tagHit: IndexItem[] = [];
    for (const a of _searchIndex) {
      if (a.title.toLowerCase().includes(q)) titleHit.push(a);
      else if (a.tags?.some((t) => t.toLowerCase().includes(q))) tagHit.push(a);
      if (titleHit.length >= 7) break;
    }
    setSuggestions([...titleHit, ...tagHit].slice(0, 7));
  }, [query, indexReady]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="glass absolute inset-x-0 top-full z-40 animate-[slide-down-in_.25s_ease-out] border-b border-ink-200/50 dark:border-ink-800/50">
      <form onSubmit={submitSearch} className="container-page flex items-center gap-3 py-4">
        <SearchIcon className="h-5 w-5 shrink-0 text-ink-400" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          aria-label="검색어"
          placeholder="검색어를 입력하세요"
          className="h-10 flex-1 bg-transparent text-lg text-ink-900 outline-none placeholder:text-ink-400 dark:text-white"
        />
        <button
          type="submit"
          className="rounded-md bg-signal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-signal-700"
        >
          검색
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="검색 닫기"
          className="inline-grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </form>
      {suggestions.length > 0 && (
        <ul className="container-page border-t border-ink-100 pb-3 dark:border-ink-800" role="listbox" aria-label="검색 추천">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/article/${s.slug}`);
                }}
                className="flex w-full items-baseline gap-3 px-1 py-2.5 text-left transition-colors hover:bg-ink-50 dark:hover:bg-ink-900"
              >
                <SearchIcon className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-ink-300 dark:text-ink-600" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink-800 dark:text-ink-100">{s.title}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                onClose();
              }}
              className="w-full px-1 py-2.5 text-left text-sm font-semibold text-signal-600 hover:text-signal-700"
            >
              &lsquo;{query.trim()}&rsquo; 전체 검색 →
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
