import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListPage, categoryMetadata } from "@/components/CategoryListPage";
import { categoryPageParams } from "@/lib/paginate";

/**
 * 목록 2페이지 이상 — /deals/page/2/ 형태.
 *
 * ⚠️ 사업 축 6개는 src/app/deals/page.tsx 라는 물리 라우트를 갖는다. 물리 세그먼트가
 *    [category]보다 우선해 하위 경로까지 가려버리므로, [category]/page/[page]로는
 *    이 6개의 2페이지가 생성되지 않는다(2026-07-31 실측 확인). 축별로 둬야 한다.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return categoryPageParams("deals");
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return categoryMetadata("deals", Number(page));
}

export default async function DealsPagedPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const n = Number(page);
  if (!Number.isInteger(n) || n < 2) notFound();
  return <CategoryListPage slug="deals" page={n} />;
}
