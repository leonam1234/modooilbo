import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ALL_ARTICLES } from "@/lib/news";
import { REPORTER_INDEXABLE, getReporterBySlug } from "@/lib/reporters";
import { CATEGORY_MAP } from "@/lib/categories";
import { SITE } from "@/lib/site";
import { formatKoreanDateTime } from "@/lib/utils";
import { displayImageUrl } from "@/lib/stock";
import { pageHref, paginate } from "@/lib/paginate";
import { SubscribeButton } from "@/components/SubscribeButton";
import { Pagination } from "@/components/Pagination";
import JsonLd from "@/components/JsonLd";

/**
 * 기자 프로필 + 기사 목록 — 1페이지(/reporter/<slug>/)와 2페이지 이상
 * (/reporter/<slug>/page/N/)이 이 컴포넌트를 공유한다.
 *
 * 목록에는 반드시 상한을 둔다. 기사 링크 하나가 HTML 약 3KB를 차지해서,
 * 발행량이 쌓이면 다작 기자의 페이지가 수 MB로 불어난다
 * (2026-07-31 실측: 링크 177개에 544KB → 기사 1만 편 시점 추정 9.5MB).
 */

export function reporterArticles(name: string) {
  return ALL_ARTICLES.filter((a) => a.author.name === name).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export function reporterMetadata(slug: string, page = 1): Metadata {
  const r = getReporterBySlug(slug);
  if (!r) return {};
  const base = `${r.name} ${r.role}`;
  const path = pageHref(`/reporter/${r.slug}/`, page);
  return {
    title: page > 1 ? `${base} (${page}페이지)` : base,
    description: `모두일보 ${r.name} ${r.role} — ${r.beat}`,
    alternates: { canonical: path },
    // 색인 여부는 lib/reporters.ts의 REPORTER_INDEXABLE 하나로 일괄 제어(사이트맵 등재와 같은 스위치)
    ...(REPORTER_INDEXABLE ? {} : { robots: { index: false, follow: true } }),
  };
}

export function ReporterPage({ slug, page = 1 }: { slug: string; page?: number }) {
  const reporter = getReporterBySlug(slug)!;
  const all = reporterArticles(reporter.name);
  const paged = paginate(all, page);
  const basePath = `/reporter/${reporter.slug}/`;

  const profileUrl = `${SITE.url}/reporter/${reporter.slug}/`;
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
      worksFor: { "@type": "NewsMediaOrganization", "@id": `${SITE.url}/#organization`, name: "모두일보" },
      knowsAbout: reporter.expertise,
      ...(reporter.photo ? { image: `${SITE.url}${reporter.photo}` } : {}),
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* 프로필 JSON-LD는 대표 URL(1페이지)에서만 — 페이지마다 같은 Person을 반복 선언하지 않는다 */}
      {paged.page === 1 && <JsonLd data={profileLd} />}
      {/* 프로필 헤더 */}
      <header className="flex items-center gap-5 border-b-2 border-ink-900 pb-8 dark:border-white">
        {reporter.photo ? (
          <Image
            src={reporter.photo}
            alt={`${reporter.name} ${reporter.role}`}
            width={80}
            height={80}
            unoptimized
            className="h-20 w-20 shrink-0 rounded-full object-cover ring-1 ring-ink-200 dark:ring-ink-700"
          />
        ) : (
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-ink-900 font-headline text-3xl font-bold text-white dark:bg-white dark:text-ink-900">
          {reporter.name.slice(0, 1)}
        </span>
        )}
        <div className="min-w-0">
          <h1 className="font-headline text-2xl font-bold text-ink-900 dark:text-white sm:text-3xl">
            {reporter.name} <span className="text-lg font-medium text-ink-500 sm:text-xl">{reporter.role}</span>
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-300">{reporter.beat}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
            {`전문 분야: ${reporter.expertise}`}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <SubscribeButton slug={reporter.slug} />
            <p className="text-xs tabular-nums text-ink-500 dark:text-ink-400">
              기사 {paged.total}건
              {paged.totalPages > 1 && ` · ${paged.page}/${paged.totalPages}페이지`}
            </p>
          </div>
        </div>
      </header>

      {/* 연락 창구·취재윤리 — 실재하는 정보만 싣는다(개별 사서함 미개설 상태, 공용 편집국 주소 사용) */}
      <section
        aria-label="연락 및 취재윤리"
        className="mt-6 rounded-lg border border-ink-100 bg-ink-50/50 px-5 py-4 text-sm leading-relaxed text-ink-600 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-300"
      >
        <p>
          제보·문의는 편집국 공용 주소{" "}
          <a href={`mailto:newsroom@modooilbo.com?subject=${encodeURIComponent(`[${reporter.name} ${reporter.role}] 문의`)}`} className="font-medium text-signal-600 hover:underline dark:text-signal-400">
            newsroom@modooilbo.com
          </a>
          &nbsp;으로 받습니다. 제목에 기자명을 적어 주시면 담당 기자에게 전달됩니다.
        </p>
        <p className="mt-2">
          모두일보의 모든 기자는{" "}
          <Link href="/ethics" className="font-medium text-signal-600 hover:underline dark:text-signal-400">
            윤리강령·편집위원회 규정
          </Link>
          을 준수합니다. 이해상충이 있는 사안은 기사에 고지하며, 광고성 콘텐츠는 광고 표기와 함께 발행합니다. 오류 정정은{" "}
          <Link href="/corrections" className="font-medium text-signal-600 hover:underline dark:text-signal-400">
            정정·반론 보도 모음
          </Link>
          에서 확인할 수 있습니다.
        </p>
      </section>

      {/* 기사 목록 */}
      <section className="mt-2 divide-y divide-ink-100 dark:divide-ink-800" aria-label="기자의 기사 목록">
        {paged.items.map((a) => (
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
                unoptimized
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </Link>
        ))}
        {paged.items.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-500 dark:text-ink-400">아직 등록된 기사가 없습니다.</p>
        )}
      </section>

      <Pagination paged={paged} basePath={basePath} />
    </div>
  );
}
