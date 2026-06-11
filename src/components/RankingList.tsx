import Link from "next/link";
import { getMostRead } from "@/lib/queries";
import { CATEGORY_MAP } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { TrendingIcon } from "./icons";

export function RankingList({ count = 5 }: { count?: number }) {
  const items = getMostRead(count);

  return (
    <section>
      <div className="mb-4 flex items-center gap-2 border-b-2 border-ink-900 pb-2 dark:border-ink-100">
        <TrendingIcon className="h-5 w-5 text-signal-600" />
        <h2 className="font-headline text-xl font-extrabold text-ink-900 dark:text-white">
          많이 본 뉴스
        </h2>
      </div>
      <ol className="space-y-3.5">
        {items.map((a, i) => (
          <li key={a.id} className="flex gap-3">
            <span
              className={cn(
                "w-6 shrink-0 font-headline text-xl font-black leading-none",
                i < 3 ? "text-signal-600" : "text-ink-300 dark:text-ink-600",
              )}
            >
              {i + 1}
            </span>
            <Link href={`/article/${a.slug}`} className="group flex-1">
              <h3 className="clamp-2 text-sm font-semibold leading-snug text-ink-800 group-hover:text-signal-600 dark:text-ink-100">
                {a.title}
              </h3>
              <span className="mt-1 block text-xs text-ink-400">
                {CATEGORY_MAP[a.category]?.name}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
