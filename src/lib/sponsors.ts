/**
 * 광고주 등록부 — 표시명과 이해관계 고지.
 *
 * 2026-09-25 당시 계약사 5사와의 광고·후원 계약이 전부 끝나면서 공개 명단 페이지(/partners)와
 * 명단 데이터(src/lib/partners.ts)·로고(public/partners/)를 폐지했다. 광고·제휴·후원 사업 자체는
 * 계속한다(/advertise·/subscribe 유지) — 새 광고주가 생기면 **이 파일에** 올린다.
 *
 * ⚠️ 계약서에 서명한 회사만 올린다. 협의 중인 곳을 미리 올리지 않는다(옛 partners.ts 와 같은 원칙).
 *    scripts/build-content.mjs 가 여기 키를 `sponsor:` 화이트리스트로 쓰므로, 여기 없는 slug 로
 *    광고 원고가 들어오면 빌드가 실패한다 — 오타로 광고 표시가 빠진 채 발행되는 것을 막는 게이트다.
 *
 * 이미 계약이 끝난 광고주(bridzzi)가 남아 있는 이유: 계약 기간에 광고비를 받고 게재한 콘텐츠가
 * 사이트에 남아 있는 한 그것은 여전히 광고다. 「신문 등의 진흥에 관한 법률」 제6조③(기사·광고 구분
 * 편집)·인터넷신문위원회 광고자율규약·「표시·광고의 공정화에 관한 법률」(기만 광고 금지)상 표시
 * 의무는 콘텐츠에 붙는 것이지 계약에 붙는 것이 아니라, 계약 종료가 표시를 지울 사유가 되지 않는다.
 *
 * 이해관계(SPONSOR_RELATIONS)를 여기 두는 이유: 종전에는 명단 페이지의 relation 문장으로 링크해
 * 고지했는데 페이지가 사라졌다. 08-11 인사책 기사는 본문에 발행인 관여 문장이 없어(08-19 브리찌
 * 기사에는 있다) 고지 박스(SponsorFooter)가 이 문장을 직접 출력한다. 발행인이 관여하는 회사는
 * 반드시 relation 을 채운다 — 비워 두면 "숨겼다"가 된다.
 *
 * ⚠️ scripts/build-content.mjs 가 이 파일에서 `slug: "…",` 꼴의 키를 정규식으로 읽는다(두 객체 모두).
 *    형식을 바꾸면 게이트가 조용히 비어 광고 표시가 빠진 채 발행될 수 있다.
 */
export const SPONSOR_NAMES: Record<string, string> = {
  bridzzi: "(주)브리찌",
};

/** 광고주와 모두일보의 이해관계. 있으면 고지 박스가 무조건 출력한다. */
export const SPONSOR_RELATIONS: Record<string, string> = {
  bridzzi: "(주)브리찌는 모두일보 발행인이 관여하는 회사입니다.",
};

/** 광고주 slug → 상호. 모르는 slug 는 그대로 돌려준다(표시 자체는 절대 생략하지 않는다). */
export function sponsorName(slug: string): string {
  return SPONSOR_NAMES[slug] ?? slug;
}

/** 광고주 slug → 이해관계 고지 문장. 없으면 undefined. */
export function sponsorRelation(slug: string): string | undefined {
  return SPONSOR_RELATIONS[slug];
}
