import type { Metadata } from "next";
import Link from "next/link";
import { EDITORIAL_SERIES } from "@/lib/editorial-series";
import { editorialSeriesArticles } from "@/components/EditorialSeriesPage";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "기획 연재",
  description: "공고 원문검증, 데이터 교차검증, 직접 답변 취재를 반복 가능한 편집국 기획으로 묶어 제공합니다.",
  alternates: { canonical: "/series/" },
};

export default function SeriesIndexPage() {
  return (
    <>
      <PageHeader
        title="기획 연재"
        subtitle="한 번 읽고 끝나는 기사가 아니라 같은 기준으로 계속 확인하는 모두일보의 취재 자산입니다."
        breadcrumb={[{ label: "기획 연재" }]}
      />
      <main className="container-page grid gap-5 py-10 md:grid-cols-3">
        {EDITORIAL_SERIES.map((series) => {
          const count = editorialSeriesArticles(series.slug).length;
          return (
            <Link
              key={series.slug}
              href={`/series/${series.slug}/`}
              className="group rounded-xl border border-ink-200 bg-white p-6 transition-colors hover:border-signal-400 dark:border-ink-800 dark:bg-ink-900"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-signal-600 dark:text-signal-400">모두일보 기획</p>
              <h2 className="mt-2 font-headline text-xl font-bold text-ink-900 group-hover:text-signal-600 dark:text-white">
                {series.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{series.description}</p>
              <p className="mt-5 text-xs font-medium text-ink-500 dark:text-ink-400">현재 {count}편</p>
            </Link>
          );
        })}
      </main>
    </>
  );
}
