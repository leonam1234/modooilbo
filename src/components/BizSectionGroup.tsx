import { BIZ_CATEGORIES } from "@/lib/categories";
import { getByCategory } from "@/lib/queries";
import { SectionBlock } from "./SectionBlock";
import { Reveal } from "./Reveal";

/**
 * 기업 데이터 뉴스 — '사업' 축 카테고리 섹션군(홈 히어로 직후, 종합뉴스 섹션들보다 위에 노출).
 *
 * 종합뉴스 섹션과 동일한 SectionBlock/카드 패턴을 그대로 재사용한다(대표이미지 + 제목 + 요약 +
 * 카테고리 헤더의 '더보기'). 기사가 1건 이상 있는 사업 카테고리만 렌더해 빈 섹션을 만들지 않는다.
 * 활성 사업 카테고리가 하나도 없으면 섹션군 전체(그룹 헤더 포함)를 숨긴다.
 *
 * bids·startup·industry·labor·deals 등은 실제 기사가 붙어 BIZ_CATEGORIES로 승격되면
 * 자동으로 이 그룹에 나타난다(별도 배치 코드 불필요). 준비 중 라우트는 그대로 유지된다.
 */
export function BizSectionGroup() {
  // 기사가 1건 이상 있는 사업 축 카테고리만 노출(빈 섹션 방지).
  const active = BIZ_CATEGORIES.filter((c) => getByCategory(c.slug, 1).length > 0);
  if (!active.length) return null;

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

      {/* 종합뉴스 문화｜스포츠 행과 동일한 2열 그리드·카드(빈 카테고리는 SectionBlock이 null 반환) */}
      <div className="grid gap-10 md:grid-cols-2">
        {active.map((c) => (
          <Reveal key={c.slug}>
            <SectionBlock slug={c.slug} count={4} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
