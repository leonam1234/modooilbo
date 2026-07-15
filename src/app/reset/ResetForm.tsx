"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const inputCls =
  "h-12 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";

export function ResetForm() {
  const [token, setToken] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (pw !== pw2) {
      setNotice("비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      const d = await r.json();
      if (r.ok && d?.ok) {
        setDone(true);
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        setNotice(d?.error || "재설정에 실패했습니다.");
      }
    } catch {
      setNotice("네트워크 오류입니다.");
    }
    setBusy(false);
  }

  if (token === null) return <p className="py-6 text-center text-sm text-ink-500 dark:text-ink-400">확인 중…</p>;

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm leading-relaxed text-ink-500 dark:text-ink-300">
          재설정 링크가 올바르지 않습니다.
          <br />
          메일의 링크를 다시 확인하거나, 재설정을 다시 요청해 주세요.
        </p>
        <Link
          href="/forgot"
          className="mt-5 inline-block rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700"
        >
          재설정 다시 요청하기
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <p className="rounded-md border border-signal-200 bg-signal-50 px-4 py-4 text-center text-sm leading-relaxed text-signal-700 dark:border-signal-900 dark:bg-signal-950/40 dark:text-signal-300">
        비밀번호가 변경되었습니다. 로그인된 상태로 홈으로 이동합니다…
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="새 비밀번호 (8자 이상)"
        autoComplete="new-password"
        required
        minLength={8}
        className={inputCls}
      />
      <input
        type="password"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        placeholder="새 비밀번호 확인"
        autoComplete="new-password"
        required
        className={inputCls}
      />
      {notice && <p className="text-sm text-signal-600 dark:text-signal-400">{notice}</p>}
      <button
        type="submit"
        disabled={busy || pw.length < 8}
        className="w-full rounded-md bg-signal-600 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50"
      >
        {busy ? "변경 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}
