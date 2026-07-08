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

export const CATEGORY_MAP: Record<CategorySlug, Category> = CATEGORIES.reduce(
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
