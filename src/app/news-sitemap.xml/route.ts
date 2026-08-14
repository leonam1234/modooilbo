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
  // 결정적 선택: 데이터 최신 기사 기준 창(Date.now 미사용 — 빌드 재현성 유지).
  //
  // ⚠️ 창을 48h로 잡으면 안 된다. 구글 뉴스 사이트맵 규격은 "최근 2일" 기사만 담으라는
  //    것인데, 이 파일은 빌드 시점에 구워져 다음 배포까지 그대로 서빙된다.
  //    빌드 순간에는 48h를 지켜도 하루가 지나면 가장 오래된 항목이 72h가 된다.
  //    (실측: 08-07 11:00 빌드 → 같은 날 17:00에 08-05 발행분 24편이 48h 초과)
  //
  //    그래서 창을 24h로 좁힌다. 하루 뒤에도 48h 안에 들어오므로, 배포가 하루 밀려도
  //    규격을 벗어나지 않는다. 매일 24편을 내보내는 발행량에서 24h 창이면 그날치가
  //    통째로 들어와 색인 목적에도 부족함이 없다.
  const newest = sorted.length ? new Date(sorted[0].publishedAt).getTime() : 0;
  const WINDOW = 24 * 60 * 60 * 1000;
  // ⚠️ 창 안에 기사가 적다고 오래된 기사로 채우지 않는다(종전 slice(0,10) 폴백 제거 —
  //    발행이 이틀 멈추면 "최근 2일" 규격을 깨는 사이트맵이 서빙됐다). 빈 urlset도 유효하다.
  const picked = sorted.filter((a) => newest - new Date(a.publishedAt).getTime() <= WINDOW);

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
