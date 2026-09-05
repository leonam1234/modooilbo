# 모두일보 — Claude / 에이전트 진입점

> **세션을 새로 시작했다면 먼저 `HANDOVER.md` 를 읽으십시오.** 열려 있는 작업,
> 막혀 있는 것, 발행 직전 게이트, 하지 말 것이 거기 있습니다.

한국어 온라인 신문사 프론트엔드. **Next.js 15 (App Router) · 정적 export · Cloudflare Pages**.

## 현재 역할과 발행 중단선

- 역할명: **`모두일보 개발 및 배포 담당자`**. 종전 모두일보 총괄·개발담당 업무와 사이트 코딩·유지보수를 이어받는다.
- 신규 패키지는 1차 정적·동적 게이트 뒤 `모두일보 독립 리뷰 담당`(작업 ID `01a05a60-a035-7921-8154-7aa4a7024f31`)에게 기사별 검수를 요청한다. `reviewedBy`·`reviewedAt`·`reporterInsight`와 PASS/HOLD·수정 요구를 회수해 최종 게이트를 완료한다.
- **기사별 상시 자동 배포 승인을 적용한다.** 독립 리뷰 PASS, 동적·최종 게이트 PASS, 필수 사람 검수 필드 완성을 충족한 기사는 별도 승인 질문 없이 즉시 CMS 변환, Git, 빌드, Preview, Production, 라이브 검증까지 진행한다. HOLD·`WAIT_SOURCE_UNTIL`·엠바고·미래 `publishedAt`·기사별 검증·빌드·Preview 실패는 해당 기사만 제외하고 READY 기사를 기다리게 하지 않는다. 조건부 PASS는 재확인 뒤 PASS로 승격될 때 자동 배포한다. 사용자의 현재 중지·보류 지시는 우선한다. 거버넌스 정본은 `wiki/09-publishing.md`, 배포 정본은 `wiki/06-deployment.md`, 현재 실행 체크리스트는 `HANDOVER.md` §5다.
- 운영 라이브 검증 뒤 신규 기사 canonical URL 전건을 `색인 담당자`(작업 ID `019ef3e0-e684-7be0-a164-3cdfacfeb6fa`)에게 전달한다. 메시지 전달·요청 접수·실제 색인 완료를 구분한다.

## 📖 먼저 읽을 것
**[wiki/README.md](wiki/README.md)** — LLM 지식베이스(방향성·아키텍처·디자인·콘텐츠·페이지·배포·컨벤션).
작업 전 **[wiki/08-conventions.md](wiki/08-conventions.md)** 의 불변식을 반드시 확인하세요.
**[wiki/decisions/](wiki/decisions/README.md)** — 과거 결정의 근거. 이상해 보이는 코드를 고치기 전에
여기부터 보세요. **의도인데 버그로 오해하는 일**을 막습니다.
매체화(실데이터·신뢰·유통·수익·법무) **반드시 해야 할 작업**은 **[wiki/operations/README.md](wiki/operations/README.md)** 참조.

## 자주 쓰는 명령
- `npm run dev` (3000) · `npm run build` (정적 export → `out/`) · `npm run preview:static` (3001)
- 기사 승급 명령은 `HANDOVER.md` §5 그대로 실행한다. Preview는 비-master 브랜치에서만 수행하고, 검증 SHA와 `origin/master` 일치 확인 뒤 Production으로 올린다.
- 리뷰 스크린샷: `node scripts/shoot.mjs <round> <light|dark> <core|full> <fullpage|fold>`

## 핵심 불변식 (상세: [wiki/08](wiki/08-conventions.md))
- `isLead` 기사는 **1건만** · 렌더 중 `Date.now`/`Math.random` 금지(날짜는 UTC) · 색은 항상 `dark:` 페어링 · 정적 export 제약(동적 SSR/route handler 불가) · 기사 소비는 `lib/queries.ts` 경유.

## 검증 루틴
일반 코드 변경은 `npm run build` → `npm run preview:static` → 화면 판독을 수행합니다. 기사
패키지 발행은 이 일반 루틴을 먼저 실행하지 않고, `HANDOVER.md` §5에 따라 기사별 독립 리뷰와
동적·최종 게이트가 PASS이고 필수 사람 검수 필드가 완성된 READY 기사부터 CMS 변환·게이트·빌드
→ Git 커밋 → Preview 엔진·뷰포트 4조합 → Production → 라이브 재검증 → 색인 인계를 자동으로
이어 수행합니다. HOLD·시간 제한·기사별 실패는 해당 기사만 제외합니다.

## 설계 문서를 쓰면서 작업합니다
되돌리기 어렵거나 · 대안이 여럿이었거나 · 나중에 "왜 이렇게 했지?" 소리가 나올 작업이면
**시작할 때** `wiki/decisions/` 에 문서를 만들고 진행하면서 채웁니다(끝나고 몰아 쓰지 않습니다 —
결론에 맞춰 근거를 지어내게 됩니다). `_template.md` 복사해 시작하세요.
**버린 안과 그 이유를 반드시 남깁니다** — 없으면 다음 사람이 같은 안을 다시 꺼냅니다.
규약: [wiki/decisions/README.md](wiki/decisions/README.md)
