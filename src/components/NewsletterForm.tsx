"use client";

import { useState } from "react";

/** 뉴스레터 구독 폼 — 골드 CTA 안에서 사용. 실제로 D1에 저장된다. */
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
        구독 완료! 매주 월요일 아침, 지난주 가장 많이 읽힌 뉴스를 보내드립니다.
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
