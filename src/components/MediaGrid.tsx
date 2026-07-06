import { getMultimedia } from "@/lib/queries";
import { ShortsCard } from "./ShortsCard";
import { SectionHeading } from "./SectionHeading";

export function MediaGrid() {
  const items = getMultimedia(4);
  if (!items.length) return null;

  return (
    <section className="container-page py-10">
      <SectionHeading title="영상" en="Video" href="/media" />
      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((a) => (
          <ShortsCard key={a.id} article={a} className="w-40 shrink-0 sm:w-48" />
        ))}
      </div>
    </section>
  );
}
