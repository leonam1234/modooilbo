"use client";

import { Card, inputCls } from "./AccountCard";

/** 비밀번호 변경·설정 카드. 상태는 AccountClient가 소유. */
export function PasswordCard({
  hasPassword,
  curPw,
  newPw,
  newPw2,
  pwMsg,
  busy,
  onCurPw,
  onNewPw,
  onNewPw2,
  onSubmit,
}: {
  hasPassword: boolean;
  curPw: string;
  newPw: string;
  newPw2: string;
  pwMsg: string | null;
  busy: boolean;
  onCurPw: (v: string) => void;
  onNewPw: (v: string) => void;
  onNewPw2: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Card title={hasPassword ? "비밀번호 변경" : "비밀번호 설정"}>
      {!hasPassword && (
        <p className="mb-4 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
          간편 로그인으로 가입한 계정입니다. 비밀번호를 설정하면 이메일로도 로그인할 수 있습니다.
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-3">
        {hasPassword && (
          <input type="password" value={curPw} onChange={(e) => onCurPw(e.target.value)} placeholder="현재 비밀번호" autoComplete="current-password" className={inputCls} />
        )}
        <input type="password" value={newPw} onChange={(e) => onNewPw(e.target.value)} placeholder="새 비밀번호 (8자 이상)" autoComplete="new-password" className={inputCls} />
        <input type="password" value={newPw2} onChange={(e) => onNewPw2(e.target.value)} placeholder="새 비밀번호 확인" autoComplete="new-password" className={inputCls} />
        {pwMsg && <p className="text-xs text-signal-600 dark:text-signal-400">{pwMsg}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50">
          {hasPassword ? "비밀번호 변경" : "비밀번호 설정"}
        </button>
      </form>
    </Card>
  );
}
