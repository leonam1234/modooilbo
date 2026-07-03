"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ShareIcon, PrintIcon, BookmarkIcon } from "./icons";

const SIZES = [16, 17, 18, 20, 22];

export function ArticleActions({ title, articleId }: { title: string; articleId: string }) {
  const [size, setSize] = useState(1);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/bookmarks?article=${encodeURIComponent(articleId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSaved(!!d?.saved))
      .catch(() => {});
  }, [articleId]);

  async function toggleSave() {
    try {
      const r = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ article: articleId }),
      });
      const d = await r.json();
      if (r.ok) {
        setSaved(!!d.saved);
        setSaveMsg(d.saved ? "스크랩됨" : "스크랩 해제");
      } else {
        setSaveMsg("로그인이 필요합니다");
      }
    } catch {
      setSaveMsg("오류가 났습니다");
    }
    setTimeout(() => setSaveMsg(null), 1500);
  }

  useEffect(() => {
    const el = document.getElementById("article-body");
    if (el) {
      el.style.fontSize = `${SIZES[size]}px`;
      el.style.lineHeight = "1.9";
    }
  }, [size]);

  function copyLink() {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function share(network: "x" | "f") {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    const href =
      network === "x"
        ? `https://twitter.com/intent/tweet?text=${text}&url=${url}`
        : `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(href, "_blank", "noopener,width=600,height=500");
  }

  const iconBtn =
    "inline-grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-300";
  const snsBtn =
    "inline-grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-sm font-bold text-ink-600 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-300";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-full border border-ink-200 dark:border-ink-700">
        <button
          type="button"
          onClick={() => setSize((s) => Math.max(0, s - 1))}
          aria-label="글자 작게"
          className="px-3 py-1 text-xs text-ink-500 hover:text-signal-600"
        >
          가−
        </button>
        <span className="h-4 w-px bg-ink-200 dark:bg-ink-700" />
        <button
          type="button"
          onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))}
          aria-label="글자 크게"
          className="px-3 py-1 text-sm font-semibold text-ink-600 hover:text-signal-600 dark:text-ink-300"
        >
          가+
        </button>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={toggleSave}
          aria-label="스크랩"
          aria-pressed={saved}
          className={cn(iconBtn, saved && "border-signal-500 bg-signal-50 text-signal-600 dark:bg-signal-950")}
        >
          <BookmarkIcon className="h-4 w-4" />
        </button>
        {saveMsg && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-xs text-white">
            {saveMsg}
          </span>
        )}
      </div>
      <button type="button" onClick={() => window.print()} aria-label="인쇄" className={iconBtn}>
        <PrintIcon className="h-4 w-4" />
      </button>
      <div className="relative">
        <button type="button" onClick={copyLink} aria-label="링크 복사" className={iconBtn}>
          <ShareIcon className="h-4 w-4" />
        </button>
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-xs text-white">
            복사됨
          </span>
        )}
      </div>
      <button type="button" onClick={() => share("x")} aria-label="X(트위터) 공유" className={snsBtn}>
        X
      </button>
      <button type="button" onClick={() => share("f")} aria-label="페이스북 공유" className={snsBtn}>
        f
      </button>
    </div>
  );
}
