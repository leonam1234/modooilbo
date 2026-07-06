"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { AuthMenu } from "./AuthMenu";
import { LocationPicker } from "./LocationPicker";
import { SearchIcon, MenuIcon, CloseIcon, UserIcon } from "./icons";

// 검색 자동완성용 기사 인덱스 — 최초 검색창 오픈 시 1회만 로드
type IndexItem = { id: string; slug: string; title: string; category: string; tags?: string[] };
let _searchIndex: IndexItem[] | null = null;

const COMPANY_LINKS = [
  { href: "/about", label: "회사소개" },
  { href: "/careers", label: "인재채용" },
  { href: "/subscribe", label: "구독안내" },
  { href: "/advertise", label: "광고·제휴" },
  { href: "/tips", label: "제보하기" },
  { href: "/ethics", label: "윤리강령" },
  { href: "/contact", label: "고객센터" },
];

function Logo({ className }: { className?: string }) {
  return (
    <Link prefetch={false} href="/" className={cn("flex items-center", className)} aria-label="모두일보 홈">
      {/* 정식 로고(코덱스 BW 시안 02 워드마크) — 무채색이라 다크모드는 invert 반전 */}
      <Image src="/logo.png" alt="모두일보" width={900} height={900} priority className="h-11 w-auto dark:invert sm:h-12" />
    </Link>
  );
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [today, setToday] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<IndexItem[]>([]);
  const [indexReady, setIndexReady] = useState(false);

  // 검색창 첫 오픈 때 인덱스 로드 — 로드 완료를 state로 알려 이미 입력된 검색어도 즉시 추천되게 한다
  useEffect(() => {
    if (!searchOpen) return;
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
  }, [searchOpen]);

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

  useEffect(() => {
    const d = new Date();
    const w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    setToday(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${w})`);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    if (menuOpen) drawerCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // ESC로 드로어/검색 닫기 (키보드 접근성)
  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, searchOpen]);

  // 라우트 변경 시 메뉴/검색 닫기
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setQuery("");
  }, [pathname]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value?.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setSearchOpen(false);
    }
  }

  const isActive = (slug: string) => pathname === `/${slug}`;

  return (
    <header className="relative">
      {/* 상단 유틸리티 바 */}
      <div className="hidden border-b border-ink-100/70 bg-ink-50/75 text-xs text-ink-500 backdrop-blur-md dark:border-ink-800/70 dark:bg-ink-950/85 dark:text-ink-400 md:block">
        <div className="container-page flex h-9 items-center justify-between">
          <span className="tabular-nums">{today || " "}</span>
          <nav className="flex items-center gap-4">
            <Link prefetch={false} href="/subscribe" className="font-semibold text-signal-600 hover:text-signal-700">
              후원·구독
            </Link>
            <span aria-hidden className="text-ink-200 dark:text-ink-700">|</span>
            <AuthMenu variant="links" />
            <Link prefetch={false} href="/newsletter" className="hover:text-ink-900 dark:hover:text-white">뉴스레터</Link>
            <ThemeToggle className="h-7 w-7" />
          </nav>
        </div>
      </div>

      {/* 마스트헤드 + 내비 (헤더 전체가 sticky) */}
      <div className="border-b border-ink-200/60 bg-white/95 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/65 dark:border-ink-800/60 dark:bg-ink-950/95 dark:supports-[backdrop-filter]:bg-ink-950/80">
        <div className="container-page flex h-14 items-center justify-between gap-3 sm:h-16">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="전체 메뉴 열기"
              className="-ml-1 inline-grid h-10 w-10 place-items-center rounded-md text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800 md:hidden"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <Logo />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="검색"
              className="inline-grid h-10 w-10 place-items-center rounded-full text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
            <ThemeToggle className="md:hidden" />
            <LocationPicker className="ml-1" />
            <AuthMenu variant="pill" />
          </div>
        </div>

        {/* 데스크톱 카테고리 내비 */}
        <nav className="hidden border-t border-ink-100 dark:border-ink-800/60 md:block">
          <div className="container-page flex items-center gap-1">
            {CATEGORIES.map((c) => (
              <Link prefetch={false}
                key={c.slug}
                href={`/${c.slug}`}
                aria-current={isActive(c.slug) ? "page" : undefined}
                className={cn(
                  "relative px-3.5 py-3 text-[15px] font-semibold transition-colors hover:text-signal-600",
                  isActive(c.slug)
                    ? "text-signal-600 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-signal-600"
                    : "text-ink-700 dark:text-ink-200",
                )}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* 검색 오버레이 */}
      {searchOpen && (
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
              onClick={() => setSearchOpen(false)}
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
                      setSearchOpen(false);
                      setQuery("");
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
                    setSearchOpen(false);
                  }}
                  className="w-full px-1 py-2.5 text-left text-sm font-semibold text-signal-600 hover:text-signal-700"
                >
                  &lsquo;{query.trim()}&rsquo; 전체 검색 →
                </button>
              </li>
            </ul>
          )}
        </div>
      )}

      {/* 모바일 전체 메뉴 드로어 */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <div
            className="absolute inset-0 animate-[overlay-in_.2s_ease-out] bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="glass absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-[drawer-in_.3s_cubic-bezier(0.32,0.72,0.33,1)] flex-col">
            <div className="flex items-center justify-between border-b border-ink-100/70 px-4 py-3 dark:border-ink-800/70">
              <Logo />
              <button
                ref={drawerCloseRef}
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="메뉴 닫기"
                className="inline-grid h-10 w-10 place-items-center rounded-md text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">뉴스</p>
              <ul className="grid grid-cols-2 gap-1">
                {CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <Link prefetch={false}
                      href={`/${c.slug}`}
                      className="block rounded-md px-3 py-2.5 font-semibold text-ink-800 hover:bg-ink-50 hover:text-signal-600 dark:text-ink-100 dark:hover:bg-ink-800"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-ink-400">서비스</p>
              <ul className="space-y-0.5">
                {COMPANY_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link prefetch={false}
                      href={l.href}
                      className="block rounded-md px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-signal-600 dark:text-ink-200 dark:hover:bg-ink-800"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2 border-t border-ink-100 p-4 dark:border-ink-800">
              <Link prefetch={false}
                href="/login"
                className="flex-1 rounded-md border border-ink-200 py-2.5 text-center text-sm font-semibold text-ink-700 dark:border-ink-700 dark:text-ink-100"
              >
                로그인
              </Link>
              <Link prefetch={false}
                href="/subscribe"
                className="flex-1 rounded-md bg-signal-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-signal-700"
              >
                후원·구독
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
