/**
 * XML 텍스트 이스케이프 — RSS·사이트맵 등 손으로 조립하는 XML 피드 공용.
 *
 * 기사 제목·요약에는 `&`, 따옴표, 부등호가 실제로 등장한다. 이스케이프를 빠뜨리면
 * 피드 전체가 파싱 실패(not well-formed)로 통째로 버려지므로, 피드에 넣는 모든
 * 텍스트 노드·속성값은 반드시 이 함수를 경유시킨다.
 */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 사이트맵 조각(urlset) 응답 생성 — 조각 라우트들이 형식을 공유한다.
 * 규격 상한(URL 50,000개)에 근접하면 빌드 로그로 알린다. 조용히 넘기면
 * 검색엔진이 조각 하나를 통째로 버리고, 그 사실을 한참 뒤에나 알게 된다.
 */
export function renderUrlset(
  entries: { loc: string; lastmod?: Date; changefreq?: string; priority?: number }[],
): Response {
  const LIMIT = 50000;
  if (entries.length > LIMIT * 0.8) {
    console.warn(`[sitemap] 조각 URL ${entries.length}개 — 규격 상한 ${LIMIT}개에 근접. 분할 기준을 좁혀야 합니다.`);
  }
  const body = entries
    .map((e) =>
      [
        "  <url>",
        `    <loc>${esc(e.loc)}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod.toISOString()}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority !== undefined ? `    <priority>${e.priority}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
}
