# 시그널저널 — Claude / 에이전트 진입점

한국어 온라인 신문사 프론트엔드. **Next.js 15 (App Router) · 정적 export · Cloudflare Pages**.

## 📖 먼저 읽을 것
**[wiki/README.md](wiki/README.md)** — LLM 지식베이스(방향성·아키텍처·디자인·콘텐츠·페이지·배포·컨벤션).
작업 전 **[wiki/08-conventions.md](wiki/08-conventions.md)** 의 불변식을 반드시 확인하세요.

## 자주 쓰는 명령
- `npm run dev` (3000) · `npm run build` (정적 export → `out/`) · `npm run preview:static` (3001)
- `npm run deploy:cf` — Cloudflare Pages 배포
- 리뷰 스크린샷: `node scripts/shoot.mjs <round> <light|dark> <core|full> <fullpage|fold>`

## 핵심 불변식 (상세: [wiki/08](wiki/08-conventions.md))
- `isLead` 기사는 **1건만** · 렌더 중 `Date.now`/`Math.random` 금지(날짜는 UTC) · 색은 항상 `dark:` 페어링 · 정적 export 제약(동적 SSR/route handler 불가) · 기사 소비는 `lib/queries.ts` 경유.

## 검증 루틴
변경 후 → `npm run build`(green) → `npm run preview:static` → 스크린샷 판독(PC/모바일·라이트/다크).
