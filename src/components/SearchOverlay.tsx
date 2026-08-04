"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ARTICLES_INDEX_URL } from "@/lib/articles-index";
import { SearchIcon, CloseIcon } from "./icons";

// 검색 자동완성용 기사 인덱스 — 최초 오픈 시 1회만 로드해 모듈에 캐시
type IndexItem = { id: string; slug: string; title: string; category: string; tags?: string[] };
let _searchIndex: IndexItem[] | null = null;

const LISTBOX_ID = "search-suggestions";
const optionId = (i: number) => `${LISTBOX_ID}-option-${i}`;

/**
 * 헤더 검색 오버레이 — 입력창 + 제목·태그 자동완성(상위 7) + 전체 검색 이동.
 *
 * 접근성 계약(ARIA combobox 1.2):
 *  - 입력창이 combobox 본체이며 aria-controls로 목록을, aria-activedescendant로 "가상 포커스"를
 *    가리킨다(실제 DOM 포커스는 입력창에 유지).
 *  - 추천 항목은 role="option"이어야 하고, option 안에 버튼 같은 조작 요소를 넣지 않는다.
 *    (예전엔 role="listbox" 안이 전부 <button>이라 option 자식이 0개 → 스크린리더가 목록을
 *     빈 것으로 읽었고, combobox 연결·키보드 탐색도 없어 마우스 전용 기능이었다)
 *  - ↑/↓ 이동, Enter 선택, ESC 닫기. 닫을 때 포커스는 트리거(헤더 검색 버튼)로 복원.
 *
 * ⚠️ 이 패널은 모달이 아니다(헤더 아래 드롭다운) → 포커스 트랩·배경 inert를 걸지 않는다.
 *    combobox는 Tab으로 빠져나갈 수 있어야 한다는 것이 ARIA 규약이기 때문.
 *    트랩이 필요한 진짜 모달(드로어·라이트박스)은 useFocusTrap을 쓴다.
 */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<IndexItem[]>([]);
  const [indexReady, setIndexReady] = useState(false);
  const [active, setActive] = useState(-1); // 가상 포커스 위치(-1 = 선택 없음)

  // 첫 오픈 때 인덱스 로드 — 로드 완료를 state로 알려 이미 입력된 검색어도 즉시 추천되게 한다.
  // 닫힐 때는 검색어를 비우고 포커스를 트리거로 되돌린다(복원 없으면 포커스가 문서 처음으로 튄다).
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(-1);
      return;
    }
    const trigger = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();

    if (_searchIndex) {
      setIndexReady(true);
    } else {
      fetch(ARTICLES_INDEX_URL)
        .then((r) => (r.ok ? r.json() : null))
        .then((list: IndexItem[] | null) => {
          if (list) {
            _searchIndex = list;
            setIndexReady(true);
          }
        })
        .catch(() => {});
    }

    return () => {
      if (trigger && trigger.isConnected) trigger.focus();
    };
  }, [open]);

  // 입력에 따라 제목·태그 매칭 상위 7개
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q || !_searchIndex) {
      setSuggestions([]);
      setActive(-1);
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
    setActive(-1); // 검색어가 바뀌면 가상 포커스 초기화
  }, [query, indexReady]);

  function go(slug: string) {
    onClose();
    router.push(`/article/${slug}`);
  }

  function goSearchAll() {
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    onClose();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    // 항목을 골라 둔 상태의 Enter는 그 기사로, 아니면 전체 검색으로
    if (active >= 0 && suggestions[active]) {
      go(suggestions[active].slug);
      return;
    }
    goSearchAll();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(suggestions.length - 1);
    }
  }

  if (!open) return null;

  const expanded = suggestions.length > 0;

  return (
    <div className="glass absolute inset-x-0 top-full z-40 animate-[slide-down-in_.25s_ease-out] border-b border-ink-200/50 dark:border-ink-800/50">
      <form onSubmit={submitSearch} className="container-page flex items-center gap-3 py-4">
        <SearchIcon className="h-5 w-5 shrink-0 text-ink-500 dark:text-ink-400" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          aria-label="검색어"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          placeholder="검색어를 입력하세요"
          className="h-10 flex-1 bg-transparent text-lg text-ink-900 outline-none placeholder:text-ink-500 dark:placeholder:text-ink-400 dark:text-white"
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
      {expanded && (
        <>
          <ul
            id={LISTBOX_ID}
            role="listbox"
            aria-label="검색 추천"
            className="container-page border-t border-ink-100 pb-1 dark:border-ink-800"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onClick={() => go(s.slug)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full cursor-pointer items-baseline gap-3 px-1 py-2.5 text-left transition-colors",
                  i === active ? "bg-ink-50 dark:bg-ink-900" : "hover:bg-ink-50 dark:hover:bg-ink-900",
                )}
              >
                <SearchIcon className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-ink-300 dark:text-ink-600" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink-800 dark:text-ink-100">{s.title}</span>
              </li>
            ))}
          </ul>
          {/* 목록(listbox) 밖의 일반 버튼 — option 자식으로 두면 role 계약 위반 */}
          <div className="container-page pb-3">
            <button
              type="button"
              onClick={goSearchAll}
              className="w-full px-1 py-2.5 text-left text-sm font-semibold text-signal-600 dark:text-signal-400 hover:text-signal-700"
            >
              &lsquo;{query.trim()}&rsquo; 전체 검색 →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
