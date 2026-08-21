# 03 · 콘텐츠 모델 & 데이터 (Content Model)

정의: [types.ts](../src/lib/types.ts) · [categories.ts](../src/lib/categories.ts) · [news.ts](../src/lib/news.ts) · [queries.ts](../src/lib/queries.ts)
생성물: `content.generated.ts` · `newest.generated.ts` (**직접 수정 금지**)

> 2026-08-21 전면 갱신. 종전 판은 초기 더미 데이터(`articles.ts`·`articles2.ts`) 기준이라
> 타입·카테고리·기사 추가 방법이 전부 현행과 달랐다.

## 1. 기사는 `content/articles/*.md` 가 유일한 원천

```
content/articles/<slug>.md   ← 사람·에이전트가 쓰는 원고 (정본)
        │  npm run content  (scripts/build-content.mjs)
        ▼
src/lib/content.generated.ts ← 자동 생성. 직접 고치지 말 것
        │
        ▼
src/lib/news.ts → ALL_ARTICLES ← 모든 소비처가 보는 배열
```

- **URL 은 파일명에서 나온다.** `2026-08-21-foo.md` → `/article/2026-08-21-foo/`.
  **파일명(slug)을 바꾸면 URL 이 죽는다.**
- `news.ts` 는 로드 시 **slug 중복을 검사해 빌드를 실패시킨다.**
- 2026-08-19 에 초기 하드코딩 데모 48편(`articles.ts` 23 + `articles2.ts` 25)을 제거했다.
  날짜 없는 slug 에 실명·출처 없는 일반화 본문이라 포털 심사에서 자체 기사로 볼 수 없었다.
  두 파일은 **더 이상 없다.** (`build-content.mjs` 의 `LEGACY_BATCHES` 는 `existsSync`
  가드가 붙은 잔재라 동작에는 영향이 없다.)

현재 993편(2026-08-21).

## 2. 카테고리 — 두 축 13종

`categories.ts` 가 정본이며 **두 배열을 분리 유지한다.**

**종합뉴스 `CATEGORIES` 7**

| slug | 표기 | 비고 |
|---|---|---|
| economy | 경제 | |
| society | 사회 | |
| world | 국제 | |
| culture | 문화 | |
| sports | 스포츠 | |
| opinion | 오피니언 | 사설·칼럼 |
| tech | 테크 | **동결** — 헤더·홈 그리드에서 빠짐(산업·트렌드가 흡수), `/tech` 와 색인만 유지 |

**사업(기업 데이터) `BIZ_CATEGORIES` 6**

| slug | 표기 |
|---|---|
| grants | 정부지원금 |
| bids | 공공입찰 |
| startup | 창업·상권 |
| industry | 산업·트렌드 |
| labor | 채용·노무 |
| deals | 계약·거래 |

⚠️ **두 배열을 합치지 말 것.** 종합뉴스 내비·홈 섹션·`[category]` 라우트의 루프가
`CATEGORIES` 만 순회해야 사업 축이 종합뉴스 면을 침범하지 않는다.
`isBizCategory(slug)` 로 판별하고, 이름 해석용 통합 맵은 `CATEGORY_MAP` 이다.

⚠️ **`politics`(정치)는 없다.** 정치 기사 미생성이 방침이다(2026-07-13 방향 결정).

## 3. 타입 ([types.ts](../src/lib/types.ts))

```ts
type ArticleType = "article" | "opinion" | "video";   // photo 없음

interface Article {
  id: string;            // = slug
  slug: string;          // 파일명에서 유래 → URL
  title, summary: string;
  body: string[];        // 본문 문단 배열
  category: CategorySlug;
  author: { name, role };
  publishedAt: string;   // KST 벽시계-as-Z (§4)
  updatedAt?: string;    // 단순 수정. 정정이 아니다
  eventEndsAt?: string;  // 지나면 "종료된 사안" 안내가 붙는다. 자동 추정 안 함
  correction?: { at, note };   // 이 필드가 있는 기사만 /corrections 에 실린다
  sponsor?: string;      // 있으면 기사가 아니라 광고. 표시 의무 발생
  reporting?: "direct" | "desk" | "sponsored" | "wire";
  reportingType?: "inquiry" | "interview" | "data-analysis" | "field" | "follow-up";
  imageUrl: string;      // 보통 /stock/<slug>.jpg (셀프호스팅)
  imageCaption?, imageAlt?, youtubeId?: string;
  tags: string[];
  isBreaking?, isLead?: boolean;
  readCount: number;
  type?: ArticleType;
}

type ArticleListItem = Omit<Article, "body">;   // 목록·카드·검색용 경량
type ArticleCardItem = Pick<...>;               // 카드 1장에 필요한 최소 필드
type ArticleIndexItem = ArticleCardItem & { tags };  // /articles-index.json 한 항목
```

**주의가 필요한 필드**

- `sponsor` — 값이 있으면 **광고**다. 광고자율규약·표시광고법상 표시 의무가 있고
  본문·카드·목록·JSON-LD 가 전부 이 필드로 분기한다. 표시를 뺄 수 있는 예외는 없다.
- `updatedAt` vs `correction` — 전자는 단순 수정, 후자만 공식 정정 보도다.
  언론중재법상 "정정 사실과 그 내용"을 밝혀야 하므로 빌드가 짝을 강제한다.
- `reporting` — **2026-08-28 부터 신규 기사에 필수**(누락 시 빌드 실패).
  `direct` 일 때만 `reportingType` 을 붙인다. 과거 기사에 소급 추정하지 않는다.
  ⚠️ AI 관여도 표시가 아니다.
- `isLead` — **전체 1건만**(불변식). 원고 frontmatter 로는 설정할 수 없다.

## 4. 시각 규약 — KST 벽시계-as-Z

`publishedAt` 은 `"2026-08-21T09:00:00Z"` 처럼 `Z` 로 끝나지만 **진짜 UTC 가 아니라
KST 벽시계 값**이다. 원고에는 `publishedAt: 2026-08-21 09:00` (KST)로 적는다.

- 기계 노출(사이트맵·RSS·JSON-LD)은 `toKstIso()` 를 경유한다.
- **미래 시각이면 그 빌드에서 건너뛴다**(예약). 24편 넘겼는데 20편만 나가는 사고의 원인이었다.
- 비정형 날짜(`2026-8-14`)는 빌드가 막는다.

## 5. 쿼리 API ([queries.ts](../src/lib/queries.ts))

`getAllArticles()` 는 모듈 로드 시 1회만 정렬해 캐시한다. **호출부는 결과를 변형하지 말 것**
(filter/find/slice/index 만) — 공유 참조다.

| 함수 | 반환 |
|---|---|
| `getAllArticles()` | 전체(최신순, 캐시) |
| `isHomeFresh(a)` | 최신 발행시각 기준 5일 이내인가 |
| `getLeadArticle()` | 리드 1건 — **종합뉴스만** |
| `getSubLeads(n=4)` | 보조 — **사업 축 2 + 종합 2**, 카테고리 중복 회피 ([decisions/0003](decisions/0003-home-hero-business-axis.md)) |
| `getBreaking(n=6)` | 속보 티커 — **종합뉴스만** |
| `getByCategory(slug, n?)` | 카테고리별 |
| `getMostRead(n=5)` | 신선한 글 우선. 광고(sponsor)는 풀에서 제외 |
| `getArticleBySlug(slug)` | 단건 |
| `getPrevNext(article)` | 이전·다음 기사 |
| `getThreeLineSummary(article)` | 세 줄 요약 |
| `getRelated(article, n=4)` | 동일 카테고리 우선, 부족 시 보충 |
| `isBreakingFresh`, `BREAKING_TTL_MS` | `breaking.ts` 재수출(호환용) |

⚠️ 리드·속보에서 사업 축을 빼는 것은 **의도**다. 버그가 아니다 —
근거는 [decisions/0003](decisions/0003-home-hero-business-axis.md).

⚠️ 속보 배지를 그리는 클라이언트 컴포넌트가 `queries.ts` 를 import 하면 코퍼스 전체가
번들된다(과거 `/search` 3.5MB 원인). 그래서 최신 발행시각만 `newest.generated.ts` 로
따로 굽고 `breaking.ts` 가 그것만 쓴다.

## 6. 기사 추가 방법

**`src/lib/` 를 고치지 않는다.** 원고 파일을 놓고 빌드하면 끝이다.

```bash
# 1) content/articles/<날짜>-<영문-슬러그>.md 작성 (frontmatter + 본문)
# 2) 반영
npm run content && npm run build
```

frontmatter 필수: `title` · `category` · `author` · `publishedAt` · 본문 문단.
2026-08-28 부터 `reporting` 도 필수. 상세 규약과 발행·검수·HOLD 절차는
[09-publishing](09-publishing.md) · [content/README](../content/README.md).

**빌드가 막는 것** — 카테고리 오타, slug 중복, `status: 보류`, 날짜 형식 오류,
정정 짝 불일치, 광고주 미등록, `reporting` 조합 오류.
조용히 건너뛰지 않고 **전부 모아서 한 번에 실패**시킨다.

## 7. 영상(유튜브) 임베드

- 본문에 유튜브 URL 만 **한 줄 단독 문단**으로 쓰면 16:9 플레이어로 자동 임베드
  (youtube-nocookie, lazy). watch?v= / youtu.be/ / shorts/ / embed/ / live/ 지원.
  문장 속에 섞인 링크는 그냥 텍스트다.
- frontmatter `youtube:` 로도 지정할 수 있다(11자 영상 ID 추출).
- 카드 썸네일은 `type: video` 여도 이미지 + 재생 배지만 나온다. TTS 는 URL 을 낭독하지 않는다.
