import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategory } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { CategoryListPage, categoryMetadata } from "@/components/CategoryListPage";

// 정적 export: 아래 목록의 카테고리만 생성, 그 외 경로는 404.
// (사업 축 6개는 src/app/{grants,bids,startup,industry,labor,deals}/ 전용 라우트가 담당한다 —
//  화면·metadata 구현은 CategoryListPage로 공유하므로 두 축의 목록 페이지가 어긋날 수 없다)
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return categoryMetadata(category as CategorySlug);
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!getCategory(category)) notFound();
  return <CategoryListPage slug={category as CategorySlug} />;
}
