# 운영 로드맵 — 매체화 작업 위키 (Operations)

> **이 폴더의 목적** — 모두일보를 "프로토타입(더미데이터·정적 export)"에서 **실제 운영되는 언론 매체**로 끌어올리기 위해 **반드시 해야 하는 작업**을 다음 작업자(사람·LLM 에이전트)가 바로 착수할 수 있도록 정리한 SSOT다. SEO 기반 작업(→ 루트 `wiki/` 본편)은 "발견되게" 만드는 단계까지 완료됐고, 이 폴더는 그 위에 얹히는 **콘텐츠·신뢰·유통·수익·법무·운영** 레이어를 다룬다.
>
> **읽는 사람에게**: 여기 적힌 항목은 "있으면 좋은 것"이 아니라 **매체 운영의 필수 요건**이다. 우선순위와 선행관계를 지켜 순차 진행하라. 각 문서는 *왜 필요한가 → 현재 상태 → 정적 export 제약 → 구현 방향 → 실연동 지점 → 완료 기준(체크리스트) → 위험*을 담는다.

## 🤖 에이전트용 권장 읽기 순서
1. 루트 [wiki/README.md](../README.md) + [00-direction](../00-direction.md)(왜·로드맵) + [08-conventions](../08-conventions.md)(불변식) — **작업 전 필독**
2. 이 폴더 [00-prerequisites](00-prerequisites.md) — **선행조건**(이게 없으면 2·3순위가 의미 없음)
3. [01-trust-eeat](01-trust-eeat.md) — 2순위(신뢰·E-E-A-T)
4. [02-growth-and-revenue](02-growth-and-revenue.md) — 3순위(측정·성장·수익)
5. [03-supplementary](03-supplementary.md) — 보조(실시간성·GEO/AEO·이미지·접근성)

## 📊 우선순위 매트릭스
| 순위 | 항목 | 문서 | 정적export 내 가능? | 선행조건 |
|------|------|------|:---:|------|
| **0 (선행)** | CMS 실데이터화 | [00](00-prerequisites.md) | 부분(빌드주입 O / 실시간 X→Workers 승급) | — |
| **0 (선행)** | 한국 유통(네이버·다음·구글뉴스) | [00](00-prerequisites.md) | O | 실콘텐츠 |
| **0 (선행)** | 인터넷신문 법적 등록 | [00](00-prerequisites.md) | O(표기만) | 사업 결정 |
| **2** | 기자 프로필 시스템 | [01](01-trust-eeat.md) | **O** | CMS(저자데이터) |
| **2** | 정정·반론 보도 워크플로 | [01](01-trust-eeat.md) | O | CMS |
| **2** | 사진·콘텐츠 저작권 체계 | [01](01-trust-eeat.md) | O | — |
| **3** | 측정 인프라(애널리틱스/GSC) | [02](02-growth-and-revenue.md) | **O(즉시)** | — |
| **3** | 뉴스레터 실연동 | [02](02-growth-and-revenue.md) | O(외부 폼/액션) | 이메일 ESP |
| **3** | 수익화(구독결제·광고·후원) | [02](02-growth-and-revenue.md) | 부분(결제는 외부 위젯/리다이렉트) | PG·사업자 |
| **3** | 댓글·커뮤니티 | [02](02-growth-and-revenue.md) | 부분(외부위젯 O / 자체 X) | — |
| **보조** | 속보 실시간성(ISR/cron) | [03](03-supplementary.md) | X→Workers 승급 | — |
| **보조** | AI 인용(GEO/AEO) | [03](03-supplementary.md) | **O** | — |
| **보조** | 이미지 파이프라인(WebP/loader) | [03](03-supplementary.md) | O | 고해상도 실이미지 |
| **보조** | 접근성·다국어 | [03](03-supplementary.md) | O | — |

## 🚦 권장 실행 순서(의존성 기준)
```
측정(3-측정, 즉시·반나절)            ← 데이터 없이는 개선 방향을 모름
   └─ CMS(0-선행, 매체의 척추)
         ├─ 기자 프로필(2)  ── 한국 유통 등록(0)
         ├─ 정정·반론(2)
         └─ 뉴스레터(3) ─ 수익화(3) ─ 댓글(3)
보조(GEO/AEO·접근성)는 병행 가능 / 이미지·실시간성은 실데이터 후
```

## ✅ 이미 완료된 토대 (이 위에 작업)
- SEO: canonical 정규화·sitemap/news-sitemap·NewsArticle/CollectionPage/NewsMediaOrganization JSON-LD·OG/Twitter·robots(AI크롤러 허용)·RSS·`_headers` 캐시/HSTS — 상세는 메모리 `seo-overhaul-2026-06` 및 커밋 `d1dff25~ce71a3b`.
- 윤리강령/정정·반론 **정책문**: `src/app/ethics/page.tsx`에 텍스트 골격 존재(운영 *시스템*은 미구현 → [01](01-trust-eeat.md)).
- `public/llms.txt` 존재(→ [03](03-supplementary.md)에서 고도화).
- Cloudflare beacon 흔적: `src/app/layout.tsx`(→ [02](02-growth-and-revenue.md)에서 정식화).

## ⚠️ 전 항목 공통 불변식 (어기지 말 것)
정적 export 제약·SSR안전(렌더중 Date.now/Math.random 금지)·단일 리드·dark: 페어링·`queries.ts` 단일 출처 등은 [08-conventions](../08-conventions.md)를 따른다. **동적 기능(인증·댓글·서버검색·결제콜백·ISR)이 필요해지면** `output:"export"`를 버리고 `@opennextjs/cloudflare`(Workers)로 승급 — 경로는 [06-deployment §5](../06-deployment.md).
