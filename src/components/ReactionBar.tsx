"use client";

import { useEffect, useState } from "react";

/** 자체 무채색 라인 아이콘(네이버 이모지 복제 아님). 전부 긍정·중립 반응(찬반 없음). */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const Bulb = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path d="M9 18h6M10 21h4" {...S} />
    <path d="M12 3a6 6 0 0 0-4 10.4c.6.6 1 1.4 1 2.2V16h6v-.4c0-.8.4-1.6 1-2.2A6 6 0 0 0 12 3Z" {...S} />
  </svg>
);
const Spark = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z" {...S} />
    <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" {...S} />
  </svg>
);
const Heart = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path d="M12 20.3S4.5 15.9 4.5 10.6A3.9 3.9 0 0 1 12 8.4a3.9 3.9 0 0 1 7.5 2.2c0 5.3-7.5 9.7-7.5 9.7Z" {...S} />
  </svg>
);
const Lens = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <circle cx="11" cy="11" r="6.5" {...S} />
    <path d="M20 20l-4.4-4.4" {...S} />
  </svg>
);
const Bookmark = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path d="M6.5 3.5h11v17l-5.5-3.7-5.5 3.7v-17Z" {...S} />
  </svg>
);

const REACTIONS = [
  { type: "info", label: "유익해요", Icon: Bulb },
  { type: "interesting", label: "흥미로워요", Icon: Spark },
  { type: "empathy", label: "공감해요", Icon: Heart },
  { type: "insight", label: "통찰있어요", Icon: Lens },
  { type: "followup", label: "후속 기대", Icon: Bookmark },
] as const;

type State = { counts: Record<string, number>; voted: Record<string, boolean> };

export function ReactionBar({ articleId }: { articleId: string }) {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/reactions?article=${encodeURIComponent(articleId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.counts) setS(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [articleId]);

  async function react(type: string) {
    if (busy || s?.voted?.[type]) return;
    setBusy(true);
    setS((prev) =>
      prev
        ? { counts: { ...prev.counts, [type]: (prev.counts[type] || 0) + 1 }, voted: { ...prev.voted, [type]: true } }
        : prev,
    );
    try {
      const r = await fetch("/api/reactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ article: articleId, type }),
      });
      const d = await r.json();
      if (d?.counts) setS({ counts: d.counts, voted: d.voted });
    } catch {
      /* 실패 시 낙관적 갱신 유지(다음 로드에서 정정) */
    }
    setBusy(false);
  }

  return (
    <section className="mt-10 rounded-xl border border-ink-100 bg-ink-50/60 p-5 dark:border-ink-800 dark:bg-ink-900/40">
      <h3 className="text-center text-sm font-bold text-ink-700 dark:text-ink-200">이 기사를 추천합니다</h3>
      <div className="mx-auto mt-4 grid max-w-lg grid-cols-5 gap-1.5 sm:gap-3">
        {REACTIONS.map(({ type, label, Icon }) => {
          const on = !!s?.voted?.[type];
          const n = s?.counts?.[type] ?? 0;
          return (
            <button
              key={type}
              onClick={() => react(type)}
              disabled={on || busy}
              aria-pressed={on}
              className={`flex flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 transition-colors ${
                on
                  ? "bg-white text-ink-900 shadow-sm ring-1 ring-ink-900/70 dark:bg-ink-800 dark:text-white dark:ring-white/60"
                  : "text-ink-500 hover:bg-white/70 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800/60 dark:hover:text-ink-100"
              } ${on ? "" : "cursor-pointer"}`}
            >
              <Icon />
              <span className="whitespace-nowrap text-[11px] font-medium sm:text-xs">{label}</span>
              <span className="text-sm font-bold tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-400">로그인 없이 참여 · 반응별 하루 1회</p>
    </section>
  );
}
