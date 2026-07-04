# 02 · 디자인 시스템 (Design System)

정의 위치: [tailwind.config.ts](../tailwind.config.ts) (토큰/애니메이션), [src/app/globals.css](../src/app/globals.css) (폰트/유틸/접근성/인쇄).

## 1. 컬러 토큰
### signal — 브랜드 액센트 ("시그널 레드")
| 토큰 | HEX | 용도 |
|------|-----|------|
| signal-50 | `#fff1f0` | 연한 배경/호버 틴트 |
| signal-500 | `#ef3a2c` | 포커스 링 |
| **signal-600** | **`#dc1f10`** | **primary** (로고·링크·CTA·액티브) |
| signal-700 | `#b8160a` | hover |
| signal-950 | `#450905` | 다크모드 틴트 배경 |

### ink — 뉴트럴 (본문/헤드라인)
| 토큰 | HEX | 용도 |
|------|-----|------|
| ink-50 | `#f6f7f8` | 섹션 배경(라이트) |
| ink-200 | `#d5d9de` | 보더(라이트) |
| ink-400 | `#84909d` | 약한 보조 텍스트(대형만) |
| ink-500 | `#657281` | 메타 텍스트(AA 대비) |
| ink-800 | `#3a404a` | 보더(다크) |
| **ink-900** | **`#0f1419`** | 헤드라인/본문(라이트) |
| ink-950 | `#080b0e` | 페이지 배경(다크) |

**라이트/다크 페어링 규칙** — 색은 항상 쌍으로:
`text-ink-900 dark:text-white` · `bg-white dark:bg-ink-950` · `border-ink-200 dark:border-ink-800` · 보조 `text-ink-500 dark:text-ink-400`.

## 2. 타이포그래피
- `--font-sans` = **Pretendard Variable** (본문·UI), CDN 동적 서브셋.
- `--font-serif` = **MaruBuri(마루 부리)** (헤드라인 시그니처) — 네이버 정적 CDN woff2를 자체 @font-face로 웨이트 매핑(400/600/700–900, 800·900은 Bold 글리프 재사용해 합성 볼드 방지).
- 헤드라인엔 **`.font-headline` 클래스**(세리프) 사용 — 자간 -0.015em 포함.
- 한글 줄바꿈 안정: `word-break: keep-all` (globals.css body/.font-headline).

## 3. 레이아웃 & 간격
- **`.container-page`** = `mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8` (최대 **1280px**). 모든 페이지 콘텐츠는 이 안에.
- 그리드는 Tailwind `grid` 사용. 홈/기사/카테고리는 `lg:grid-cols-[minmax(0,1fr)_300~320px]`(본문+사이드바) 패턴.
- 섹션 간격: 주요 블록 `py-10`~`py-12`.

## 4. 다크 모드
- 전략: `darkMode: "class"` — `<html class="dark">` 토글.
- [ThemeToggle](../src/components/ThemeToggle.tsx): `localStorage["modoo-theme"]` 저장 + 최초엔 `prefers-color-scheme` 반영.
- 모든 색 유틸은 `dark:` 변형을 동반(위 페어링 규칙).

## 5. 애니메이션
| 이름 | 정의 | 사용처 |
|------|------|--------|
| `animate-marquee` | 30s linear, `translateX(0→-50%)` | [BreakingTicker](../src/components/BreakingTicker.tsx) (속보) |
| `animate-fade-up` | 0.4s ease-out | 진입 모션(옵션) |
- **`prefers-reduced-motion`** 존중: 모든 애니메이션/트랜지션 비활성(globals.css).

## 6. 유틸리티 & 접근성
- `.clamp-2` / `.clamp-3` — 다국어 안전 줄임(line-clamp).
- `:focus-visible` — signal 아웃라인(키보드 포커스 가시성).
- 활성 내비에 `aria-current="page"`.
- 메타 텍스트 대비 AA(ink-500), 본문 바로가기 skip-link(layout).
- 커스텀 스크롤바(데스크톱), `@media print`(기사 본문 중심).

## 7. 브랜드 마크
- 워드마크: `모두` + `일보`(signal-600) + 정사각 `M`(bg-signal-600, 흰 글자). Header/Footer 인라인.


## 리퀴드 글라스 (2026-07 추가)
iOS 26풍 반투명 유리 — **내비/플로팅 크롬 전용**(헤더·드로어·검색 오버레이·세그먼트 탭·맨위로). 본문 콘텐츠 카드에는 쓰지 않는다(신문 톤 유지).
- 공용 클래스 `.glass` (globals.css): blur(18px)+saturate, 라이트/다크 배경·하이라이트, backdrop-filter 미지원 브라우저는 불투명 폴백.
- 등장 모션 keyframes: `overlay-in` / `slide-down-in` / `drawer-in` — `animate-[name_duration_easing]` 형태로 사용. prefers-reduced-motion은 전역 규칙이 커버.
