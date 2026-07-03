import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getByCategory, getMostRead } from "@/lib/queries";
import { ArticleCard } from "@/components/ArticleCard";
import { MarketStrip } from "@/components/MarketStrip";
import { RankingList } from "@/components/RankingList";
import { RecentArticles } from "@/components/RecentArticles";
import { PageHeader } from "@/components/PageHeader";

// 정적 export: 아래 목록의 카테고리만 생성, 그 외 경로는 404
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
  const c = getCategory(category);
  if (!c) return { title: "페이지를 찾을 수 없습니다" };
  return { title: c.name, description: c.description };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  const articles = getByCategory(cat.slug);
  const lead = articles[0];
  const rest = articles.slice(1);

  return (
    <>
      <PageHeader
        title={cat.name}
        subtitle={cat.description}
        breadcrumb={[{ label: cat.name }]}
      />

      {cat.slug === "economy" && (
        <div className="container-page pt-8">
          <MarketStrip />
        </div>
      )}

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
