export type CategorySlug =
  | "politics"
  | "economy"
  | "society"
  | "world"
  | "culture"
  | "sports"
  | "opinion"
  | "tech";

export type ArticleType = "article" | "opinion" | "photo" | "video";

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
  imageUrl: string;
  imageCaption?: string;
  tags: string[];
  isBreaking?: boolean;
  isLead?: boolean; // 메인 톱기사
  readCount: number;
  type?: ArticleType;
}

/** 본문(body)을 제외한 목록/카드/검색용 경량 타입 */
export type ArticleListItem = Omit<Article, "body">;
