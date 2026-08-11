import Link from "next/link";
import { PARTNERS } from "@/lib/partners";

/**
 * 광고성 콘텐츠 표시.
 *
 * [왜 필요한가] 「인터넷신문위원회 광고자율규약」과 「표시·광고의 공정화에 관한 법률」은
 * 광고를 기사로 오인하게 만드는 것을 금지한다. 브랜디드 콘텐츠는 기사 형식이라
 * 표시가 없으면 독자가 구분할 방법이 없다. 광고계약서 제6조 ③의 이행 수단이다.
 *
 * [표시 위치] 위(badge)와 아래(footer) 둘 다 붙인다. 위만 있으면 본문부터 읽기 시작한
 * 독자가 못 보고, 아래만 있으면 다 읽고 나서야 알게 된다. 목록에서도 ArticleCard 가
 * 별도로 표시한다 — 클릭 전에 알아야 한다.
 *
 * ⚠️ 이 컴포넌트를 조건부로 숨기지 마라. 표시를 뺄 상황이면 광고를 받지 말아야 한다.
 */

function partnerName(slug: string): string {
  return PARTNERS.find((p) => p.slug === slug)?.name ?? slug;
}

/** 기사 제목 위 — 클릭해 들어온 직후 가장 먼저 보이는 자리. */
export function SponsorBadge({ sponsor }: { sponsor: string }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-ink-900 px-3.5 py-1.5 text-xs font-bold text-white dark:bg-white dark:text-ink-900">
      <span>광고</span>
      <span className="font-medium opacity-80">{partnerName(sponsor)} 제공</span>
    </p>
  );
}

/** 본문 끝 — 무엇을 읽었는지 다시 알린다. */
export function SponsorFooter({ sponsor }: { sponsor: string }) {
  const name = partnerName(sponsor);
  return (
    <aside className="mt-10 rounded-xl border border-ink-300 bg-ink-50 p-5 dark:border-ink-700 dark:bg-ink-900/70">
      <p className="text-sm font-bold text-ink-900 dark:text-white">광고성 콘텐츠 고지</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        이 콘텐츠는 <b>{name}</b>의 광고비를 받아 제작·게재한 광고입니다. 모두일보 편집국이
        독립적으로 취재해 작성한 기사가 아닙니다. 광고 계약은 모두일보의 보도·논평에 관여하지
        않습니다.
      </p>
      <p className="mt-3 text-sm">
        <Link
          href="/partners/"
          className="font-medium underline underline-offset-4 hover:text-signal-600 dark:hover:text-signal-400"
        >
          광고·후원 계약사 전체 보기
        </Link>
      </p>
    </aside>
  );
}

/** 목록·카드용 소형 표시. 클릭 전에 광고임을 알 수 있어야 한다. */
export function SponsorTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded bg-ink-900 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white dark:bg-white dark:text-ink-900 ${className}`}
    >
      광고
    </span>
  );
}
