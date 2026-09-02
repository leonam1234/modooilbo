# 05 · 페이지 맵 (Pages / Routes)

App Router. 전부 Static 또는 SSG. 2026-09-02 기준 기사 Markdown **1,277편**, 빌드 산출물은
**1,400페이지 이상**이다.

> 2026-08-21 전면 갱신. 종전 판은 "90개 페이지 · 카테고리 8종 · 기사 62편" 기준이었고
> 이미 삭제된 `/media` 와 `sitemap.ts` 를 싣고 있었다.

## 1. 뉴스

| 경로 | 파일 | 목적 | 생성 수 |
|---|---|---|---|
| `/` | [page.tsx](../src/app/page.tsx) | 홈 — 히어로 + 기업데이터 6섹션 + 종합뉴스 6섹션 | 1 |
| `/article/[slug]` | [article/\[slug\]](../src/app/article/[slug]/page.tsx) | 기사 상세 | **1,277** |
| `/[category]` | [\[category\]](../src/app/[category]/page.tsx) | 종합뉴스 섹션 목록 | 7 |
| `/[category]/page/[n]` | [+ page/\[page\]](../src/app/[category]/page/[page]/page.tsx) | 종합 페이지네이션 | 다수 |
| `/grants` `/bids` `/startup` `/industry` `/labor` `/deals` | 각 디렉터리 | **사업 축 6종**(별도 라우트) | 6 + 각 `/page/[n]` |
| `/reporter/[slug]` (+ `/page/[n]`) | [reporter/\[slug\]](../src/app/reporter/[slug]/page.tsx) | 기자 프로필 + 기사 목록 | 8명 |
| `/search` | [search](../src/app/search/page.tsx) | 검색(클라 필터 + 인덱스 JSON) | 1 |

⚠️ **사업 축은 `[category]` 동적 라우트가 아니라 각자 디렉터리**를 가진다.
종합뉴스 루프가 사업 축을 순회하지 않게 하려는 의도적 분리다([03 §2](03-content-model.md)).
목록 화면 자체는 [CategoryListPage](../src/components/CategoryListPage.tsx) 하나로 구현돼 있다.

⚠️ `/opinion` 은 별도 페이지가 아니라 `[category]` 의 opinion 슬러그다.
`/tech` 는 편성에서 빠졌지만 색인 보존을 위해 라우트는 살아 있다.

## 2. 편집국 · 신뢰

| 경로 | 비고 |
|---|---|
| `/newsroom` | 편집국 소개 — 기자 6명(명단 제외 2명은 목록에서만 빠짐) |
| `/corrections` | 정정·반론 보도 모음 — `correction` 필드가 있는 기사만 |
| `/ethics` | 윤리강령·청소년보호 |
| `/policy` | 운영정책 — 허위조작정보·신고·이의신청·댓글·팩트체크·투명성 + **7절 AI 활용 고지** ([decisions/0001](decisions/0001-ai-disclosure-scope.md)) |
| `/transparency` | 투명성 보고 |
| `/committee` | 편집위원회 |
| `/ombudsman` | 고충처리인 |
| `/about` | 회사소개 — 미션·가치·연혁 |
| `/partners` | 제휴·광고주 |

## 3. 서비스 · 계정

| 경로 | 비고 |
|---|---|
| `/subscribe` `/newsletter` | 구독·후원, 뉴스레터 |
| `/advertise` `/tips` `/contact` `/careers` | 광고문의·제보·문의·채용 |
| `/login` `/register` `/account` | 로그인·가입·내 계정 |
| `/forgot` `/reset` `/verify-email` `/verify-signup` | 비밀번호 재설정·이메일 인증 |
| `/terms` `/privacy` | 약관·개인정보처리방침 |
| `/weather` | 날씨 |

⚠️ 이 폼들은 **데모가 아니다.** [functions/api/](../functions/api/)(Cloudflare Pages
Functions + D1)가 실제로 처리한다 — [04 §8](04-components.md) 참조.

## 4. 피드 · 사이트맵 (route handler, `force-static`)

| 경로 | 파일 | 비고 |
|---|---|---|
| `/sitemap.xml` | [sitemap.xml/route.ts](../src/app/sitemap.xml/route.ts) | **인덱스** — 아래 둘을 가리킴 |
| `/sitemap-pages.xml` | [route](../src/app/sitemap-pages.xml/route.ts) | 정적 페이지 + 기자 프로필 |
| `/sitemap-articles/[year]/sitemap.xml` | [route](../src/app/sitemap-articles/[year]/sitemap.xml/route.ts) | 연도별 기사 |
| `/news-sitemap.xml` | [route](../src/app/news-sitemap.xml/route.ts) | 구글 뉴스용(최근분) |
| `/rss.xml` | [route](../src/app/rss.xml/route.ts) | RSS. **IndexNow 통지 URL 목록의 출처** |
| `/articles-index.json` | [route](../src/app/articles-index.json/route.ts) | 검색용 경량 인덱스. `?v=CONTENT_VERSION` 으로 캐시 무효화 |
| `/robots.txt` | [robots.txt/route.ts](../src/app/robots.txt/route.ts) | AI 크롤러 허용 |

⚠️ 종전 문서의 `sitemap.ts` 는 2026-07-31 에 위 구조로 대체됐다.
사이트맵 구성 로직은 [sitemap-parts.ts](../src/lib/sitemap-parts.ts) 에 있고,
기자 프로필 등재는 `REPORTER_INDEXABLE` 로 게이트된다(noindex 페이지가 사이트맵에
남는 드리프트 방지).

## 5. 시스템

| 경로 | 파일 |
|---|---|
| (404) | [not-found.tsx](../src/app/not-found.tsx) → `out/404.html` |
| (로딩) | [loading.tsx](../src/app/loading.tsx) |

## 6. 공통 레이아웃

[layout.tsx](../src/app/layout.tsx):
skip-link → `Header` → `TrendingTags` → `BreakingTicker` → `<main id="content">` → `Footer`
+ `BackToTop` · `ThirdPartyScripts` · 날씨 배경.
메타데이터 `title.template = "%s | 모두일보"`.

## 7. 삭제된 라우트 (되살리지 말 것)

| 경로 | 삭제 | 이유 |
|---|---|---|
| `/media` | 2026-07-08 | 대표 지시로 유튜브 노출 전면 철수. `MediaGrid` 도 함께 제거 |
