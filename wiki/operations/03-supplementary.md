# 03 · 보조 제안 (Supplementary)

> 핵심 로드맵을 보강하는 항목. GEO/AEO·접근성은 지금 바로, 실시간성·이미지 파이프라인은 실데이터/Workers 전환 시점에.

---

## ⑪ 속보 실시간성 (ISR / Cron)

### 왜 필요한가
뉴스의 생명은 속도. 현재 sitemap·news-sitemap·RSS·페이지는 **빌드 시점에 고정**된다. 발행 즉시 노출이 안 되면 Top Stories·속보 경쟁에서 진다.

### 현재 상태
- 전 페이지 정적 export. 변경 반영은 재빌드뿐.

### 정적 export 제약
- 실시간 반영 불가 → **승급 필요**.

### 구현 방향
1. **단기(정적 유지)**: CMS 발행 웹훅 → Cloudflare Pages Deploy Hook 재빌드. 또는 Cloudflare **Cron Trigger**로 주기적 재빌드(예: 5~15분). 발행량 적을 때 충분.
2. **본격**: `@opennextjs/cloudflare`(Workers) 승급 → ISR/온디맨드 재검증으로 기사만 부분 갱신. → [06 §5](../06-deployment.md)
3. **속보 배너/티커**: `BreakingTicker`는 빌드 고정 → 실시간이면 클라이언트가 경량 JSON(엣지 KV) 폴링.

### 완료 기준 ✅
- [ ] 발행→노출 지연 목표 정의(예: ≤5분)
- [ ] 웹훅/Cron 재빌드 또는 ISR 동작
- [ ] news-sitemap이 신규 기사 자동 반영

### 위험
- 잦은 전체 재빌드는 빌드시간·비용↑ — 발행량 보고 ISR 승급 판단.

---

## ⑫ AI 인용 최적화 (GEO / AEO) — 지금 가능

### 왜 필요한가
검색의 무게중심이 **생성형 답변(ChatGPT·Perplexity·Google AI Overviews)** 으로 이동. AI가 인용하기 좋게 구조화하면 새 유입 채널이 열린다(GEO=Generative Engine Optimization, AEO=Answer Engine Optimization).

### 현재 상태
- `robots.ts`에 주요 AI 크롤러 **명시 허용**(GPTBot/ClaudeBot/anthropic-ai/PerplexityBot/Google-Extended/CCBot/Applebot-Extended).
- `public/llms.txt` **존재**(내용 고도화 필요).
- 기사 NewsArticle JSON-LD·요약(`summary`) 보유.

### 정적 export 제약
없음.

### 구현 방향
1. **`llms.txt` 고도화**: 매체 소개·주요 섹션·정책·연락처·라이선스·핵심 URL 목록을 LLM 친화 구조로. (선택) `llms-full.txt`.
2. **답변 친화 구조**: 기사 상단 핵심요약(TL;DR)·불릿·Q&A 블록. 적절 시 `FAQPage`/`QAPage` 스키마.
3. **인용 가능성**: 명확한 발행일·저자·출처(E-E-A-T와 동반). 데이터 저널리즘은 표/수치 구조화.
4. **정책 결정**: AI 학습 허용 범위(`Google-Extended` 등) — 콘텐츠 개방 지향과 정합.

### 완료 기준 ✅
- [ ] `llms.txt` 실내용으로 고도화
- [ ] 기사 TL;DR/요약 구조 + 필요한 곳 FAQ 스키마
- [ ] AI Overviews·Perplexity 인용 모니터링

### 위험
- 과도한 요약 자동화는 사실오류 전파 — 편집 검수 유지.

---

## ⑬ 이미지 파이프라인 (WebP / 커스텀 loader / srcset)

### 왜 필요한가
모바일 LCP·대역폭. 단 **현재는 보류 상태**(전문가 판단).

### 현재 상태 / 보류 사유
- 스톡 이미지가 이미 장당 ~50–70KB로 작아 **ROI 낮고**, 커스텀 loader는 전 사이트 이미지에 회귀면이 닿으며 `?v=` 캐시버스팅과 얽힌다.
- 안전한 성능작업(폰트 비차단·`priority`·`sizes`·`_headers` immutable 캐시)은 SEO 단계에서 이미 적용.
- `next.config.mjs`: `images.unoptimized:true`.

### 실효 시점 = 실데이터(고해상도 CMS 이미지) 전환 시
고해상도 원본이 들어오면 그때 가치가 커진다.

### 구현 방향 (그때)
1. **Cloudflare Images** 로더 또는 커스텀 `loaderFile`(`next.config` `images.loader='custom'`) + `deviceSizes`/`imageSizes` 래더.
2. **빌드 변종**: `sharp`로 WebP/AVIF 다중 폭 생성(`public/stock/<base>-<w>.webp`), 로더가 폭→변종 매핑. `unoptimized` 제거.
3. **검증 게이트**: 빌드 후 `out/`의 모든 `srcset` URL이 실파일로 해소되는지 grep 검사(깨진 이미지 방지). 시각 회귀 스크린샷(→ [07-review-qa](../07-review-qa.md)).

### 완료 기준 ✅
- [ ] 반응형 srcset로 썸네일이 원본 풀사이즈 받지 않음
- [ ] 모든 srcset URL 해소(404 0건)
- [ ] 모바일 LCP 개선 실측(애널리틱스)

### 위험
- 변종 누락 시 깨진 이미지 — 강한 빌드 검증 게이트 필수.

---

## ⑭ 접근성 · 다국어

### 왜 필요한가
- **접근성**: 장애인차별금지법(공공성 있는 매체) + 검색 신뢰. 일부는 이미 반영(focus-visible·reduced-motion·skip-link·aria-current·인쇄 CSS).
- **다국어**: 영문판 등 추가 시 `hreflang` 필요(현재 단일 ko → 불필요).

### 현재 상태
- a11y 기본기 양호(→ [02-design-system §6](../02-design-system.md)). 단일 ko, `<html lang="ko">`.

### 정적 export 제약
없음.

### 구현 방향
1. **접근성 감사**: WCAG 2.1 AA — 대비·키보드·스크린리더·폼 라벨·동영상 자막. axe/Lighthouse a11y 정기 점검.
2. **다국어(필요 시)**: 로케일 라우팅(`/en/...`) + `alternates.languages`(hreflang) + locale별 sitemap. 단일어면 도입 보류.
3. **이미지 alt**: 실데이터에서 의미있는 alt 의무화(현재 `imageAlt?`/`imageCaption` 인프라 존재).

### 완료 기준 ✅
- [ ] Lighthouse a11y ≥ 95, axe 치명 0
- [ ] 동영상 자막·대체텍스트
- [ ] (다국어 시) hreflang·로케일 sitemap 정합

### 위험
- 다국어를 어설프게 도입하면 중복콘텐츠·hreflang 오류로 SEO 역행 — 실제 번역체계 갖춘 뒤에만.
