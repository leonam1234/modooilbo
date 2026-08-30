import type { Metadata } from "next";
import Link from "next/link";
import { ALL_ARTICLES } from "@/lib/news";
import { getEditorialSeries, type EditorialSeriesSlug } from "@/lib/editorial-series";
import { SITE } from "@/lib/site";
import { ArticleCard } from "@/components/ArticleCard";
import { PageHeader } from "@/components/PageHeader";
import JsonLd from "@/components/JsonLd";

export function editorialSeriesArticles(slug: EditorialSeriesSlug) {
  return ALL_ARTICLES.filter((article) => article.series === slug).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export function editorialSeriesMetadata(slug: string): Metadata {
  const series = getEditorialSeries(slug);
  if (!series) return {};
  const path = `/series/${series.slug}/`;
  return {
    title: series.name,
    description: series.description,
    alternates: { canonical: path },
  };
}

export function EditorialSeriesPage({ slug }: { slug: EditorialSeriesSlug }) {
  const series = getEditorialSeries(slug)!;
  const articles = editorialSeriesArticles(slug);
  const basePath = `/series/${series.slug}/`;
  const pageUrl = `${SITE.url}${basePath}`;
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": pageUrl,
    url: pageUrl,
    name: series.name,
    description: series.description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": `${SITE.url}/#website` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: article.title,
        url: `${SITE.url}/article/${article.slug}/`,
      })),
    },
  };

  return (
    <>
      <JsonLd data={collectionLd} />
      <PageHeader
        title={series.name}
        subtitle={series.description}
        breadcrumb={[{ label: "기획 연재", href: "/series/" }, { label: series.name }]}
      />
      <main className="container-page py-10">
        {articles.length ? (
          <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} variant="feature" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-ink-200 p-8 text-center dark:border-ink-800">
            <p className="text-ink-600 dark:text-ink-300">이 기획의 첫 검증 기사를 준비하고 있습니다.</p>
            <Link href="/series/" className="mt-3 inline-block text-sm font-semibold text-signal-600 hover:underline dark:text-signal-400">
              다른 기획 보기
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
