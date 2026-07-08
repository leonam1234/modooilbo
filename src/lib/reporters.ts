/**
 * 모두일보 기자 로스터(7명 고정) — 기자 프로필 페이지(/reporter/[slug])의 정본.
 * 소개 문구는 담당 분야 설명만 쓴다(경력 등 사실 창작 금지).
 */

export interface Reporter {
  slug: string;
  name: string;
  role: string;
  beat: string; // 담당 분야 한 줄
}

export const REPORTERS: Reporter[] = [
  { slug: "kim-younghwan", name: "김영환", role: "경제부 기자", beat: "거시경제·산업·금융을 취재합니다." },
  { slug: "yoo-seunghyun", name: "유승현", role: "사회부 기자", beat: "사건·노동·교육 등 사회 전반을 취재합니다." },
  { slug: "kim-sungwoo", name: "김성우", role: "국제부 기자", beat: "국제 정세와 외교를 취재합니다." },
  { slug: "park-yuju", name: "박유주", role: "테크부 기자", beat: "IT·과학·스타트업을 취재합니다." },
  { slug: "nam-dongkyun", name: "남동균", role: "문화·스포츠부 기자", beat: "문화·연예·스포츠 현장을 취재합니다." },
  { slug: "yoo-suhwa", name: "유수화", role: "논설위원", beat: "모두일보의 시각을 칼럼과 사설로 전합니다." },
];

export function getReporterBySlug(slug: string): Reporter | undefined {
  return REPORTERS.find((r) => r.slug === slug);
}

export function getReporterByName(name: string): Reporter | undefined {
  return REPORTERS.find((r) => r.name === name);
}

/**
 * 기자 프로필(/reporter/*) 색인 스위치.
 * 현재 로스터는 데모 단계라 noindex,follow — 실명 기자 체제(실인물·약력 검증) 전환 시 true로 변경하고
 * sitemap.ts에 reporter 엔트리를 추가한 뒤 Rich Results Test로 Person/ProfilePage를 검증한다.
 * 절차 상세: wiki/operations/01-trust-eeat.md ⑦.
 */
export const REPORTER_INDEXABLE = false;
