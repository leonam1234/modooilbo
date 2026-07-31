/**
 * 목록 페이지 분할 — 기자·카테고리 목록이 기사 수에 비례해 무한히 커지는 것을 막는다.
 *
 * 왜 필요한가: 기사 링크 하나가 HTML을 약 3KB 차지한다. 상한이 없으면 기사 1만 편 시점에
 * 특정 기자 페이지가 9MB를 넘어 사실상 열리지 않는다(2026-07-31 실측: 링크 177개에 544KB).
 *
 * URL 규약 — 1페이지는 기존 주소를 그대로 쓰고, 2페이지부터만 /page/N/ 을 붙인다.
 *   /economy/            (1페이지, 기존 URL 유지 → 색인·링크가 깨지지 않는다)
 *   /economy/page/2/
 *   /reporter/kim-younghwan/page/3/
 * 1페이지를 /page/1/ 로도 접근 가능하게 만들면 같은 내용이 두 URL을 갖게 되므로 만들지 않는다.
 */

import { getByCategory } from "./queries";
import type { CategorySlug } from "./types";

/** 목록 한 페이지에 싣는 기사 수. 하루 발행량(24편)보다 조금 크게 잡아 첫 페이지가 하루치를 덮게 한다. */
export const PAGE_SIZE = 30;

export type Paged<T> = {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  /** 1페이지면 null — 기존 URL을 canonical로 유지하기 위한 표식 */
  prevPage: number | null;
  nextPage: number | null;
};

export function paginate<T>(all: T[], page: number, size = PAGE_SIZE): Paged<T> {
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const cur = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  return {
    items: all.slice((cur - 1) * size, cur * size),
    page: cur,
    totalPages,
    total,
    prevPage: cur > 1 ? cur - 1 : null,
    nextPage: cur < totalPages ? cur + 1 : null,
  };
}

/** 2페이지부터 정적 생성할 번호 목록 — generateStaticParams에서 쓴다(1페이지는 기본 라우트가 담당). */
export function extraPageNumbers(total: number, size = PAGE_SIZE): number[] {
  const totalPages = Math.ceil(total / size);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => i + 2);
}

/** 기준 경로(끝에 / 포함)와 페이지 번호 → 실제 URL. 1페이지는 기준 경로 그대로. */
export function pageHref(basePath: string, page: number): string {
  const base = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return page <= 1 ? base : `${base}page/${page}/`;
}

/**
 * 카테고리 목록의 2페이지 이상 번호를 generateStaticParams 형태로 반환.
 * 사업 축 6개 라우트가 같은 로직을 복사하지 않도록 여기로 모았다.
 * (queries는 news → content.generated 방향이라 여기로 되돌아오지 않는다 — 순환 없음)
 */
export function categoryPageParams(slug: CategorySlug): { page: string }[] {
  return extraPageNumbers(getByCategory(slug).length).map((p) => ({ page: String(p) }));
}
