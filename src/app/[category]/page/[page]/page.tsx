import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getByCategory } from "@/lib/queries";
import { extraPageNumbers } from "@/lib/paginate";
import type { CategorySlug } from "@/lib/types";
import { CategoryListPage, categoryMetadata } from "@/components/CategoryListPage";

/**
 * 카테고리 목록 2페이지 이상 — /economy/page/2/ 형태.
 * 1페이지는 기존 /economy/ 가 그대로 담당한다(색인된 URL을 건드리지 않기 위해).
 *
 * 사업 축 6개(grants·bids·startup·industry·labor·deals)는 1페이지만 물리 라우트
 * (src/app/<slug>/page.tsx)로 존재하고 /page/N/ 하위 경로는 없다. 따라서 2페이지부터는
 * 13개 카테고리 전부가 이 라우트 하나로 처리된다 — 축별로 따로 만들 필요가 없다.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.flatMap((c) =>
    extraPageNumbers(getByCategory(c.slug).length).map((p) => ({ category: c.slug, page: String(p) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; page: string }>;
}): Promise<Metadata> {
  const { category, page } = await params;
  return categoryMetadata(category as CategorySlug, Number(page));
}

export default async function CategoryPagedPage({
  params,
}: {
  params: Promise<{ category: string; page: string }>;
}) {
  const { category, page } = await params;
  if (!getCategory(category)) notFound();
  const n = Number(page);
  if (!Number.isInteger(n) || n < 2) notFound();
  return <CategoryListPage slug={category as CategorySlug} page={n} />;
}
