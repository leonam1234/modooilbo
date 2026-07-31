import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { REPORTERS, getReporterBySlug } from "@/lib/reporters";
import { extraPageNumbers } from "@/lib/paginate";
import { ReporterPage, reporterArticles, reporterMetadata } from "@/components/ReporterPage";

/**
 * 기자 기사 목록 2페이지 이상 — /reporter/<slug>/page/2/ 형태.
 * 1페이지는 /reporter/<slug>/ 가 그대로 담당한다(색인된 URL 유지).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return REPORTERS.flatMap((r) =>
    extraPageNumbers(reporterArticles(r.name).length).map((p) => ({ slug: r.slug, page: String(p) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}): Promise<Metadata> {
  const { slug, page } = await params;
  return reporterMetadata(slug, Number(page));
}

export default async function ReporterPagedPage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { slug, page } = await params;
  if (!getReporterBySlug(slug)) notFound();
  const n = Number(page);
  if (!Number.isInteger(n) || n < 2) notFound();
  return <ReporterPage slug={slug} page={n} />;
}
