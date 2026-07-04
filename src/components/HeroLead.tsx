import Image from "next/image";
import Link from "next/link";
import { getLeadArticle, getSubLeads } from "@/lib/queries";
import { CATEGORY_MAP } from "@/lib/categories";
import { formatKoreanDateTime } from "@/lib/utils";
import { ArticleCard } from "./ArticleCard";
import { displayImageUrl } from "@/lib/stock";
import { TypeBadge } from "./TypeBadge";

export function HeroLead() {
  const lead = getLeadArticle();
  const subs = getSubLeads(4);
  const href = `/article/${lead.slug}`;

  return (
    <section className="container-page py-6 sm:py-8">
      <div className="grid gap-8 md:grid-cols-[1.6fr_1fr] lg:grid-cols-[1.7fr_1fr]">
        {/* 리드 기사 — 이미지 위, 제목 아래 (2안) */}
        <article className="group">
          <Link prefetch={false} href={href} className="block">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
              <Image
                src={displayImageUrl(lead)}
                alt={lead.title}
                fill
                priority
                sizes="(max-width:1024px) 100vw, 66vw"
                unoptimized
                className="object-cover animate-kenburns"
              />
              <TypeBadge article={lead} className="absolute left-3 top-3 z-10" />
            </div>
          </Link>
          <div className="mt-4">
            <Link prefetch={false}
              href={`/${lead.category}`}
              className="text-xs font-bold uppercase tracking-wider text-signal-600"
            >
              {CATEGORY_MAP[lead.category]?.name}
            </Link>
            <h1 className="mt-2 font-headline text-2xl font-extrabold leading-tight text-ink-900 dark:text-white sm:text-3xl lg:text-[40px] lg:leading-[1.15]">
              <Link prefetch={false} href={href} className="hover:text-signal-700 dark:hover:text-signal-400">
                {lead.title}
              </Link>
            </h1>
            <p className="clamp-3 mt-3 text-base leading-relaxed text-ink-600 dark:text-ink-300">
              {lead.summary}
            </p>
            <div className="mt-3 text-sm text-ink-400">
              {lead.author.name} · {formatKoreanDateTime(lead.publishedAt)}
            </div>
          </div>
        </article>

        {/* 서브 리드 */}
        <div className="flex flex-col divide-y divide-ink-100 dark:divide-ink-800">
          {subs.map((a, i) => (
            <ArticleCard
              key={a.id}
              article={a}
              variant="horizontal"
              showSummary={false}
              className="py-4 first:pt-0 last:pb-0"
              priority={i === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
