/**
 * 광고·후원 계약사 명단.
 *
 * ⚠️ 실제로 계약서에 서명한 회사만 올린다. 협의 중인 곳을 미리 올리지 않는다.
 *    이 페이지는 "누가 모두일보에 돈을 내는가"를 독자에게 밝히는 곳이라,
 *    한 줄이라도 사실과 다르면 페이지 전체의 신뢰가 무너진다.
 *
 * ⚠️ 이해관계가 있는 회사는 반드시 relation 을 채운다. 비워 두면 "숨겼다"가 된다.
 *    같은 원칙으로 기사 본문에도 이해관계 고지를 넣는다
 *    (예: 2026-07-31 인사책 기사).
 *
 * 로고는 public/partners/<slug>.png — 320x160 투명 배경으로 정규화해 둔다.
 * 원본 .ai 는 ~/Documents/회사서류/ 아래에 있고, 로고가 없는 회사는 logo 를 비운다
 * (그 경우 회사명이 텍스트로 표시된다).
 */

export type Partner = {
  slug: string;
  name: string;
  /** 홈페이지. 없으면 비운다 — 도메인만 있고 사이트가 없는 곳은 링크를 걸지 않는다. */
  url?: string;
  /** public/partners/<slug>.png 존재 여부. 없으면 이름만 표시한다. */
  logo?: boolean;
  /** 한 줄 소개 — 사업 내용만 적는다. 홍보 문구는 쓰지 않는다. */
  desc: string;
  /**
   * 모두일보와의 이해관계. 있으면 반드시 밝힌다.
   * 공정거래법상 계열회사 관계는 아니지만 발행인이 관여하는 회사가 있다.
   */
  relation?: string;
  /** 계약 시작 — YYYY-MM. 계약서 서명 후 채운다. */
  since?: string;
};

export const PARTNERS: Partner[] = [
  {
    slug: "bcmobility",
    name: "비씨모빌리티(주)",
    url: "https://bcmobility.kr/",
    logo: true,
    // 2026-08-11 bcmobility.kr 본문에서 확인한 사업 내용
    desc: "배달 라이더 대상 오토바이 장기 리스·단기 렌탈, 사업자·단체 차량 운영",
    relation: "모두일보 발행인이 관여하는 회사입니다.",
  },
  {
    slug: "bridzzi",
    name: "(주)브리찌",
    url: "https://bridzzi.com/",
    logo: true,
    // 2026-08-11 bridzzi.com 본문에서 확인. 자사를 'INTEGRATED PERFORMANCE AGENCY'로 소개하며
    // AI 프로덕션·채널 운영·콘텐츠 제작·확산 마케팅·퍼포먼스 광고 5개 영역을 제시한다.
    desc: "광고·마케팅 대행 — AI 영상 제작, SNS 채널 운영, 콘텐츠 제작, 인플루언서 마케팅, 퍼포먼스 광고",
    // ⚠️ 브리찌는 자사 홈페이지 Work 목록에 모두일보를 자사 운영 사례로 게시하고 있다
    //    (2026-08-11 확인). 광고주이면서 제작 파트너인 관계라 더 분명히 밝힌다.
    relation:
      "모두일보 발행인이 관여하는 회사이며, 브리찌는 자사 홈페이지에 모두일보를 운영 사례로 게시하고 있습니다.",
  },
  {
    slug: "jcrew",
    name: "제이크루",
    logo: true,
    desc: "이륜차 관련 사업",
  },
  {
    slug: "forusbike",
    name: "포어스바이크",
    logo: true,
    desc: "이륜차 관련 사업",
  },
  {
    slug: "hanmobility",
    name: "한국모터사이클리스",
    logo: false,
    desc: "이륜차 관련 사업",
  },
];
