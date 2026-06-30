import type { Metadata } from "next";
import { Suspense } from "react";
import { ALL_ARTICLES } from "@/lib/news";
import type { ArticleListItem } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { SearchClient } from "./SearchClient";

export const metadata: Metadata = {
  title: "검색",
  description: "모두일보 기사 검색",
  alternates: { canonical: "/search/" },
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  // 본문(body)을 제외한 경량 인덱스를 서버에서 만들어 전달 → 클라이언트 번들 축소
  const index: ArticleListItem[] = ALL_ARTICLES.map(({ body, ...rest }) => rest);

  return (
    <>
      <PageHeader title="검색" breadcrumb={[{ label: "검색" }]} />
      <div className="container-page py-10">
        <Suspense fallback={<p className="text-ink-400">검색 준비 중…</p>}>
          <SearchClient index={index} />
        </Suspense>
      </div>
    </>
  );
}
