# 모두일보 — Claude / 에이전트 진입점

> **세션을 새로 시작했다면 먼저 `HANDOVER.md` 를 읽으십시오.** 열려 있는 작업,
> 막혀 있는 것, 발행 직전 게이트, 하지 말 것이 거기 있습니다.

한국어 온라인 신문사 프론트엔드. **Next.js 15 (App Router) · 정적 export · Cloudflare Pages**.

## 📖 먼저 읽을 것
**[wiki/README.md](wiki/README.md)** — LLM 지식베이스(방향성·아키텍처·디자인·콘텐츠·페이지·배포·컨벤션).
작업 전 **[wiki/08-conventions.md](wiki/08-conventions.md)** 의 불변식을 반드시 확인하세요.
**[wiki/decisions/](wiki/decisions/README.md)** — 과거 결정의 근거. 이상해 보이는 코드를 고치기 전에
여기부터 보세요. **의도인데 버그로 오해하는 일**을 막습니다.
매체화(실데이터·신뢰·유통·수익·법무) **반드시 해야 할 작업**은 **[wiki/operations/README.md](wiki/operations/README.md)** 참조.

## 자주 쓰는 명령
- `npm run dev` (3000) · `npm run build` (정적 export → `out/`) · `npm run preview:static` (3001)
- `npm run deploy:cf` — Cloudflare Pages 배포
- 리뷰 스크린샷: `node scripts/shoot.mjs <round> <light|dark> <core|full> <fullpage|fold>`

## 핵심 불변식 (상세: [wiki/08](wiki/08-conventions.md))
- `isLead` 기사는 **1건만** · 렌더 중 `Date.now`/`Math.random` 금지(날짜는 UTC) · 색은 항상 `dark:` 페어링 · 정적 export 제약(동적 SSR/route handler 불가) · 기사 소비는 `lib/queries.ts` 경유.

## 검증 루틴
변경 후 → `npm run build`(green) → `npm run preview:static` → 스크린샷 판독(PC/모바일·라이트/다크).

## 설계 문서를 쓰면서 작업합니다
되돌리기 어렵거나 · 대안이 여럿이었거나 · 나중에 "왜 이렇게 했지?" 소리가 나올 작업이면
**시작할 때** `wiki/decisions/` 에 문서를 만들고 진행하면서 채웁니다(끝나고 몰아 쓰지 않습니다 —
결론에 맞춰 근거를 지어내게 됩니다). `_template.md` 복사해 시작하세요.
**버린 안과 그 이유를 반드시 남깁니다** — 없으면 다음 사람이 같은 안을 다시 꺼냅니다.
규약: [wiki/decisions/README.md](wiki/decisions/README.md)
