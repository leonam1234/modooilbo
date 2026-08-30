# 04 · 컴포넌트 카탈로그 (Components)

위치: [src/components/](../src/components/). **서버 컴포넌트가 기본**, 인터랙션만 `"use client"`.

> 2026-08-21 전면 갱신. 종전 판은 이미 삭제된 컴포넌트(`CategoryBadge`·`OpinionStrip`·
> `MediaGrid`)를 싣고, 실재하지 않는 폼 7종을 "데모"로 설명하고 있었다.

⚠️ **클라이언트 컴포넌트가 `lib/queries` 를 import 하면 코퍼스 전체(수 MB)가 번들된다.**
과거 `/search` 3.5MB 사고의 원인이다. 속보 시효 같은 값은 `lib/breaking`(경량 모듈)을 쓴다.

## 1. 셸 · 내비

| 컴포넌트 | 종류 | 역할 |
|---|---|---|
| [Header](../src/components/Header.tsx) | client | 유틸바(날짜·테마·로그인) + 마스트헤드 + **2단 GNB**(사업 6 / 종합 6) + 모바일 드로어. 스티키 |
| [SearchOverlay](../src/components/SearchOverlay.tsx) | client | 헤더 검색 오버레이 — 제목·태그 자동완성 |
| [AuthMenu](../src/components/AuthMenu.tsx) | client | 로그인 상태 메뉴(세션 캐시) |
| [LocationPicker](../src/components/LocationPicker.tsx) | client | 지역 선택 + 현재 날씨·온도 |
| [ThemeToggle](../src/components/ThemeToggle.tsx) | client | 라이트/다크 토글. **클래스 기반**(`html.dark`) |
| [Footer](../src/components/Footer.tsx) | server | 브랜드·링크 컬럼·법적 정보·섹션 바로가기 |
| [PageHeader](../src/components/PageHeader.tsx) | server | 회사·유틸 페이지 상단 타이틀 블록 |
| [SectionHeading](../src/components/SectionHeading.tsx) | server | 섹션 제목 + 더보기 링크 |
| [Pagination](../src/components/Pagination.tsx) | server | 목록 페이지 번호 이동 |
| [icons](../src/components/icons.tsx) | — | 인라인 SVG 아이콘 세트 |

## 2. 속보 · 실시간 스트립

| 컴포넌트 | 종류 | 역할 |
|---|---|---|
| [BreakingTicker](../src/components/BreakingTicker.tsx) | server | 속보 마퀴 컨테이너(`getBreaking`) — **종합뉴스만** |
| [BreakingMarquee](../src/components/BreakingMarquee.tsx) | client | 흐르는 헤드라인 + 일시정지 |
| [TrendingTags](../src/components/TrendingTags.tsx) | client | 실시간 인기 스트립(속보 티커 위) |
| [MarketStrip](../src/components/MarketStrip.tsx) | client | 경제 섹션 상단 증시·환율. 실패 시 숨김 |
| [AutoRefresh](../src/components/AutoRefresh.tsx) | client | 자동 새로고침(네이버·연합뉴스식) |

## 3. 기사 카드 — [ArticleCard](../src/components/ArticleCard.tsx)

워크호스. `{ article: ArticleListItem, variant, priority?, showSummary?, ... }`

| variant | 모양 | 주 사용처 |
|---|---|---|
| `feature` | 상단 이미지 + 제목 + 데크 + 메타 (기본) | 섹션 리드, 카테고리 그리드 |
| `horizontal` | 좌 썸네일 + 우 제목·메타 | 서브리드, 검색 결과, 관련 기사 |
| `list` | 목록형 | 카테고리 목록 |
| `compact` | 작은 썸네일 + 2줄 제목 | 섹션 리스트, 사이드 |
| `text` | 이미지 없음 | 고밀도 텍스트 리스트 |
| `overlay` | 이미지 풀 + 그라데이션 | 그리드 |

배지·표시는 아래 컴포넌트들이 붙는다.

| 컴포넌트 | 역할 |
|---|---|
| [TypeBadge](../src/components/TypeBadge.tsx) | 속보/영상/칼럼 타입 배지 |
| [SponsorNotice](../src/components/SponsorNotice.tsx) | **광고성 콘텐츠 표시**(`sponsor` 필드) |
| [ReportingBadge](../src/components/ReportingBadge.tsx) | 취재 방식 — `direct` 기사에만. ⚠️ **AI 관여도 표시가 아니다** |
| [ReportingDisclosure](../src/components/ReportingDisclosure.tsx) | 기사별 실제 취재·검증 행위와 연결 원문 수 공개 |
| [ReporterInsight](../src/components/ReporterInsight.tsx) | 사실 본문과 분리된 근거 기반 기자 해설·최종 검수자 표시 |
| [EventEndedNotice](../src/components/EventEndedNotice.tsx) | 종료된 행사·접수 안내(`eventEndsAt`) |

## 4. 홈 모듈

| 컴포넌트 | 역할 |
|---|---|
| [HeroLead](../src/components/HeroLead.tsx) | 리드(대형) + 보조 4건. 보조는 **사업 축 2 + 종합 2** ([decisions/0003](decisions/0003-home-hero-business-axis.md)) |
| [BizSectionGroup](../src/components/BizSectionGroup.tsx) | 기업 데이터 축 6섹션 — 히어로 아래, 종합뉴스 위 |
| [SectionBlock](../src/components/SectionBlock.tsx) | `{slug, count}` → 섹션 리드 + 리스트 |
| [RankingList](../src/components/RankingList.tsx) | 많이 본 / 댓글 많은. 광고는 풀에서 제외 |
| [RecentArticles](../src/components/RecentArticles.tsx) | 최근 본 기사(localStorage, 서버 미전송) |
| [NewsletterCTA](../src/components/NewsletterCTA.tsx) · [NewsletterForm](../src/components/NewsletterForm.tsx) | 구독 CTA + 폼 |
| [Reveal](../src/components/Reveal.tsx) | 스크롤 진입 fade-up 래퍼(no-JS 안전) |

## 5. 기사 상세

| 컴포넌트 | 종류 | 역할 |
|---|---|---|
| [ArticleBody](../src/components/ArticleBody.tsx) | server | 본문 렌더러(소제목·이미지·유튜브) + `articleSpeechText()` |
| [ThreeLineSummary](../src/components/ThreeLineSummary.tsx) | server | 세 줄 요약 접이식 박스 |
| [ArticleActions](../src/components/ArticleActions.tsx) | client | 글자크기·스크랩·인쇄·링크복사·공유 |
| [ListenButton](../src/components/ListenButton.tsx) | client | 본문 듣기(TTS) — 접근성 |
| [ReactionBar](../src/components/ReactionBar.tsx) | client | 기사 반응 |
| [CommentSection](../src/components/CommentSection.tsx) · [CommentItem](../src/components/CommentItem.tsx) | client | 댓글 목록·작성·신고 |
| [ViewCount](../src/components/ViewCount.tsx) · [ViewBeacon](../src/components/ViewBeacon.tsx) | client | 조회수 표시 / `/api/view` 1회 전송 |
| [ImageLightbox](../src/components/ImageLightbox.tsx) | client | 본문 이미지 확대 |
| [ReadingProgress](../src/components/ReadingProgress.tsx) | client | 상단 읽기 진행바 |
| [BackToTop](../src/components/BackToTop.tsx) | client | 맨 위로(layout 전역) |
| [SubscribeButton](../src/components/SubscribeButton.tsx) | client | 기자 구독 |

## 6. 페이지 단일 구현체

같은 화면이 여러 라우트에서 쓰이므로 **한 곳에만 구현**한다. 고칠 때 여기만 고치면 된다.

| 컴포넌트 | 쓰이는 곳 |
|---|---|
| [CategoryListPage](../src/components/CategoryListPage.tsx) | 종합 `[category]` · 사업 6종 · 각 `/page/[n]` |
| [ReporterPage](../src/components/ReporterPage.tsx) | `/reporter/<slug>/` 와 `/page/[n]` |

## 7. 메타 · 서드파티 · 배경

| 컴포넌트 | 역할 |
|---|---|
| [JsonLd](../src/components/JsonLd.tsx) | 구조화 데이터 주입 |
| [PortalMeta](../src/components/PortalMeta.tsx) | 네이버·다음용 마이크로데이터(연합뉴스 관례) |
| [PlainEmail](../src/components/PlainEmail.tsx) | Cloudflare 이메일 난독화 우회 — 주소 평문 노출 |
| [AdSlot](../src/components/AdSlot.tsx) · [AdSenseLoader](../src/components/AdSenseLoader.tsx) | AdSense **수동** 슬롯(자동광고 OFF 전제) |
| [ThirdPartyScripts](../src/components/ThirdPartyScripts.tsx) | Clarity·AdSense 지연 로드 |
| [WeatherBackground](../src/components/WeatherBackground.tsx) · [WeatherCanvas](../src/components/WeatherCanvas.tsx) | 날씨 배경 모션(무채색·옅게, 캔버스) |
| [SocialSigninButtons](../src/components/SocialSigninButtons.tsx) | 카카오·네이버·구글 로그인 |

## 8. 폼과 백엔드 — 데모가 아니다

⚠️ 종전 문서는 "폼은 전부 데모, 백엔드 없음"이라고 적었으나 **지금은 실동작한다.**
회원가입·로그인·소셜 로그인·이메일 인증·댓글·북마크·반응·조회수·뉴스레터·문의가
**Cloudflare Pages Functions**([functions/api/](../functions/api/), D1 연동)로 붙어 있다.

정적 export 사이트에 **API 만 Functions 로 얹은 구조**다 — Next.js route handler 가
아니라 Pages Functions 라서 `output: "export"` 를 유지할 수 있다.
아키텍처는 [01-architecture](01-architecture.md), 승급 판단은 [06-deployment §10](06-deployment.md).
