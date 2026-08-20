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
  /**
   * 행사·접수의 종료 시각(KST). 이 시각이 지나면 기사 상단에 "종료된 사안" 안내가 붙는다.
   *
   * [왜 필요한가] 전시·공연·마감 기사는 기간이 끝나도 검색 노출이 그대로 남는다.
   * 2026-08-18 네이버 실측에서 국립중앙박물관 여름 연장운영 기사가 노출 36,703회를
   * 유지하면서 내용은 전날 만료된 상태였다. 독자가 끝난 정보를 현재로 오인하게 된다.
   * 기사 자체는 시점 기록이므로 지우거나 고쳐 쓰지 않고, 안내만 덧붙인다.
   *
   * ⚠️ 자동 추정하지 않는다. 제목의 날짜를 기계적으로 파싱하면 오탐이 생기고
   *    (예: "7월 ICT 수출 533억달러"), 멀쩡한 기사에 만료 딱지가 붙는다.
   *    반드시 원고에서 명시적으로 지정한다.
   */
  eventEndsAt?: string;
  // 명시적 정정 기록 — 이 필드가 있는 기사만 /corrections(정정·반론 보도 모음)에 실린다.
  correction?: {
    at: string; // ISO 8601 — 정정 반영 시각
    note: string; // 무엇이 틀렸고 무엇을 바로잡았는지(정정 사실과 그 내용)
  };
  /**
   * 광고성 콘텐츠일 때 광고주 slug(src/lib/partners.ts 의 Partner.slug).
   *
   * ⚠️ 이 값이 있으면 기사가 아니라 **광고**다. 「인터넷신문위원회 광고자율규약」과
   *    「표시·광고의 공정화에 관한 법률」상 광고임을 독자가 오인하지 않게 표시해야 한다.
   *    ArticleBody·ArticleCard·목록·JSON-LD가 전부 이 필드를 보고 분기한다.
   *    표시를 뺄 수 있는 예외는 없다 — 뺄 거면 광고를 받지 말아야 한다.
   *
   * 광고계약서 제6조 ③(광고성 콘텐츠에 "광고" 표기)의 이행 수단이다.
   */
  sponsor?: string;

  /**
   * 취재 유형(2026-08-21 도입) — 포털 제휴 심사의 '자체기사 비율' 근거.
   * direct 자체취재 / desk 원자료 재구성 / sponsored 광고·협찬·기업소식 / wire 외부 제공.
   * 비율은 direct ÷ (direct + desk) 로 계산하고 sponsored·wire 는 양쪽에서 뺀다.
   * ⚠️ 필드가 없는 기사는 unknown 이다 — 과거 기사에 소급 추정하지 않는다.
   *    라이브 화면 노출은 별도 승인 전까지 하지 않는다(원고 필드를 AI 관여도로 오해할 소지).
   */
  reporting?: "direct" | "desk" | "sponsored" | "wire";
  /** direct 기사의 취재 방식. direct 가 아닌 기사에 붙으면 빌드 실패. */
  reportingType?: "inquiry" | "interview" | "data-analysis" | "field" | "follow-up";
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
  Partial<Pick<Article, "type" | "isBreaking" | "tags" | "sponsor">>;

/** /articles-index.json 한 항목 — 카드 렌더 + 제목·태그 검색에 필요한 만큼만 담는다(본문 제외). */
export type ArticleIndexItem = ArticleCardItem & { tags: string[] };
