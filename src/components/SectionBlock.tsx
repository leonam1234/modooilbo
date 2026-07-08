import { getByCategory, getLeadArticle } from "@/lib/queries";
import { CATEGORY_MAP } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { ArticleCard } from "./ArticleCard";
import { SectionHeading } from "./SectionHeading";

export function SectionBlock({ slug, count = 5 }: { slug: CategorySlug; count?: number }) {
  // 홈 히어로가 쓰는 리드를 섹션에서 제외(중복 노출 방지). 정적 isLead 플래그는 데이터에
  // 세팅되지 않아 무력 → getLeadArticle()이 실제로 해석한 리드 id로 제외한다(getSubLeads와 동일 규약).
  const leadId = getLeadArticle().id;
  const all = getByCategory(slug, count + 1)
    .filter((a) => a.id !== leadId)
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
            <li key={a.id} className="py-3.5 first:pt-0">
              <ArticleCard article={a} variant="list" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
