import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_ARTICLES } from "@/lib/news";
import { getArticleBySlug, getRelated, getPrevNext } from "@/lib/queries";
import { CATEGORY_MAP } from "@/lib/categories";
import { formatKoreanDateTime, formatCount } from "@/lib/utils";
import { ArticleCard } from "@/components/ArticleCard";
import { RankingList } from "@/components/RankingList";
import { ArticleActions } from "@/components/ArticleActions";
import { ListenButton } from "@/components/ListenButton";
import { ReactionBar } from "@/components/ReactionBar";
import { displayImageUrl } from "@/lib/stock";
import JsonLd from "@/components/JsonLd";

const SITE_URL = "https://modooilbo.com";

function absoluteImageUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

// 정적 export: 전체 기사 슬러그만 생성, 그 외 경로는 404
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticleBySlug(slug);
  if (!a) return { title: "기사를 찾을 수 없습니다" };
  const imageUrl = absoluteImageUrl(displayImageUrl(a));
  return {
    title: a.title,
    description: a.summary,
    openGraph: { title: a.title, description: a.summary, images: [imageUrl], type: "article" },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const cat = CATEGORY_MAP[article.category];
  const related = getRelated(article, 4);
  const { prev, next } = getPrevNext(article);
  const readMinutes = Math.max(1, Math.round(article.body.join(" ").length / 600));
  const articleUrl = `${SITE_URL}/article/${article.slug}`;
  const imageUrl = absoluteImageUrl(displayImageUrl(article));

  const newsArticleLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    headline: article.title,
    description: article.summary,
    image: [imageUrl],
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    author: [{ "@type": "Person", name: article.author.name }],
    publisher: {
      "@type": "Organization",
      name: "모두일보",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    articleSection: cat?.name,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      ...(cat
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: cat.name,
              item: `${SITE_URL}/${article.category}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: cat ? 3 : 2,
        name: article.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <div className="container-page py-8">
      <JsonLd data={newsArticleLd} />
      <JsonLd data={breadcrumbLd} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0">
          <nav className="mb-4 flex items-center gap-1.5 text-xs text-ink-400">
            <Link href="/" className="hover:text-signal-600">홈</Link>
            <span aria-hidden>/</span>
            <Link href={`/${article.category}`} className="hover:text-signal-600">
              {cat?.name}
            </Link>
          </nav>

          <Link
            href={`/${article.category}`}
            className="text-sm font-bold text-signal-600 hover:text-signal-700"
          >
            {cat?.name}
          </Link>
          <h1 className="mt-2 font-headline text-3xl font-extrabold leading-tight text-ink-900 dark:text-white sm:text-4xl sm:leading-tight">
            {article.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            {article.summary}
          </p>

          <div className="mt-5 flex flex-col gap-3 border-y border-ink-100 py-3 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-ink-500">
              <span className="font-medium text-ink-800 dark:text-ink-100">{article.author.name}</span>{" "}
              {article.author.role} ·{" "}
              <time dateTime={article.publishedAt}>{formatKoreanDateTime(article.publishedAt)}</time>
              <span className="ml-2 text-ink-400">조회 {formatCount(article.readCount)}</span>
              <span className="ml-2 text-ink-400">읽는 시간 {readMinutes}분</span>
            </div>
            <ArticleActions title={article.title} />
          </div>

          <figure className="mt-6">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
              <Image
                src={displayImageUrl(article)}
                alt={article.title}
                fill
                priority
                sizes="(max-width:1024px) 100vw, 66vw"
                unoptimized
                className="object-cover animate-kenburns"
              />
            </div>
            {article.imageCaption && (
              <figcaption className="mt-2 text-xs text-ink-400">{article.imageCaption}</figcaption>
            )}
          </figure>

          <div className="mt-6 flex justify-center">
            <ListenButton text={[article.title, article.summary, ...article.body].join(" ")} />
          </div>

          <div
            id="article-body"
            className="mt-8 space-y-5 text-[17px] leading-[1.9] text-ink-800 dark:text-ink-200"
          >
            {article.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((t) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="rounded-full bg-ink-100 px-3 py-1 text-sm text-ink-600 transition-colors hover:bg-signal-50 hover:text-signal-700 dark:bg-ink-800 dark:text-ink-300"
              >
                #{t}
              </Link>
            ))}
          </div>

          <ReactionBar articleId={article.id} />

          <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-900">
            <p className="text-sm font-bold text-ink-900 dark:text-white">
              {article.author.name} <span className="font-normal text-ink-500">{article.author.role}</span>
            </p>
            <p className="mt-1 text-sm text-ink-500">
              modooilbo.com · 본 기사와 기자 프로필은 데모용 가상 정보입니다.
            </p>
          </div>

          {(prev || next) && (
            <nav
              aria-label="이전 다음 기사"
              className="mt-10 grid gap-3 border-t border-ink-100 pt-8 dark:border-ink-800 sm:grid-cols-2"
            >
              {prev ? (
                <Link
                  href={`/article/${prev.slug}`}
                  className="group flex items-center gap-3 rounded-lg border border-ink-200 px-4 py-3.5 transition-colors hover:border-ink-400 dark:border-ink-800 dark:hover:border-ink-600"
                >
                  <span aria-hidden className="shrink-0 text-lg text-ink-400">‹</span>
                  <span className="min-w-0">
                    <span className="block text-xs text-ink-400">이전 기사</span>
                    <span className="block truncate font-medium text-ink-800 group-hover:text-signal-700 dark:text-ink-100">
                      {prev.title}
                    </span>
                  </span>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
              {next ? (
                <Link
                  href={`/article/${next.slug}`}
                  className="group flex items-center justify-end gap-3 rounded-lg border border-ink-200 px-4 py-3.5 text-right transition-colors hover:border-ink-400 dark:border-ink-800 dark:hover:border-ink-600"
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-ink-400">다음 기사</span>
                    <span className="block truncate font-medium text-ink-800 group-hover:text-signal-700 dark:text-ink-100">
                      {next.title}
                    </span>
                  </span>
                  <span aria-hidden className="shrink-0 text-lg text-ink-400">›</span>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
            </nav>
          )}

          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-5 border-b-2 border-ink-900 pb-2 font-headline text-xl font-extrabold text-ink-900 dark:border-ink-100 dark:text-white">
                관련 기사
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {related.map((a) => (
                  <ArticleCard key={a.id} article={a} variant="horizontal" showSummary={false} />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-10">
          <RankingList count={6} />
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-6 dark:border-ink-800 dark:bg-ink-900">
            <h3 className="font-headline text-lg font-bold text-ink-900 dark:text-white">
              독립 저널리즘을 후원하세요
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
              광고가 아닌 독자의 힘으로 만드는 뉴스. 모두일보와 함께해 주세요.
            </p>
            <Link
              href="/subscribe"
              className="mt-4 block rounded-md bg-signal-600 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-signal-700"
            >
              후원·구독하기
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
