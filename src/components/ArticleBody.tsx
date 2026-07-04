import Image from "next/image";

/**
 * 기사 본문 렌더러 — 문단 배열을 소제목(##/###)·이미지 마크다운·일반 문단으로 그린다.
 * article/[slug]/page.tsx에서 분리(2026-07). 마크업·클래스는 분리 전과 동일.
 */
/** "## 출처 …" 이후를 각주 블록으로 분리. [본문, 출처라벨, 출처항목들] */
export function splitSources(body: string[]): [string[], string | null, string[]] {
  const idx = body.findIndex((p) => /^#{2,3}\s*(출처|자료 출처|참고 자료)/.test(p));
  if (idx === -1) return [body, null, []];
  const label = body[idx].replace(/^#{2,3}\s*/, "").trim();
  const items = body
    .slice(idx + 1)
    .flatMap((chunk) => chunk.split("\n"))
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
  return [body.slice(0, idx), label, items];
}

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
      {sourceLabel && sources.length > 0 && (
        <aside aria-label="출처" className="!mt-10 border-t border-ink-100 pt-4 dark:border-ink-800">
          <p className="text-[11px] font-semibold tracking-wide text-ink-400 dark:text-ink-500">
            {sourceLabel}
          </p>
          <ul className="mt-1.5 space-y-1">
            {sources.map((s, i) => (
              <li key={i} className="break-all text-xs leading-relaxed text-ink-400 dark:text-ink-500">
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
    .replace(/#{2,3}\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
