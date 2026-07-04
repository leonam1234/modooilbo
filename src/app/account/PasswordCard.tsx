"use client";

import { Card, inputCls } from "./AccountCard";

/** 비밀번호 변경·설정 카드. 상태는 AccountClient가 소유. */
export function PasswordCard({
  hasPassword,
  hasRealEmail,
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
  hasRealEmail: boolean;
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
  // 간편가입(실제 이메일 없음) + 비밀번호 미설정 → 이메일 로그인 자체가 불가능하므로
  // 비밀번호 설정 폼 대신 상태 안내만 보여준다 (이메일 등록·인증 기능 도입 시 폼 오픈).
  if (!hasPassword && !hasRealEmail) {
    return (
      <Card title="비밀번호 설정">
        <p className="text-sm leading-relaxed text-ink-500 dark:text-ink-300">
          간편 로그인 전용 계정입니다. 아직 등록된 이메일이 없어 이메일·비밀번호 로그인은 사용할 수
          없습니다. 위 계정 정보에서 이메일을 등록(인증)하면 이곳이 열립니다.
        </p>
      </Card>
    );
  }

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
