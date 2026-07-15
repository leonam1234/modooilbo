import type { Metadata } from "next";
import { getCategory } from "@/lib/categories";
import { getByCategory, getMostRead } from "@/lib/queries";
import { ArticleCard } from "@/components/ArticleCard";
import { RankingList } from "@/components/RankingList";
import { RecentArticles } from "@/components/RecentArticles";
import { PageHeader } from "@/components/PageHeader";
import JsonLd from "@/components/JsonLd";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

const SITE_URL = "https://modooilbo.com";

// 산업·트렌드 — 기업 데이터 뉴스 '사업' 축의 정식 카테고리 목록 페이지.
// (기사가 붙어 승격됨 → noindex 해제. 준비 중 메뉴는 BizComingSoon·noindex 유지.)
const cat = getCategory("industry")!;
const title = cat.seoTitle ?? cat.name;
const description = cat.seoDescription ?? cat.description;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/industry/" },
  openGraph: { title, description, type: "website", url: "/industry/", images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE.url] },
};

export default function IndustryPage() {
  const articles = getByCategory("industry");
  const lead = articles[0];
  const rest = articles.slice(1);

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/industry/`,
    url: `${SITE_URL}/industry/`,
    name: cat.name,
    description: cat.description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/article/${a.slug}/`,
        name: a.title,
      })),
    },
  };

  return (
    <>
      <JsonLd data={collectionLd} />
      <PageHeader
        title={cat.name}
        subtitle={cat.description}
        breadcrumb={[{ label: cat.name }]}
      />

      <div className="container-page grid gap-x-10 gap-y-10 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {lead ? (
            <>
              <ArticleCard
                article={lead}
                variant="horizontal"
                priority
                className="border-b border-ink-100 pb-8 dark:border-ink-800 [&_h3]:text-xl sm:[&_h3]:text-2xl"
              />
              {rest.length > 0 && (
                <div className="mt-8 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((a) => (
                    <ArticleCard key={a.id} article={a} variant="feature" />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="py-20 text-center text-ink-400">아직 등록된 기사가 없습니다.</p>
          )}
        </div>

        <aside className="space-y-10">
          <RankingList
            count={6}
            pool={getMostRead(60).map((a) => ({ id: a.id, slug: a.slug, title: a.title, category: a.category }))}
          />
          <RecentArticles />
        </aside>
      </div>
    </>
  );
}
