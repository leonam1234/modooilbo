# 모두일보 (Modoo Ilbo) — 온라인 신문사 풀빌드 + 리뷰루프 계획

> Ralph Mode (병렬 멀티에이전트). 빌드 → 20인 전문가 리뷰(스크린샷 기반) → 수정을 10회 반복.

## 1. 개요
- **브랜드**: 모두일보 (Modoo Ilbo) — *"모두를 위한 신뢰의 뉴스"*
- **유형**: 온라인 신문사 / 언론사 종합 홈페이지 (프론트엔드)
- **스택**: Next.js(App Router) + TypeScript + Tailwind CSS / 폰트 Pretendard + Nanum Myeongjo
- **이미지**: picsum.photos 시드 기반 더미
- **배포**: Cloudflare Pages 최적화 — `output: export` 정적 빌드(`out/`) + 엣지 캐시·보안 헤더(`public/_headers`) + `wrangler.jsonc` + `npm run deploy:cf` (SSR 필요 시 `@opennextjs/cloudflare` Workers 승급 → `DEPLOY.md`)

## 2. 벤치마킹 (백그라운드 워크플로우 wa0qbf82x)
- 조선일보 · 중앙일보 · 한겨레 병렬 분석 → IA/디자인시스템/컴포넌트/백로그 합성

## 3. 전체 페이지 맵
### 뉴스
- `/` 홈
- `/[category]` 섹션 (정치·경제·사회·국제·문화·스포츠·테크·오피니언)
- `/article/[slug]` 기사 상세
- `/search` 검색
- `/media` 포토·영상 (보조)
### 회사·서비스 (언론사 필수)
- `/about` 회사소개 (연혁/조직/편집원칙)
- `/careers` **인재채용 · 기자모집** (채용공고 + 지원 폼)
- `/subscribe` 구독 안내 (요금제)
- `/advertise` 광고 · 제휴 문의
- `/tips` 제보하기
- `/newsletter` 뉴스레터 신청
- `/ethics` 윤리강령 · 편집위원회
- `/contact` 고객센터 · 문의
- `/login`, `/register` 로그인 · 회원가입
- `/terms` 이용약관, `/privacy` 개인정보처리방침

## 4. 컴포넌트 아키텍처
- 공통: `icons`, `CategoryBadge`, `SectionHeading`, `ThemeToggle`, `ArticleCard`(feature/horizontal/compact/text/overlay)
- 셸: `TopUtilityBar`, `Header`(GNB·검색·모바일메뉴), `BreakingTicker`, `Footer`
- 홈 모듈: `HeroLead`, `SubLeadGrid`, `SectionBlock`, `RankingList`, `OpinionStrip`, `MediaGrid`, `NewsletterCTA`
- 폼: `SearchBar`, `ApplyForm`(채용), 뉴스레터/문의 폼

## 5. 디자인 시스템 (1차안, 리서치로 보정)
- 컬러: signal(레드 액센트) + ink(뉴트럴). 라이트/다크.
- 타이포: 본문 Pretendard, 헤드라인 Nanum Myeongjo(세리프)
- 그리드: 최대 1280px, 12컬럼, 신문형 고밀도 + 충분한 여백

## 6. 더미 데이터
- agent1 → `src/lib/articles.ts` (ARTICLES, ~30, isLead 1)
- agent2 → `src/lib/articles2.ts` (ARTICLES_2, ~32)
- 병합 → `src/lib/news.ts` → `queries.ts`가 참조 (60건+)

## 7. 20인 전문가 리뷰 루프 (×10) — 핵심
각 라운드:
1. dev 서버 기동 (localhost) — 백그라운드
2. **PC(1440×900) + 모바일(390×844)** 으로 주요 페이지 전부 스크린샷 캡쳐
3. 스크린샷을 **직접 읽고 해석** (UX/UI/BX 20개 관점: 레이아웃·정렬·여백·위계·타이포·대비·색·반응형 깨짐·인터랙션·접근성·일관성·브랜드·정보밀도·가독성·CTA·네비·푸터·이미지·로딩·오류상태)
4. 이슈 목록화 → 코드 수정
5. 재캡쳐로 검증
- 라운드 1~3: 구조/레이아웃/반응형 큰 문제
- 라운드 4~7: 디테일(여백/타이포/색/일관성)
- 라운드 8~10: 폴리시(인터랙션/접근성/엣지케이스/브랜드 완성도)

## 8. 완료 정의 (DoD)
- 위 모든 페이지 동작, PC/모바일 반응형, 라이트/다크
- 10라운드 리뷰 반영, 스크린샷 증거 보관 (`/review-shots`)
- 실제 언론사 수준 비주얼 완성도

## 9. 진행 로그
- [P0] 환경 OK (Node26/npm11/git), 스캐폴드 + 데이터레이어 + queries 완료
- [P0] npm install 완료
- [P0] 벤치마킹 워크플로우 가동(wa0qbf82x)
- [P0] 데이터 agent1+agent2 완료 → 기사 62건(`news.ts` 병합)
- [P0] 공통 컴포넌트(헤더/푸터/속보/카드/모듈) + 홈 완성
- [P1] 동적 페이지 직접 구축: 카테고리·기사상세·검색·미디어
- [P1] 회사 페이지 4개 팀(병렬 에이전트) 완료: 소개·윤리·고객센터·채용·광고·구독·뉴스레터·제보·로그인·회원가입·약관·개인정보
- [P2] 리뷰 루프 R1~R10 완료 (스크린샷 기반, `REVIEW.md` 참조)
- [P2] `next build` 그린 — 90 정적 페이지 / 타입 통과 / 검색 번들 -30kB
- [완료] dev 서버 localhost:3000 구동 중. 전 페이지 PC·모바일·라이트·다크 검증.
