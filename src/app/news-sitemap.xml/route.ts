import { ALL_ARTICLES } from "@/lib/news";
import { toKstIso } from "@/lib/utils";
import { SITE } from "@/lib/site";
import { esc } from "@/lib/xml";

// 정적 export: 빌드 시 out/news-sitemap.xml 로 프리렌더(동적 아님)
export const dynamic = "force-static";

export function GET() {
  const sorted = [...ALL_ARTICLES].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  // 결정적 선택: 데이터 최신 기사 기준 48h 이내, 10건 미만이면 최신 10건 보장 (Date.now 미사용)
  const newest = sorted.length ? new Date(sorted[0].publishedAt).getTime() : 0;
  const WINDOW = 48 * 60 * 60 * 1000;
  const recent = sorted.filter((a) => newest - new Date(a.publishedAt).getTime() <= WINDOW);
  const picked = recent.length >= 10 ? recent : sorted.slice(0, Math.min(10, sorted.length));

  const urls = picked
    .map((a) => {
      const loc = `${SITE.url}/article/${a.slug}/`;
      return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>모두일보</news:name>
        <news:language>ko</news:language>
      </news:publication>
      <news:publication_date>${toKstIso(a.publishedAt)}</news:publication_date>
      <news:title>${esc(a.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
