"use client";

import { Card, isSyntheticEmail, type User } from "./AccountCard";

/** 계정 정보 카드 — 닉네임 변경·이메일 표시(간편가입은 이메일 등록 폼). 상태는 AccountClient가 소유. */
export function ProfileCard({
  user,
  editingName,
  nameInput,
  nameMsg,
  busy,
  emailInput,
  emailMsg,
  onEditStart,
  onCancel,
  onNameInput,
  onSave,
  onEmailInput,
  onSendVerify,
}: {
  user: User;
  editingName: boolean;
  nameInput: string;
  nameMsg: string | null;
  busy: boolean;
  emailInput: string;
  emailMsg: string | null;
  onEditStart: () => void;
  onCancel: () => void;
  onNameInput: (v: string) => void;
  onSave: () => void;
  onEmailInput: (v: string) => void;
  onSendVerify: () => void;
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
                <button type="button" onClick={onCancel} className="shrink-0 text-xs text-ink-500 dark:text-ink-400 hover:text-ink-700">
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
          {isSyntheticEmail(user.email) ? (
            <dd className="text-ink-500 dark:text-ink-400">등록된 이메일 없음 · 간편가입 계정</dd>
          ) : (
            <dd className="break-all font-semibold text-ink-900 dark:text-white">{user.email}</dd>
          )}
        </div>
        {isSyntheticEmail(user.email) && (
          <div className="rounded-lg border border-ink-100 p-3.5 dark:border-ink-800">
            <p className="text-xs leading-relaxed text-ink-500 dark:text-ink-300">
              이메일을 등록하면 인증 후 이메일 로그인·비밀번호 재설정을 쓸 수 있습니다.
            </p>
            <div className="mt-2.5 flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => onEmailInput(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="h-9 min-w-0 flex-1 rounded-md border border-ink-200 bg-white px-3 text-ink-900 outline-none focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
              <button
                type="button"
                onClick={onSendVerify}
                disabled={busy || !emailInput.includes("@")}
                className="shrink-0 rounded-md bg-signal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-signal-700 disabled:opacity-50"
              >
                인증 메일 발송
              </button>
            </div>
            {emailMsg && <p className="mt-2 text-xs text-signal-600 dark:text-signal-400">{emailMsg}</p>}
          </div>
        )}
      </dl>
      {nameMsg && <p className="mt-3 text-xs text-signal-600 dark:text-signal-400">{nameMsg}</p>}
    </Card>
  );
}
