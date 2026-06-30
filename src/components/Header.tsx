"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { SearchIcon, MenuIcon, CloseIcon, UserIcon } from "./icons";

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
    <Link href="/" className={cn("flex items-center gap-2", className)} aria-label="모두일보 홈">
      <span className="grid h-7 w-7 place-items-center rounded-sm bg-signal-600 font-headline text-sm font-black text-white">
        M
      </span>
      <span className="font-headline text-xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-2xl">
        모두<span className="text-signal-600">일보</span>
      </span>
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
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // 라우트 변경 시 메뉴/검색 닫기
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
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
      <div className="hidden border-b border-ink-100 bg-ink-50 text-xs text-ink-500 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-400 md:block">
        <div className="container-page flex h-9 items-center justify-between">
          <span className="tabular-nums">{today || " "}</span>
          <nav className="flex items-center gap-4">
            <Link href="/subscribe" className="font-semibold text-signal-600 hover:text-signal-700">
              후원·구독
            </Link>
            <span aria-hidden className="text-ink-200 dark:text-ink-700">|</span>
            <Link href="/login" className="hover:text-ink-900 dark:hover:text-white">로그인</Link>
            <Link href="/register" className="hover:text-ink-900 dark:hover:text-white">회원가입</Link>
            <Link href="/newsletter" className="hover:text-ink-900 dark:hover:text-white">뉴스레터</Link>
            <ThemeToggle className="h-7 w-7" />
          </nav>
        </div>
      </div>

      {/* 마스트헤드 + 내비 (헤더 전체가 sticky) */}
      <div className="border-b border-ink-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-ink-800 dark:bg-ink-950/95 dark:supports-[backdrop-filter]:bg-ink-950/80">
        <div className="container-page flex h-14 items-center justify-between gap-3 sm:h-16">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="전체 메뉴 열기"
              className="-ml-1 inline-grid h-10 w-10 place-items-center rounded-md text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800 lg:hidden"
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
            <Link
              href="/login"
              className="ml-1 hidden items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-medium text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-200 sm:inline-flex"
            >
              <UserIcon className="h-4 w-4" />
              로그인
            </Link>
          </div>
        </div>

        {/* 데스크톱 카테고리 내비 */}
        <nav className="hidden border-t border-ink-100 dark:border-ink-800/60 lg:block">
          <div className="container-page flex items-center gap-1">
            {CATEGORIES.map((c) => (
              <Link
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
        <div className="absolute inset-x-0 top-full z-40 border-b border-ink-200 bg-white shadow-lg dark:border-ink-800 dark:bg-ink-950">
          <form onSubmit={submitSearch} className="container-page flex items-center gap-3 py-4">
            <SearchIcon className="h-5 w-5 shrink-0 text-ink-400" />
            <input
              ref={inputRef}
              type="search"
              name="q"
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
        </div>
      )}

      {/* 모바일 전체 메뉴 드로어 */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl dark:bg-ink-950">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
              <Logo />
              <button
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
                    <Link
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
                    <Link
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
              <Link
                href="/login"
                className="flex-1 rounded-md border border-ink-200 py-2.5 text-center text-sm font-semibold text-ink-700 dark:border-ink-700 dark:text-ink-100"
              >
                로그인
              </Link>
              <Link
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
