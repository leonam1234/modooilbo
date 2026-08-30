import type { Article } from "@/lib/types";

const METHOD_LABEL: Record<string, string> = {
  inquiry: "담당기관 질의",
  interview: "인터뷰 취재",
  "data-analysis": "자체 데이터 분석",
  "document-verification": "원문·문서 검증",
  field: "현장 취재",
  "follow-up": "후속 확인 취재",
  desk: "공개자료 검증",
};

const SOURCE_LABEL: Record<string, string> = {
  primary: "1차 원문 중심",
  mixed: "1차 원문·보조자료 교차 확인",
  secondary: "2차 자료 중심",
};

/**
 * 독자용 취재·검증 공개 블록.
 * AI 관여도와 취재 방식을 섞지 않는다. 실제 행위를 쓴 verificationNote가 있는 기사만
 * 표시하므로, 과거 기사에 근거 없이 분류를 소급하거나 빈 배지를 붙이지 않는다.
 */
export function ReportingDisclosure({ article, sourceCount }: { article: Article; sourceCount: number }) {
  if (!article.verificationNote) return null;
  const method = article.reporting === "direct"
    ? METHOD_LABEL[article.reportingType || ""] || "편집국 자체 취재"
    : METHOD_LABEL[article.reporting || ""] || "편집국 검증";

  return (
    <section className="mt-7 rounded-xl border border-ink-200 bg-ink-50 px-5 py-4 dark:border-ink-800 dark:bg-ink-900" aria-labelledby="reporting-disclosure-title">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="reporting-disclosure-title" className="text-sm font-bold text-ink-900 dark:text-white">취재·검증 정보</h2>
        <span className="rounded-full border border-signal-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-signal-700 dark:border-signal-800 dark:bg-ink-950 dark:text-signal-300">
          {method}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{article.verificationNote}</p>
      <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
        {article.sourceBasis && SOURCE_LABEL[article.sourceBasis] ? SOURCE_LABEL[article.sourceBasis] : "출처 확인"}
        {sourceCount > 0 ? ` · 연결된 원문 ${sourceCount}개` : ""}
      </p>
    </section>
  );
}
