# 05 · 페이지 맵 (Pages / Routes)

App Router. 전부 정적(Static) 또는 SSG. 빌드 시 90개 페이지 생성.

## 뉴스
| 경로 | 파일 | 목적 | 렌더 |
|------|------|------|------|
| `/` | [page.tsx](../src/app/page.tsx) | 홈 — 리드·섹션·랭킹·오피니언·미디어·뉴스레터 | Static |
| `/[category]` | [\[category\]/page.tsx](../src/app/[category]/page.tsx) | 섹션 목록(8종) — 리드 + 그리드 + 사이드 랭킹 | SSG×8 |
| `/article/[slug]` | [article/\[slug\]/page.tsx](../src/app/article/[slug]/page.tsx) | 기사 상세 — 본문·액션·태그·관련기사·JSON-LD·읽는시간 | SSG×62 |
| `/search` | [search/page.tsx](../src/app/search/page.tsx) + [SearchClient](../src/app/search/SearchClient.tsx) | 검색(클라 필터, 서버 인덱스 주입) | Static |
| `/media` | [media/page.tsx](../src/app/media/page.tsx) | 포토·영상 그리드 | Static |

> `/opinion`은 별도 페이지가 아니라 `[category]`의 opinion 슬러그로 처리.

## 회사 · 서비스
| 경로 | 파일 | 비고 |
|------|------|------|
| `/about` | [about](../src/app/about/page.tsx) | 회사소개(미션·가치·연혁·조직) |
| `/careers` | [careers](../src/app/careers/page.tsx) + ApplyForm | **인재채용·기자모집** + 지원폼 |
| `/subscribe` | [subscribe](../src/app/subscribe/page.tsx) | 구독·후원 요금제 3종 |
| `/newsletter` | [newsletter](../src/app/newsletter/page.tsx) + NewsletterToggle | 뉴스레터 종류 + 구독 |
| `/advertise` | [advertise](../src/app/advertise/page.tsx) + AdInquiryForm | 광고·제휴 + 문의폼 |
| `/tips` | [tips](../src/app/tips/page.tsx) + TipForm | 제보(익명 옵션) |
| `/contact` | [contact](../src/app/contact/page.tsx) + ContactForm | 고객센터 + 문의폼 |
| `/ethics` | [ethics](../src/app/ethics/page.tsx) | 윤리강령·편집위원회·청소년보호 |
| `/login` | [login](../src/app/login/page.tsx) + LoginForm | 로그인 + 소셜 |
| `/register` | [register](../src/app/register/page.tsx) + RegisterForm | 회원가입 |
| `/terms` | [terms](../src/app/terms/page.tsx) | 이용약관 |
| `/privacy` | [privacy](../src/app/privacy/page.tsx) | 개인정보처리방침 |

## 시스템
| 경로 | 파일 | 비고 |
|------|------|------|
| (404) | [not-found.tsx](../src/app/not-found.tsx) | 브랜드형 404 → `out/404.html` |
| (로딩) | [loading.tsx](../src/app/loading.tsx) | 라우트 전환 스피너 |
| `/robots.txt` | [robots.ts](../src/app/robots.ts) | `force-static` |
| `/sitemap.xml` | [sitemap.ts](../src/app/sitemap.ts) | 정적+카테고리+기사 전체 |

## 공통 레이아웃
[layout.tsx](../src/app/layout.tsx): `<skip-link>` → `<Header/>` → `<BreakingTicker/>` → `<main id="content">{children}</main>` → `<Footer/>`. 메타데이터 `title.template = "%s | 모두일보"`.
