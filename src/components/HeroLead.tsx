import Image from "next/image";
import Link from "next/link";
import { getLeadArticle, getSubLeads } from "@/lib/queries";
import { CATEGORY_MAP } from "@/lib/categories";
import { formatKoreanDateTime } from "@/lib/utils";
import { ArticleCard } from "./ArticleCard";
import { displayImageUrl } from "@/lib/stock";
import { TypeBadge, typeBadgeLabel } from "./TypeBadge";

/**
 * 홈 히어로 좌측 컬럼 — 리드(대형) 기사 + 그 아래 보조 기사 4개(콤팩트 목록형).
 * 우측 컬럼('많이 본' 랭킹 + 후원 CTA)은 page.tsx가 히어로 그리드에서 나란히 배치한다.
 * 모바일에서는 리드 → 보조4 → (아래로) 많이 본 순으로 세로 스택된다.
 */
export function HeroLead() {
  const lead = getLeadArticle();
  const subs = getSubLeads(4);
  const href = `/article/${lead.slug}`;

  return (
    <div>
      {/* 리드 기사 — 이미지 위, 제목 아래 */}
      <article className="group">
        {/* 아래 제목 링크와 같은 목적지 → 보조기술·키보드에는 중복이라 숨긴다(ArticleCard와 동일 규약) */}
        <Link prefetch={false} href={href} aria-hidden tabIndex={-1} className="block">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
            {/* 홈 LCP 요소 — priority(=preload)만으로는 img에 fetchpriority가 붙지 않아
                (next/image 15.5 기준) 브라우저가 다른 이미지와 같은 우선순위로 큐에 넣는다.
                명시적으로 high를 지정해 LCP 이미지를 대역폭 경합에서 앞세운다. */}
            <Image
              src={displayImageUrl(lead)}
              alt="" // 장식용 — 바로 아래 제목 링크가 같은 내용을 전한다(중복 낭독 방지)
              fill
              priority
              fetchPriority="high"
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
          <h2 className="mt-2 font-headline text-2xl font-extrabold leading-tight text-ink-900 dark:text-white sm:text-3xl lg:text-[38px] lg:leading-[1.15]">
            <Link prefetch={false} href={href} className="hover:text-signal-700 dark:hover:text-signal-400">
              {/* 숨긴 썸네일 안 TypeBadge('속보' 등)의 정보를 링크 이름에 보존 */}
              {typeBadgeLabel(lead) && <span className="sr-only">{typeBadgeLabel(lead)} </span>}
              {lead.title}
            </Link>
          </h2>
          <p className="clamp-3 mt-3 text-base leading-relaxed text-ink-600 dark:text-ink-300">
            {lead.summary}
          </p>
          <div className="mt-3 text-sm text-ink-500 dark:text-ink-400">
            {lead.author.name} · {formatKoreanDateTime(lead.publishedAt)}
          </div>
        </div>
      </article>

      {/* 보조 기사 4개 — 콤팩트 카드(작은 썸네일 + 제목). 데스크톱 2×2, 모바일 1열 스택. */}
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-ink-100 pt-5 dark:border-ink-800 sm:grid-cols-2">
        {subs.map((a) => (
          <ArticleCard key={a.id} article={a} variant="compact" />
        ))}
      </div>
    </div>
  );
}
