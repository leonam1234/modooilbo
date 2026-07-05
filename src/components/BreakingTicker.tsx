import Link from "next/link";
import { getBreaking } from "@/lib/queries";

export function BreakingTicker() {
  const items = getBreaking(8);
  if (!items.length) return null;
  const doubled = [...items, ...items];

  return (
    <div className="border-b border-ink-200 bg-white/95 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/65 dark:border-ink-800 dark:bg-ink-950/95 dark:supports-[backdrop-filter]:bg-ink-950/60">
      <div className="container-page flex items-center gap-3 py-2.5">
        <span className="flex shrink-0 items-center gap-1.5 rounded bg-breaking px-2.5 py-1 text-[11px] font-bold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          속보
        </span>
        <div className="fade-mask-x group relative min-w-0 flex-1 overflow-hidden">
          <ul className="flex w-max animate-marquee items-center gap-10 group-hover:[animation-play-state:paused]">
            {doubled.map((a, i) => (
              <li key={`${a.id}-${i}`} className="shrink-0">
                <Link
                  href={`/article/${a.slug}`}
                  className="text-sm text-ink-600 transition-colors hover:text-signal-600 dark:text-ink-300"
                >
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
