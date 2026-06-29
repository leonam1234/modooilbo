# 모두일보 위키 — LLM Knowledge Base

이 폴더는 **모두일보(Modoo Ilbo)** 프로젝트의 단일 진실 공급원(SSOT)이자, AI 에이전트·협업자가 빠르게 맥락을 잡기 위한 **LLM 친화 지식베이스**입니다. 새 세션의 에이전트는 여기부터 읽으세요.

> **한 줄 요약** — 모두일보는 Next.js 15(App Router · 정적 export) 기반 **한국어 온라인 신문사 프론트엔드**입니다. Cloudflare Pages 배포에 최적화됐고, 자체 디자인 시스템(시그널 레드 + 잉크 뉴트럴), 더미 기사 62건, 20여 개 페이지, 라이트/다크·반응형을 갖췄습니다. 백엔드 없는 프로토타입(데이터·폼 데모).

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
| 03 | [콘텐츠 모델](03-content-model.md) | 타입·카테고리·더미데이터·쿼리 API |
| 04 | [컴포넌트](04-components.md) | 컴포넌트 카탈로그 + ArticleCard 변형 |
| 05 | [페이지 맵](05-pages.md) | 전 라우트 목록 + 목적 + 렌더 방식 |
| 06 | [배포](06-deployment.md) | Cloudflare Pages 최적화 + 승급 경로 |
| 07 | [리뷰·QA](07-review-qa.md) | 스크린샷 리뷰 루프 방법론 + 결과 |
| 08 | [컨벤션](08-conventions.md) | 코드 규칙·불변식·추가 방법·에이전트 가이드 |

## 🗺️ 리포 맵 (핵심 경로)
```
src/
  app/                 # Next App Router (라우트 = 폴더)
    layout.tsx         # 루트 레이아웃 (Header+Ticker+Footer 셸)
    page.tsx           # 홈
    [category]/        # 섹션 (8종, 정적)
    article/[slug]/    # 기사 상세 (62종, 정적)
    search/, media/, about/, careers/ ...  # 검색·미디어·회사 페이지
    sitemap.ts, robots.ts, not-found.tsx, loading.tsx
  components/          # 재사용 컴포넌트 (Header, ArticleCard, ...)
  lib/                 # 데이터·로직 (types, categories, articles, news, queries, utils)
  app/globals.css      # 디자인 토큰 CSS (폰트/유틸/접근성/인쇄)
tailwind.config.ts     # signal/ink 컬러, 폰트, 애니메이션
scripts/shoot.mjs      # 리뷰용 스크린샷 캡쳐 (Playwright)
scripts/static-server.mjs  # out/ 정적 서빙 (CF 동작 근사)
```

## ✅ 현재 상태 (스냅샷)
- 빌드: ✅ green (정적 export, 90 페이지) · 타입체크 ✅ pass
- 리뷰: 10라운드 + Cloudflare 라운드 완료 → [07-review-qa](07-review-qa.md)
- 배포: ✅ Cloudflare Pages 준비 완료 (`npm run deploy:cf`)

## 🔗 루트 문서 (이 위키의 원천/보완)
- [PLAN.md](../PLAN.md) — 전체 계획·진행 로그
- [REVIEW.md](../REVIEW.md) — 리뷰 라운드 상세 로그
- [DEPLOY.md](../DEPLOY.md) — 배포 상세
- [docs/AGENT_BRIEF.md](../docs/AGENT_BRIEF.md) — 페이지 작성 에이전트 공통 브리핑
