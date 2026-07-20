"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES, BIZ_CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "./useFocusTrap";
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

// 하단 서브 줄(종합뉴스) — 기존 카테고리에서 "테크"는 제외(→ 산업·트렌드가 흡수).
const SUB_CATEGORIES = CATEGORIES.filter((c) => c.slug !== "tech");

function Logo({ className }: { className?: string }) {
  return (
    <Link prefetch={false} href="/" className={cn("flex items-center", className)} aria-label="모두일보">
      {/* 정식 로고 B안(데이터심볼: 「보」 끝이 상승 막대그래프) — 라이트=검정/다크=흰색 2에셋 스위칭.
          ⚠️ priority·loading="eager" 금지 → 반드시 lazy. 이유:
           1) 테마가 class 기반이라 media 조건부 preload가 불가능해 두 장이 **모두** preload됐다.
              어느 테마든 하나는 display:none이라 한 장은 100% 낭비였고, 그 두 장이 LCP(히어로
              이미지) preload보다 앞줄을 차지했다.
           2) next/image는 priority뿐 아니라 loading="eager"에도 preload를 건다
              (get-img-props: isLazy = !priority && loading !== 'eager'). 즉 lazy만이 preload를 뺀다.
           3) lazy면 display:none인 쪽은 아예 내려받지 않고, 보이는 쪽은 최초 뷰포트 안이라
              레이아웃 직후 바로 로드된다(5KB 안팎이라 체감 지연 없음). */}
      <Image src="/logo-b.png?v=1" alt="모두일보" width={450} height={150} loading="lazy" className="h-10 w-auto dark:hidden sm:h-12" />
      <Image src="/logo-b-dark.png?v=1" alt="" aria-hidden width={450} height={150} loading="lazy" className="hidden h-10 w-auto dark:block sm:h-12" />
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [today, setToday] = useState("");
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  // 드로어: role="dialog" aria-modal 선언에 맞는 실제 계약(진입 포커스·Tab 트랩·ESC·복원·배경 inert)
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const drawerRef = useFocusTrap<HTMLDivElement>(menuOpen, closeMenu, drawerCloseRef);

  useEffect(() => {
    const d = new Date();
    const w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    setToday(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${w})`);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // 라우트 변경 시 메뉴/검색 닫기 (ESC는 각 오버레이가 자체 처리)
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
            <Link prefetch={false} href="/subscribe" className="font-semibold text-signal-600 dark:text-signal-400 hover:text-signal-700">
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

        {/* 데스크톱 내비 A안 2행 — 상단: 사업 메뉴(메인·강조) / 하단: 종합뉴스(서브·옅은 배경) */}
        {/* 상단 줄: 신규 사업 메뉴 (진하게) */}
        <nav aria-label="사업 메뉴" className="hidden border-t border-ink-100 dark:border-ink-800/60 md:block">
          <div className="container-page flex items-center gap-1">
            {BIZ_CATEGORIES.map((m) => (
              <Link prefetch={false}
                key={m.slug}
                href={`/${m.slug}`}
                aria-current={isActive(m.slug) ? "page" : undefined}
                className={cn(
                  "relative px-3.5 py-3 text-[15px] font-bold transition-colors hover:text-signal-600 dark:hover:text-signal-400",
                  isActive(m.slug)
                    ? "text-signal-600 dark:text-signal-400 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-signal-600"
                    : "text-ink-900 dark:text-white",
                )}
              >
                {m.name}
              </Link>
            ))}
          </div>
        </nav>
        {/* 하단 줄: 종합뉴스 카테고리 (옅은 배경으로 분리, 색만 옅게) */}
        <nav aria-label="종합뉴스" className="hidden border-t border-ink-100 bg-ink-50/70 dark:border-ink-800/60 dark:bg-ink-900/40 md:block">
          <div className="container-page flex items-center gap-1">
            {SUB_CATEGORIES.map((c) => (
              <Link prefetch={false}
                key={c.slug}
                href={`/${c.slug}`}
                aria-current={isActive(c.slug) ? "page" : undefined}
                className={cn(
                  "relative px-3.5 py-2.5 text-[15px] font-medium transition-colors hover:text-signal-600 dark:hover:text-signal-400",
                  isActive(c.slug)
                    ? "text-signal-600 dark:text-signal-400 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-signal-600"
                    : "text-ink-500 dark:text-ink-400",
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
        <div ref={drawerRef} className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <div
            className="absolute inset-0 animate-[overlay-in_.2s_ease-out] bg-black/40 backdrop-blur-[2px]"
            onClick={closeMenu}
            aria-hidden
          />
          <div className="glass absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-[drawer-in_.3s_cubic-bezier(0.32,0.72,0.33,1)] flex-col">
            <div className="flex items-center justify-between border-b border-ink-100/70 px-4 py-3 dark:border-ink-800/70">
              <Logo />
              <button
                ref={drawerCloseRef}
                type="button"
                onClick={closeMenu}
                aria-label="메뉴 닫기"
                className="inline-grid h-10 w-10 place-items-center rounded-md text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              {/* 상단: 신규 사업 메뉴 (우선 노출·진하게) */}
              <ul className="grid grid-cols-2 gap-1">
                {BIZ_CATEGORIES.map((m) => (
                  <li key={m.slug}>
                    <Link prefetch={false}
                      href={`/${m.slug}`}
                      className="block rounded-md px-3 py-2.5 font-bold text-ink-900 hover:bg-ink-50 hover:text-signal-600 dark:hover:text-signal-400 dark:text-white dark:hover:bg-ink-800"
                    >
                      {m.name}
                    </Link>
                  </li>
                ))}
              </ul>
              {/* 구분선: 배경 대신 라인으로 위/아래 경계 (모바일용 A안 변형) */}
              <div className="my-4 border-t border-ink-100 dark:border-ink-800" />
              {/* 하단: 종합뉴스 카테고리 (테크 제외·옅게) */}
              <ul className="grid grid-cols-2 gap-1">
                {SUB_CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <Link prefetch={false}
                      href={`/${c.slug}`}
                      className="block rounded-md px-3 py-2.5 font-medium text-ink-500 hover:bg-ink-50 hover:text-signal-600 dark:hover:text-signal-400 dark:text-ink-400 dark:hover:bg-ink-800"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">서비스</p>
              <ul className="space-y-0.5">
                {COMPANY_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link prefetch={false}
                      href={l.href}
                      className="block rounded-md px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50 hover:text-signal-600 dark:hover:text-signal-400 dark:text-ink-200 dark:hover:bg-ink-800"
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
