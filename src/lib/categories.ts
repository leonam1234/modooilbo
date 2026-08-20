import type { Category, CategorySlug } from "./types";

export const CATEGORIES: Category[] = [
  { slug: "economy", name: "경제", nameEn: "Economy", description: "시장·산업·부동산·금융 심층 분석", seoTitle: "경제 뉴스 — 증시·부동산·금리·산업·기업", seoDescription: "증시와 부동산, 금리와 환율, 산업·기업 동향까지 — 모두일보가 한국 경제의 흐름을 짚고 투자와 생활에 도움이 되는 심층 분석을 전합니다. 통계청·한국은행·기획재정부 등 공식 발표를 원문에서 확인하고, 수치의 기준 시점과 잠정치 여부를 함께 밝힙니다." },
  { slug: "society", name: "사회", nameEn: "Society", description: "우리 사회의 오늘을 기록합니다", seoTitle: "사회 뉴스 — 사건사고·교육·노동·복지·환경", seoDescription: "사건·사고부터 교육·노동·복지·환경까지 — 모두일보가 우리 사회의 오늘을 기록하고 변화의 의미를 차분하게 풀어냅니다. 정부 부처와 지자체의 공고·보도자료 원문을 직접 열어 시행 시점과 적용 대상, 신청 조건까지 확인해 전합니다." },
  { slug: "world", name: "국제", nameEn: "World", description: "세계를 읽는 또 하나의 창", seoTitle: "국제 뉴스 — 미국·중국·일본·유럽 글로벌 이슈", seoDescription: "미국·중국·일본·유럽 등 세계 곳곳의 주요 뉴스 — 모두일보가 국제 정세와 글로벌 이슈를 한국의 시각으로 읽어 드립니다. 각국 통계기관과 국제기구의 공식 자료를 원문에서 확인하고, 발표 시점과 집계 기준을 기사에 함께 적습니다." },
  { slug: "culture", name: "문화", nameEn: "Culture", description: "예술·공연·라이프스타일", seoTitle: "문화 뉴스 — 영화·공연·전시·도서·라이프스타일", seoDescription: "영화·공연·전시·도서·음악과 라이프스타일까지 — 모두일보가 문화 예술의 흐름과 트렌드를 감각 있게 소개합니다. 공연·전시 일정과 관람료, 예매 마감과 운영시간을 공식 안내와 예매처에서 확인해 변경 사항까지 전합니다." },
  { slug: "sports", name: "스포츠", nameEn: "Sports", description: "현장의 함성, 승부의 기록", seoTitle: "스포츠 뉴스 — 축구·야구·올림픽·e스포츠", seoDescription: "축구·야구·농구부터 올림픽과 e스포츠까지 — 모두일보가 현장의 함성과 승부의 순간, 선수들의 이야기를 생생하게 전합니다. 경기 결과와 기록은 KBO·MLB 등 공식 기록을 대조하고, 이닝별 득점과 투수 등판 순서까지 검산해 싣습니다." },
  { slug: "tech", name: "테크", nameEn: "Tech", description: "AI·IT·과학의 최전선", seoTitle: "테크 뉴스 — AI·IT·반도체·스타트업·과학", seoDescription: "AI·IT·반도체·스타트업·과학 — 모두일보가 빠르게 변하는 기술의 최전선과 산업 혁신의 흐름을 알기 쉽게 짚어 드립니다. 정부 기술정책과 기업 공시, 연구기관 발표를 원문에서 확인하고 지원사업의 신청 조건까지 함께 정리합니다." },
  { slug: "opinion", name: "오피니언", nameEn: "Opinion", description: "사설·칼럼·시론", seoTitle: "오피니언 — 사설·칼럼·시론·기고", seoDescription: "사설과 칼럼, 시론과 독자 기고 — 모두일보가 우리 시대의 쟁점을 다양한 시선으로 조명하고 건강한 공론의 장을 엽니다. 인용한 통계의 기준 연도와 출처를 본문에 밝히고, 공공데이터에 근거해 주장의 전제를 함께 적습니다." },
];

/**
 * 기업 데이터 뉴스 — '사업' 축 카테고리(위 종합뉴스 CATEGORIES와 분리된 신규 축).
 *
 * ⭐ **사업 6개의 단일 정의(정본)** — 헤더 상단 사업 메뉴·홈 '기업 데이터' 섹션군·각 카테고리
 *    라우트·사이트맵이 전부 이 배열 하나만 본다. 배열 **순서 = 헤더 노출 순서**다.
 *    (예전엔 lib/biz-menus.ts의 BIZ_MENUS가 같은 6개를 이름·설명까지 따로 들고 있어
 *     이미 문구가 어긋나 있었다 — 헤더는 "…정보를 모읍니다", 카테고리 페이지는
 *     "…기업 관점에서 정리합니다". 그래서 정의를 여기로 통합하고 biz-menus.ts는 제거했다.)
 *
 * ⚠️ 이 배열은 CATEGORIES와는 분리 유지한다. 종합뉴스 내비·홈 섹션·[category] 라우트의
 *    카테고리 루프가 CATEGORIES만 순회하도록 두어 사업 축이 종합뉴스 면을 침범하지 않게 한다.
 */
export const BIZ_CATEGORIES: Category[] = [
  {
    slug: "grants",
    name: "정부지원금",
    nameEn: "Grants",
    description: "정부·지자체 지원사업과 보조금 공고를 기업 관점에서 정리합니다",
    seoTitle: "정부지원금 뉴스 — 정부·지자체 지원사업·보조금 공고 분석",
    seoDescription:
      "정부·지자체 지원사업과 보조금 공고를 대상·자격·마감 중심으로 정리합니다. 모두일보가 기업이 놓치기 쉬운 지원금 조건과 주의점을 짚어 드립니다. 기업마당과 소관 기관 공고문을 직접 열어 지원 규모와 제출서류의 필수·선택 구분, 마감 시각까지 확인합니다.",
  },
  {
    slug: "bids",
    name: "공공입찰",
    nameEn: "Bids",
    description: "공공조달·입찰 공고와 낙찰 동향을 기업 관점에서 정리합니다",
    seoTitle: "공공입찰 뉴스 — 공공조달·입찰 공고·낙찰 동향 분석",
    seoDescription:
      "공공조달·입찰 공고를 참가자격·금액·마감 중심으로 정리합니다. 모두일보가 입찰 전에 확인해야 할 자격과 절차를 짚어 드립니다. 나라장터 공고를 직접 조회해 추정가격과 배정예산, 입찰·개찰 일시, 정정·취소 여부와 첨부 구성까지 확인합니다.",
  },
  {
    slug: "startup",
    name: "창업·상권",
    nameEn: "Startup",
    description: "창업 지원과 상권·소상공인 흐름을 기업 관점에서 살핍니다",
    seoTitle: "창업·상권 뉴스 — 창업 지원·상권·소상공인 동향 분석",
    seoDescription:
      "창업 지원과 상권·소상공인 흐름을 대상·조건·주의점 중심으로 정리합니다. 모두일보가 예비창업자와 사업자가 놓치기 쉬운 지점을 짚어 드립니다. K-Startup 등 공고 원문에서 모집 규모와 지원금, 접수 마감과 선정 절차, 자기부담 조건까지 확인해 전합니다.",
  },
  {
    slug: "industry",
    name: "산업·트렌드",
    nameEn: "Industry",
    description: "산업 동향과 시장 트렌드를 기업 관점에서 짚어 드립니다",
    seoTitle: "산업·트렌드 뉴스 — 산업 동향·시장 트렌드 분석",
    seoDescription:
      "산업 동향과 시장 트렌드를 업종·수치·주의점 중심으로 정리합니다. 모두일보가 기업이 시장을 읽는 데 필요한 지점을 짚어 드립니다. 정부 부처 발표자료와 기업 공시, 통계 원자료를 직접 확인해 기준 연도와 집계 범위, 잠정치 여부를 밝힙니다.",
  },
  {
    slug: "labor",
    name: "채용·노무",
    nameEn: "Labor",
    description: "채용·인사·노무 실무에 도움이 되는 정보를 정리합니다",
    seoTitle: "채용·노무 뉴스 — 채용·인사·노무 실무 정보 분석",
    seoDescription:
      "채용·인사·노무 실무를 대상·요건·주의점 중심으로 정리합니다. 모두일보가 사업주와 인사담당자가 놓치기 쉬운 조건을 짚어 드립니다. 공공기관 채용정보시스템과 기관 공고문을 직접 열어 채용 인원과 고용형태, 접수 마감과 전형 일정을 확인합니다.",
  },
  {
    slug: "deals",
    name: "계약·거래",
    nameEn: "Deals",
    description: "기업 간 계약·거래와 B2B 소식을 기업 관점에서 정리합니다",
    seoTitle: "계약·거래 뉴스 — 기업 간 계약·거래·B2B 실무 분석",
    seoDescription:
      "기업 간 계약·거래와 B2B 실무를 대상·조건·주의점 중심으로 정리합니다. 모두일보가 계약 전에 확인해야 할 지점을 짚어 드립니다. 금융감독원 전자공시(DART) 원문을 직접 확인해 계약 금액과 지분율, 대금 지급 일정과 후속 정정 여부를 전합니다.",
  },
];

/** 사업 축 카테고리 슬러그 집합 — 종합뉴스 홈 히어로 등에서 사업 기사를 걸러내는 데 쓴다. */
export const BIZ_CATEGORY_SLUGS = new Set<CategorySlug>(
  BIZ_CATEGORIES.map((c) => c.slug),
);

/** 해당 슬러그가 사업 축(정부지원금 등) 카테고리인지 여부. */
export function isBizCategory(slug: CategorySlug): boolean {
  return BIZ_CATEGORY_SLUGS.has(slug);
}

// 이름·SEO 해석용 통합 맵 — 종합뉴스 + 사업 축 카테고리 정의를 모두 담는다.
export const CATEGORY_MAP: Record<CategorySlug, Category> = [
  ...CATEGORIES,
  ...BIZ_CATEGORIES,
].reduce(
  (acc, c) => {
    acc[c.slug] = c;
    return acc;
  },
  {} as Record<CategorySlug, Category>,
);

export function getCategory(slug: string): Category | undefined {
  return CATEGORY_MAP[slug as CategorySlug];
}

