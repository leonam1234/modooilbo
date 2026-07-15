"use client";

import Link from "next/link";
import { useState } from "react";

type State =
  | { phase: "ready" }
  | { phase: "busy" }
  | { phase: "done"; name: string; email: string }
  | { phase: "error"; msg: string };

/**
 * 가입 확인 메일 링크 착지 페이지 — 사용자가 버튼을 눌러야 계정이 확정된다.
 *
 * ⚠️ **자동 전송하지 않는다**(이메일 등록 인증 /verify-email과 의도적으로 다르다). 왜:
 *   1) 메일 보안 스캐너·프리페처가 링크를 미리 긁는다. 페이지 로드만으로 POST를 보내면
 *      사람이 누르지 않아도 계정이 만들어진다(3차에서 고친 'GET 수신거부' 사고와 같은 계열).
 *   2) 이 설계에 남는 유일한 선점 경로가 "요청하지 않은 확인 링크를 무심코 누르는 것"이다.
 *      무엇을 확정하는지 읽고 누르게 해야 그 경로가 줄어든다. 아래 경고 문구를 지우지 말 것.
 */
export function VerifySignupClient() {
  const [state, setState] = useState<State>({ phase: "ready" });

  async function confirm() {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setState({ phase: "error", msg: "링크가 올바르지 않습니다. 메일의 버튼을 다시 눌러 주세요." });
      return;
    }
    setState({ phase: "busy" });
    try {
      const r = await fetch("/api/auth/verify-signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j: any = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) {
        setState({ phase: "done", name: String(j?.user?.name || ""), email: String(j?.user?.email || "") });
      } else {
        setState({
          phase: "error",
          msg: String(j?.error || "가입 확인에 실패했습니다. 잠시 후 다시 시도해 주세요."),
        });
      }
    } catch {
      setState({ phase: "error", msg: "네트워크 오류입니다. 잠시 후 다시 시도해 주세요." });
    }
  }

  if (state.phase === "done")
    return (
      <div className="space-y-5 text-center">
        <div
          role="status"
          className="rounded-md border border-signal-200 bg-signal-50 px-4 py-5 text-sm text-signal-700 dark:border-signal-900 dark:bg-signal-950/40 dark:text-signal-300"
        >
          <p className="font-headline text-lg font-bold text-ink-900 dark:text-white">가입이 완료되었습니다</p>
          <p className="mt-2">
            {state.name ? `${state.name}님, ` : ""}환영합니다. 바로 로그인되었습니다.
          </p>
          <p className="mt-1 break-all text-ink-500 dark:text-ink-400">{state.email}</p>
        </div>
        <Link
          prefetch={false}
          href="/"
          className="inline-block w-full rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700"
        >
          홈으로 가기
        </Link>
      </div>
    );

  if (state.phase === "error")
    return (
      <div className="text-center">
        <p role="alert" className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">
          {state.msg}
        </p>
        <Link
          prefetch={false}
          href="/register/"
          className="mt-6 inline-block rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200 dark:hover:text-signal-400"
        >
          회원가입 다시 하기
        </Link>
      </div>
    );

  return (
    <div className="space-y-5 text-center">
      <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">
        아래 버튼을 누르면 모두일보 회원가입이 완료됩니다.
      </p>
      <p className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">
        본인이 요청한 가입이 아니라면 <b className="text-ink-900 dark:text-white">이 창을 그냥 닫아 주세요.</b>
        <br />
        누르지 않으면 계정은 만들어지지 않습니다.
      </p>
      <button
        type="button"
        onClick={confirm}
        disabled={state.phase === "busy"}
        className="w-full rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50"
      >
        {state.phase === "busy" ? "확인 중…" : "가입 완료하기"}
      </button>
    </div>
  );
}
