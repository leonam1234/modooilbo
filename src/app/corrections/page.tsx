import type { Metadata } from "next";
import Link from "next/link";
import { getAllArticles } from "@/lib/queries";
import { formatKoreanDateTime } from "@/lib/utils";
import { ArticleCard } from "@/components/ArticleCard";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "정정·반론 보도 모음",
  description:
    "모두일보가 게재한 정정 및 반론 보도 내역을 투명하게 공개하는 아카이브입니다.",
  alternates: { canonical: "/corrections/" },
};

export default function CorrectionsPage() {
  // ⚠️ 판정 기준은 correction(명시적 정정 기록)이다. updatedAt(단순 수정)으로 거르면
  // 오타 수정·속보 갱신까지 공식 정정 보도로 둔갑한다.
  const corrections = getAllArticles()
    .filter((a) => a.correction)
    .sort(
      (a, b) =>
        new Date(b.correction!.at).getTime() - new Date(a.correction!.at).getTime(),
    ); // 고정 ISO 문자열 파싱 — 결정적

  return (
    <>
      <PageHeader
        title="정정·반론 보도 모음"
        subtitle="보도에 오류가 확인되면 바로잡고, 그 기록을 삭제하지 않고 남깁니다."
        breadcrumb={[{ label: "정정·반론 보도 모음" }]}
      />

      <div className="container-page py-12">
        {corrections.length > 0 ? (
          <div className="space-y-8">
            {corrections.map((a) => (
              <div key={a.id}>
                <p className="mb-2 text-xs font-semibold text-signal-600 dark:text-signal-400">
                  정정 반영{" "}
                  <time dateTime={a.correction!.at}>
                    {formatKoreanDateTime(a.correction!.at)}
                  </time>
                </p>
                <ArticleCard article={a} variant="horizontal" />
                {/* 정정 사실과 그 내용 — 날짜만 남기면 정정 보도의 요건을 못 채운다. */}
                <p className="mt-3 rounded-lg border-l-2 border-signal-500 bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-700 dark:bg-ink-900/40 dark:text-ink-200">
                  {a.correction!.note}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-8 dark:border-ink-800 dark:bg-ink-900/40">
            <p className="font-bold text-ink-900 dark:text-white">
              현재까지 게재된 정정·반론 보도가 없습니다.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              정정이 발생하면 이 페이지에 기록을 남기고 임의로 삭제하지 않습니다.
            </p>
          </div>
        )}

        {/* 정정·반론 요청 안내 — 상시 노출 */}
        <h2 className="mt-12 mb-4 font-headline text-xl font-extrabold text-ink-900 dark:text-white">
          정정·반론 요청 안내
        </h2>
        <p className="leading-relaxed text-ink-600 dark:text-ink-300">
          보도 내용에 오류가 있거나 반론이 필요하다고 판단되면{" "}
          <a
            href="mailto:correction@modooilbo.com"
            className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
          >
            correction@modooilbo.com
          </a>{" "}
          으로 접수해 주십시오. 접수된 사안은 편집위원회가 검토하며,{" "}
          <Link
            href="/contact"
            className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
          >
            고객센터
          </Link>
          를 통해서도 문의하실 수 있습니다. 처리 기준은{" "}
          <Link
            href="/ethics#correction"
            className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
          >
            정정·반론 보도 원칙 전문
          </Link>
          을 따릅니다.
        </p>
      </div>
    </>
  );
}
