import { ALL_ARTICLES } from "@/lib/news";
import { CATEGORY_MAP } from "@/lib/categories";

// 정적 export: 빌드 시 out/rss.xml 로 프리렌더(동적 아님)
export const dynamic = "force-static";

const SITE = "https://modooilbo.com";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const items = [...ALL_ARTICLES]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 50)
    .map((a) => {
      const url = `${SITE}/article/${a.slug}/`;
      const cat = CATEGORY_MAP[a.category]?.name ?? "";
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(a.summary)}</description>
      <category>${esc(cat)}</category>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>모두일보</title>
    <link>${SITE}</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>모두일보 — 모두를 위한 신뢰의 뉴스. 정치·경제·사회·국제·문화·테크.</description>
    <language>ko</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
