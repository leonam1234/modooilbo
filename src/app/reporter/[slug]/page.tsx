import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_ARTICLES } from "@/lib/news";
import { REPORTERS, REPORTER_INDEXABLE, getReporterBySlug } from "@/lib/reporters";
import { CATEGORY_MAP } from "@/lib/categories";
import { formatKoreanDateTime } from "@/lib/utils";
import { displayImageUrl } from "@/lib/stock";
import { SubscribeButton } from "@/components/SubscribeButton";
import JsonLd from "@/components/JsonLd";

const SITE_URL = "https://modooilbo.com";

// 정적 export: 로스터 7명만 생성
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
  const r = getReporterBySlug(slug);
  if (!r) return {};
  return {
    title: `${r.name} ${r.role}`,
    description: `모두일보 ${r.name} ${r.role} — ${r.beat}`,
    alternates: { canonical: `/reporter/${r.slug}/` },
    // 실명 기자 체제 전환 전까지 noindex — lib/reporters.ts의 REPORTER_INDEXABLE로 일괄 해제
    ...(REPORTER_INDEXABLE ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function ReporterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const reporter = getReporterBySlug(slug);
  if (!reporter) notFound();

  const articles = ALL_ARTICLES.filter((a) => a.author.name === reporter.name).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  const profileUrl = `${SITE_URL}/reporter/${reporter.slug}/`;
  const profileLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": profileUrl,
    mainEntity: {
      "@type": "Person",
      name: reporter.name,
      jobTitle: reporter.role,
      description: reporter.beat,
      url: profileUrl,
      worksFor: { "@type": "NewsMediaOrganization", "@id": `${SITE_URL}/#organization`, name: "모두일보" },
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd data={profileLd} />
      {/* 프로필 헤더 */}
      <header className="flex items-center gap-5 border-b-2 border-ink-900 pb-8 dark:border-white">
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-ink-900 font-headline text-3xl font-bold text-white dark:bg-white dark:text-ink-900">
          {reporter.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <h1 className="font-headline text-2xl font-bold text-ink-900 dark:text-white sm:text-3xl">
            {reporter.name} <span className="text-lg font-medium text-ink-500 sm:text-xl">{reporter.role}</span>
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-300">{reporter.beat}</p>
          <div className="mt-2 flex items-center gap-3">
            <SubscribeButton slug={reporter.slug} />
            <p className="text-xs tabular-nums text-ink-500 dark:text-ink-400">기사 {articles.length}건</p>
          </div>
        </div>
      </header>

      {/* 기사 목록 */}
      <section className="mt-2 divide-y divide-ink-100 dark:divide-ink-800" aria-label="기자의 기사 목록">
        {articles.map((a) => (
          <Link key={a.id} href={`/article/${a.slug}`} className="group flex items-center gap-4 py-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-500 dark:text-ink-400">{CATEGORY_MAP[a.category]?.name ?? a.category}</p>
              <h2 className="mt-1 line-clamp-2 font-headline text-base font-bold leading-snug text-ink-900 group-hover:underline dark:text-white sm:text-lg">
                {a.title}
              </h2>
              <p className="mt-1 hidden text-sm text-ink-500 line-clamp-1 dark:text-ink-400 sm:block">{a.summary}</p>
              <p className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">{formatKoreanDateTime(a.publishedAt)}</p>
            </div>
            <div className="relative h-[4.5rem] w-28 shrink-0 overflow-hidden rounded-md bg-ink-100 dark:bg-ink-800">
              <Image
                src={displayImageUrl(a)}
                alt=""
                fill
                sizes="112px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </Link>
        ))}
        {articles.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-500 dark:text-ink-400">아직 등록된 기사가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
