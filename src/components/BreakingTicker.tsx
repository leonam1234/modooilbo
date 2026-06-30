import Link from "next/link";
import { getBreaking } from "@/lib/queries";

export function BreakingTicker() {
  const items = getBreaking(8);
  if (!items.length) return null;
  const doubled = [...items, ...items];

  return (
    <div className="border-b border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
      <div className="container-page flex items-center gap-3 py-2.5">
        <span className="flex shrink-0 items-center gap-1.5 rounded bg-breaking px-2.5 py-1 text-[11px] font-bold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          속보
        </span>
        <div className="group relative min-w-0 flex-1 overflow-hidden">
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
          {/* 양끝 페이드 */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent dark:from-ink-950" />
        </div>
      </div>
    </div>
  );
}
