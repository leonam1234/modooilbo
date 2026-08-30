import type { Article } from "@/lib/types";
import { formatKoreanDateTime } from "@/lib/utils";

/** 사실 보도와 기자의 판단을 시각적으로 분리한다. */
export function ReporterInsight({ article }: { article: Article }) {
  if (!article.reporterInsight) return null;

  return (
    <aside className="mt-7 border-l-4 border-signal-500 bg-signal-50/70 px-5 py-4 dark:bg-signal-950/30" aria-labelledby="reporter-insight-title">
      <h2 id="reporter-insight-title" className="text-sm font-bold text-ink-900 dark:text-white">기자가 본 핵심</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{article.reporterInsight}</p>
      {article.reviewedBy && article.reviewedAt && (
        <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
          최종 검수 {article.reviewedBy} 기자 · {formatKoreanDateTime(article.reviewedAt)}
        </p>
      )}
    </aside>
  );
}
