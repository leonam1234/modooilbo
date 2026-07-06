import type { Metadata } from "next";
import { getMultimedia } from "@/lib/queries";
import { ArticleCard } from "@/components/ArticleCard";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "영상",
  description: "모두일보 영상으로 보는 뉴스 — 유튜브 쇼츠",
  alternates: { canonical: "/media/" },
};

export default function MediaPage() {
  const items = getMultimedia(24);

  return (
    <>
      <PageHeader
        title="영상"
        subtitle="뉴스를 쇼츠 영상으로 전합니다."
        breadcrumb={[{ label: "영상" }]}
      />
      <div className="container-page py-10">
        {items.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((a) => (
              <ArticleCard key={a.id} article={a} variant="overlay" />
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-ink-400">콘텐츠가 없습니다.</p>
        )}
      </div>
    </>
  );
}
