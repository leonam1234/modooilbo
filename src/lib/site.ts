/**
 * 소셜 공유 카드 기본 이미지(루트 og.png — 실제 1200×630).
 *
 * ⚠️ Next.js metadata의 openGraph/twitter는 **얕은 병합**이다. 페이지에서 openGraph를 선언하면
 * 루트 layout.tsx의 images가 상속되지 않고 통째로 덮여 사라진다(= og:image 없는 맨 카드).
 * 따라서 openGraph를 선언하는 페이지는 images를 직접 명시해야 한다.
 * 카테고리 대표 이미지가 생기면 페이지별로 이 값을 대체하면 된다.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/og.png?v=2",
  width: 1200,
  height: 630,
  alt: "모두일보 — 모두를 위한 신뢰의 뉴스",
};

// 매체 정체성 = 두 축(기업 데이터 뉴스 + 종합뉴스). 전 페이지 기본 설명·소셜 카드·포털 메타가 이 값을 공유한다.
// (동결된 '테크'는 홍보 문구에서 제외 — /tech 라우트·기존 기사는 색인 보존을 위해 유지되나 대표 소개엔 넣지 않는다)
// ⚠️ 사이트 이름값(<title>·og:title 등)은 "모두일보" 단일화 규칙이라 슬로건 포함 제목 상수는 두지 않는다.
//    슬로건은 아래 설명(description) 계열에서만 사용한다.
export const SITE_DESCRIPTION =
  "모두일보는 정부지원금·공공입찰·창업상권·산업트렌드·채용노무·계약거래 등 기업에 필요한 공공데이터 뉴스와 경제·사회·국제·문화·스포츠·오피니언 종합뉴스를 함께 전합니다. 모두를 위한 신뢰의 뉴스.";

export const SITE = {
  name: "모두일보",
  legalName: "주식회사 브릿지타임즈", // 운영법인(팀 확정값 — Footer/약관과 일치)
  /**
   * 사이트 오리진(정본). canonical·og:url·sitemap·RSS 등 절대 URL이 전부 이 값을 공유한다.
   * ⚠️ 끝에 슬래시를 두지 않는다(`${SITE.url}/path/` 형태로 조합).
   */
  url: "https://modooilbo.com",
  email: "help@modooilbo.com",
  tel: "010-9848-5765", // 등록증 발행소 전화번호
  address: "경기도 하남시 하남대로 947 (풍산동, 하남테크노밸리 U1 CENTER) D동 2층 252호",
  addressZip: "12982",
  publisher: "김성우", // 대표이사·발행인(등록증)
  editor: "남동균", // 편집인(실무 편집책임). ⚠️등록증상 편집인은 김성우 — 경기도 편집인 변경등록 예정
  youthOfficer: "김영환", // 청소년보호책임자
  ombudsman: "유수화", // 고충처리인(언론중재법)
  privacyOfficer: "김영환", // 개인정보보호책임자(개인정보 보호법 제31조)
  regNumber: "경기 아54891", // 인터넷신문 등록번호(경기도지사, 2026.7.6 등록)
  regDate: "2026.07.06",
  copyrightYear: 2026,
  /**
   * 브랜드 공식 채널(sameAs). 실계정 개설 시 전체 URL을 문자열로 추가.
   * 예: "https://www.youtube.com/@modooilbo", "https://x.com/modooilbo",
   *     "https://www.wikidata.org/wiki/Qxxxxxxx" (위키데이터 등재 후)
   * 비어 있으면 홈 JSON-LD의 sameAs 필드가 아예 출력되지 않고, Footer SNS도 렌더하지 않음(데드링크 방지).
   * 운영 절차: wiki/operations/01-trust-eeat.md ⑦ 참조.
   *
   * ⚠️ 핸들(@모두일보)이 아닌 채널ID URL을 쓴다 — 유튜브 canonical이자 핸들 변경에도 불변.
   */
  sameAs: [
    "https://www.youtube.com/channel/UCsvBsEH1FasPFncxakOuARg", // 모두일보 MODOO ILBO(2026-07-20 개설·역링크 확인)
  ] as string[],
} as const;

/**
 * 상대 경로 → 사이트 오리진 기준 절대 URL. 이미 절대 URL(http/https)이면 그대로 반환한다.
 * og:image·RSS enclosure 등 외부 스크레이퍼가 읽는 값은 상대 경로가 통하지 않으므로 반드시 경유시킨다.
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE.url}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}
