"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { AuthMenu } from "./AuthMenu";
import { LocationPicker } from "./LocationPicker";
import { SearchOverlay } from "./SearchOverlay";
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
    <Link prefetch={false} href="/" className={cn("flex items-center", className)} aria-label="모두일보 홈">
      {/* 정식 로고(코덱스 BW 시안 02 워드마크) — 무채색이라 다크모드는 invert 반전 */}
      <Image src="/logo.png?v=4" alt="모두일보 — 균형 있게 보는 오늘의 뉴스" width={947} height={195} priority className="h-10 w-auto dark:invert sm:h-12" />
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [today, setToday] = useState("");
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = new Date();
    const w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    setToday(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${w})`);
  }, []);

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
  }, [pathname]);

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

      {/* 검색 오버레이 — 자동완성 로직 포함(관심사 분리: SearchOverlay.tsx) */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

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
