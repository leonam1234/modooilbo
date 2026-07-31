import { SITE } from "@/lib/site";
import { articleYears, articlesOfYear, toUtc } from "@/lib/sitemap-parts";
import { ALL_ARTICLES } from "@/lib/news";
import { esc } from "@/lib/xml";

/**
 * 사이트맵 인덱스 — URL을 직접 담지 않고 조각 사이트맵만 가리킨다.
 * 단일 사이트맵은 URL 50,000개 / 압축 전 50MB가 규격 상한이라, 기사가 쌓이면 반드시 넘는다.
 * 지금 인덱스로 바꿔두면 그 시점에 robots.txt·검색엔진 등록을 다시 건드릴 필요가 없다.
 */
export const dynamic = "force-static";

export function GET() {
  const parts = [
    { loc: `${SITE.url}/sitemap-pages.xml`, lastmod: undefined as Date | undefined },
    ...articleYears().map((y) => {
      const list = articlesOfYear(y);
      return {
        loc: `${SITE.url}/sitemap-articles/${y}/sitemap.xml`,
        lastmod: list.length
          ? new Date(Math.max(...list.map((a) => toUtc(a.updatedAt ?? a.publishedAt).getTime())))
          : undefined,
      };
    }),
  ];
  // 홈 lastmod와 같은 기준(최신 발행)을 pages 조각에도 준다
  parts[0].lastmod = ALL_ARTICLES.length
    ? new Date(Math.max(...ALL_ARTICLES.map((a) => toUtc(a.updatedAt ?? a.publishedAt).getTime())))
    : undefined;

  const body = parts
    .map(
      (p) =>
        `  <sitemap>\n    <loc>${esc(p.loc)}</loc>${p.lastmod ? `\n    <lastmod>${p.lastmod.toISOString()}</lastmod>` : ""}\n  </sitemap>`,
    )
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`,
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
}
