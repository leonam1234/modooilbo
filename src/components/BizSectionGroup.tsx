import type { Category } from "@/lib/types";
import { BIZ_CATEGORIES } from "@/lib/categories";
import { getByCategory } from "@/lib/queries";
import { SectionBlock } from "./SectionBlock";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * 기업 데이터 뉴스 — '사업' 축 카테고리 섹션군(홈 '많이 본' 상단 행 아래, 종합뉴스 섹션들보다 위).
 *
 * 사업 카테고리 정본(BIZ_CATEGORIES) 6개를 배열 순서(=헤더 순서) 그대로 전부 노출한다
 * ("기사가 없어도 카테고리는 다 노출").
 *  - 기사가 1건 이상이면 종합뉴스와 동일한 SectionBlock 카드로 렌더한다.
 *  - 기사가 0건이면 담백한 '준비 중' 플레이스홀더 카드로 렌더해 빈 섹션을 방지한다.
 *    (2026-07-15 현재 6개 모두 기사가 있어 이 경로는 쓰이지 않지만, 새 사업 카테고리를 열 때나
 *     기사가 전부 내려간 경우를 위한 안전망으로 남긴다)
 */

/** 아직 기사가 없는 사업 카테고리의 홈 '준비 중' 카드 — 섹션 헤더 + 담백한 안내(빈 카드 방지). */
function BizPlaceholderCard({ category }: { category: Category }) {
  return (
    <section>
      <SectionHeading title={category.name} en={category.nameEn} href={`/${category.slug}`} />
      <div className="flex min-h-[10rem] flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-6 py-10 text-center dark:border-ink-800 dark:bg-ink-900/40">
        <span className="rounded-full border border-ink-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:border-ink-700 dark:text-ink-400">
          준비 중 · 곧 공개
        </span>
        <p className="mt-3 text-sm text-ink-500 dark:text-ink-300">
          관련 기사를 준비하고 있습니다.
        </p>
      </div>
    </section>
  );
}

export function BizSectionGroup() {
  return (
    <section aria-labelledby="biz-data-heading" className="container-page pt-10">
      {/* 새 '사업' 축임을 알리는 그룹 헤더 — 무채색 타이포만(진영색·과한 장식 배제) */}
      <div className="mb-6 flex items-center gap-3">
        <h2
          id="biz-data-heading"
          className="font-headline text-sm font-bold uppercase tracking-[0.22em] text-ink-500 dark:text-ink-300"
        >
          기업 데이터
        </h2>
        <span aria-hidden className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
        <span className="text-[11px] font-medium uppercase tracking-widest text-ink-500 dark:text-ink-300">
          Business Data
        </span>
      </div>

      {/* 문화｜스포츠 행과 동일한 2열 그리드 — 사업 카테고리 6개를 헤더 순서대로 3행 배치 */}
      <div className="grid gap-10 md:grid-cols-2">
        {BIZ_CATEGORIES.map((c) => {
          const hasArticles = getByCategory(c.slug, 1).length > 0;
          return (
            <Reveal key={c.slug}>
              {hasArticles ? <SectionBlock slug={c.slug} count={4} /> : <BizPlaceholderCard category={c} />}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
