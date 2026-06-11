import { getByCategory } from "@/lib/queries";
import { CATEGORY_MAP } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { ArticleCard } from "./ArticleCard";
import { SectionHeading } from "./SectionHeading";

export function SectionBlock({ slug, count = 5 }: { slug: CategorySlug; count?: number }) {
  const all = getByCategory(slug, count + 1)
    .filter((a) => !a.isLead)
    .slice(0, count);
  if (!all.length) return null;
  const [lead, ...rest] = all;
  const cat = CATEGORY_MAP[slug];

  return (
    <section>
      <SectionHeading title={cat.name} en={cat.nameEn} href={`/${slug}`} />
      <ArticleCard article={lead} variant="feature" />
      {rest.length > 0 && (
        <ul className="mt-5 flex flex-col divide-y divide-ink-100 dark:divide-ink-800">
          {rest.map((a) => (
            <li key={a.id} className="py-3 first:pt-0">
              <ArticleCard article={a} variant="compact" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
