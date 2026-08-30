import { notFound } from "next/navigation";
import { EDITORIAL_SERIES, getEditorialSeries, type EditorialSeriesSlug } from "@/lib/editorial-series";
import { EditorialSeriesPage, editorialSeriesMetadata } from "@/components/EditorialSeriesPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return EDITORIAL_SERIES.map((series) => ({ slug: series.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return editorialSeriesMetadata(slug);
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getEditorialSeries(slug)) notFound();
  return <EditorialSeriesPage slug={slug as EditorialSeriesSlug} />;
}
