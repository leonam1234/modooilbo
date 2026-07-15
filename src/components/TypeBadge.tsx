import type { ArticleListItem } from "@/lib/types";
import { isBreakingFresh } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * 콘텐츠 타입 배지 — 속보/영상/포토/칼럼.
 * 무채색(NYT식)이라 색 대신 대비로 눈에 띄게 한다.
 * 표면 밝기에 따라 칩이 뒤집힌다: 밝은 표면=검은 칩 / 어두운 표면=흰 칩.
 * onDark=true(항상 어두운 overlay 타일)에서는 흰 칩 고정.
 */
/**
 * 배지 문구만 계산(렌더와 분리) — 카드 썸네일이 보조기술에서 숨겨질 때
 * 제목 링크 쪽에 같은 문구를 sr-only로 실어 '속보·칼럼' 정보가 사라지지 않게 하기 위함.
 * 속보 배지는 시효(48h) 안에서만 — 오래된 기사에 '속보'가 남지 않게.
 */
export function typeBadgeLabel(article: ArticleListItem): string | null {
  if (isBreakingFresh(article)) return "속보";
  if (article.type === "video") return "영상";
  if (article.type === "opinion" || article.category === "opinion") return "칼럼";
  return null;
}

export function TypeBadge({
  article,
  className,
  onDark = false,
}: {
  article: ArticleListItem;
  className?: string;
  onDark?: boolean;
}) {
  const label = typeBadgeLabel(article);
  const kind: "solid" | "breaking" = label === "속보" ? "breaking" : "solid";

  if (!label) return null;

  // 표면이 어두우면(흰 칩) / 밝으면(검은 칩). 자동 커버는 모드에 따라 표면이 뒤집히므로 dark: 페어링.
  // 모든 배지는 꽉 찬(불투명) 칩 — 그림 위에서도 또렷하게.
  const solid = onDark
    ? "bg-white text-ink-900"
    : "bg-ink-900 text-white dark:bg-ink-50 dark:text-ink-900";

  // 속보는 표면·모드와 무관하게 항상 딥 마룬 레드 칩(긴급 신호)
  const style = kind === "breaking" ? "bg-breaking text-white shadow-sm" : cn(solid, "shadow-sm");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold leading-none tracking-tight",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
