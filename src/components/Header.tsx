"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES, BIZ_CATEGORIES } from "@/lib/categories";
import { DOW, cn, kstToday } from "@/lib/utils";
import { useFocusTrap } from "./useFocusTrap";
import { ThemeToggle } from "./ThemeToggle";
import { AuthMenu } from "./AuthMenu";
import { LocationPicker } from "./LocationPicker";
import { SearchOverlay } from "./SearchOverlay";
import { SearchIcon, MenuIcon, CloseIcon } from "./icons";

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
      {/* 제호 락업(2026-08-24 확정): 심볼 칩 + 타이핑 제호.
          - 심볼(5인 원형)은 흰 라운드 칩에 담는다 — 심볼의 검정 인물과 투명한 꽃 중심이
            다크 헤더(ink-950)에 묻히므로, 어느 테마든 흰 배경 위에서 다섯 인물이 온전히 보이게.
          - 제호는 이미지가 아니라 **글자**다(마루부리 명조 = font-headline). 이미지 워드마크
            (logo-b*.png, 「보」끝 막대그래프 구형 심볼 포함)는 새 심볼과 병기 시 심볼이
            두 개가 되는 문제로 헤더에서 퇴역했다 — 파일은 롤백 대비 보존.
          - 글자 제호는 가벼워서 모바일에도 함께 노출한다(이미지 시절의 0폭 찌부 문제 없음). */}
      <span className="mr-2 inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1 ring-1 ring-ink-200/70 dark:ring-white/10">
        <Image
          src="/logo-symbol.png?v=1"
          alt=""
          aria-hidden
          width={256}
          height={256}
          loading="lazy"
          className="h-7 w-7 sm:h-9 sm:w-9"
        />
      </span>
      {/* whitespace-nowrap 필수 — 헤더가 좁아지면 flex 가 이 span 을 최소폭으로 눌러
          한 글자씩 세로로 꺾인다(모바일 실측). shrink-0 로 제호는 절대 줄이지 않는다. */}
      <span className="shrink-0 whitespace-nowrap font-headline text-xl font-bold leading-none tracking-tight text-ink-900 dark:text-white sm:text-[27px]">
        모두일보
      </span>
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

  // 발행일자는 한국 신문 지면의 날짜다 — 독자 브라우저 시간대가 아니라 KST 기준으로 고정한다.
  // (마운트 이후에만 계산: 렌더 중 현재시각 사용은 결정성 규약 위반)
  useEffect(() => {
    const { year, month, day, dow } = kstToday();
    setToday(`${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")} (${DOW[dow]})`);
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
      {/* 유틸바 — 아래 마스트헤드와 같은 유리로 통일(2026-08-21).
          종전엔 ink-50/75 + blur-md 라 아래 줄보다 훨씬 불투명해 층이 따로 놀았다.
          글자는 GNB 두 줄과 같은 블랙 — 유리 뒤로 사진이 지나면 옅은 회색은 묻힌다.
          기본이 블랙이라 hover 는 signal 색으로 준다(hover:text-ink-900 은 무효). */}
      <div className="hidden border-b border-ink-200/45 text-xs text-ink-900 dark:border-ink-700/40 dark:text-white md:block">
        <div className="container-page flex h-9 items-center justify-between">
          <span className="tabular-nums">{today || " "}</span>
          <nav className="flex items-center gap-4">
            {/* 강조(signal)는 회원가입 pill(AuthMenu) 몫이다. 후원·구독은 가입 퍼널을
                가리지 않게 일반 링크로 둔다 — 목적지가 아직 '멤버십 준비중' 페이지다. */}
            <Link prefetch={false} href="/subscribe" className="hover:text-signal-600 dark:hover:text-signal-400">
              후원·구독
            </Link>
            <span aria-hidden className="text-ink-300 dark:text-ink-600">|</span>
            <AuthMenu variant="links" />
            <Link prefetch={false} href="/newsletter" className="hover:text-signal-600 dark:hover:text-signal-400">뉴스레터</Link>
            <ThemeToggle className="h-7 w-7" />
          </nav>
        </div>
      </div>

      {/* 마스트헤드 + 내비 (헤더 전체가 sticky) */}
      {/* --gnb-col: 아래 2행 GNB(사업 6 + 종합 6 = 12칸)의 컬럼 앵커.
          ⚠️ 반드시 이 한 곳에서만 정의한다 — nav 별로 적으면 한쪽만 고쳐져 정렬이 어긋난다.
          md(768px)에서 6×7rem=672px 라 가장 좁은 데스크톱에서도 가로 넘침이 없다. */}
      <div className="[--gnb-col:7rem] lg:[--gnb-col:7.5rem]">
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
            {/* 날씨 핀(≈99px)은 모바일에서 숨긴다 — 타이핑 제호 도입(2026-08-24)으로 375px 헤더가
                82px 초과했고, 우측 묶음에서 유일한 비필수 항목이 이것이다. 제호와 회원가입 CTA 는
                유지한다. 날씨는 /weather 페이지에서 그대로 볼 수 있다. */}
            <span className="hidden sm:inline-flex">
              <LocationPicker className="ml-1" />
            </span>
            <AuthMenu variant="pill" />
          </div>
        </div>

        {/* 데스크톱 내비 A안 2행 — 상단: 사업 메뉴(메인·강조) / 하단: 종합뉴스(서브·옅은 배경) */}
        {/* 상단 줄: 신규 사업 메뉴 (진하게) */}
        {/* ⚠️ 두 줄의 컬럼 앵커는 --gnb-col 하나로 묶여 있다. 위(사업 6)·아래(종합 6) 12칸이
            같은 x 에서 시작해야 한 세트로 읽힌다. 폭을 한쪽만 바꾸면 정렬이 깨진다.
            글자가 트랙보다 길어지면 그 항목만 밀려나므로, 라벨을 늘릴 때는 --gnb-col 도 함께 볼 것.
            justify-self-center: 칸 왼쪽에 붙이면 「정부지원금」 아래 「경제」가 왼쪽으로 치우쳐 보인다.
            글자 수가 5:2 로 차이나서 시각적 중심이 어긋나기 때문 — 두 줄 다 칸 중앙에 둔다. */}
        <nav aria-label="사업 메뉴" className="hidden border-t border-ink-200/45 dark:border-ink-700/40 md:block">
          <div className="container-page">
          <div className="grid w-max grid-cols-[repeat(6,var(--gnb-col))] items-center">
            {BIZ_CATEGORIES.map((m) => (
              <Link prefetch={false}
                key={m.slug}
                href={`/${m.slug}`}
                aria-current={isActive(m.slug) ? "page" : undefined}
                className={cn(
                  "relative justify-self-center px-3.5 py-3 text-[15px] font-bold transition-colors hover:text-signal-600 dark:hover:text-signal-400",
                  isActive(m.slug)
                    ? "text-signal-600 dark:text-signal-400 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-signal-600"
                    : "text-ink-900 dark:text-white",
                )}
              >
                {m.name}
              </Link>
            ))}
          </div>
          </div>
        </nav>
        {/* 하단 줄: 종합뉴스 카테고리 (옅은 배경으로 분리, 색만 옅게).
            컬럼 폭은 위 줄과 같은 --gnb-col(정의는 헤더 wrapper 한 곳). */}
        <nav aria-label="종합뉴스" className="hidden border-t border-ink-200/45 dark:border-ink-700/40 md:block">
          <div className="container-page">
          <div className="grid w-max grid-cols-[repeat(6,var(--gnb-col))] items-center">
            {SUB_CATEGORIES.map((c) => (
              <Link prefetch={false}
                key={c.slug}
                href={`/${c.slug}`}
                aria-current={isActive(c.slug) ? "page" : undefined}
                className={cn(
                  "relative justify-self-center px-3.5 py-2.5 text-[15px] font-medium transition-colors hover:text-signal-600 dark:hover:text-signal-400",
                  isActive(c.slug)
                    ? "text-signal-600 dark:text-signal-400 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-signal-600"
                    : "text-ink-900 dark:text-white",
                )}
              >
                {c.name}
              </Link>
            ))}
          </div>
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
          <div className="glass-panel absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-[drawer-in_.3s_cubic-bezier(0.32,0.72,0.33,1)] flex-col">
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
              {/* 드로어 primary 는 회원가입. 예전엔 후원·구독이었는데 목적지가
                  '멤버십 준비중' 페이지라 모바일의 유일한 강조 CTA 가 막다른 길이었다. */}
              <Link prefetch={false}
                href="/register"
                className="flex-1 rounded-md bg-signal-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-signal-700"
              >
                회원가입
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
