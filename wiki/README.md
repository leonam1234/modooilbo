# 모두일보 위키 — LLM Knowledge Base

이 폴더는 **모두일보(Modoo Ilbo)** 프로젝트의 단일 진실 공급원(SSOT)이자, AI 에이전트·협업자가 빠르게 맥락을 잡기 위한 **LLM 친화 지식베이스**입니다. 새 세션의 에이전트는 여기부터 읽으세요.

> **한 줄 요약** — 모두일보는 **실운영 중인 한국어 독립 디지털 언론**입니다(인터넷신문 등록 경기 아54891, 법인 주식회사 모두일보). 두 축 편집 체계 — ① 기업 공공데이터 뉴스 6부문(정부지원금·공공입찰·창업상권·산업트렌드·채용노무·계약거래), ② 종합뉴스(경제·사회·국제·문화·스포츠·오피니언, 테크는 동결) — 로 **품질 통과분을 하루 최대 24편** 발행합니다. 기술은 Next.js 15 정적 export + **Cloudflare Pages Functions·D1·KV·R2 하이브리드**(인증·댓글·뉴스레터·조회수는 동적, 이미지는 img.modooilbo.com R2 서빙). 2026-09-02 기준 기사 Markdown 1,277편, 13개 유효 카테고리(일일 편성 12개), 라이트/다크·반응형입니다.
>
> ⚠️ 이 위키의 세부 문서 일부는 프로토타입 시절 서술이 남아 있습니다. 구현과 어긋나면 **코드가 정본**입니다. 발행·검증은 [09-publishing](09-publishing.md), 배포·승급은 [06-deployment](06-deployment.md)이 운영 정본입니다.

## 🤖 에이전트용 권장 읽기 순서
1. [00-direction](00-direction.md) — **무엇을·왜** (방향성·브랜드·원칙·로드맵)
2. [01-architecture](01-architecture.md) — **어떻게 돌아가는가** (스택·구조·렌더링·데이터 흐름)
3. [03-content-model](03-content-model.md) — 데이터 모델 & 쿼리 API
4. [02-design-system](02-design-system.md) — 디자인 토큰 & 컴포넌트 규칙
5. [08-conventions](08-conventions.md) — **작업 전 필독**: 추가/수정 규칙 + 불변식(invariants)

## 📚 전체 목차
| # | 문서 | 내용 |
|---|------|------|
| 00 | [방향성](00-direction.md) | 브랜드·미션·포지셔닝·편집원칙·비즈니스·로드맵 |
| 01 | [아키텍처](01-architecture.md) | 스택·폴더구조·렌더링 모델·데이터 흐름·라우팅 |
| 02 | [디자인 시스템](02-design-system.md) | 컬러/타이포/그리드/다크모드/접근성/유틸 |
| 03 | [콘텐츠 모델](03-content-model.md) | 타입·카테고리(두 축)·쿼리 API |
| 04 | [컴포넌트](04-components.md) | 컴포넌트 카탈로그 + ArticleCard 변형 |
| 05 | [페이지 맵](05-pages.md) | 전 라우트 목록 + 목적 + 렌더 방식 |
| 06 | [배포](06-deployment.md) | Cloudflare Pages 최적화 + 승급 경로 |
| 07 | [리뷰·QA](07-review-qa.md) | 스크린샷 리뷰 루프 방법론 + 결과 |
| 08 | [컨벤션](08-conventions.md) | 코드 규칙·불변식·추가 방법·에이전트 가이드 |
| 09 | [발행·검증 시스템](09-publishing.md) | **독립 리뷰·명시 승인·품질 통과분만 최대 24편·80점 출고선·Preview/라이브 검증·색인 인계** |

## 🚀 운영 로드맵 (매체화 — 반드시 해야 할 작업)
매체화 필수작업의 SSOT(상당수 완료: 법인·인터넷신문 등록·뉴스레터 실연동·유튜브 sameAs — 각 문서의 체크리스트 참조). → **[operations/README.md](operations/README.md)**
| 순위 | 문서 | 내용 |
|---|------|------|
| 0(선행) | [operations/00-prerequisites](operations/00-prerequisites.md) | CMS 실데이터화·한국 유통(네이버/다음/구글뉴스)·인터넷신문 법적등록 |
| 2 | [operations/01-trust-eeat](operations/01-trust-eeat.md) | 기자 프로필·정정/반론 워크플로·사진 저작권 |
| 3 | [operations/02-growth-and-revenue](operations/02-growth-and-revenue.md) | 측정(애널리틱스/GSC)·뉴스레터·수익화·댓글 |
| 보조 | [operations/03-supplementary](operations/03-supplementary.md) | 실시간성(ISR)·AI인용(GEO/AEO)·이미지 파이프라인·접근성/다국어 |

## 🗺️ 리포 맵 (핵심 경로)
```
src/
  app/                 # Next App Router (라우트 = 폴더)
    layout.tsx         # 루트 레이아웃 (Header+Ticker+Footer 셸)
    page.tsx           # 홈
    [category]/        # 종합뉴스 7종, 정적 생성
    grants|bids|startup|industry|labor|deals/  # 사업 6종 전용 정적 라우트
    article/[slug]/    # 기사 상세 (Markdown 1,277편 기준, 정적 생성)
    search/, about/, careers/ ...  # 검색·회사 페이지
    sitemap.xml/, news-sitemap.xml/, robots.txt/, rss.xml/  # 정적 route handlers
    not-found.tsx, loading.tsx
  components/          # 재사용 컴포넌트 (Header, ArticleCard, ...)
  lib/                 # 데이터·로직 (types, categories, articles, news, queries, utils)
  app/globals.css      # 디자인 토큰 CSS (폰트/유틸/접근성/인쇄)
tailwind.config.ts     # signal/ink 컬러, 폰트, 애니메이션
scripts/shoot.mjs      # 리뷰용 스크린샷 캡쳐 (Playwright)
scripts/static-server.mjs  # out/ 정적 서빙 (CF 동작 근사)
```

## ✅ 현재 상태 (스냅샷)
- 빌드: 최근 green(정적 export 1,400페이지 이상) · 타입체크 pass
- 리뷰: 10라운드 + Cloudflare 라운드 완료 → [07-review-qa](07-review-qa.md)
- 배포: Cloudflare Pages 운영 중. 비-master Preview 검증 뒤 SHA 3자 일치 시 통제된 Production 승급

## 🔗 루트 문서 (이 위키의 원천/보완)
- [decisions/](decisions/) — **결정 기록** (왜 그렇게 했고 무엇을 버렸는가)
- [archive/](archive/) — 역할이 끝난 문서(PLAN·REVIEW·DEPLOY·DEPLOYMENT)
- [docs/AGENT_BRIEF.md](../docs/AGENT_BRIEF.md) — 페이지 작성 에이전트 공통 브리핑
