import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "./icons";

export function SectionHeading({
  title,
  href,
  en,
  className,
}: {
  title: string;
  href?: string;
  en?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex items-end justify-between gap-3 border-b-2 border-ink-900 pb-2 dark:border-ink-100",
        className,
      )}
    >
      <h2 className="flex items-baseline gap-2">
        <span className="font-headline text-xl font-extrabold leading-none text-ink-900 dark:text-white sm:text-2xl">
          {title}
        </span>
        {en && (
          <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-300">
            {en}
          </span>
        )}
      </h2>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-ink-400 hover:text-signal-600"
        >
          더보기
          <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
