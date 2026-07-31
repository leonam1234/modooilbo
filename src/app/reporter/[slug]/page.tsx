import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { REPORTERS, getReporterBySlug } from "@/lib/reporters";
import { ReporterPage, reporterMetadata } from "@/components/ReporterPage";

// 정적 export: 로스터에 있는 기자만 생성
export const dynamicParams = false;

export function generateStaticParams() {
  return REPORTERS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return reporterMetadata(slug);
}

export default async function ReporterIndexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getReporterBySlug(slug)) notFound();
  return <ReporterPage slug={slug} />;
}
