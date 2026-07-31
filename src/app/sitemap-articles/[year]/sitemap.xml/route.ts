import { articleEntries, articleYears } from "@/lib/sitemap-parts";
import { renderUrlset } from "@/lib/xml";

/**
 * 연도별 기사 사이트맵 — /sitemap-articles/2026/sitemap.xml
 *
 * 세그먼트 이름에 .xml을 붙이는 이유: 동적 세그먼트만 쓰면 산출물이 확장자 없는
 * 파일(out/sitemap-articles/2026)로 떨어져 정적 호스팅이 content-type을 XML로
 * 내려주지 못한다. 검색엔진이 사이트맵으로 인식하지 않는다.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return articleYears().map((year) => ({ year }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return renderUrlset(articleEntries(year));
}
