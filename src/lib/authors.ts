import { ALL_ARTICLES } from "./news"; // queries.ts가 이 모듈을 import하므로 순환 방지 위해 news 직접 참조(예외 허용)
import { SITE } from "./site";

/**
 * 기자 프로필(/reporter/*) 색인 허용 여부.
 * 현재 저자는 가상 인물이므로 false — 가짜 Person 색인은 E-E-A-T 역효과.
 * 실인물 기자 전환 시 true로 변경 → reporter 페이지 robots noindex 해제.
 * (sitemap 등재는 자동이 아님: 전환 시 src/app/sitemap.ts에 reporter 엔트리를 함께 추가할 것 — wiki/operations/01-trust-eeat.md ⑦ 참조)
 */
export const REPORTER_INDEXABLE: boolean = false; // 리터럴 false 타입 고정 방지 위해 : boolean 명시

export interface AuthorProfile {
  slug: string;
  name: string;
  role: string;
  bio: string;
  beats: string[];
}

/** 저자명 → 결정적 로마자 케밥 슬러그(런타임 변환 없이 전량 하드코딩). */
const NAME_TO_SLUG: Record<string, string> = {
  강리원: "gang-ri-won",
  강민서: "gang-min-seo",
  고은별: "go-eun-byeol",
  구민재: "gu-min-jae",
  구본하: "gu-bon-ha",
  권다흰: "gwon-da-huin",
  김도윤: "kim-do-yun",
  남기철: "nam-gi-cheol",
  남기태: "nam-gi-tae",
  노준혁: "no-jun-hyeok",
  노하경: "no-ha-gyeong",
  도하린: "do-ha-rin",
  라윤재: "ra-yun-jae",
  "마르코 베르티": "marco-berti",
  문세현: "mun-se-hyeon",
  문해성: "mun-hae-seong",
  박서연: "park-seo-yeon",
  배현우: "bae-hyeon-u",
  백서윤: "baek-seo-yun",
  백지운: "baek-ji-un",
  서가은: "seo-ga-eun",
  서다온: "seo-da-on",
  "소피아 라모스": "sofia-ramos",
  신동률: "shin-dong-ryul",
  신재호: "shin-jae-ho",
  엄지성: "eom-ji-seong",
  "오드리 첸": "audrey-chen",
  오세준: "oh-se-jun",
  오세진: "oh-se-jin",
  유경한: "yu-gyeong-han",
  유선아: "yu-seon-a",
  유설아: "yu-seol-a",
  유한결: "yu-han-gyeol",
  윤지호: "yun-ji-ho",
  윤태경: "yun-tae-gyeong",
  임채린: "im-chae-rin",
  임채원: "im-chae-won",
  장미경: "jang-mi-gyeong",
  전유나: "jeon-yu-na",
  정우람: "jeong-u-ram",
  정하늘: "jeong-ha-neul",
  정하람: "jeong-ha-ram",
  조민설: "jo-min-seol",
  조은별: "jo-eun-byeol",
  차승호: "cha-seung-ho",
  표지훈: "pyo-ji-hun",
  한가람: "han-ga-ram",
  한도연: "han-do-yeon",
  한지원: "han-ji-won",
  허윤재: "heo-yun-jae",
  황지민: "hwang-ji-min",
};

/** role → 전문분야·소개문 결정적 매핑(구체 이력 날조 금지, 중립 서술만). */
function roleMeta(role: string): { beats: string[]; bio: string } {
  if (role === "국제부 특파원") return { beats: ["국제"], bio: "모두일보 국제부 특파원으로 해외 현장 소식을 전합니다." };
  if (role === "논설위원") return { beats: ["오피니언"], bio: "모두일보 논설위원으로 사설과 칼럼을 씁니다." };
  if (role === "객원 칼럼니스트") return { beats: ["칼럼"], bio: "모두일보 객원 칼럼니스트로 칼럼을 기고합니다." };
  if (role.startsWith("정치부")) return { beats: ["정치"], bio: `모두일보 ${role}로 정치 분야를 취재합니다.` };
  if (role.startsWith("경제부")) return { beats: ["경제"], bio: `모두일보 ${role}로 경제 분야를 취재합니다.` };
  if (role.startsWith("사회부")) return { beats: ["사회"], bio: `모두일보 ${role}로 사회 분야를 취재합니다.` };
  if (role.startsWith("문화부")) return { beats: ["문화"], bio: `모두일보 ${role}로 문화 분야를 취재합니다.` };
  if (role.startsWith("체육부")) return { beats: ["스포츠"], bio: `모두일보 ${role}로 스포츠 분야를 취재합니다.` };
  if (role.startsWith("국제부")) return { beats: ["국제"], bio: `모두일보 ${role}로 국제 분야를 취재합니다.` };
  if (role.startsWith("테크부") || role.startsWith("정보과학부")) return { beats: ["IT·과학"], bio: `모두일보 ${role}로 IT·과학 분야를 취재합니다.` };
  if (role.startsWith("외교안보부")) return { beats: ["외교·안보"], bio: `모두일보 ${role}로 외교·안보 분야를 취재합니다.` };
  if (role.startsWith("사진부")) return { beats: ["포토"], bio: `모두일보 ${role}로 현장을 사진으로 기록합니다.` };
  if (role.startsWith("영상취재")) return { beats: ["영상"], bio: `모두일보 ${role}로 현장을 영상으로 기록합니다.` };
  return { beats: [], bio: `모두일보 ${role}로 활동합니다.` };
}

// 모듈 스코프 파생(빌드타임 1회 평가, Date.now/Math.random 불사용)
const uniqueByName = new Map<string, string>(); // name -> role(첫 등장)
for (const a of ALL_ARTICLES) {
  if (a.author.name === SITE.name) continue; // 스태프 바이라인 "모두일보" 제외
  if (!uniqueByName.has(a.author.name)) uniqueByName.set(a.author.name, a.author.role);
}

const seenSlugs = new Set<string>();
export const AUTHORS: AuthorProfile[] = [...uniqueByName.entries()]
  .map(([name, role]) => {
    const slug = NAME_TO_SLUG[name];
    if (!slug) throw new Error(`authors.ts: NAME_TO_SLUG에 슬러그 누락: ${name}`);
    if (seenSlugs.has(slug)) throw new Error(`authors.ts: 슬러그 중복: ${slug}`);
    seenSlugs.add(slug);
    const { beats, bio } = roleMeta(role);
    return { slug, name, role, bio, beats };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "ko")); // 가나다순 — 결정성 보장

export function getAuthorSlugByName(name: string): string | undefined {
  return AUTHORS.find((p) => p.name === name)?.slug; // 스태프 바이라인이면 undefined
}
