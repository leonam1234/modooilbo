import { pageEntries } from "@/lib/sitemap-parts";
import { renderUrlset } from "@/lib/xml";

/** 홈·정책 페이지 + 카테고리 목록(2페이지 이상 포함). 기사와 갱신 주기가 달라 조각을 나눈다. */
export const dynamic = "force-static";

export function GET() {
  return renderUrlset(pageEntries());
}
