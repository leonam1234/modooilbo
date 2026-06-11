# 03 · 콘텐츠 모델 & 데이터 (Content Model)

정의: [src/lib/types.ts](../src/lib/types.ts) · [categories.ts](../src/lib/categories.ts) · [articles.ts](../src/lib/articles.ts) · [articles2.ts](../src/lib/articles2.ts) · [news.ts](../src/lib/news.ts) · [queries.ts](../src/lib/queries.ts)

## 1. 타입
```ts
type CategorySlug = "politics" | "economy" | "society" | "world"
                  | "culture" | "sports" | "opinion" | "tech";
type ArticleType  = "article" | "opinion" | "photo" | "video";

interface Author  { name: string; role: string; }   // role: 기자/논설위원/특파원 등

interface Article {
  id: string;            // "a01".."a62" (고유)
  slug: string;          // kebab-case, 고유 → /article/<slug>
  title: string;
  summary: string;       // 데크(한두 문장)
  body: string[];        // 본문 문단 배열
  category: CategorySlug;
  author: Author;
  publishedAt: string;   // ISO 8601
  imageUrl: string;      // https://picsum.photos/seed/<seed>/1200/800
  imageCaption?: string;
  tags: string[];
  isBreaking?: boolean;
  isLead?: boolean;      // 메인 톱기사 — 전체 1건만
  readCount: number;
  type?: ArticleType;    // 기본 "article"
}

type ArticleListItem = Omit<Article, "body">;  // 목록/카드/검색용 경량
```

## 2. 카테고리 (8종)
| slug | name | nameEn | description |
|------|------|--------|-------------|
| politics | 정치 | Politics | 국회·정당·외교·안보의 핵심 동향 |
| economy | 경제 | Economy | 시장·산업·부동산·금융 심층 분석 |
| society | 사회 | Society | 우리 사회의 오늘을 기록합니다 |
| world | 국제 | World | 세계를 읽는 또 하나의 창 |
| culture | 문화 | Culture | 예술·공연·라이프스타일 |
| sports | 스포츠 | Sports | 현장의 함성, 승부의 기록 |
| tech | 테크 | Tech | AI·IT·과학의 최전선 |
| opinion | 오피니언 | Opinion | 사설·칼럼·시론 |

`CATEGORIES`(배열), `CATEGORY_MAP`(slug→Category), `getCategory(slug)`, `categoryName(slug)`.

## 3. 더미 데이터 (총 62건)
- `articles.ts` → `ARTICLES` (a01–a30): **isLead 1건**(리드), isBreaking 약 5건, 타입 혼합(article/opinion/photo/video).
- `articles2.ts` → `ARTICLES_2` (a31–a62): isLead 없음, isBreaking 약 5건.
- `news.ts` → **`ALL_ARTICLES = [...ARTICLES, ...ARTICLES_2]`** ← 모든 소비처는 이걸 본다.
- 8개 카테고리에 분산(카테고리당 7~10건). 모두 가상·픽션.

## 4. 쿼리 API ([queries.ts](../src/lib/queries.ts))
모두 `ALL_ARTICLES` 기반, 최신순 정렬 기본.

| 함수 | 반환 |
|------|------|
| `getAllArticles()` | 전체(최신순) |
| `getLeadArticle()` | `isLead` 기사(없으면 최신) |
| `getSubLeads(n=4)` | 리드 제외·오피니언 제외 상위 n |
| `getBreaking(n=6)` | 속보(없으면 최신) 상위 n |
| `getByCategory(slug, n?)` | 카테고리별(옵션 n) |
| `getMostRead(n=5)` | readCount 내림차순 |
| `getOpinion(n=4)` | type==="opinion" 또는 category==="opinion" |
| `getMultimedia(n=4)` | type photo/video |
| `getArticleBySlug(slug)` | 단건 |
| `getRelated(article, n=4)` | 동일 카테고리 우선, 부족 시 타 카테고리 보충 |

## 5. 기사 추가 방법
1. `articles2.ts`의 `ARTICLES_2` 배열에 항목 추가(또는 새 배치 파일 → `news.ts`에서 spread).
2. **불변식**: `id`/`slug`/picsum `seed` 고유, **`isLead`는 전체 1건만**(이미 a-리드 존재 → 추가 금지).
3. `publishedAt` ISO, `type` 누락 시 "article"로 간주.
4. 정적 export이므로 추가 후 `npm run build` 재실행해야 `/article/<slug>` 생성.
