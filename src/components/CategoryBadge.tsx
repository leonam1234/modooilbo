import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryBadge({
  category,
  className,
  asLink = true,
}: {
  category: CategorySlug;
  className?: string;
  asLink?: boolean;
}) {
  const c = CATEGORY_MAP[category];
  const label = c?.name ?? category;
  const cls = cn(
    "inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-signal-600",
    className,
  );
  if (!asLink) return <span className={cls}>{label}</span>;
  return (
    <Link href={`/${category}`} className={cn(cls, "hover:text-signal-700")}>
      {label}
    </Link>
  );
}
