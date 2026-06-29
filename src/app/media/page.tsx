import type { Metadata } from "next";
import { getMultimedia } from "@/lib/queries";
import { ArticleCard } from "@/components/ArticleCard";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "포토·영상",
  description: "모두일보의 사진과 영상으로 보는 뉴스",
};

export default function MediaPage() {
  const items = getMultimedia(24);

  return (
    <>
      <PageHeader
        title="포토 · 영상"
        subtitle="현장의 순간을 사진과 영상으로 전합니다."
        breadcrumb={[{ label: "포토·영상" }]}
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
