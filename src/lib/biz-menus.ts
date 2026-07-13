/**
 * 기업 대상 공공데이터 뉴스 — 헤더 상단(메인) 사업 메뉴.
 * 종합뉴스 카테고리(categories.ts)와 분리된 신규 축.
 * 콘텐츠 준비 전이라 각 라우트는 "준비 중" 안내 페이지로 연결된다.
 * (실제 기사 시스템 붙기 전까지는 슬러그·순서만 확정된 골격 단계)
 */

export interface BizMenu {
  slug: string;
  name: string; // 헤더 표시 한글명 (변경 시 헤더·라우트 동시 확인)
  description: string; // 준비 중 페이지 부제 겸 메뉴 설명
}

export const BIZ_MENUS: BizMenu[] = [
  { slug: "grants", name: "정부지원금", description: "정부·지자체 지원사업과 보조금 정보를 모읍니다." },
  { slug: "bids", name: "공공입찰", description: "공공조달·입찰 공고와 낙찰 동향을 전합니다." },
  { slug: "startup", name: "창업·상권", description: "창업 지원과 상권·소상공인 흐름을 살핍니다." },
  { slug: "industry", name: "산업·트렌드", description: "산업 동향과 시장 트렌드를 짚어 드립니다." },
  { slug: "labor", name: "채용·노무", description: "채용·인사·노무 실무에 도움이 되는 정보를 전합니다." },
  { slug: "deals", name: "계약·거래", description: "기업 간 계약·거래와 B2B 소식을 전합니다." },
];

export const BIZ_MENU_MAP: Record<string, BizMenu> = BIZ_MENUS.reduce(
  (acc, m) => {
    acc[m.slug] = m;
    return acc;
  },
  {} as Record<string, BizMenu>,
);

export function getBizMenu(slug: string): BizMenu | undefined {
  return BIZ_MENU_MAP[slug];
}
