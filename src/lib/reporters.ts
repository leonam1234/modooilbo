/**
 * 모두일보 기자 로스터(6명 고정) — 기자 프로필 페이지(/reporter/[slug])의 정본.
 * 소개 문구는 담당 분야 설명만 쓴다(경력 등 사실 창작 금지).
 */

export interface Reporter {
  slug: string;
  name: string;
  role: string;
  beat: string; // 담당 분야 한 줄
  /** 전문 분야 — 이 매체에서 실제로 발행한 기사 구성에서 도출한다(외부 경력 창작 금지, 아카이브로 검증 가능). */
  expertise: string;
  /**
   * 편집국 소개(/newsroom) 명단 노출 여부. 기본 노출이며 false 면 목록에서만 뺀다.
   *
   * ⚠️ 프로필 페이지(/reporter/<slug>)는 **지우지 않는다**. 이미 발행된 기사들이
   *    바이라인에서 그 주소로 링크를 걸고 있고 색인도 돼 있어, 지우면 죽은 링크와
   *    404 가 그대로 생긴다. "현재 편집국 기자냐"와 "과거 기사의 저자냐"는 다른 질문이다.
   */
  listed?: boolean;
  /**
   * 프로필 사진 경로(public 기준). 본인이 제공한 실사진만 넣는다.
   * ⚠️ 없는 얼굴을 생성해 채우면 실명 가장이 된다 — 미제공자는 이 필드를 비우고 이니셜 아바타를 쓴다.
   */
  photo?: string;
}

export const REPORTERS: Reporter[] = [
  { slug: "kim-younghwan", photo: "/reporters/kim-younghwan.jpg", name: "김영환", role: "경제부 기자", beat: "거시경제·산업·금융을 취재합니다." , expertise: "정부지원사업·공공입찰 공고 분석, 기업 공시(DART)·거시경제 지표 해설" },
  { slug: "yoo-seunghyun", photo: "/reporters/yoo-seunghyun.jpg", name: "유승현", role: "사회부 기자", beat: "사건·노동·교육 등 사회 전반을 취재합니다." , expertise: "사회 정책·행정 서비스, 창업지원 프로그램, 채용·노동 공고 분석" },
  {
    slug: "kim-sungwoo",
    name: "김성우",
    // 2026-08-20: 대표이사·발행인이라 편집국 기자 명단에서 뺀다.
    // 기명 기사 75편이 이 프로필로 링크되므로 페이지 자체는 유지한다.
    role: "대표이사·발행인",
    beat: "모두일보의 발행인이며 창간 초기 국제 분야 기사를 맡았습니다.",
    expertise: "국제기구·주요국 공식 통계와 정책 원자료 해설",
    listed: false,
  },
  { slug: "park-yuju", name: "박유주", role: "논설위원", beat: "모두일보의 시각을 칼럼과 사설로 전합니다. 산업·기술 분야를 취재해 왔습니다." , expertise: "산업 정책·기업 동향, 정부 R&D·기술 지원사업 분석" },
  // 2026-08-20 합류. 공공입찰 전담 — 종전엔 김영환 기자가 economy·bids·deals·grants
  // 네 축을 혼자 맡아 하루 5.8편이었다. bids 를 떼어내 부담을 나누고 전문 분야를 선명히 한다.
  // ⚠️ expertise 는 발행 이력이 쌓이면 아카이브 기준으로 다시 맞춘다(경력 창작 금지).
  { slug: "seo-youngho", name: "서영호", role: "공공입찰 전담기자", beat: "나라장터 공고와 공공조달 동향을 취재합니다.", expertise: "나라장터 입찰공고 분석 — 추정가격·배정예산, 입찰·개찰 일정, 정정·취소 확인" },
  { slug: "nam-dongkyun", name: "남동균", role: "문화·스포츠부 기자", beat: "문화·연예·스포츠 현장을 취재합니다." , expertise: "공연·전시 일정 검증 보도, KBO·해외 스포츠 공식 기록 분석" },
  {
    slug: "yoo-suhwa",
    photo: "/reporters/yoo-suhwa.jpg",
    name: "유수화",
    // 2026-08-20: 논설 집필을 박유주에게 넘기고 고충처리인 직무로 이동했다.
    // 접수·판단 창구가 필자를 겸하지 않도록 한 조치다(외부 점검 지적 해소).
    // 기명 기사 78편이 이 프로필로 링크되므로 페이지 자체는 유지한다.
    role: "고충처리인",
    beat: "모두일보의 고충처리인입니다. 창간 초기 칼럼과 사설을 맡았습니다.",
    expertise: "공공데이터에 근거한 정책 논평과 사설",
    listed: false,
  },
];

export function getReporterBySlug(slug: string): Reporter | undefined {
  return REPORTERS.find((r) => r.slug === slug);
}

export function getReporterByName(name: string): Reporter | undefined {
  return REPORTERS.find((r) => r.name === name);
}

/**
 * 기자 프로필(/reporter/*) 색인 스위치.
 *
 * 2026-08-14 true 전환 — 위 로스터가 실명 기자 체제로 확정됐다(대표 확인).
 * 종전 false는 "데모 단계 로스터"를 전제로 한 값이었는데, 그 사이 실명 체제가 됐는데도
 * 스위치가 남아 있어 **기사 JSON-LD의 author가 noindex 페이지를 가리키는** 상태였다.
 * 검색엔진 입장에선 저자 신호가 비어 있는 것과 같아 E-E-A-T에 그대로 손해였다.
 *
 * 전환과 함께: sitemap-parts.ts가 reporter 엔트리를 싣는다(이 상수로 함께 게이트 —
 * 되돌릴 때 noindex 페이지가 사이트맵에 남는 드리프트를 원천 차단).
 * 남은 절차: Rich Results Test로 Person/ProfilePage 검증(절차 wiki/operations/01-trust-eeat.md ⑦).
 */
export const REPORTER_INDEXABLE = true;
