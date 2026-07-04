"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CommentItem, type CommentData } from "@/components/CommentItem";

type Data = { count: number; comments: CommentData[]; me: { name: string } | null };

const MAX_BODY = 500;

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
    <div className="glass-card rounded-xl border border-ink-200 p-3 dark:border-ink-700">
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
      .then((d: Data) => {
        setFailed(false);
        setData(d);
      })
      .catch(() => setFailed(true));
  }, [articleId]);
  useEffect(load, [load]);

  const { roots, repliesOf, bestIds } = useMemo(() => {
    const list: CommentData[] = data?.comments ?? [];
    const all = list.filter((c) => !c.parent_id);

    // 베스트 댓글(네이버식): 공감 2개 이상 중 상위 3개를 상단 고정
    const best = all
      .filter((c) => !c.deleted && !c.hidden && c.likes >= 2)
      .sort((a, b) => b.likes - a.likes || b.created_at.localeCompare(a.created_at))
      .slice(0, 3);
    const bestIds = new Set(best.map((c) => c.id));

    const rest = all.filter((c) => !bestIds.has(c.id));
    if (sort === "likes") rest.sort((a, b) => b.likes - a.likes || b.created_at.localeCompare(a.created_at));
    else rest.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const repliesOf = new Map<string, CommentData[]>();
    for (const c of list) {
      if (!c.parent_id) continue;
      const arr = repliesOf.get(c.parent_id) ?? [];
      arr.push(c);
      repliesOf.set(c.parent_id, arr);
    }
    return { roots: [...best, ...rest], repliesOf, bestIds };
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

  // 공통 props로 CommentItem을 렌더 — 마크업은 기존과 동일
  function renderComment(c: CommentData, isReply?: boolean) {
    return (
      <CommentItem
        comment={c}
        isReply={isReply}
        isBest={bestIds.has(c.id)}
        canReply={!!data?.me}
        canReport={!!data?.me}
        reported={reported.has(c.id)}
        onToggleLike={() => toggleLike(c.id)}
        onToggleReply={() => setReplyTo(replyTo === c.id ? null : c.id)}
        onRemove={() => remove(c.id)}
        onReport={() => report(c.id)}
      />
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
          <div className="flex flex-col items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 p-4 text-center dark:border-ink-800 dark:bg-ink-900 sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-ink-500 dark:text-ink-300">댓글을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                load();
              }}
              className="shrink-0 rounded-md border border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200"
            >
              다시 시도
            </button>
          </div>
        ) : data === null ? (
          <div className="space-y-3 py-4" role="status" aria-label="댓글을 불러오는 중">
            <div className="h-4 w-1/4 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
            <div className="h-4 w-full animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
          </div>
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
                {renderComment(c)}
                {(replies.length > 0 || replyTo === c.id) && (
                  <div className="mb-4 ml-4 space-y-4 border-l-2 border-ink-100 pl-4 dark:border-ink-800">
                    {replies.map((r) => (
                      <div key={r.id}>{renderComment(r, true)}</div>
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
