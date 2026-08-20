import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { REPORTERS } from "@/lib/reporters";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";

/**
 * 편집국 소개 — 실제 발행 중인 로스터만 싣는다(2026-08-20 외부 점검 반영).
 * 회사소개(/about)의 비전·연혁과 달리, 이 페이지는 "지금 누가 무엇을 쓰는가"의 정본이다.
 * 조직·경력을 창작하지 않는다: 전문 분야는 reporters.ts(아카이브 도출값)를 그대로 쓴다.
 */
export const metadata: Metadata = {
  title: "편집국 소개",
  description:
    "모두일보 편집국의 기자 구성과 담당 분야, 연락 창구를 안내합니다. 모든 기자는 윤리강령을 준수하며 이해상충은 기사에 고지합니다. 기자별 담당과 전문 분야, 원자료 대조 절차와 광고 구분 원칙, 편집국 연락처를 함께 안내합니다. 기사는 공식 원자료를 직접 확인해 작성합니다.",
  alternates: { canonical: "/newsroom/" },
};

export default function NewsroomPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="편집국 소개"
        subtitle="모두일보의 기사는 아래 기자들이 담당 분야별로 작성하고 편집국 검수를 거쳐 발행됩니다."
      />

      <section aria-label="기자 명단" className="mt-8 grid gap-5 sm:grid-cols-2">
        {REPORTERS.filter((r) => r.listed !== false).map((r) => (
          <Link
            key={r.slug}
            href={`/reporter/${r.slug}/`}
            className="group rounded-xl border border-ink-200 bg-white p-6 transition-colors hover:border-signal-400 dark:border-ink-800 dark:bg-ink-900"
          >
            <div className="flex items-center gap-4">
              {r.photo ? (
                <Image
                  src={r.photo}
                  alt={`${r.name} ${r.role}`}
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-ink-200 dark:ring-ink-700"
                />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink-900 font-headline text-xl font-bold text-white dark:bg-white dark:text-ink-900">
                  {r.name.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="font-headline text-lg font-bold text-ink-900 group-hover:text-signal-600 dark:text-white">
                  {r.name} <span className="text-sm font-medium text-ink-500">{r.role}</span>
                </h2>
                <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-300">{r.beat}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              {`전문 분야: ${r.expertise}`}
            </p>
          </Link>
        ))}
      </section>

      <section
        aria-label="편집국 운영 원칙"
        className="mt-10 space-y-3 rounded-lg border border-ink-100 bg-ink-50/50 px-6 py-5 text-sm leading-relaxed text-ink-600 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-300"
      >
        <p>
          기사는 나라장터·기업마당·DART 등 공식 원자료를 직접 확인해 작성하며, 발행 전 담당
          기자와 편집국이 원출처를 대조합니다. 오류가 확인되면{" "}
          <Link href="/corrections" className="font-medium text-signal-600 hover:underline dark:text-signal-400">
            정정·반론 보도
          </Link>
          로 바로잡습니다.
        </p>
        <p>
          광고성 콘텐츠는 기사와 구분해 광고 표기와 함께 발행하며, 발행인이 관여하는 회사의
          콘텐츠에는 이해관계를 함께 고지합니다(
          <Link href="/partners" className="font-medium text-signal-600 hover:underline dark:text-signal-400">
            광고·후원 계약사 공개
          </Link>
          ).
        </p>
        <p>
          편집국 연락처:{" "}
          <a href="mailto:newsroom@modooilbo.com" className="font-medium text-signal-600 hover:underline dark:text-signal-400">
            newsroom@modooilbo.com
          </a>{" "}
          · 대표전화 {SITE.tel}
        </p>
      </section>
    </div>
  );
}
