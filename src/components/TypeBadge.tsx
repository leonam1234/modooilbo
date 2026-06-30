import type { ArticleListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 콘텐츠 타입 배지 — 속보/영상/포토/칼럼.
 * 무채색(NYT식)이라 색 대신 대비로 눈에 띄게 한다.
 * 표면 밝기에 따라 칩이 뒤집힌다: 밝은 표면=검은 칩 / 어두운 표면=흰 칩.
 * onDark=true(항상 어두운 overlay 타일)에서는 흰 칩 고정.
 */
export function TypeBadge({
  article,
  className,
  onDark = false,
}: {
  article: ArticleListItem;
  className?: string;
  onDark?: boolean;
}) {
  let label: string | null = null;
  let kind: "solid" | "outline" = "solid";

  if (article.isBreaking) {
    label = "속보";
  } else if (article.type === "video") {
    label = "영상";
  } else if (article.type === "photo") {
    label = "포토";
  } else if (article.type === "opinion" || article.category === "opinion") {
    label = "칼럼";
    kind = "outline";
  }

  if (!label) return null;

  // 표면이 어두우면(흰 칩) / 밝으면(검은 칩). 자동 커버는 모드에 따라 표면이 뒤집히므로 dark: 페어링.
  const solid = onDark
    ? "bg-white text-ink-900"
    : "bg-ink-900 text-white dark:bg-ink-50 dark:text-ink-900";
  const outline = onDark
    ? "border border-white text-white"
    : "border border-ink-900 text-ink-900 dark:border-ink-100 dark:text-ink-100";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold leading-none tracking-tight",
        kind === "solid" ? cn(solid, "shadow-sm") : outline,
        className,
      )}
    >
      {label}
    </span>
  );
}
