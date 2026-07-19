import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import { webpSrc } from "@/lib/stock";

/**
 * 기사 본문 렌더러 — 문단 배열을 소제목(##/###)·이미지 마크다운·일반 문단으로 그린다.
 * article/[slug]/page.tsx에서 분리(2026-07). 마크업·클래스는 분리 전과 동일.
 */
/** 유튜브 URL "단독 문단"만 임베드 — 문장에 섞인 링크는 텍스트 유지. watch/shorts/youtu.be/embed/live 지원. */
const YOUTUBE_RE =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})\/?(?:[?&#]\S*)?$/;

/** "## 출처 …" 이후를 각주 블록으로 분리. [본문, 출처라벨, 출처항목들]
 *  생성 파이프라인(build-content)이 문단 내 줄바꿈을 공백으로 접기 때문에
 *  "## 출처 메모 - 항목 - 항목"처럼 한 덩어리로 오는 형태와, 별도 문단 형태를 모두 처리.
 *  헤딩 판정은 "출처/자료 출처/참고 자료" 단어로 끝나거나 바로 " - "가 이어질 때만
 *  (— "## 출처 표기 논란" 같은 일반 소제목을 오인해 본문을 자르지 않도록). */
const SOURCE_HEAD = /^(#{2,3})\s*(출처(?:\s*메모)?|자료\s*출처|참고\s*자료)\s*(?:$|-\s)/;

export function splitSources(body: string[]): [string[], string | null, string[]] {
  const idx = body.findIndex((p) => SOURCE_HEAD.test(p));
  if (idx === -1) return [body, null, []];
  const chunk = body[idx];
  const m = chunk.match(SOURCE_HEAD)!;
  const label = m[2].replace(/\s+/g, " ").trim();
  // 같은 덩어리 안에 " - 항목 - 항목"이 붙어 있으면 그걸 목록으로 사용
  const inline = chunk.slice(m[0].length ? chunk.indexOf(m[2]) + m[2].length : 0);
  const inlineItems = inline
    .split(/\s+-\s+/)
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
  const followItems = body
    .slice(idx + 1)
    .flatMap((c) => c.split("\n"))
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
  // 내부 데스킹 메모("확인 메모: …" 등)는 독자에게 출판 금지 — 파이프라인에 섞여 와도 여기서 차단
  const items = [...inlineItems, ...followItems].filter((l) => !INTERNAL_NOTE.test(l));
  return [body.slice(0, idx), label, items];
}

/** 출처 목록에 섞여 들어온 내부 편집 메모 판별 (확인/검수/편집/데스크/내부 메모) */
const INTERNAL_NOTE = /^(확인|검수|편집|데스크|데스킹|내부)\s*메모\s*[:：]/;

/**
 * 출처 항목 문자열("레이블: URL")을 일반 신문식 한 줄 출처로 변환한다.
 * - 레이블에서 기관 명칭만 뽑아 링크(앵커=기관명, href=원문). 생 URL은 화면에 노출하지 않는다.
 * - 같은 기관은 1회만(대표 링크 = 그 기관의 첫 출처 URL).
 * - URL이 없는 항목("최종 확인시각 …", 첨부 파일명 등)은 화면에서 제외한다.
 * 정적 export라 이 변환은 빌드 시 1회 실행돼 HTML로 굳는다(런타임 비용 없음).
 */
export type SourceLink = { org: string; url: string };

// 레이블 부분문자열 → 표준 기관 표기(= 앵커 텍스트). 레이블은 "공식 원문, 관세청, …"처럼
// 서술어가 앞설 때가 많아 첫 어절이 아니라 "가장 왼쪽에 등장하는" 표제어를 채택한다(선두 귀속 기관).
// 같은 위치면 더 긴 표제어 우선. 변형(문체부·서울시·상생결제·법령명 등)은 대표 표기로 통일한다.
const ORG_DICT: [string, string][] = [
  ["대한민국 정책브리핑", "정책브리핑"],
  ["경남지방중소벤처기업청", "경남지방중소벤처기업청"],
  ["중소기업 수출규제대응지원센터", "중소기업 수출규제대응지원센터"],
  ["장애인기업종합지원센터", "장애인기업종합지원센터"],
  ["해외인증·기술규제 정보포털", "국가기술표준원"],
  ["경기도경제과학진흥원", "경기도경제과학진흥원"],
  ["경기스타트업플랫폼", "경기스타트업플랫폼"],
  ["외국인고용관리시스템", "외국인고용관리시스템"],
  ["용인기업지원시스템", "용인기업지원시스템"],
  ["과학기술정보통신부", "과학기술정보통신부"],
  ["개인정보보호위원회", "개인정보보호위원회"],
  ["경제사회노동위원회", "경제사회노동위원회"],
  ["한국인터넷진흥원", "한국인터넷진흥원"],
  ["1인 창조기업 지원센터", "1인 창조기업 지원센터"],
  ["캐릭터 라이선싱 페어", "캐릭터 라이선싱 페어"],
  ["유네스코 세계유산위원회", "유네스코 세계유산위원회"],
  ["어린이집안전공제회", "어린이집안전공제회"],
  ["중소벤처기업부", "중소벤처기업부"],
  ["문화체육관광부", "문화체육관광부"],
  ["최저임금위원회", "최저임금위원회"],
  ["공정거래위원회", "공정거래위원회"],
  ["국가법령정보센터", "국가법령정보센터"],
  ["세계유산위원회", "유네스코 세계유산위원회"],
  ["경남테크노파크", "경남테크노파크"],
  ["포항테크노파크", "포항테크노파크"],
  ["울산테크노파크", "울산테크노파크"],
  ["예술의전당", "예술의전당"],
  ["투르 드 프랑스", "투르 드 프랑스"],
  ["국가기술표준원", "국가기술표준원"],
  ["한국관광공사", "한국관광공사"],
  ["영화진흥위원회", "영화진흥위원회"],
  ["국립중앙박물관", "국립중앙박물관"],
  ["국립환경과학원", "국립환경과학원"],
  ["국립자연휴양림", "산림청"],
  ["한국부동산원", "한국부동산원"],
  ["한국장학재단", "한국장학재단"],
  ["기후에너지환경부", "기후에너지환경부"],
  ["한국지능정보사회진흥원", "한국지능정보사회진흥원"],
  ["국토교통 기업지원허브", "국토교통 기업지원허브"],
  ["한국환경공단", "한국환경공단"],
  ["공공데이터포털", "공공데이터포털"],
  ["행정안전부", "행정안전부"],
  ["보건복지부", "보건복지부"],
  ["산업통상부", "산업통상부"],
  ["국가데이터처", "국가데이터처"],
  ["한국거래소", "한국거래소"],
  ["고용노동부", "고용노동부"],
  ["근로복지공단", "근로복지공단"],
  ["질병관리청", "질병관리청"],
  ["금융감독원", "금융감독원"],
  ["포스코퓨처엠", "포스코퓨처엠"],
  ["울트라백화점", "울트라백화점"],
  ["KSD나눔재단", "KSD나눔재단"],
  ["경주예술의전당", "경주시"],
  ["스페인축구협회", "스페인축구협회"],
  ["상생결제제도", "상생결제제도"],
  ["한국은행", "한국은행"],
  ["대통령실", "대통령실"],
  ["관세청", "관세청"],
  ["경찰청", "경찰청"],
  ["산림청", "산림청"],
  ["교육부", "교육부"],
  ["외교부", "외교부"],
  ["문체부", "문화체육관광부"],
  ["정책브리핑", "정책브리핑"],
  ["기업마당", "기업마당"],
  ["상생결제", "상생결제제도"],
  ["고용24", "고용24"],
  ["KOSIS", "국가데이터처"],
  ["KnowTBT", "국가기술표준원"],
  ["비짓부산", "부산광역시"],
  ["부산광역시", "부산광역시"],
  ["부산시", "부산광역시"],
  ["서울특별시", "서울특별시"],
  ["서울시", "서울특별시"],
  ["경주시", "경주시"],
  ["조세특례제한법", "국가법령정보센터"],
  ["하도급거래 공정화에 관한 법률", "국가법령정보센터"],
  ["하도급법", "국가법령정보센터"],
  ["나라장터", "나라장터"],
  ["K-Startup", "K-Startup"],
  ["KT 위즈", "KT 위즈"],
  ["KBO", "KBO"],
  ["FIFA", "FIFA"],
  ["FAO", "FAO"],
  ["IATA", "IATA"],
  ["UNCTAD", "UNCTAD"],
  ["UNEP", "UNEP"],
  ["NOAA", "NOAA"],
  ["ESA", "ESA"],
  ["FSS", "금융감독원"],
  ["디오픈", "디오픈"],
  ["AusAlert", "AusAlert"],
  ["호주 보건·장애·노인부", "호주 보건·장애·노인부"],
  ["UK Health Security Agency", "UK Health Security Agency"],
  ["Korea.net", "Korea.net"],
];

// 레이블 앞머리에 붙는 서술어/수식어(기관명이 아님) — 폴백 시 이런 토큰은 건너뛴다.
const SOURCE_DESCRIPTOR = new Set([
  "공식", "원문", "발표", "조사", "원자료", "보도자료", "최종", "현행", "현장", "세부", "사업",
  "실제", "최근", "최신", "신청처", "계약", "통계", "서비스", "공개", "주최사", "호환", "외국인",
  "근거자료", "첨부", "자료", "참고", "출처", "관련", "기타", "안내", "정정", "공고문", "공고",
  "목록", "페이지", "화면", "누리집",
]);
// 한글 기관형 접미사 — 사전에 없는(향후) 레이블도 org-first면 폴백으로 안전하게 뽑기 위함.
const INST_SUFFIX = /(부|처|청|원|회|공사|공단|센터|위원회|은행|거래소|재단|협회|조합|시|도|군|구|국|단)$/;

/** 출처 레이블에서 기관 명칭 1개를 뽑는다. 못 뽑으면 null(그 항목은 화면에서 제외). */
function orgFromLabel(label: string): string | null {
  // 1) 사전 스캔 — 가장 왼쪽(선두 귀속) 표제어 채택, 같은 위치면 더 긴 표제어
  let best: { i: number; len: number; canon: string } | null = null;
  for (const [needle, canon] of ORG_DICT) {
    const i = label.indexOf(needle);
    if (i === -1) continue;
    if (best === null || i < best.i || (i === best.i && needle.length > best.len)) {
      best = { i, len: needle.length, canon };
    }
  }
  if (best) return best.canon;
  // 2) 폴백 — 선두 서술어절을 구분자로 걷어낸 뒤 첫 토큰이 '한글 기관형'이면 채택, 아니면 드롭
  const segs = [label, ...label.split(/[:：,，—–]|\s-\s/).map((s) => s.trim())];
  for (const seg of segs) {
    const tok = (seg.split(/\s+/)[0] || "").replace(/[.,、·]+$/, "");
    if (!tok || SOURCE_DESCRIPTOR.has(tok)) continue;
    if (/[가-힣]/.test(tok) && INST_SUFFIX.test(tok)) return tok;
  }
  return null;
}

/** 출처 항목 배열 → {기관명, 원문 URL} 배열(URL 없는 항목·기관 미상 항목 제외, 기관 중복 제거). */
export function sourceLinks(items: string[]): SourceLink[] {
  const seen = new Set<string>();
  const out: SourceLink[] = [];
  for (const s of items) {
    const m = s.match(/https?:\/\/\S+/);
    if (!m) continue; // "최종 확인시각 …", 첨부 파일명 등 URL 없는 줄은 화면 제외
    const url = m[0].replace(/["'.,]+$/, "");
    const label = s.slice(0, m.index).replace(/[:：]\s*$/, "").trim();
    const org = orgFromLabel(label);
    if (!org || seen.has(org)) continue;
    seen.add(org);
    out.push({ org, url });
  }
  return out;
}

/** 본문 블록 하나 — 소제목(##/###) · 유튜브 단독 문단 · 이미지 마크다운 · 일반 문단. */
function BodyBlock({ p }: { p: string }) {
  // "## 소제목" / "### 소제목" — 기사 중간 소제목
  const heading = p.match(/^(#{2,3})\s+(.+)$/);
  if (heading) {
    return heading[1].length === 2 ? (
      <h2 className="!mt-9 border-l-4 border-signal-600 pl-3 font-headline text-[21px] font-bold leading-snug text-ink-900 dark:text-white">
        {heading[2]}
      </h2>
    ) : (
      <h3 className="!mt-8 font-headline text-lg font-bold leading-snug text-ink-900 dark:text-white">
        {heading[2]}
      </h3>
    );
  }
  // 유튜브 단독 문단 → 반응형 임베드(16:9, 지연 로드, 쿠키리스 도메인)
  const yt = p.trim().match(YOUTUBE_RE);
  if (yt) {
    return (
      <figure className="my-2">
        <span className="relative block aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt[1]}`}
            title="기사 영상"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </span>
      </figure>
    );
  }

  const img = p.match(/^!\[([^\]]*)\]\((\/[^)]+)\)$/);
  if (img) {
    return (
      <figure className="my-2">
        <span className="relative block aspect-[16/9] w-full overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
          <Image
            src={webpSrc(img[2])}
            alt={img[1] || ""}
            fill
            sizes="(max-width:1024px) 100vw, 66vw"
            unoptimized
            className="object-cover"
          />
        </span>
        {img[1] && <figcaption className="mt-2 text-xs text-ink-500 dark:text-ink-400">{img[1]}</figcaption>}
      </figure>
    );
  }
  return <p>{p}</p>;
}

/** 본문 중간 삽입물(midSlot)을 넣는 위치 = '일반 문단' 이만큼 뒤(뉴스 관행). 소제목·이미지·영상은 세지 않는다. */
const MID_AFTER_PARAGRAPHS = 3;
/** 일반 문단이 이보다 적은 짧은 기사엔 넣지 않는다 — 3문단 뒤가 곧 기사 끝이라 흐름만 끊는다. */
const MID_MIN_PARAGRAPHS = 6;

function isPlainParagraph(p: string): boolean {
  return !/^#{2,3}\s+/.test(p) && !/^!\[[^\]]*\]\((\/[^)]+)\)$/.test(p) && !YOUTUBE_RE.test(p.trim());
}

/**
 * midSlot을 렌더할 '직후' 블록 인덱스(없으면 -1).
 * ⚠️ 문단 자체는 절대 쪼개지 않는다 — 블록과 블록 '사이'에만 끼운다(본문 훼손 방지).
 */
function midSlotAfterIndex(main: string[]): number {
  const paragraphIdx = main.map((p, i) => (isPlainParagraph(p) ? i : -1)).filter((i) => i >= 0);
  if (paragraphIdx.length < MID_MIN_PARAGRAPHS) return -1;
  return paragraphIdx[MID_AFTER_PARAGRAPHS - 1];
}

/**
 * @param midSlot 본문 중간에 끼울 노드(광고 슬롯 등). 무엇을 끼울지는 호출자가 정하고,
 *                어디에 끼울지는 여기(본문 구조를 아는 쪽)가 정한다.
 */
export function ArticleBody({ body, midSlot }: { body: string[]; midSlot?: ReactNode }) {
  const [main, sourceLabel, sources] = splitSources(body);
  // 일반 신문식 한 줄 출처: 기관명만 하이퍼링크. 링크가 하나도 없으면 출처 블록을 그리지 않는다.
  const links = sourceLabel ? sourceLinks(sources) : [];
  const midAfter = midSlot ? midSlotAfterIndex(main) : -1;
  return (
    <div
      id="article-body"
      className="mt-8 space-y-5 text-[17px] leading-[1.9] text-ink-800 dark:text-ink-200"
    >
      {main.map((p, i) => (
        // Fragment는 DOM 노드를 만들지 않으므로 space-y-5(직계 자식 간격)가 그대로 적용된다
        <Fragment key={i}>
          <BodyBlock p={p} />
          {i === midAfter && midSlot}
        </Fragment>
      ))}
      {links.length > 0 && (
        <aside aria-label="출처" className="!mt-10 border-t border-ink-100 pt-4 dark:border-ink-800">
          <p className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
            <span className="font-semibold">출처</span>{": "}
            {links.map((l, i) => (
              <Fragment key={l.org}>
                {i > 0 && (
                  <span aria-hidden className="mx-1.5 text-ink-300 dark:text-ink-600">
                    ·
                  </span>
                )}
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener"
                  className="underline decoration-ink-300 underline-offset-2 hover:text-ink-700 dark:decoration-ink-600 dark:hover:text-ink-200"
                >
                  {l.org}
                </a>
              </Fragment>
            ))}
          </p>
        </aside>
      )}
    </div>
  );
}

/** 본문 듣기(TTS)용 순수 텍스트 — 소제목 기호·이미지 마크다운 제거 + 출처 블록(URL 낭독) 제외. */
export function articleSpeechText(a: { title: string; summary: string; body: string[] }): string {
  const [main] = splitSources(a.body);
  return [a.title, a.summary, ...main]
    .join(" ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/https?:\/\/\S+/g, "") // URL 낭독 방지(유튜브 임베드 문단 포함)
    .replace(/#{2,3}\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
