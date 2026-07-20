import { ALL_ARTICLES } from "@/lib/news";
import { CATEGORY_MAP } from "@/lib/categories";
import { SITE, SITE_DESCRIPTION, absoluteUrl } from "@/lib/site";
import { ogImageUrl } from "@/lib/stock";
import { esc } from "@/lib/xml";

// 정적 export: 빌드 시 out/rss.xml 로 프리렌더(동적 아님)
export const dynamic = "force-static";

// publishedAt은 "KST 벽시계를 Z로 저장"하는 규약 — RFC822 pubDate는 +0900을 명시해 그대로 내보낸다.
// (toUTCString()을 쓰면 KST 시각이 GMT로 선언되어 최대 9시간 미래 시각이 됨)
function rfc822Kst(iso: string): string {
  const d = new Date(iso);
  const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${DAY[d.getUTCDay()]}, ${p(d.getUTCDate())} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0900`;
}

export function GET() {
  const sorted = [...ALL_ARTICLES].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const items = sorted
    .slice(0, 50)
    .map((a) => {
      const url = `${SITE.url}/article/${a.slug}/`;
      const cat = CATEGORY_MAP[a.category]?.name ?? "";
      const img = absoluteUrl(ogImageUrl(a));
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(a.summary)}</description>
      <category>${esc(cat)}</category>
      <dc:creator>${esc(a.author.name)}</dc:creator>
      <enclosure url="${esc(img)}" type="image/jpeg" />
      <pubDate>${rfc822Kst(a.publishedAt)}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>모두일보</title>
    <link>${SITE.url}</link>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${esc(SITE_DESCRIPTION)}</description>
    <language>ko</language>
    <lastBuildDate>${sorted.length ? rfc822Kst(sorted[0].publishedAt) : new Date(0).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
