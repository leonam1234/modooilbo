import { CATEGORIES, BIZ_CATEGORIES } from "./categories";
import { ALL_ARTICLES } from "./news";
import { extraPageNumbers, pageHref } from "./paginate";
import { getByCategory } from "./queries";
import { REPORTERS, REPORTER_INDEXABLE } from "./reporters";
import { SITE } from "./site";

/**
 * 사이트맵 조각 구성 — 단일 sitemap.xml이 규격 상한(URL 50,000개 / 압축 전 50MB)에
 * 부딪히지 않도록 인덱스 + 조각 구조로 나눈다.
 *
 * /sitemap.xml                  ← 인덱스(조각 목록만)
 * /sitemap-pages.xml            ← 홈·정책·카테고리 목록(페이지네이션 포함)
 * /sitemap-articles/<연도>/     ← 해당 연도 기사
 *
 * 연도로 쪼개는 이유: 하루 24편 기준 연 약 8,800편이라 한 조각이 상한의 1/5을 넘지 않고,
 * 지난 연도 조각은 내용이 굳어 검색엔진이 재크롤링할 이유가 줄어든다.
 */

/** publishedAt은 KST 벽시계-as-Z 규약 — 9시간 빼서 실제 UTC로 보정한다. */
export function toUtc(iso: string): Date {
  return new Date(new Date(iso).getTime() - 9 * 3600 * 1000);
}

export function articleYear(a: { publishedAt: string }): string {
  return a.publishedAt.slice(0, 4);
}

/** 기사가 존재하는 연도(내림차순) — 인덱스와 generateStaticParams가 공유한다. */
export function articleYears(): string[] {
  return [...new Set(ALL_ARTICLES.map(articleYear))].sort().reverse();
}

export function articlesOfYear(year: string) {
  return ALL_ARTICLES.filter((a) => articleYear(a) === year);
}

export const STATIC_PATHS = [
  "",
  "/about",
  "/careers",
  "/subscribe",
  "/newsletter",
  "/advertise",
  "/tips",
  "/contact",
  "/ethics",
  "/transparency",
  "/corrections",
  "/policy",
  "/committee",
  "/ombudsman",
  "/partners",
  "/terms",
  "/privacy",
] as const;

export type Entry = { loc: string; lastmod?: Date; changefreq?: string; priority?: number };

const STATIC_POLICY: Record<string, { changefreq: string; priority: number }> = {
  "": { changefreq: "daily", priority: 1 },
  "/tips": { changefreq: "monthly", priority: 0.4 },
  "/subscribe": { changefreq: "weekly", priority: 0.5 },
  "/newsletter": { changefreq: "weekly", priority: 0.5 },
};

const latest = (list: typeof ALL_ARTICLES): Date | undefined =>
  list.length ? new Date(Math.max(...list.map((a) => toUtc(a.updatedAt ?? a.publishedAt).getTime()))) : undefined;

/** 홈·정책 페이지 + 카테고리 목록(2페이지 이상 포함) */
export function pageEntries(): Entry[] {
  const statics: Entry[] = STATIC_PATHS.map((p) => {
    const policy = STATIC_POLICY[p] ?? { changefreq: "monthly", priority: 0.3 };
    return {
      loc: `${SITE.url}${p}/`,
      ...(p === "" ? { lastmod: latest(ALL_ARTICLES) } : {}),
      changefreq: policy.changefreq,
      priority: policy.priority,
    };
  });

  const categories: Entry[] = [...CATEGORIES, ...BIZ_CATEGORIES].flatMap((c) => {
    const list = getByCategory(c.slug);
    const lastmod = latest(list);
    const base = `/${c.slug}/`;
    // 1페이지 + 실제로 존재하는 2페이지 이상까지 모두 싣는다 — 목록을 나눈 뒤 뒷페이지가
    // 사이트맵에서 빠지면 과거 기사로 가는 크롤링 경로가 끊긴다.
    return [1, ...extraPageNumbers(list.length)].map((p) => ({
      loc: `${SITE.url}${pageHref(base, p)}`,
      lastmod,
      changefreq: p === 1 ? "hourly" : "weekly",
      priority: p === 1 ? 0.8 : 0.4,
    }));
  });

  // 기자 프로필(2026-08-14 실명 체제 전환과 함께 등재).
  // 기사 JSON-LD의 author가 이 URL을 가리키므로, 저자 신호가 실제로 닿으려면 색인 대상이어야 한다.
  // ⚠️ REPORTER_INDEXABLE 로 함께 게이트한다 — 스위치를 되돌렸을 때 noindex 페이지가
  //    사이트맵에 남아 있으면 검색엔진에 모순된 신호를 준다(그 드리프트를 구조적으로 차단).
  const reporters: Entry[] = REPORTER_INDEXABLE
    ? REPORTERS.flatMap((r) => {
        const list = ALL_ARTICLES.filter((a) => a.author.name === r.name);
        const lastmod = latest(list);
        const base = `/reporter/${r.slug}/`;
        // 카테고리와 같은 규약 — 1페이지 + 실존하는 2페이지 이상 전부(뒷페이지 크롤 경로 유지).
        return [1, ...extraPageNumbers(list.length)].map((p) => ({
          loc: `${SITE.url}${pageHref(base, p)}`,
          lastmod,
          changefreq: p === 1 ? "daily" : "weekly",
          priority: p === 1 ? 0.6 : 0.3,
        }));
      })
    : [];

  return [...statics, ...categories, ...reporters];
}

export function articleEntries(year: string): Entry[] {
  return articlesOfYear(year).map((a) => ({
    loc: `${SITE.url}/article/${a.slug}/`,
    lastmod: toUtc(a.updatedAt ?? a.publishedAt),
    changefreq: "weekly",
    priority: 0.7,
  }));
}
