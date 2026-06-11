# 시그널저널 — 페이지 빌드 에이전트 공통 브리핑

> 이 문서를 먼저 읽고, 배정된 페이지를 이 규칙에 **정확히** 맞춰 작성하세요.

## 프로젝트
- 시그널저널 (Signal Journal) — 대한민국 온라인 신문사. Next.js 15 App Router + TypeScript + Tailwind CSS.
- 루트: `C:\Users\namdg\signaljournal`, 소스: `src/`. 임포트 별칭 `@/` → `src/`.
- 오늘 날짜 2026-06-10. 모든 콘텐츠는 한국어, 진중한 언론 브랜드 톤, 가상(데모) 데이터.

## 디자인 시스템 (반드시 준수)
- **브랜드 액센트**: Tailwind `signal-600`(레드 #dc1f10), hover `signal-700`, 연한 틴트 `signal-50/100`, 다크 텍스트 `signal-400`.
- **뉴트럴**: `ink-50`~`ink-950`. ink-900=거의 검정 헤드라인, ink-500=본문 보조, ink-200=보더.
- **라이트/다크 항상 같이**: 예) `text-ink-900 dark:text-white`, `bg-white dark:bg-ink-950`, `border-ink-200 dark:border-ink-800`, 보조텍스트 `text-ink-500 dark:text-ink-300`.
- **헤드라인**: `font-headline` 클래스(세리프). 본문은 기본 산세리프.
- **폭 래퍼**: `container-page` 클래스(최대 1280px, 반응형 패딩). 페이지 콘텐츠는 항상 이 안에.
- 내부 링크는 `next/link`의 `<Link>`, 이미지는 `next/image`의 `<Image>` (picsum 허용: `https://picsum.photos/seed/<seed>/1200/800`).

## 공통 컴포넌트 (재사용)
- `import { PageHeader } from "@/components/PageHeader"` — props `{ title: string; subtitle?: string; breadcrumb?: {label:string; href?:string}[]; align?: "left"|"center" }`. 모든 페이지 상단 타이틀 블록으로 사용(로그인/회원가입 같은 중앙정렬 폼 페이지는 생략 가능).
- `import { ArticleCard } from "@/components/ArticleCard"` — 기사 리스트용. variant: `"feature"|"horizontal"|"compact"|"text"|"overlay"`.
- `import { NewsletterCTA } from "@/components/NewsletterCTA"` — 뉴스레터 구독 배너(다크 배경).
- `import { cn } from "@/lib/utils"`.
- 아이콘: `@/components/icons` 에서 — SearchIcon, MenuIcon, CloseIcon, SunIcon, MoonIcon, ChevronRightIcon, ArrowRightIcon, ShareIcon, ClockIcon, MailIcon, UserIcon, BookmarkIcon, PrintIcon, PlayIcon, TrendingIcon. (없는 아이콘은 인라인 SVG로.)
- 데이터가 필요하면 `@/lib/queries`(getByCategory, getMostRead 등), `@/lib/categories`(CATEGORIES), `@/lib/types`.

## 패턴
- 서버 컴포넌트 페이지는 `export const metadata: Metadata = { title, description }` 포함.
- **인터랙티브 폼**: 같은 폴더에 `'use client'` 자식 컴포넌트(예 `./ContactForm.tsx`)를 만들고 useState로 상태 관리, 제출 시 `e.preventDefault()` 후 인라인 성공 메시지 표시(백엔드 없음). page.tsx는 서버 컴포넌트로 두고 PageHeader + 본문 + 폼 컴포넌트를 렌더.
- **폼 필드 스타일**:
  - label: `mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200`
  - input/select: `h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white`
  - textarea: 위와 같되 `h-11` 대신 `min-h-32 py-3`
  - 기본 버튼: `rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50`
  - 보조 버튼: `rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200`
  - 체크박스 행: `flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300`
- **카드/박스**: `rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900`
- 섹션 간격: 주요 섹션 `py-10`~`py-12`, 내부는 `container-page`.
- TypeScript strict 통과. 외부 패키지 금지. 폼은 데모임을 자연스럽게 안내.
- 접근성: 라벨-인풋 연결(htmlFor/id), 시맨틱 마크업, 반응형(모바일 우선).

## 산출물
- 배정된 정확한 경로에 page.tsx(및 필요한 client 자식 컴포넌트) 생성.
- 공통 컴포넌트나 배정 외 파일은 수정 금지. 빌드/실행 명령 실행 금지.
- 완료 후 생성한 파일 목록을 한 줄로 보고.
