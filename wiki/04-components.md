# 04 · 컴포넌트 카탈로그 (Components)

위치: [src/components/](../src/components/). 서버 컴포넌트 기본, 인터랙션만 `"use client"`.

## 1. 셸 / 내비
| 컴포넌트 | 종류 | 역할 |
|----------|------|------|
| [Header](../src/components/Header.tsx) | client | 상단 유틸바(날짜·로그인·테마) + 마스트헤드(로고·검색·로그인) + GNB(8섹션, `aria-current`) + 검색 오버레이 + 모바일 드로어. 스티키. |
| [BreakingTicker](../src/components/BreakingTicker.tsx) | server | 속보 마퀴(`getBreaking`), 호버 시 정지, 우측 페이드. |
| [Footer](../src/components/Footer.tsx) | server | 브랜드·SNS·링크 컬럼(회사/서비스/약관)·법적 정보·섹션 바로가기. |
| [ThemeToggle](../src/components/ThemeToggle.tsx) | client | 라이트/다크 토글(localStorage `modoo-theme`). |
| [PageHeader](../src/components/PageHeader.tsx) | server | 회사/유틸 페이지 상단 타이틀 블록. props `{title, subtitle?, breadcrumb?, align?}`. |
| [SectionHeading](../src/components/SectionHeading.tsx) | server | 섹션 제목 + "더보기" 링크. |
| [CategoryBadge](../src/components/CategoryBadge.tsx) | server | 카테고리 라벨(링크). |
| [icons](../src/components/icons.tsx) | — | 인라인 SVG 아이콘 세트(Search, Menu, Sun/Moon, Share, Play, Trending 등). |

## 2. 기사 카드 — [ArticleCard](../src/components/ArticleCard.tsx)
워크호스. props: `{ article: ArticleListItem, variant, priority?, showSummary?, className?, headingClassName? }`.

| variant | 모양 | 주 사용처 |
|---------|------|-----------|
| `feature` | 상단 이미지(16:10) + 제목 + 데크 + 메타 | 섹션 블록 리드, 카테고리 그리드 |
| `horizontal` | 좌 썸네일 + 우 제목/메타 | 서브리드, 검색 결과, 관련 기사 |
| `compact` | 작은 정사각 썸네일 + 2줄 제목 | 섹션 리스트, 사이드 |
| `text` | 이미지 없음, 불릿 + 제목 | 고밀도 텍스트 리스트 |
| `overlay` | 이미지 풀 + 그라데이션 + 하단 제목 | 포토·영상 그리드 |
- 영상 타입이면 재생 아이콘 오버레이. 메타는 `CardMeta`(카테고리·기자·시각).

## 3. 홈 모듈
| 컴포넌트 | 역할 |
|----------|------|
| [HeroLead](../src/components/HeroLead.tsx) | 리드(대형 이미지+세리프 헤드라인) + 서브리드 4건 |
| [SectionBlock](../src/components/SectionBlock.tsx) | `{slug, count}` → 섹션 리드(feature) + compact 리스트 |
| [RankingList](../src/components/RankingList.tsx) | 많이 본 뉴스(번호 1~3 레드) |
| [OpinionStrip](../src/components/OpinionStrip.tsx) | 오피니언 3열(좌측 레드 보더, 필자 강조) |
| [MediaGrid](../src/components/MediaGrid.tsx) | 포토·영상 overlay 그리드 |
| [NewsletterCTA](../src/components/NewsletterCTA.tsx) | client. 다크 배경 뉴스레터 구독 폼(데모) |

## 4. 기사 상세
| 컴포넌트 | 역할 |
|----------|------|
| [ArticleActions](../src/components/ArticleActions.tsx) | client. 글자크기(가−/가+, `#article-body` 조절)·스크랩·인쇄·링크복사·X/페이스북 공유 |

## 5. 폼 (모두 client·데모)
`ApplyForm`(채용) · `ContactForm`(문의) · `TipForm`(제보) · `AdInquiryForm`(광고) · `LoginForm` · `RegisterForm` · `NewsletterToggle`. 공통: `e.preventDefault()` → 인라인 성공 메시지, 백엔드 없음. 필드 스타일은 [docs/AGENT_BRIEF.md](../docs/AGENT_BRIEF.md) 규약.
