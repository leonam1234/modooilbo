# 07 · 리뷰 & QA

상세 로그: [REVIEW.md](../REVIEW.md). 캡쳐물: `review-shots/<round>/`.

## 1. 방법론 — 스크린샷 기반 직접 판독
- 도구: **Playwright 헤드리스 크로미움** ([scripts/shoot.mjs](../scripts/shoot.mjs)).
- 뷰포트: **PC 1440×900 / 모바일 390×844**, **라이트+다크** 양쪽.
- 모드: 풀페이지(구조) + 상단 fold(디테일). 자동 스크롤로 lazy 이미지 로드 후 캡쳐.
- 흐름: 캡쳐 → PNG 직접 판독(UX/UI/BX 관점) → 코드 수정 → 재캡쳐 검증.

```bash
node scripts/shoot.mjs <round> <light|dark> <core|full> <fullpage|fold>
# 예) 전체 라이트 풀페이지:  node scripts/shoot.mjs r1 light full fullpage
#     코어 다크 상단:        node scripts/shoot.mjs r2 dark core fold
# 정적 빌드 대상으로 캡쳐:   $env:BASE="http://localhost:3001"; node scripts/shoot.mjs cf light full fold
```
- 캡쳐 팁: **모바일(390폭) 샷이 표시 시 거의 1:1**이라 타이포/간격 디테일 판독에 유리. 와이드 PC 샷은 구조 판독용.

## 2. 라운드 요약 (R1–R11)
| R | 주제 | 결과 |
|---|------|------|
| 1 | 구조·반응형(라이트) | 전 페이지 200, 신문형 레이아웃 ✅ |
| 2 | 다크모드 | 대비·보더 정상 ✅ |
| 3 | 접근성 | focus-visible·reduced-motion·인쇄·앵커 스크롤·메타대비 AA ✅ |
| 4–5 | 프로덕션 | 404·로딩·robots·sitemap·JSON-LD·읽는시간 ✅ |
| 6 | 내비 a11y | `aria-current` ✅ |
| 7 | 검색 관련도 | 카테고리명 포함 → ‘경제’ 1→11건 ✅ |
| 8 | 롱폼 가독성 | `max-w-3xl` 본문 ✅ |
| 9 | 성능/빌드 | `next build` green, /search 148→118kB ✅ |
| 10 | 회귀 | 40캡쳐 전부 200 ✅ |
| 11 | Cloudflare 정적 export | `out/` 전수 캡쳐 200, 404.html 정확 ✅ |

## 3. 변경 후 검증 루틴 (권장)
1. `npm run build` — 타입·정적 생성 무결성(green 확인).
2. `npm run preview:static` (또는 `npm run dev`).
3. `node scripts/shoot.mjs verify light core fold` → 관련 페이지 PNG 판독.
4. 라이트/다크 + PC/모바일 양쪽 확인.
