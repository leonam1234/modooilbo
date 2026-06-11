# 시그널저널 — 20인 전문가 리뷰 루프 로그

방법론: Playwright 헤드리스 크로미움으로 **PC 1440×900 / 모바일 390×844**, **라이트+다크**, 풀페이지 + 상단(fold) 캡쳐 → 직접 판독(UX/UI/BX 관점) → 코드 수정 → 재캡쳐 검증. (`scripts/shoot.mjs`, 산출물 `review-shots/<round>/`)

총 페이지: 홈 · 8개 섹션 · 기사상세 · 검색 · 미디어 · 회사소개 · 인재채용 · 구독 · 뉴스레터 · 광고 · 제보 · 고객센터 · 윤리강령 · 로그인 · 회원가입 · 약관 · 개인정보 (+ 404/로딩)

---

## R1 — 구조/레이아웃 (라이트·반응형)  ✅ PASS
- 전 페이지(19) × PC/모바일 = 38캡쳐, **전부 HTTP 200**(빌드 무결성 확인).
- 홈: 히어로/섹션블록/사이드바 랭킹/오피니언/미디어그리드/뉴스레터/푸터 — 신문형 레이아웃 정상.
- 기사상세: 브레드크럼·세리프 헤드라인·액션바·캡션·본문·태그·기자박스·관련기사·사이드바.
- 카테고리: 헤더·리드·3열 그리드·사이드바 (8개 섹션 공통 템플릿).
- 채용/구독/로그인 등 회사 페이지 완성도 양호.

## R2 — 다크모드  ✅ PASS
- 전 페이지 상단 다크 캡쳐. 배경 ink-950, 카드 보더, 화이트 텍스트, 레드 CTA, 소셜버튼 브랜드색 유지. 대비 양호.

## R3 — 접근성·전역 폴리시  ✅ DONE
- `:focus-visible` 키보드 포커스 링(signal) 추가.
- `prefers-reduced-motion` 존중(마퀴/트랜지션 비활성).
- `scroll-padding-top: 6rem` — 스티키 헤더에 앵커(#apply, 윤리 목차) 안 가리게.
- 인쇄 스타일(@media print): 기사 본문 중심, 헤더/푸터/사이드바 숨김.
- 카드 메타 텍스트 대비 AA 개선 (ink-400→ink-500, 라이트 3.25→4.9:1).

## R4–R5 — 프로덕션 폴리시  ✅ DONE
- 브랜드형 `not-found.tsx`(404), `loading.tsx`(로딩 스피너).
- `robots.ts`, `sitemap.ts`(정적+카테고리+기사 전체).
- 기사 구조화데이터(JSON-LD NewsArticle) + 읽는 시간 표기.

## R6 — 헤더/내비 접근성  ✅ DONE
- 활성 내비 링크에 `aria-current="page"` 추가(스크린리더 현재 위치 인지).
- 라우트 변경 시 검색/모바일 메뉴 자동 닫힘(기존), 라이트/다크 토글 유지.

## R7 — 검색 관련도  ✅ DONE
- 검색 대상에 카테고리명 포함 → ‘경제’ 검색 결과 **1건 → 11건**으로 개선(재캡쳐 검증, `r10b/search-pc`).

## R8 — 롱폼 가독성  ✅ PASS
- 약관/개인정보/윤리: `max-w-3xl` 본문 폭, 조항 구조, 충분한 행간·여백 — 가독성 확인.

## R9 — 성능/빌드 무결성  ✅ DONE
- `next build` 성공: **90개 정적 페이지**(8 카테고리 + 62 기사 + 회사 페이지 + robots/sitemap), 타입체크 통과.
- 검색 번들 최적화: 본문 제외 인덱스를 서버에서 주입 → `/search` First Load **148kB → 118kB**(-30kB).
- 공유 First Load JS 105kB, 페이지별 1~3kB 수준.

## R10 — 전체 회귀 점검  ✅ PASS
- 전 페이지(20 라우트) × PC/모바일 = 40캡쳐 재실행, **전부 200**, 시각 회귀 없음.
- 라이트/다크 모두 정상. 404/로딩/sitemap/robots 동작 확인.

## R11 — Cloudflare 최적화 & 정적 export 검증  ✅ DONE
- `next.config`: `output: "export"` + `trailingSlash` + `images.unoptimized` → 정적 사이트(`out/`).
- 동적 라우트 `dynamicParams = false`, 메타데이터 라우트 `force-static` → export 호환.
- `public/_headers`(엣지 캐시+보안), `wrangler.jsonc`(pages_build_output_dir), `deploy:cf` 스크립트, `DEPLOY.md`.
- **검증**: `out/`를 정적 서버(:3001)로 서빙 → 전 페이지 × PC/모바일 재캡쳐, **전부 200**(404는 404.html로 정확). 이미지 unoptimized 전환에도 비주얼 동일.
- `npm run build` → `✓ Exporting`, 90 정적 페이지. `npm run deploy:cf`로 Cloudflare Pages 즉시 배포 가능.

---

### 최종 상태
- 빌드: ✅ green(정적 export) / 타입: ✅ pass / 페이지: 20 라우트(기사 62건 포함 90 정적 페이지)
- 반응형(PC1440·모바일390) ✅ / 라이트·다크 ✅ / 접근성(포커스·모션·대비·aria) ✅
- 배포: ✅ Cloudflare Pages 최적화(`out/`, `_headers`, `wrangler.jsonc`, `npm run deploy:cf`)
- 증거: `review-shots/`(r1 라이트풀 · r1f fold · r1df 다크 · r3/r10/r10b 회귀 · **cf 정적빌드 전수**)
