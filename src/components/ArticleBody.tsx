import Image from "next/image";

/**
 * 기사 본문 렌더러 — 문단 배열을 소제목(##/###)·이미지 마크다운·일반 문단으로 그린다.
 * article/[slug]/page.tsx에서 분리(2026-07). 마크업·클래스는 분리 전과 동일.
 */
export function ArticleBody({ body }: { body: string[] }) {
  return (
    <div
      id="article-body"
      className="mt-8 space-y-5 text-[17px] leading-[1.9] text-ink-800 dark:text-ink-200"
    >
      {body.map((p, i) => {
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
        const img = p.match(/^!\[([^\]]*)\]\((\/[^)]+)\)$/);
        if (img) {
          return (
            <figure key={i} className="my-2">
              <span className="relative block aspect-[16/9] w-full overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                <Image
                  src={img[2]}
                  alt={img[1] || ""}
                  fill
                  sizes="(max-width:1024px) 100vw, 66vw"
                  unoptimized
                  className="object-cover"
                />
              </span>
              {img[1] && <figcaption className="mt-2 text-xs text-ink-400">{img[1]}</figcaption>}
            </figure>
          );
        }
        return <p key={i}>{p}</p>;
      })}
    </div>
  );
}

/** 본문 듣기(TTS)용 순수 텍스트 — 소제목 기호·이미지 마크다운을 제거해 낭독 사고를 막는다. */
export function articleSpeechText(a: { title: string; summary: string; body: string[] }): string {
  return [a.title, a.summary, ...a.body]
    .join(" ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/#{2,3}\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
