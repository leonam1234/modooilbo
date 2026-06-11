# 01 · 아키텍처 (Architecture)

## 1. 기술 스택
| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **Next.js 15.1.6** (App Router) | RSC 기반, 정적 export |
| 언어 | **TypeScript** (strict) | |
| 스타일 | **Tailwind CSS 3.4** | `darkMode: "class"` |
| 폰트 | Pretendard(본문) + Nanum Myeongjo(헤드라인) | CDN `@import` (globals.css) |
| 이미지 | `next/image` + `unoptimized` | 정적 export용, picsum 더미 |
| 배포 | **Cloudflare Pages** (정적 `out/`) | → [06-deployment](06-deployment.md) |
| 테스트/리뷰 | Playwright (스크린샷) | `scripts/shoot.mjs` |

## 2. 렌더링 모델 — 전부 정적
- 모든 라우트가 **Static** 또는 **SSG**(generateStaticParams). 서버 런타임 없음.
- `next.config.mjs`의 `output: "export"` → `next build` 시 `out/`에 완전한 정적 사이트 생성(90 페이지).
- 인터랙션은 **클라이언트 컴포넌트 하이드레이션**으로 처리(테마 토글·검색·폼·모바일 메뉴·기사 액션).
- `trailingSlash: true` → `out/about/index.html` 식 폴더 구조(정적 호스팅 안정).

## 3. 폴더 구조
```
src/
  app/
    layout.tsx          # 루트 레이아웃: <Header/> <BreakingTicker/> <main/> <Footer/>
    page.tsx            # 홈 (HeroLead + SectionBlock×N + Ranking + Opinion + Media + Newsletter)
    globals.css         # 디자인 토큰/유틸/접근성/인쇄 CSS
    [category]/page.tsx # 섹션 목록 (dynamicParams=false, generateStaticParams=8 카테고리)
    article/[slug]/page.tsx # 기사 상세 (62 슬러그, JSON-LD, 읽는시간)
    search/{page,SearchClient}.tsx  # 검색 (서버가 경량 인덱스 주입 → 클라이언트 필터)
    media/page.tsx
    about|careers|subscribe|newsletter|advertise|tips|contact|ethics|login|register|terms|privacy/
    not-found.tsx, loading.tsx, sitemap.ts, robots.ts
  components/           # → 04-components.md
  lib/                  # → 03-content-model.md
```

## 4. 데이터 흐름
```
articles.ts  (ARTICLES   a01–a30)
articles2.ts (ARTICLES_2 a31–a62)
        └──► news.ts  (ALL_ARTICLES = [...배치1, ...배치2])
                  └──► queries.ts  (getLeadArticle, getByCategory, getMostRead, ...)
                            └──► 서버 컴포넌트/페이지에서 호출 → 정적 렌더
```
- **검색만 예외**: `search/page.tsx`(서버)가 `ALL_ARTICLES`에서 **본문 제외 경량 인덱스**(`ArticleListItem[]`)를 만들어 `<SearchClient index=.../>`로 주입 → 클라이언트 번들에서 본문 제외(번들 -30kB).

## 5. 라우팅 규칙
- 정적 라우트(`/about` 등)가 동적 `[category]`보다 **우선**.
- `[category]`/`[slug]` 모두 `export const dynamicParams = false` + `generateStaticParams` → 목록 외 경로는 빌드 시 미생성 → 404(`not-found.tsx` → `out/404.html`).
- 메타데이터 라우트(`sitemap.ts`, `robots.ts`)는 `export const dynamic = "force-static"` (정적 export 호환).

## 6. 서버/클라이언트 경계
- **클라이언트(`"use client"`)**: `Header`, `ThemeToggle`, `NewsletterCTA`, `ArticleActions`, `SearchClient`, 각 폼(`ApplyForm`, `ContactForm`, `TipForm`, `AdInquiryForm`, `LoginForm`, `RegisterForm`, `NewsletterToggle`).
- **서버(기본)**: 나머지 전부(페이지·표시 컴포넌트). 데이터 쿼리는 서버에서 실행.

## 7. 빌드 & 실행
| 명령 | 동작 |
|------|------|
| `npm run dev` | 개발 서버 (localhost:3000) |
| `npm run build` | 정적 export → `out/` |
| `npm run preview:static` | `out/`를 정적 서버로 서빙 (localhost:3001, `scripts/static-server.mjs`) |
| `npm run deploy:cf` | build + `wrangler pages deploy out` |
| `node scripts/shoot.mjs <round> <light\|dark> <core\|full> <fullpage\|fold>` | 리뷰 스크린샷 |

## 8. SSR 안전(하이드레이션) 규칙 — 중요
- 렌더 중 `Math.random()` / `new Date()`(현재시각) 금지 → 서버/클라 불일치. 날짜 포맷은 **UTC 고정**(`lib/utils.ts`의 `formatKoreanDateTime`).
- 현재 시각·랜덤은 **이벤트 핸들러/useEffect** 안에서만(예: 폼 접수번호, 헤더 날짜). → [08-conventions](08-conventions.md)
