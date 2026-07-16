/**
 * 포털(네이버·다음)용 마이크로데이터 메타 3종 — 연합뉴스 head 벤치마킹(2026-07-16 실측).
 * og/twitter 계열과 같은 정보를 itemprop 계열로 한 번 더 게재하는 한국 포털 관례.
 * 값 규약: 홈·목록 = 사이트명/사이트 설명/기본 og 이미지, 기사 = 기사 제목(<title>과 동일)/요약/대표 이미지.
 *
 * ⚠️ 렌더 위치: React 19는 itemProp이 붙은 <meta>를 head로 승격하지 않는다(공식 문서 명시 —
 * itemProp은 문서 전체가 아니라 페이지 특정 부분의 메타데이터로 취급하는 예외).
 * Next Metadata API에도 itemprop 채널이 없어 head 강제 수단이 없다.
 * → body 상단에 렌더되지만, HTML5 명세상 itemprop 있는 <meta>는 body(플로 콘텐츠) 허용이고
 *   구글·네이버 마이크로데이터 파서는 문서 어디에 있든 읽는다. JSON-LD(NewsArticle 등)와 병행.
 * ⚠️ 정적 HTML에 속성이 `itemProp`(camelCase)로 직렬화되는데(React 19 실측), HTML5 토크나이저가
 *   속성명을 소문자화하므로 모든 표준 파서에서 `itemprop`과 동일하게 동작한다(기능 차이 없음).
 */
export function PortalMeta({
  name,
  description,
  image,
}: {
  name: string;
  description: string;
  image: string;
}) {
  return (
    <>
      <meta itemProp="name" content={name} />
      <meta itemProp="description" content={description} />
      <meta itemProp="image" content={image} />
    </>
  );
}
