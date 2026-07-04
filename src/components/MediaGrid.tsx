import { getMultimedia } from "@/lib/queries";
import { ArticleCard } from "./ArticleCard";
import { SectionHeading } from "./SectionHeading";

export function MediaGrid() {
  const items = getMultimedia(4);
  if (!items.length) return null;

  return (
    <section className="container-page py-10">
      <SectionHeading title="포토 · 영상" en="Multimedia" href="/media" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((a) => (
          <ArticleCard key={a.id} article={a} variant="overlay" />
        ))}
      </div>
    </section>
  );
}
