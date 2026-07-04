import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthors, getAuthorBySlug, getByAuthor } from "@/lib/queries";
import { REPORTER_INDEXABLE } from "@/lib/authors";
import { SITE } from "@/lib/site";
import { ArticleCard } from "@/components/ArticleCard";
import { PageHeader } from "@/components/PageHeader";
import JsonLd from "@/components/JsonLd";

const SITE_URL = "https://modooilbo.com";

// 정적 export: 전 저자 슬러그만 생성, 그 외 404
export const dynamicParams = false;

export function generateStaticParams() {
  return getAuthors().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getAuthorBySlug(slug);
  if (!p) return { title: "기자를 찾을 수 없습니다" };
  return {
    title: `${p.name} ${p.role}`,
    description: p.bio,
    alternates: { canonical: `/reporter/${p.slug}/` },
    // 가상 인물 색인 방지 게이트 — 실인물 전환 시 authors.ts 플래그 한 줄로 해제
    ...(REPORTER_INDEXABLE ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function ReporterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getAuthorBySlug(slug);
  if (!p) notFound();
  const articles = getByAuthor(p.slug);

  const personLd = {
    "@type": "Person",
    "@id": `${SITE_URL}/reporter/${p.slug}/#person`,
    name: p.name,
    jobTitle: p.role,
    description: p.bio,
    url: `${SITE_URL}/reporter/${p.slug}/`,
    worksFor: { "@id": `${SITE_URL}/#organization` }, // 홈 NewsMediaOrganization @id와 정확 일치
    ...(p.beats.length ? { knowsAbout: p.beats } : {}),
  };
  const profilePageLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${SITE_URL}/reporter/${p.slug}/`,
    mainEntity: personLd,
  };
  // 날짜 필드(dateCreated 등)는 렌더 중 Date 금지 불변식으로 생략

  return (
    <>
      <JsonLd data={profilePageLd} />
      <PageHeader
        title={p.name}
        subtitle={`${p.role} · ${p.bio}`}
        breadcrumb={[{ label: "기자" }, { label: p.name }]}
      />
      <div className="container-page py-8">
        {p.beats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {p.beats.map((b) => (
              <span
                key={b}
                className="rounded-full bg-ink-100 px-3 py-1 text-sm text-ink-600 dark:bg-ink-800 dark:text-ink-300"
              >
                {b}
              </span>
            ))}
          </div>
        )}
        <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">
          제보·문의{" "}
          <a
            href={`mailto:${SITE.email}`}
            className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
          >
            {SITE.email}
          </a>
        </p>
        <section className="mt-10">
          <h2 className="mb-5 border-b-2 border-ink-900 pb-2 font-headline text-xl font-extrabold text-ink-900 dark:border-ink-100 dark:text-white">
            {p.name} 기자의 기사
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} variant="horizontal" showSummary={false} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
