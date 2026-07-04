"use client";

import { Card, type User } from "./AccountCard";

/** 계정 정보 카드 — 닉네임 변경·이메일 표시. 상태는 AccountClient가 소유. */
export function ProfileCard({
  user,
  editingName,
  nameInput,
  nameMsg,
  busy,
  onEditStart,
  onCancel,
  onNameInput,
  onSave,
}: {
  user: User;
  editingName: boolean;
  nameInput: string;
  nameMsg: string | null;
  busy: boolean;
  onEditStart: () => void;
  onCancel: () => void;
  onNameInput: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <Card title="계정 정보">
      <dl className="space-y-4 text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-ink-100 pb-4 dark:border-ink-800">
          <dt className="shrink-0 font-medium text-ink-500 dark:text-ink-400">닉네임</dt>
          <dd className="flex min-w-0 items-center gap-2">
            {editingName ? (
              <>
                <input
                  value={nameInput}
                  onChange={(e) => onNameInput(e.target.value)}
                  maxLength={20}
                  className="h-9 w-40 rounded-md border border-ink-200 bg-white px-3 text-right text-ink-900 outline-none focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
                />
                <button type="button" onClick={onSave} disabled={busy} className="shrink-0 rounded-md bg-signal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-signal-700 disabled:opacity-50">
                  저장
                </button>
                <button type="button" onClick={onCancel} className="shrink-0 text-xs text-ink-400 hover:text-ink-700">
                  취소
                </button>
              </>
            ) : (
              <>
                <span className="font-semibold text-ink-900 dark:text-white">{user.name}</span>
                <button type="button" onClick={onEditStart} className="shrink-0 text-xs font-medium text-signal-600 hover:text-signal-700">
                  변경
                </button>
              </>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="shrink-0 font-medium text-ink-500 dark:text-ink-400">이메일</dt>
          <dd className="break-all font-semibold text-ink-900 dark:text-white">{user.email}</dd>
        </div>
      </dl>
      {nameMsg && <p className="mt-3 text-xs text-signal-600 dark:text-signal-400">{nameMsg}</p>}
    </Card>
  );
}
