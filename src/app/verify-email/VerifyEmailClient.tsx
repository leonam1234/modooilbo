"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type State = { phase: "loading" } | { phase: "done"; email: string } | { phase: "error"; msg: string };

/** 인증 메일 링크 착지 페이지 — ?token= 을 검증 API로 보내고 결과 표시. */
export function VerifyEmailClient() {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setState({ phase: "error", msg: "링크가 올바르지 않습니다. 메일의 버튼을 다시 눌러 주세요." });
      return;
    }
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const j: any = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok && j?.ok) setState({ phase: "done", email: String(j.email || "") });
        else setState({ phase: "error", msg: String(j?.error || "인증에 실패했습니다. 잠시 후 다시 시도해 주세요.") });
      } catch {
        if (alive) setState({ phase: "error", msg: "네트워크 오류입니다. 잠시 후 다시 시도해 주세요." });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state.phase === "loading") return <p className="text-center text-sm text-ink-400">인증 확인 중…</p>;

  if (state.phase === "done")
    return (
      <div className="text-center">
        <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">
          <b className="break-all">{state.email}</b> 등록이 완료되었습니다.
          <br />
          이제 계정 페이지에서 비밀번호를 설정하면 이메일로도 로그인할 수 있습니다.
        </p>
        <Link
          prefetch={false}
          href="/account/"
          className="mt-6 inline-block rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700"
        >
          계정 페이지로 가기
        </Link>
      </div>
    );

  return (
    <div className="text-center">
      <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">{state.msg}</p>
      <Link
        prefetch={false}
        href="/account/"
        className="mt-6 inline-block rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200"
      >
        계정 페이지로 가기
      </Link>
    </div>
  );
}
