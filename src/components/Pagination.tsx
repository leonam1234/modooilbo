import Link from "next/link";
import { pageHref, type Paged } from "@/lib/paginate";
import { cn } from "@/lib/utils";

/**
 * 목록 페이지 번호 이동.
 *
 * - 1페이지 링크는 기준 경로 그대로(/economy/) — /page/1/ 중복 URL을 만들지 않는다.
 * - 페이지가 많아져도 번호 버튼은 현재 위치 주변 5개 + 처음/끝만 그린다(여기까지 무한히 늘면
 *   페이지네이션 자체가 목록만큼 무거워진다).
 * - prefetch를 끄는 이유: 목록 페이지는 용량이 커서 사용자가 누르지도 않을 페이지를 미리
 *   받으면 데이터만 낭비된다.
 */
function pageWindow(cur: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const near = [cur - 1, cur, cur + 1].filter((p) => p > 1 && p < total);
  const out: (number | "gap")[] = [1];
  if (near[0] && near[0] > 2) out.push("gap");
  out.push(...near);
  if (near.at(-1) && (near.at(-1) as number) < total - 1) out.push("gap");
  out.push(total);
  return out;
}

const boxCls =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm transition-colors";

export function Pagination({ paged, basePath }: { paged: Paged<unknown>; basePath: string }) {
  if (paged.totalPages <= 1) return null;
  const { page, totalPages, prevPage, nextPage } = paged;

  return (
    <nav
      aria-label="페이지 이동"
      className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-ink-100 pt-8 dark:border-ink-800"
    >
      {prevPage ? (
        <Link
          prefetch={false}
          href={pageHref(basePath, prevPage)}
          rel="prev"
          className={cn(boxCls, "border-ink-200 text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-200 dark:hover:text-signal-400")}
        >
          이전
        </Link>
      ) : (
        <span className={cn(boxCls, "border-ink-100 text-ink-300 dark:border-ink-800 dark:text-ink-600")}>이전</span>
      )}

      {pageWindow(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-ink-400 dark:text-ink-500">
            …
          </span>
        ) : p === page ? (
          <span
            key={p}
            aria-current="page"
            className={cn(boxCls, "border-signal-600 bg-signal-600 font-semibold text-white")}
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            prefetch={false}
            href={pageHref(basePath, p)}
            className={cn(boxCls, "border-ink-200 text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-200 dark:hover:text-signal-400")}
          >
            {p}
          </Link>
        ),
      )}

      {nextPage ? (
        <Link
          prefetch={false}
          href={pageHref(basePath, nextPage)}
          rel="next"
          className={cn(boxCls, "border-ink-200 text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-200 dark:hover:text-signal-400")}
        >
          다음
        </Link>
      ) : (
        <span className={cn(boxCls, "border-ink-100 text-ink-300 dark:border-ink-800 dark:text-ink-600")}>다음</span>
      )}
    </nav>
  );
}
