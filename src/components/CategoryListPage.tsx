import type { Metadata } from "next";
import type { CategorySlug } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { getByCategory, getMostRead } from "@/lib/queries";
import { ArticleCard } from "@/components/ArticleCard";
import { MarketStrip } from "@/components/MarketStrip";
import { RankingList } from "@/components/RankingList";
import { RecentArticles } from "@/components/RecentArticles";
import { PageHeader } from "@/components/PageHeader";
import JsonLd from "@/components/JsonLd";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

const SITE_URL = "https://modooilbo.com";

/**
 * 카테고리 목록 페이지의 **단일 구현** — 종합뉴스 [category] 라우트와 사업 6개 전용 라우트가
 * 공유한다.
 *
 * 사업 6개(grants·bids·startup·industry·labor·deals)는 정적 export를 위해 각자 물리 라우트
 * 파일을 가져야 하는데(=[category]의 generateStaticParams는 종합뉴스만 돌린다), 그 6개가
 * 이 페이지 본문을 93줄씩 그대로 복붙해 두고 있었다. 한 곳을 고치면 나머지 6곳이 조용히
 * 어긋나는 구조라 여기로 합쳤다. 각 라우트 파일은 이제 슬러그만 넘기는 껍데기다.
 */

/** 카테고리 목록 페이지 metadata 생성 — og:image 누락(얕은 병합) 방지 포함. */
export function categoryMetadata(slug: CategorySlug): Metadata {
  const c = getCategory(slug);
  if (!c) return { title: "페이지를 찾을 수 없습니다" };
  const title = c.seoTitle ?? c.name;
  const description = c.seoDescription ?? c.description;
  return {
    title,
    description,
    alternates: { canonical: `/${c.slug}/` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/${c.slug}/`,
      // openGraph는 얕은 병합 — 페이지가 openGraph를 새로 선언하면 루트 layout의 siteName·locale·
      // 이미지가 상속되지 않고 통째로 사라진다. 이름값 정합(og:site_name="모두일보")을 위해 여기서
      // 공통값을 함께 병합한다(site.ts 주석 참조).
      siteName: "모두일보",
      locale: "ko_KR",
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}

export function CategoryListPage({ slug }: { slug: CategorySlug }) {
  const cat = getCategory(slug)!;
  const articles = getByCategory(cat.slug);
  const lead = articles[0];
  const rest = articles.slice(1);

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/${cat.slug}/`,
    url: `${SITE_URL}/${cat.slug}/`,
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
      <PageHeader title={cat.name} subtitle={cat.description} breadcrumb={[{ label: cat.name }]} />

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
            <p className="py-20 text-center text-ink-500 dark:text-ink-400">아직 등록된 기사가 없습니다.</p>
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
