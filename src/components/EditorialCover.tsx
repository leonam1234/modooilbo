import { CATEGORY_MAP } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 에디토리얼 커버 — 실제 보도사진이 없는 기사의 표지.
 * 무관한 스톡 사진 대신, 기사 키워드를 세리프 표제로 얹은 무채색 표지.
 * 정치적 중립을 위해 카테고리별 색 구분 없이 NYT식 흑백·그레이로 통일하고,
 * 색이 아니라 키워드·라벨로 기사를 구분한다. 정적 export 안전(외부 에셋 0).
 */
export function EditorialCover({
  category,
  keyword,
  size = "lg",
  tone = "auto",
  className,
}: {
  category: CategorySlug;
  /** 기사별 핵심 키워드(태그) — 큰 표제로 노출. 같은 카테고리도 표지가 달라진다. */
  keyword?: string;
  size?: "lg" | "sm";
  tone?: "auto" | "dark";
  className?: string;
}) {
  const cat = CATEGORY_MAP[category];
  const dark = tone === "dark";
  const headline = keyword?.trim() || cat?.name || "";

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden",
        dark
          ? "bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950"
          : "bg-gradient-to-br from-ink-50 via-white to-ink-100 dark:from-ink-900 dark:via-ink-950 dark:to-ink-950",
        className,
      )}
    >
      {/* 상단 헤어라인 (무채색) */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[3px]",
          dark ? "bg-ink-500" : "bg-ink-300 dark:bg-ink-700",
        )}
      />

      {/* 미세 워터마크 (영문 카테고리명) — 질감용 */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-3 -right-2 select-none font-headline font-black uppercase leading-none tracking-tight",
          dark ? "text-white/[0.04]" : "text-ink-900/[0.06] dark:text-white/[0.05]",
          size === "lg" ? "text-[clamp(3rem,9vw,6.5rem)]" : "text-4xl",
        )}
      >
        {cat?.nameEn}
      </span>

      {size === "lg" ? (
        <>
          {/* 브랜드 워드마크 (좌상단) */}
          <span
            aria-hidden
            className={cn(
              "absolute left-5 top-4 text-[10px] font-semibold uppercase tracking-[0.25em]",
              dark ? "text-white/40" : "text-ink-400",
            )}
          >
            모두일보
          </span>

          {/* 표제 키워드 (중앙) — 기사별로 달라지는 큰 세리프 */}
          <span
            aria-hidden
            className={cn(
              "clamp-2 absolute inset-x-5 top-1/2 -translate-y-1/2 select-none break-keep font-headline font-extrabold leading-[1.1] tracking-tight",
              "text-[clamp(1.7rem,4.4vw,2.9rem)]",
              dark ? "text-white/90" : "text-ink-800/85 dark:text-white/90",
            )}
          >
            {headline}
          </span>

          {/* 카테고리 라벨 (좌하단) */}
          <span
            className={cn(
              "absolute bottom-4 left-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider",
              dark ? "text-white/90" : "text-ink-600 dark:text-ink-300",
            )}
          >
            <span
              aria-hidden
              className={cn("inline-block h-3 w-[3px] rounded-full", dark ? "bg-ink-400" : "bg-ink-400 dark:bg-ink-600")}
            />
            {cat?.name}
          </span>
        </>
      ) : (
        /* 작은 썸네일 — 카테고리 라벨만 중앙에 */
        <span
          className={cn(
            "absolute inset-0 grid place-items-center text-center font-headline text-base font-extrabold",
            dark ? "text-white" : "text-ink-600 dark:text-ink-300",
          )}
        >
          {cat?.name}
        </span>
      )}
    </div>
  );
}

/** picsum 등 플레이스홀더(무작위) 이미지인지 — 이 경우 에디토리얼 커버로 대체 */
export function isPlaceholderImage(url?: string): boolean {
  if (!url) return true;
  return /picsum\.photos|placehold|placeholder|via\.placeholder|dummyimage/i.test(url);
}
