import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_ARTICLES } from "@/lib/news";
import { getArticleBySlug, getRelated, getPrevNext, getMostRead, getThreeLineSummary } from "@/lib/queries";
import { CATEGORY_MAP } from "@/lib/categories";
import { formatKoreanDateTime, toKstIso } from "@/lib/utils";
import { ArticleCard } from "@/components/ArticleCard";
import { RankingList } from "@/components/RankingList";
import { ArticleActions } from "@/components/ArticleActions";
import { CommentSection } from "@/components/CommentSection";
import { ListenButton } from "@/components/ListenButton";
import { RecentArticles } from "@/components/RecentArticles";
import { ReactionBar } from "@/components/ReactionBar";
import { ThreeLineSummary } from "@/components/ThreeLineSummary";
import { ViewBeacon } from "@/components/ViewBeacon";
import { ViewCount } from "@/components/ViewCount";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ArticleBody, articleSpeechText } from "@/components/ArticleBody";
import { ogImageUrl, displayImageUrl } from "@/lib/stock";
import { getReporterByName } from "@/lib/reporters";
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
  const imageUrl = absoluteImageUrl(ogImageUrl(a)); // og는 webp 미지원 스크레이퍼 대비 jpg 고정
  const cat = CATEGORY_MAP[a.category];
  return {
    title: a.title,
    description: a.summary,
    alternates: { canonical: `/article/${a.slug}/` },
    openGraph: {
      title: a.title,
      description: a.summary,
      type: "article",
      locale: "ko_KR",
      siteName: "모두일보",
      url: `/article/${a.slug}/`,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: a.title }],
      publishedTime: a.publishedAt,
      authors: [a.author.name],
      section: cat?.name,
      tags: a.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: a.title,
      description: a.summary,
      images: [imageUrl],
    },
    other: { news_keywords: a.tags.join(", ") },
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

  const reporter = getReporterByName(article.author.name);
  const cat = CATEGORY_MAP[article.category];
  const related = getRelated(article, 4);
  const { prev, next } = getPrevNext(article);
  const readMinutes = Math.max(1, Math.round(article.body.join(" ").length / 600));
  const articleUrl = `${SITE_URL}/article/${article.slug}/`;
  const imageUrl = absoluteImageUrl(displayImageUrl(article));

  const isOpinion = article.type === "opinion" || article.category === "opinion";
  const wordCount = article.body.join(" ").trim().split(/\s+/).filter(Boolean).length;

  const newsArticleLd = {
    "@context": "https://schema.org",
    "@type": isOpinion ? "OpinionNewsArticle" : "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    headline: article.title.slice(0, 110),
    description: article.summary,
    image: [{ "@type": "ImageObject", url: imageUrl, width: 1600, height: 900 }],
    thumbnailUrl: imageUrl,
    datePublished: toKstIso(article.publishedAt),
    dateModified: toKstIso(article.updatedAt ?? article.publishedAt),
    keywords: article.tags.join(","),
    wordCount,
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    author: reporter
      ? [{ "@type": "Person", name: article.author.name, url: `${SITE_URL}/reporter/${reporter.slug}/` }]
      : [{ "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: article.author.name }],
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "모두일보",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
        width: 512,
        height: 512,
      },
    },
    articleSection: cat?.name,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: `${SITE_URL}/` },
      ...(cat
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: cat.name,
              item: `${SITE_URL}/${article.category}/`,
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
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <article className="min-w-0">
          <nav className="mb-4 flex min-w-0 items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
            <Link href="/" className="hover:text-signal-600">홈</Link>
            <span aria-hidden>/</span>
            <Link href={`/${article.category}`} className="shrink-0 hover:text-signal-600">
              {cat?.name}
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page" className="truncate text-ink-500 dark:text-ink-400">
              {article.title}
            </span>
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
          {/* id: 가+/가− 글자 확대 대상(본문과 함께 커져야 위계가 안 뒤집힘) */}
          <p id="article-lede" className="mt-4 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            {article.summary}
          </p>

          <div className="mt-5 flex flex-col gap-3 border-y border-ink-100 py-3 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-ink-500">
              {reporter ? (
                <Link
                  href={`/reporter/${reporter.slug}`}
                  className="font-medium text-ink-800 hover:underline dark:text-ink-100"
                >
                  {article.author.name}
                </Link>
              ) : (
                <span className="font-medium text-ink-800 dark:text-ink-100">{article.author.name}</span>
              )}{" "}
              {article.author.role} ·{" "}
              <span>
                입력 <time dateTime={toKstIso(article.publishedAt)}>{formatKoreanDateTime(article.publishedAt)}</time>
              </span>
              {article.updatedAt && (
                <span className="ml-2">
                  수정 <time dateTime={toKstIso(article.updatedAt)}>{formatKoreanDateTime(article.updatedAt)}</time>
                </span>
              )}
              <ViewCount articleId={article.id} />
              <span className="ml-2 text-ink-500 dark:text-ink-400">읽는 시간 {readMinutes}분</span>
            </div>
            <ArticleActions title={article.title} articleId={article.id} />
          </div>

          {article.youtubeId ? (
            <div className="mt-6">
              <div className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-lg bg-ink-900">
                <iframe
                  src={`https://www.youtube.com/embed/${article.youtubeId}`}
                  title={article.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
              {article.imageCaption && (
                <p className="mt-2 text-center text-xs text-ink-500 dark:text-ink-400">{article.imageCaption}</p>
              )}
            </div>
          ) : (
          <figure id="article-hero" className="mt-6">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
              <Image
                src={displayImageUrl(article)}
                alt={article.imageAlt ?? article.imageCaption ?? article.title}
                fill
                priority
                sizes="(max-width:1024px) 100vw, 66vw"
                unoptimized
                className="object-cover animate-kenburns"
              />
            </div>
            {article.imageCaption && (
              <figcaption className="mt-2 text-xs text-ink-500 dark:text-ink-400">{article.imageCaption}</figcaption>
            )}
          </figure>
          )}

          {/* 영상(쇼츠) 기사는 본문 듣기 제외 — 영상과 TTS가 겹치지 않게 */}
          {!article.youtubeId && (
            <div className="no-print mt-6 flex justify-center">
              <ListenButton text={articleSpeechText(article)} />
            </div>
          )}

          <ThreeLineSummary lines={getThreeLineSummary(article)} />

          <ArticleBody body={article.body} />

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

          <div className="mt-6 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-500 dark:text-ink-400 dark:border-ink-800">
            <p>ⓒ 모두일보(modooilbo.com) — 무단 전재·재배포 및 AI 학습·활용 금지</p>
            <p className="no-print mt-1.5">
              기사에서 잘못된 정보나 오탈자를 발견하셨나요?{" "}
              <a
                href={`mailto:correction@modooilbo.com?subject=${encodeURIComponent(`[정정요청] ${article.title}`)}`}
                className="underline underline-offset-2 hover:text-signal-600"
              >
                정정 요청하기
              </a>
              <span aria-hidden> · </span>
              <Link href="/ethics" className="underline underline-offset-2 hover:text-signal-600">
                정정·반론 원칙
              </Link>
            </p>
          </div>

          <ViewBeacon articleId={article.id} />
          <ImageLightbox />
          <ReadingProgress />
          <div className="no-print">
            <ReactionBar articleId={article.id} />
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-900">
            <div>
              <p className="text-sm font-bold text-ink-900 dark:text-white">
                {article.author.name} <span className="font-normal text-ink-500">{article.author.role}</span>
              </p>
              <p className="mt-1 text-sm text-ink-500">
                modooilbo.com
              </p>
            </div>
            {getReporterByName(article.author.name) && (
              <Link
                href={`/reporter/${getReporterByName(article.author.name)!.slug}`}
                className="shrink-0 rounded-md border border-ink-300 px-3 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200"
              >
                기자의 다른 기사
              </Link>
            )}
          </div>

          <div className="no-print">
            {/* AI 활용 고지 + 정정요청 (정보통신망법 2026-07-07 시행 대응) */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50/60 px-4 py-3 text-xs leading-relaxed text-ink-500 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-400">
            <span>
              이 기사는 AI 도구를 활용해 작성되고 편집국 검수를 거쳤습니다.{" "}
              <a href="/policy" className="underline">운영정책</a>
            </span>
            <a
              href={`mailto:help@modooilbo.com?subject=${encodeURIComponent(`[정정요청] ${article.title}`)}&body=${encodeURIComponent(`기사: https://modooilbo.com/article/${article.slug}/\n\n정정 요청 내용을 적어 주세요.`)}`}
              className="shrink-0 font-semibold text-ink-700 underline dark:text-ink-200"
            >
              정정요청·신고
            </a>
          </div>

          <CommentSection articleId={article.id} />
          </div>

          {(prev || next) && (
            /* minmax(0,1fr): 긴 제목의 min-content가 트랙을 밀어 모바일 가로 스크롤을 만들던 버그 방지 */
            <nav
              aria-label="이전 다음 기사"
              className="no-print mt-10 grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-ink-100 pt-8 dark:border-ink-800 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            >
              {prev ? (
                <Link
                  href={`/article/${prev.slug}`}
                  className="group flex items-center gap-3 rounded-lg border border-ink-200 px-4 py-3.5 transition-colors hover:border-ink-400 dark:border-ink-800 dark:hover:border-ink-600"
                >
                  <span aria-hidden className="shrink-0 text-lg text-ink-500 dark:text-ink-400">‹</span>
                  <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-ink-100 dark:bg-ink-800">
                    <Image src={displayImageUrl(prev)} alt="" fill sizes="64px" unoptimized className="object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-ink-500 dark:text-ink-400">이전 기사</span>
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
                    <span className="block text-xs text-ink-500 dark:text-ink-400">다음 기사</span>
                    <span className="block truncate font-medium text-ink-800 group-hover:text-signal-700 dark:text-ink-100">
                      {next.title}
                    </span>
                  </span>
                  <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-ink-100 dark:bg-ink-800">
                    <Image src={displayImageUrl(next)} alt="" fill sizes="64px" unoptimized className="object-cover" />
                  </span>
                  <span aria-hidden className="shrink-0 text-lg text-ink-500 dark:text-ink-400">›</span>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
            </nav>
          )}

          {related.length > 0 && (
            <section className="no-print mt-12">
              <h2 className="mb-5 border-b-2 border-ink-900 pb-2 font-headline text-xl font-extrabold text-ink-900 dark:border-ink-100 dark:text-white">
                관련 기사
              </h2>
              {/* md(사이드바 등장)에서는 본문 칼럼이 좁아 2열이면 제목이 2~3글자씩 꺾임 → 1열 */}
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {related.map((a) => (
                  <ArticleCard key={a.id} article={a} variant="horizontal" showSummary={false} />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-10">
          <RankingList
            count={6}
            pool={getMostRead(60).map((a) => ({ id: a.id, slug: a.slug, title: a.title, category: a.category }))}
          />
          <RecentArticles excludeId={article.id} />
          <div className="glass-card rounded-xl border border-ink-200 p-6 dark:border-ink-800">
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
