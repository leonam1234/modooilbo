export const SITE = {
  name: "모두일보",
  legalName: "주식회사 브릿지타임즈", // 운영법인(팀 확정값 — Footer/약관과 일치)
  email: "help@modooilbo.com",
  tel: "010-9848-5765", // 등록증 발행소 전화번호
  address: "경기도 하남시 하남대로 947 (풍산동, 하남테크노밸리 U1 CENTER) D동 2층 252호",
  addressZip: "12982",
  publisher: "김성우", // 대표이사·발행인(등록증)
  editor: "남동균", // 편집인(실무 편집책임). ⚠️등록증상 편집인은 김성우 — 경기도 편집인 변경등록 예정
  youthOfficer: "김영환", // 청소년보호책임자
  ombudsman: "유수화", // 고충처리인(언론중재법)
  regNumber: "경기 아54891", // 인터넷신문 등록번호(경기도지사, 2026.7.6 등록)
  regDate: "2026.07.06",
  copyrightYear: 2026,
  /**
   * 브랜드 공식 채널(sameAs). 실계정 개설 시 전체 URL을 문자열로 추가.
   * 예: "https://www.youtube.com/@modooilbo", "https://x.com/modooilbo",
   *     "https://www.wikidata.org/wiki/Qxxxxxxx" (위키데이터 등재 후)
   * 비어 있으면 홈 JSON-LD의 sameAs 필드가 아예 출력되지 않고, Footer SNS도 렌더하지 않음(데드링크 방지).
   * 운영 절차: wiki/operations/01-trust-eeat.md ⑦ 참조.
   */
  sameAs: [] as string[],
} as const;
