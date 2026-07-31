import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SearchClient } from "./SearchClient";

export const metadata: Metadata = {
  title: "검색",
  description: "모두일보 기사 검색",
  alternates: { canonical: "/search/" },
  robots: { index: false, follow: true },
};

/**
 * 검색 페이지는 셸만 정적으로 굽는다.
 *
 * ⚠️ 여기서 `@/lib/news`(ALL_ARTICLES)를 임포트하지 말 것.
 *    SearchClient가 클라이언트 컴포넌트라, 이 라우트가 기사 배열에 닿는 순간
 *    코퍼스 전체가 라우트 청크에 실린다(예전 3.5MB / 전송 1.0MB의 원인).
 *    지금은 검색어가 실제로 입력됐을 때만 /articles-index.json 을 fetch 한다.
 */
export default function SearchPage() {
  return (
    <>
      <PageHeader title="검색" breadcrumb={[{ label: "검색" }]} />
      <div className="container-page py-10">
        <Suspense fallback={<p className="text-ink-500 dark:text-ink-400">검색 준비 중…</p>}>
          <SearchClient />
        </Suspense>
      </div>
    </>
  );
}
