import type { Article } from "@/lib/types";

/**
 * 취재 방식 표시 — direct(자체 취재) 기사에만 붙인다.
 *
 * ⚠️ 이건 AI 관여도 표시가 아니라 **취재 방식** 표시다. 문구를 "AI"·"자동"과
 *    섞어 쓰면 독자가 오해한다(코덱스가 도입 때 우려한 지점 그대로다).
 *
 * ⚠️ desk·sponsored·wire 에는 아무것도 붙이지 않는다. 원자료 재구성 기사에
 *    "데스크"라고 써 붙이면 감점 표시처럼 읽히고, 광고는 이미 광고 배지가 있다.
 *    표시가 없다는 것이 곧 "자체 취재가 아니다"라는 뜻은 아니며, 분류값이 없는
 *    과거 기사(2026-08-21 규약 이전)도 여기에 해당한다 — 소급 추정하지 않는다.
 */
const LABEL: Record<string, string> = {
  inquiry: "담당기관 직접 확인",
  interview: "인터뷰 취재",
  "data-analysis": "자체 데이터 분석",
  field: "현장 취재",
  "follow-up": "후속 확인 취재",
};

export function ReportingBadge({ article, className = "" }: { article: Article; className?: string }) {
  if (article.reporting !== "direct" || !article.reportingType) return null;
  const label = LABEL[article.reportingType];
  if (!label) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-signal-200 bg-signal-50 px-2 py-0.5 text-[11px] font-semibold leading-none text-signal-700 dark:border-signal-800 dark:bg-signal-950 dark:text-signal-300 ${className}`}
      title="모두일보가 직접 취재해 확인한 내용이 담긴 기사입니다."
    >
      {label}
    </span>
  );
}
