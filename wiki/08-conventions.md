# 08 · 컨벤션 & 불변식 (작업 전 필독)

> 이 리포에서 코드를 추가/수정하는 에이전트·개발자를 위한 규칙. 위반 시 빌드 깨짐·하이드레이션 오류·디자인 불일치가 발생한다.

## 🔒 불변식 (Invariants) — 깨지 말 것
1. **단일 리드**: `isLead` 기사는 **전체 1건**. 새 기사에 `isLead: true` 추가 금지.
2. **SSR 안전(하이드레이션)**: 렌더 경로에서 `Math.random()` / `new Date()`(현재시각) 금지. 날짜는 [utils.formatKoreanDateTime](../src/lib/utils.ts)의 **UTC 고정** 사용. 현재시각·랜덤·접수번호는 `useEffect`/이벤트 핸들러 안에서만.
3. **라이트/다크 페어링**: 색 유틸은 항상 `dark:` 동반. (`text-ink-900 dark:text-white` 등) → [02-design-system](02-design-system.md)
4. **폭 래퍼**: 페이지 콘텐츠는 `container-page` 안에.
5. **헤드라인 폰트**: 제목엔 `font-headline`(세리프).
6. **정적 export 제약**: 동적 SSR/route handler/서버액션/미들웨어 런타임 금지. 새 동적 라우트엔 `generateStaticParams` + `dynamicParams=false` 필수. 메타 라우트엔 `dynamic="force-static"`.
7. **데이터 단일 출처**: 기사 소비는 항상 `queries.ts`(→ `ALL_ARTICLES`). 컴포넌트에서 `articles.ts`/`articles2.ts` 직접 임포트 금지.

## 🎨 스타일 규약
- Tailwind 유틸 우선. 토큰은 `signal-*`/`ink-*`만(임의 HEX 지양, 소셜 브랜드색 예외).
- className 결합은 [cn()](../src/lib/utils.ts).
- 폼 필드/버튼/카드 클래스 레시피는 [docs/AGENT_BRIEF.md](../docs/AGENT_BRIEF.md) 그대로.
- 내부 링크 `next/link`, 이미지 `next/image`.

## 🧩 컴포넌트 규약
- 서버 컴포넌트 기본. 상태/이벤트/브라우저 API가 필요할 때만 `"use client"`.
- 기사 리스트는 [ArticleCard](../src/components/ArticleCard.tsx) 변형 재사용(새로 만들지 말 것). → [04-components](04-components.md)
- 인터랙티브 폼은 **page.tsx(서버) + 자식 `'use client'` 폼** 패턴.

## ➕ 추가 방법 (How-to)
**페이지 추가**: `src/app/<route>/page.tsx` 생성 → `export const metadata` → `PageHeader` + `container-page`. 폼 있으면 `./XxxForm.tsx`(client) 분리.
**기사 추가**: [03-content-model §5](03-content-model.md) 참고(고유 id/slug/seed, isLead 금지) → `npm run build`.
**카테고리 추가**: [categories.ts](../src/lib/categories.ts)의 `CATEGORIES` + `CategorySlug` 유니온에 추가 → `/[category]` 자동 생성(해당 카테고리 기사 존재해야 의미 있음).
**아이콘 추가**: [icons.tsx](../src/components/icons.tsx)에 인라인 SVG.

## ✅ 변경 후 검증 (필수)
```bash
npm run build       # 타입 + 정적 export green 확인 (가장 강한 게이트)
npm run preview:static   # 또는 npm run dev
node scripts/shoot.mjs verify light core fold   # PC/모바일 PNG 직접 판독
```
라이트/다크 + PC/모바일 양쪽 확인. → [07-review-qa](07-review-qa.md)

## 🤖 LLM 에이전트 가이드
- **진실의 위치**: 데이터=`lib/`, 디자인 토큰=`tailwind.config.ts`+`globals.css`, 라우트=`app/`. 이 위키는 지도일 뿐, 충돌 시 **코드가 우선**. 위키가 코드와 어긋나면 위키를 고쳐라.
- **읽기 순서**: [README](README.md) → 00 → 01 → 03 → 02 → 08.
- **작업 원칙**: 불변식 준수 → 작게 변경 → `npm run build`로 검증 → 스크린샷으로 시각 확인 → 위키/PLAN/REVIEW 갱신.
- **환경**: Windows, PowerShell. 정적 서버는 `node scripts/static-server.mjs`(:3001).
