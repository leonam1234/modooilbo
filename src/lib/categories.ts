import type { Category, CategorySlug } from "./types";

export const CATEGORIES: Category[] = [
  { slug: "economy", name: "경제", nameEn: "Economy", description: "시장·산업·부동산·금융 심층 분석", seoTitle: "경제 뉴스 — 증시·부동산·금리·산업·기업", seoDescription: "증시와 부동산, 금리와 환율, 산업·기업 동향까지 — 모두일보가 한국 경제의 흐름을 짚고 투자와 생활에 도움이 되는 심층 분석을 전합니다." },
  { slug: "society", name: "사회", nameEn: "Society", description: "우리 사회의 오늘을 기록합니다", seoTitle: "사회 뉴스 — 사건사고·교육·노동·복지·환경", seoDescription: "사건·사고부터 교육·노동·복지·환경까지 — 모두일보가 우리 사회의 오늘을 기록하고 변화의 의미를 차분하게 풀어냅니다." },
  { slug: "world", name: "국제", nameEn: "World", description: "세계를 읽는 또 하나의 창", seoTitle: "국제 뉴스 — 미국·중국·일본·유럽 글로벌 이슈", seoDescription: "미국·중국·일본·유럽 등 세계 곳곳의 주요 뉴스 — 모두일보가 국제 정세와 글로벌 이슈를 한국의 시각으로 읽어 드립니다." },
  { slug: "culture", name: "문화", nameEn: "Culture", description: "예술·공연·라이프스타일", seoTitle: "문화 뉴스 — 영화·공연·전시·도서·라이프스타일", seoDescription: "영화·공연·전시·도서·음악과 라이프스타일까지 — 모두일보가 문화 예술의 흐름과 트렌드를 감각 있게 소개합니다." },
  { slug: "sports", name: "스포츠", nameEn: "Sports", description: "현장의 함성, 승부의 기록", seoTitle: "스포츠 뉴스 — 축구·야구·올림픽·e스포츠", seoDescription: "축구·야구·농구부터 올림픽과 e스포츠까지 — 모두일보가 현장의 함성과 승부의 순간, 선수들의 이야기를 생생하게 전합니다." },
  { slug: "tech", name: "테크", nameEn: "Tech", description: "AI·IT·과학의 최전선", seoTitle: "테크 뉴스 — AI·IT·반도체·스타트업·과학", seoDescription: "AI·IT·반도체·스타트업·과학 — 모두일보가 빠르게 변하는 기술의 최전선과 산업 혁신의 흐름을 알기 쉽게 짚어 드립니다." },
  { slug: "opinion", name: "오피니언", nameEn: "Opinion", description: "사설·칼럼·시론", seoTitle: "오피니언 — 사설·칼럼·시론·기고", seoDescription: "사설과 칼럼, 시론과 독자 기고 — 모두일보가 우리 시대의 쟁점을 다양한 시선으로 조명하고 건강한 공론의 장을 엽니다." },
];

/**
 * 기업 데이터 뉴스 — '사업' 축 카테고리(위 종합뉴스 CATEGORIES와 분리된 신규 축).
 * 헤더 상단 사업 메뉴(lib/biz-menus.ts)로 노출되며, 실제 기사가 붙어 정식 카테고리로
 * 승격된 사업 메뉴만 여기에 등록한다(bids 등 '준비 중' 메뉴는 기사 카테고리가 아니므로 제외).
 *
 * ⚠️ 이 배열은 CATEGORIES와 분리 유지한다. 종합뉴스 내비·홈 섹션·[category] 라우트·사이트맵
 *    카테고리 루프가 CATEGORIES만 순회하도록 두어 사업 축이 종합뉴스 면을 침범하지 않게 한다.
 */
export const BIZ_CATEGORIES: Category[] = [
  {
    slug: "grants",
    name: "정부지원금",
    nameEn: "Grants",
    description: "정부·지자체 지원사업과 보조금 공고를 기업 관점에서 정리합니다",
    seoTitle: "정부지원금 뉴스 — 정부·지자체 지원사업·보조금 공고 분석",
    seoDescription:
      "정부·지자체 지원사업과 보조금 공고를 대상·자격·마감 중심으로 정리합니다. 모두일보가 기업이 놓치기 쉬운 지원금 조건과 주의점을 짚어 드립니다.",
  },
];

/** 사업 축 카테고리 슬러그 집합 — 종합뉴스 홈 히어로 등에서 사업 기사를 걸러내는 데 쓴다. */
export const BIZ_CATEGORY_SLUGS = new Set<CategorySlug>(
  BIZ_CATEGORIES.map((c) => c.slug),
);

/** 해당 슬러그가 사업 축(정부지원금 등) 카테고리인지 여부. */
export function isBizCategory(slug: CategorySlug): boolean {
  return BIZ_CATEGORY_SLUGS.has(slug);
}

// 이름·SEO 해석용 통합 맵 — 종합뉴스 + 사업 축 카테고리 정의를 모두 담는다.
export const CATEGORY_MAP: Record<CategorySlug, Category> = [
  ...CATEGORIES,
  ...BIZ_CATEGORIES,
].reduce(
  (acc, c) => {
    acc[c.slug] = c;
    return acc;
  },
  {} as Record<CategorySlug, Category>,
);

export function getCategory(slug: string): Category | undefined {
  return CATEGORY_MAP[slug as CategorySlug];
}

export function categoryName(slug: CategorySlug): string {
  return CATEGORY_MAP[slug]?.name ?? slug;
}
