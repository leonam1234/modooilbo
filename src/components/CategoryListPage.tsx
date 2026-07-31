import type { Metadata } from "next";
import type { CategorySlug } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { getByCategory, getMostRead } from "@/lib/queries";
import { PAGE_SIZE, pageHref, paginate } from "@/lib/paginate";
import { Pagination } from "@/components/Pagination";
import { cn } from "@/lib/utils";
import { ArticleCard } from "@/components/ArticleCard";
import { MarketStrip } from "@/components/MarketStrip";
import { RankingList } from "@/components/RankingList";
import { RecentArticles } from "@/components/RecentArticles";
import { PageHeader } from "@/components/PageHeader";
import JsonLd from "@/components/JsonLd";
import { DEFAULT_OG_IMAGE, SITE } from "@/lib/site";

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
export function categoryMetadata(slug: CategorySlug, page = 1): Metadata {
  const c = getCategory(slug);
  if (!c) return { title: "페이지를 찾을 수 없습니다" };
  const base = c.seoTitle ?? c.name;
  // 2페이지부터는 제목·설명에 페이지 번호를 넣는다 — 같은 title이 여러 URL에 붙으면
  // 검색엔진이 중복 페이지로 보고 색인에서 접는다.
  const title = page > 1 ? `${base} (${page}페이지)` : base;
  const description = page > 1 ? `${c.seoDescription ?? c.description} ${page}페이지.` : (c.seoDescription ?? c.description);
  const path = pageHref(`/${c.slug}/`, page);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: "website",
      url: path,
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

export function CategoryListPage({ slug, page = 1 }: { slug: CategorySlug; page?: number }) {
  const cat = getCategory(slug)!;
  const all = getByCategory(cat.slug);
  // 목록은 반드시 잘라서 그린다 — 상한이 없으면 기사 링크(1개당 HTML 약 3KB)가 쌓여
  // 기사 1만 편 시점에 카테고리 페이지가 수 MB가 된다.
  const paged = paginate(all, page);
  const basePath = `/${cat.slug}/`;
  // 리드 카드는 1페이지에서만 크게 뽑는다(2페이지부터는 균일한 그리드).
  const lead = paged.page === 1 ? paged.items[0] : undefined;
  const rest = paged.page === 1 ? paged.items.slice(1) : paged.items;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE.url}${pageHref(basePath, paged.page)}`,
    url: `${SITE.url}${pageHref(basePath, paged.page)}`,
    name: cat.name,
    description: cat.description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": `${SITE.url}/#website` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: paged.items.map((a, i) => ({
        "@type": "ListItem",
        position: (paged.page - 1) * PAGE_SIZE + i + 1,
        url: `${SITE.url}/article/${a.slug}/`,
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
          {paged.items.length ? (
            <>
              {lead && (
                <ArticleCard
                  article={lead}
                  variant="horizontal"
                  priority
                  className="border-b border-ink-100 pb-8 dark:border-ink-800 [&_h3]:text-xl sm:[&_h3]:text-2xl"
                />
              )}
              {rest.length > 0 && (
                <div className={cn("grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3", lead && "mt-8")}>
                  {rest.map((a) => (
                    <ArticleCard key={a.id} article={a} variant="feature" priority={!lead} />
                  ))}
                </div>
              )}
              <Pagination paged={paged} basePath={basePath} />
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
