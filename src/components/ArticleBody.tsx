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

export function ArticleBody({ body }: { body: string[] }) {
  const [main, sourceLabel, sources] = splitSources(body);
  return (
    <div
      id="article-body"
      className="mt-8 space-y-5 text-[17px] leading-[1.9] text-ink-800 dark:text-ink-200"
    >
      {main.map((p, i) => {
        // "## 소제목" / "### 소제목" — 기사 중간 소제목
        const heading = p.match(/^(#{2,3})\s+(.+)$/);
        if (heading) {
          return heading[1].length === 2 ? (
            <h2
              key={i}
              className="!mt-9 border-l-4 border-signal-600 pl-3 font-headline text-[21px] font-bold leading-snug text-ink-900 dark:text-white"
            >
              {heading[2]}
            </h2>
          ) : (
            <h3
              key={i}
              className="!mt-8 font-headline text-lg font-bold leading-snug text-ink-900 dark:text-white"
            >
              {heading[2]}
            </h3>
          );
        }
        // 유튜브 단독 문단 → 반응형 임베드(16:9, 지연 로드, 쿠키리스 도메인)
        const yt = p.trim().match(YOUTUBE_RE);
        if (yt) {
          return (
            <figure key={i} className="my-2">
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
            <figure key={i} className="my-2">
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
        return <p key={i}>{p}</p>;
      })}
      {sourceLabel && sources.length > 0 && (
        <aside aria-label="출처" className="!mt-10 border-t border-ink-100 pt-4 dark:border-ink-800">
          <p className="text-[11px] font-semibold tracking-wide text-ink-500 dark:text-ink-400">
            {sourceLabel}
          </p>
          <ul className="mt-1.5 space-y-1">
            {sources.map((s, i) => (
              <li key={i} className="break-all text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                {s}
              </li>
            ))}
          </ul>
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
