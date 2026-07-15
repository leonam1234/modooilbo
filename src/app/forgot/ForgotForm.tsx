"use client";

import { useState } from "react";
import Link from "next/link";

const inputCls =
  "h-12 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (r.ok && d?.ok) setSent(true);
      else setNotice(d?.error || "요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } catch {
      setNotice("네트워크 오류입니다.");
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="rounded-md border border-signal-200 bg-signal-50 px-4 py-4 text-sm leading-relaxed text-signal-700 dark:border-signal-900 dark:bg-signal-950/40 dark:text-signal-300">
          <b>{email}</b> 로 재설정 링크를 보냈습니다.
          <br />
          메일함(스팸함 포함)을 확인해 주세요. 링크는 <b>1시간</b> 동안 유효합니다.
        </p>
        <p className="mt-4 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
          메일이 오지 않는다면 — 카카오·구글·네이버로 가입한 계정일 수 있어요. 그 경우{" "}
          <Link href="/login" className="underline">
            간편 로그인
          </Link>
          을 이용해 주세요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="가입한 이메일 주소"
        autoComplete="email"
        required
        className={inputCls}
      />
      {notice && <p className="text-sm text-signal-600 dark:text-signal-400">{notice}</p>}
      <button
        type="submit"
        disabled={busy || !email.trim()}
        className="w-full rounded-md bg-signal-600 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50"
      >
        {busy ? "보내는 중…" : "재설정 링크 보내기"}
      </button>
      <p className="text-center text-sm text-ink-500 dark:text-ink-300">
        <Link href="/login" className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400">
          로그인으로 돌아가기
        </Link>
      </p>
    </form>
  );
}
