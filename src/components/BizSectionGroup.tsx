import type { CategorySlug } from "@/lib/types";
import { BIZ_CATEGORY_SLUGS } from "@/lib/categories";
import { BIZ_MENUS, type BizMenu } from "@/lib/biz-menus";
import { getByCategory } from "@/lib/queries";
import { SectionBlock } from "./SectionBlock";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * 기업 데이터 뉴스 — '사업' 축 카테고리 섹션군(홈 '많이 본' 상단 행 아래, 종합뉴스 섹션들보다 위).
 *
 * 헤더 사업 메뉴(BIZ_MENUS) 6개를 순서대로 전부 노출한다("기사가 없어도 카테고리는 다 노출").
 *  - 실제 기사가 붙어 정식 카테고리로 승격된 메뉴(현재는 정부지원금)는 종합뉴스와 동일한
 *    SectionBlock 카드(대표이미지 + 제목 + 요약 + '더보기')로 렌더한다.
 *  - 아직 기사가 없는 메뉴(공공입찰·창업·상권 등)는 담백한 '준비 중' 플레이스홀더 카드로 렌더하고
 *    '더보기'는 각 준비 중 라우트(/bids 등, noindex)로 연결한다.
 *
 * 나머지 메뉴에 기사가 붙어 BIZ_CATEGORIES로 승격되면 자동으로 실제 카드로 바뀐다(배치 코드 불필요).
 */

/** 아직 기사가 없는 사업 메뉴의 홈 '준비 중' 카드 — 섹션 헤더 + 담백한 안내(빈 카드 방지). */
function BizPlaceholderCard({ menu }: { menu: BizMenu }) {
  return (
    <section>
      <SectionHeading title={menu.name} en={menu.nameEn} href={`/${menu.slug}`} />
      <div className="flex min-h-[10rem] flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-6 py-10 text-center dark:border-ink-800 dark:bg-ink-900/40">
        <span className="rounded-full border border-ink-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-ink-400 dark:border-ink-700 dark:text-ink-500">
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
        <span className="text-[11px] font-medium uppercase tracking-widest text-ink-300">
          Business Data
        </span>
      </div>

      {/* 문화｜스포츠 행과 동일한 2열 그리드 — 사업 메뉴 6개를 헤더 순서대로 3행 배치 */}
      <div className="grid gap-10 md:grid-cols-2">
        {BIZ_MENUS.map((m) => {
          // 정식 카테고리로 승격되었고 기사가 1건 이상이면 실제 섹션 카드, 아니면 '준비 중' 카드.
          const promoted =
            BIZ_CATEGORY_SLUGS.has(m.slug as CategorySlug) &&
            getByCategory(m.slug as CategorySlug, 1).length > 0;
          return (
            <Reveal key={m.slug}>
              {promoted ? (
                <SectionBlock slug={m.slug as CategorySlug} count={4} />
              ) : (
                <BizPlaceholderCard menu={m} />
              )}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
