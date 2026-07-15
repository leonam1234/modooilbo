"use client";

import { timeAgo } from "@/lib/timeago";

export type CommentData = {
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

/** 댓글 1개 렌더 — 본문·공감·답글·삭제·신고 버튼. */
export function CommentItem({
  comment: c,
  isReply,
  isBest,
  canReply,
  canReport,
  reported,
  onToggleLike,
  onToggleReply,
  onRemove,
  onReport,
}: {
  comment: CommentData;
  isReply?: boolean;
  isBest: boolean;
  /** 로그인 상태에서 루트 댓글에만 답글 버튼 노출 */
  canReply: boolean;
  /** 로그인 상태 + 내 댓글이 아닐 때만 신고 버튼 노출 */
  canReport: boolean;
  reported: boolean;
  onToggleLike: () => void;
  onToggleReply: () => void;
  onRemove: () => void;
  onReport: () => void;
}) {
  return (
    <div className={isReply ? "" : "py-4"}>
      {c.deleted || c.hidden ? (
        <p className="text-sm italic text-ink-500 dark:text-ink-400">
          {c.deleted ? "삭제된 댓글입니다." : "신고 누적으로 가려진 댓글입니다."}
        </p>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            {isBest && (
              <span className="shrink-0 rounded border border-ink-900 px-1 text-[10px] font-black leading-4 text-ink-900 dark:border-white dark:text-white">
                BEST
              </span>
            )}
            <span className="text-sm font-semibold text-ink-900 dark:text-white">{c.author}</span>
            <span className="text-xs text-ink-500 dark:text-ink-400">{timeAgo(c.created_at)}</span>
          </p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink-800 dark:text-ink-100">
            {c.body}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleLike}
              className={`rounded-full border px-2.5 py-0.5 text-xs tabular-nums transition-colors ${
                c.liked
                  ? "border-ink-900 font-semibold text-ink-900 dark:border-white dark:text-white"
                  : "border-ink-200 text-ink-500 hover:border-ink-400 dark:border-ink-700 dark:text-ink-300"
              }`}
            >
              공감 {c.likes > 0 ? c.likes : ""}
            </button>
            {!isReply && canReply && (
              <button
                type="button"
                onClick={onToggleReply}
                className="text-xs text-ink-500 dark:text-ink-400 transition-colors hover:text-ink-700 dark:hover:text-ink-200"
              >
                답글
              </button>
            )}
            {c.mine && (
              <button
                type="button"
                onClick={onRemove}
                className="text-xs text-ink-500 dark:text-ink-400 transition-colors hover:text-ink-700 dark:hover:text-ink-200"
              >
                삭제
              </button>
            )}
            {!c.mine && canReport && (
              <button
                type="button"
                onClick={onReport}
                disabled={reported}
                className="text-xs text-ink-500 dark:text-ink-400 transition-colors hover:text-ink-700 disabled:cursor-default disabled:opacity-60 dark:hover:text-ink-200"
              >
                {reported ? "신고됨" : "신고"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
