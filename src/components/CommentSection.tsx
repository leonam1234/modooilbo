"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CommentItem = {
  id: string;
  parent_id: string | null;
  author: string;
  body: string;
  created_at: string; // KST 벽시계 문자열
  likes: number;
  liked: boolean;
  mine: boolean;
  deleted: boolean;
  hidden: boolean;
};

type Data = { count: number; comments: CommentItem[]; me: { name: string } | null };

const MAX_BODY = 500;

/** KST 저장 문자열 → 상대 시각. */
function timeAgo(kst: string): string {
  const t = new Date(`${kst.replace(" ", "T")}+09:00`).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "방금 전";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
  return kst.slice(0, 10).replaceAll("-", ".") + ".";
}

function WriteBox({
  placeholder,
  busy,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder: string;
  busy: boolean;
  onSubmit: (text: string) => Promise<boolean>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-700 dark:bg-ink-900">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_BODY))}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={3}
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-400 dark:text-white"
      />
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-ink-100 pt-2.5 dark:border-ink-800">
        <span className="text-xs tabular-nums text-ink-400">
          {text.length}/{MAX_BODY}
        </span>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-ink-400 transition-colors hover:text-ink-700 dark:hover:text-ink-200">
            취소
          </button>
        )}
        <button
          type="button"
          disabled={busy || text.trim().length === 0}
          onClick={async () => {
            if (await onSubmit(text)) setText("");
          }}
          className="rounded-md bg-ink-900 px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40 dark:bg-white dark:text-ink-900"
        >
          등록
        </button>
      </div>
    </div>
  );
}

/** 기사 하단 댓글 — 회원 작성·답글 1단·공감·본인 삭제·정렬(최신/공감). */
export function CommentSection({ articleId }: { articleId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState<"latest" | "likes">("latest");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/comments?article=${encodeURIComponent(articleId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => setData(d))
      .catch(() => setFailed(true));
  }, [articleId]);
  useEffect(load, [load]);

  const { roots, repliesOf } = useMemo(() => {
    const list = data?.comments ?? [];
    const roots = list.filter((c) => !c.parent_id);
    if (sort === "likes") roots.sort((a, b) => b.likes - a.likes || b.created_at.localeCompare(a.created_at));
    else roots.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const repliesOf = new Map<string, CommentItem[]>();
    for (const c of list) {
      if (!c.parent_id) continue;
      const arr = repliesOf.get(c.parent_id) ?? [];
      arr.push(c);
      repliesOf.set(c.parent_id, arr);
    }
    return { roots, repliesOf };
  }, [data, sort]);

  async function submit(text: string, parent: string | null): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ article: articleId, body: text, parent }),
      });
      const d = await r.json();
      if (r.ok) {
        setData(d);
        setReplyTo(null);
        setBusy(false);
        return true;
      }
      setNotice(d?.error || "등록에 실패했습니다.");
    } catch {
      setNotice("네트워크 오류입니다.");
    }
    setBusy(false);
    return false;
  }

  async function toggleLike(id: string) {
    if (!data?.me) {
      setNotice("공감하려면 로그인이 필요합니다.");
      return;
    }
    try {
      const r = await fetch("/api/comments/like", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await r.json();
      if (!r.ok) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments.map((c) => (c.id === id ? { ...c, likes: d.likes, liked: d.liked } : c)),
            }
          : prev,
      );
    } catch {
      /* noop */
    }
  }

  const [reported, setReported] = useState<Set<string>>(new Set());

  async function report(id: string) {
    if (!window.confirm("이 댓글을 신고할까요? 신고가 누적되면 자동으로 가려집니다.")) return;
    try {
      const r = await fetch("/api/comments/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await r.json();
      if (!r.ok) {
        setNotice(d?.error || "신고에 실패했습니다.");
        return;
      }
      setReported((prev) => new Set(prev).add(id));
      if (d.hidden) load();
      else setNotice("신고가 접수되었습니다.");
    } catch {
      setNotice("네트워크 오류입니다.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    try {
      const r = await fetch("/api/comments/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (r.ok) load();
    } catch {
      /* noop */
    }
  }

  function Row({ c, isReply }: { c: CommentItem; isReply?: boolean }) {
    return (
      <div className={isReply ? "" : "py-4"}>
        {c.deleted || c.hidden ? (
          <p className="text-sm italic text-ink-400">
            {c.deleted ? "삭제된 댓글입니다." : "신고 누적으로 가려진 댓글입니다."}
          </p>
        ) : (
          <>
            <p className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-ink-900 dark:text-white">{c.author}</span>
              <span className="text-xs text-ink-400">{timeAgo(c.created_at)}</span>
            </p>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink-800 dark:text-ink-100">
              {c.body}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleLike(c.id)}
                className={`rounded-full border px-2.5 py-0.5 text-xs tabular-nums transition-colors ${
                  c.liked
                    ? "border-ink-900 font-semibold text-ink-900 dark:border-white dark:text-white"
                    : "border-ink-200 text-ink-500 hover:border-ink-400 dark:border-ink-700 dark:text-ink-300"
                }`}
              >
                공감 {c.likes > 0 ? c.likes : ""}
              </button>
              {!isReply && data?.me && (
                <button
                  type="button"
                  onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                  className="text-xs text-ink-400 transition-colors hover:text-ink-700 dark:hover:text-ink-200"
                >
                  답글
                </button>
              )}
              {c.mine && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="text-xs text-ink-400 transition-colors hover:text-ink-700 dark:hover:text-ink-200"
                >
                  삭제
                </button>
              )}
              {!c.mine && data?.me && (
                <button
                  type="button"
                  onClick={() => report(c.id)}
                  disabled={reported.has(c.id)}
                  className="text-xs text-ink-400 transition-colors hover:text-ink-700 disabled:cursor-default disabled:opacity-60 dark:hover:text-ink-200"
                >
                  {reported.has(c.id) ? "신고됨" : "신고"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const count = data?.count ?? 0;

  return (
    <section className="mt-10 border-t border-ink-200 pt-8 dark:border-ink-800" aria-label="댓글">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white">
          댓글 <span className="tabular-nums text-ink-400">{count}</span>
        </h2>
        {count > 1 && (
          <div className="flex items-center gap-3 text-xs">
            {(
              [
                ["latest", "최신순"],
                ["likes", "공감순"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={
                  sort === key
                    ? "font-semibold text-ink-900 dark:text-white"
                    : "text-ink-400 transition-colors hover:text-ink-700 dark:hover:text-ink-200"
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {failed ? (
          <p className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-500 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300">
            댓글을 불러오지 못했습니다.
          </p>
        ) : data === null ? (
          <p className="py-4 text-sm text-ink-400">댓글을 불러오는 중…</p>
        ) : data.me ? (
          <WriteBox placeholder={`${data.me.name}님, 이 기사에 대한 생각을 남겨 주세요.`} busy={busy} onSubmit={(t) => submit(t, null)} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 px-4 py-6 text-center dark:border-ink-800 dark:bg-ink-900 sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-ink-500 dark:text-ink-300">댓글을 쓰려면 로그인이 필요합니다.</p>
            <Link
              href="/login"
              className="shrink-0 rounded-md bg-ink-900 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-ink-900"
            >
              로그인하기
            </Link>
          </div>
        )}
        {notice && <p className="mt-2 text-xs text-signal-600 dark:text-signal-400">{notice}</p>}
      </div>

      {data !== null && roots.length > 0 && (
        <div className="mt-2 divide-y divide-ink-100 dark:divide-ink-800">
          {roots.map((c) => {
            const replies = repliesOf.get(c.id) ?? [];
            return (
              <div key={c.id}>
                <Row c={c} />
                {(replies.length > 0 || replyTo === c.id) && (
                  <div className="mb-4 ml-4 space-y-4 border-l-2 border-ink-100 pl-4 dark:border-ink-800">
                    {replies.map((r) => (
                      <Row key={r.id} c={r} isReply />
                    ))}
                    {replyTo === c.id && (
                      <WriteBox
                        placeholder="답글을 남겨 주세요."
                        busy={busy}
                        autoFocus
                        onSubmit={(t) => submit(t, c.id)}
                        onCancel={() => setReplyTo(null)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data !== null && roots.length === 0 && !failed && (
        <p className="py-6 text-center text-sm text-ink-400">아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.</p>
      )}
    </section>
  );
}
