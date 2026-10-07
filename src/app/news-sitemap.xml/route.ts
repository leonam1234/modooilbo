import { ALL_ARTICLES } from "@/lib/news";
import { toKstIso } from "@/lib/utils";
import { SITE } from "@/lib/site";
import { esc } from "@/lib/xml";

// 정적 export: 빌드 시 out/news-sitemap.xml 로 프리렌더(동적 아님)
export const dynamic = "force-static";

export function GET() {
  // 광고(sponsor 있음)는 뉴스가 아니다 — 구글 뉴스 사이트맵에 실으면 정책 위반이고,
  // 매체 신뢰 문제로 돌아온다. 일반 sitemap.xml 색인은 그대로 둔다.
  const sorted = [...ALL_ARTICLES].filter((a) => !a.sponsor).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  // Build-time window; the Pages Function additionally expires entries at request time.
  // Production reuses the sealed Preview artifact instead of rebuilding it.
  const buildTime = Date.now();
  const WINDOW = 24 * 60 * 60 * 1000;
  // Never backfill old articles when publishing stops. An empty urlset is valid.
  const picked = sorted.filter((a) => {
    const age = buildTime - new Date(toKstIso(a.publishedAt)).getTime();
    return age >= 0 && age <= WINDOW;
  }).slice(0, 1000);

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
