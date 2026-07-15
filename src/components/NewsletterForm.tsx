"use client";

import { useState } from "react";

/**
 * 뉴스레터 구독 폼 — 골드 CTA 안에서 사용.
 * ⚠️ double opt-in(2026-07-15): 이 폼 제출은 **확인 메일 발송**까지다. 메일의 확인 링크를
 * 눌러야 실제 구독(newsletter_subs)이 된다 → 남의 주소를 무단 등록할 수 없다.
 * 그래서 완료 문구도 '구독 완료'가 아니라 '확인 메일을 보냈습니다'여야 한다.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (r.ok && d?.ok) {
        setState("done");
      } else {
        setMsg(d?.error || "구독에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        setState("error");
      }
    } catch {
      setMsg("네트워크 오류입니다.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="mx-auto mt-6 max-w-md rounded-lg border border-[#d4af37]/40 bg-white/10 px-4 py-3.5 font-medium text-[#d4af37]">
        확인 메일을 보냈습니다. 메일의 링크를 눌러 구독을 완료해 주세요.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="이메일 주소"
        placeholder="이메일 주소"
        className="h-12 flex-1 rounded-lg border border-[#d4af37]/40 bg-white/10 px-4 text-white outline-none placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-[#d4af37]"
      />
      <button
        type="submit"
        disabled={state === "busy"}
        className="h-12 shrink-0 rounded-lg bg-[#d4af37] px-6 font-bold text-ink-900 transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {state === "busy" ? "등록 중…" : "무료 구독"}
      </button>
      {state === "error" && <p role="alert" className="text-xs text-[#d4af37] sm:col-span-2">{msg}</p>}
    </form>
  );
}
