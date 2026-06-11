import type { Category, CategorySlug } from "./types";

export const CATEGORIES: Category[] = [
  { slug: "politics", name: "정치", nameEn: "Politics", description: "국회·정당·외교·안보의 핵심 동향" },
  { slug: "economy", name: "경제", nameEn: "Economy", description: "시장·산업·부동산·금융 심층 분석" },
  { slug: "society", name: "사회", nameEn: "Society", description: "우리 사회의 오늘을 기록합니다" },
  { slug: "world", name: "국제", nameEn: "World", description: "세계를 읽는 또 하나의 창" },
  { slug: "culture", name: "문화", nameEn: "Culture", description: "예술·공연·라이프스타일" },
  { slug: "sports", name: "스포츠", nameEn: "Sports", description: "현장의 함성, 승부의 기록" },
  { slug: "tech", name: "테크", nameEn: "Tech", description: "AI·IT·과학의 최전선" },
  { slug: "opinion", name: "오피니언", nameEn: "Opinion", description: "사설·칼럼·시론" },
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
