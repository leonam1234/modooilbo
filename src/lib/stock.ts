import type { ArticleListItem } from "./types";
import webpManifest from "./webp-manifest.generated.json";

// prebuild(scripts/convert-webp.mjs)가 생성 — webp가 실존하는 스톡 jpg 목록
const WEBP_SET = new Set<string>(webpManifest as string[]);

/** /stock/x.jpg → 같은 이름의 .webp (변환본이 있을 때만). 그 외 URL은 그대로. */
export function webpSrc(url: string): string {
  const m = url.match(/^\/stock\/([^/?]+\.jpg)(\?.*)?$/);
  if (m && WEBP_SET.has(m[1])) return `/stock/${m[1].replace(/\.jpg$/, ".webp")}${m[2] ?? ""}`;
  return url;
}

/**
 * 기사 표시용 이미지 해석.
 * - 실제 사진 URL이 있으면 그대로 사용.
 * - picsum 등 무작위 플레이스홀더면 → 셀프호스팅 스톡(`/stock/<id>.jpg`)으로 대체.
 *
 * 스톡 이미지는 기사 이해를 돕기 위해 생성한 16:9 AI 이미지다.
 * → 우리 도메인(Cloudflare CDN)에서 서빙되어 빠르고 캐시된다(외부 핫링크·저작권 출처 혼선 제거).
 */

const PLACEHOLDER = /picsum\.photos|placehold|placeholder|via\.placeholder|dummyimage/i;

// 스톡 이미지를 교체(재생성)할 때 이 값을 올리면 브라우저 캐시가 무효화된다.
// 파일명(/stock/<id>.jpg)은 그대로고 내용만 바뀌므로, 버전 쿼리가 없으면 브라우저가 옛 이미지를 계속 보여준다.
const STOCK_VERSION = "20260630";

export function isPlaceholderImage(url?: string): boolean {
  return !url || PLACEHOLDER.test(url);
}

/** 카드/히어로/상세에 표시할 이미지 URL. 플레이스홀더면 셀프호스팅 스톡, webp 변환본 있으면 webp.
 *  og:image·RSS 등 스크레이퍼용은 jpg가 필요하므로 ogImageUrl()을 쓸 것. */
export function displayImageUrl(article: ArticleListItem): string {
  const url = isPlaceholderImage(article.imageUrl) ? `/stock/${article.id}.jpg` : article.imageUrl!;
  // 셀프호스팅 스톡은 파일명이 같고 내용만 바뀌므로 버전 쿼리로 캐시를 강제 갱신
  return url.startsWith("/stock/") ? webpSrc(`${url}?v=${STOCK_VERSION}`) : url;
}

/** 소셜 스크레이퍼(카카오 등)용 — webp 미지원 대비 항상 jpg 유지. */
export function ogImageUrl(article: ArticleListItem): string {
  const url = isPlaceholderImage(article.imageUrl) ? `/stock/${article.id}.jpg` : article.imageUrl!;
  return url.startsWith("/stock/") ? `${url}?v=${STOCK_VERSION}` : url;
}
