import { getBreaking } from "@/lib/queries";
import { BreakingMarquee } from "./BreakingMarquee";

export function BreakingTicker() {
  const items = getBreaking(8);
  if (!items.length) return null;
  const doubled = [...items, ...items];

  return (
    <div>
      <div className="container-page flex h-11 items-center gap-3">
        <span className="flex shrink-0 items-center gap-1.5 rounded bg-breaking px-2.5 py-1 text-[11px] font-bold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          속보
        </span>
        <BreakingMarquee items={doubled.map((a) => ({ slug: a.slug, title: a.title }))} />
      </div>
    </div>
  );
}
