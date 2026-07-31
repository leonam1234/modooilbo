export type CategorySlug =
  | "economy"
  | "society"
  | "world"
  | "culture"
  | "sports"
  | "opinion"
  | "tech"
  // 기업 데이터 뉴스 '사업' 축(종합뉴스와 분리) — 실제 기사가 붙어 승격된 것만 추가.
  | "grants"
  | "startup"
  | "industry"
  | "labor"
  | "deals"
  | "bids";

export type ArticleType = "article" | "opinion" | "video";

export interface Category {
  slug: CategorySlug;
  name: string; // 한글 표기 (화면 표시용 — 변경 금지)
  nameEn: string;
  description: string; // 화면 표시용 subtitle — 변경 금지
  seoTitle?: string; // <title> 키워드형(브랜드 접미는 template가 부착)
  seoDescription?: string; // meta description 키워드형
}

export interface Author {
  name: string;
  role: string; // 기자 / 논설위원 / 특파원 등
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[]; // 본문 문단 배열
  category: CategorySlug;
  author: Author;
  publishedAt: string; // ISO 8601
  // ISO 8601 — 최종 수정 시각(있을 때만 "입력·수정" 병기).
  // ⚠️ 정정(訂正)이 아니다. 오타 수정·속보 갱신·후속 반영 등 모든 수정이 여기 들어간다.
  // 공식 정정 보도는 아래 correction 필드로만 표시한다(언론중재법상 정정 사실과 내용을 밝혀야 함).
  updatedAt?: string;
  // 명시적 정정 기록 — 이 필드가 있는 기사만 /corrections(정정·반론 보도 모음)에 실린다.
  correction?: {
    at: string; // ISO 8601 — 정정 반영 시각
    note: string; // 무엇이 틀렸고 무엇을 바로잡았는지(정정 사실과 그 내용)
  };
  imageUrl: string;
  imageCaption?: string;
  youtubeId?: string; // 영상 기사 = 유튜브 쇼츠 임베드
  imageAlt?: string; // 대표이미지 대체텍스트(없으면 imageCaption→title 폴백)
  tags: string[];
  isBreaking?: boolean;
  isLead?: boolean; // 메인 톱기사
  readCount: number;
  type?: ArticleType;
}

/** 본문(body)을 제외한 목록/카드/검색용 경량 타입 */
export type ArticleListItem = Omit<Article, "body">;

/**
 * 카드 한 장을 그리는 데 실제로 필요한 최소 필드.
 * ArticleListItem은 이 타입에 그대로 대입되며, /articles-index.json 항목도 마찬가지다.
 * → 검색처럼 인덱스 JSON만 받아온 화면도 전체 Article 없이 카드를 그릴 수 있다.
 */
export type ArticleCardItem = Pick<
  Article,
  "id" | "slug" | "title" | "summary" | "category" | "author" | "publishedAt" | "imageUrl"
> &
  Partial<Pick<Article, "type" | "isBreaking" | "tags">>;

/** /articles-index.json 한 항목 — 카드 렌더 + 제목·태그 검색에 필요한 만큼만 담는다(본문 제외). */
export type ArticleIndexItem = ArticleCardItem & { tags: string[] };
