"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PlainEmail, PUBLIC_EMAILS } from "@/components/PlainEmail";

const CATEGORIES = [
  "정치·행정",
  "경제·기업",
  "사회·사건",
  "노동·인권",
  "환경·안전",
  "교육·문화",
  "기타",
] as const;

const label = "mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200";
const field =
  "w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";

/**
 * ⚠️ 접수번호는 **서버가 발급한다**(2026-08-11). 종전에는 이 파일에서 만들었는데,
 *    그 번호에 대응하는 DB 행이 없어서 "접수번호를 보관하시면 진행 상황을 문의하실 수
 *    있습니다"가 지켜질 수 없는 안내였다. 이제 /api/inquiry 가 D1 inquiries 에 저장한
 *    뒤 그 행의 receipt_no 를 돌려준다.
 */

export function TipForm() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [agree, setAgree] = useState(false);
  const [fileName, setFileName] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !category || !content.trim() || !agree) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "tip",
          category,
          title,
          body: content,
          // 익명 제보를 선택하면 연락처를 서버로 보내지 않는다 — 안 받는 것이 가장 확실한 보호다.
          phone: anonymous ? "" : contact,
          attachmentName: fileName,
          agree,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { receiptNo?: string; error?: string };
      if (!res.ok || !data.receiptNo) {
        setError(data.error || "접수에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setSubmitted(data.receiptNo);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("네트워크 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setTitle("");
    setCategory("");
    setContent("");
    setContact("");
    setAnonymous(false);
    setAgree(false);
    setFileName("");
    setSubmitted(null);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-signal-200 bg-white p-8 text-center dark:border-signal-900 dark:bg-ink-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-signal-50 dark:bg-signal-950/40">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="h-7 w-7 text-signal-600 dark:text-signal-400"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h3 className="mt-4 font-headline text-xl font-bold text-ink-900 dark:text-white">
          제보가 정상적으로 접수되었습니다
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
          소중한 제보에 감사드립니다. 담당 데스크가 24시간 이내에 내용을 검토합니다.
          {anonymous
            ? " 익명 제보로 접수되어 별도의 회신은 드리지 않습니다."
            : " 추가 확인이 필요하면 입력하신 연락처로 안전하게 연락드립니다."}
        </p>
        <div className="mt-5 inline-block rounded-lg border border-ink-200 bg-ink-50 px-5 py-3 dark:border-ink-700 dark:bg-ink-800">
          <p className="text-xs text-ink-500 dark:text-ink-400">접수번호</p>
          <p className="mt-0.5 font-headline text-lg font-bold tracking-wide text-ink-900 dark:text-white">
            {submitted}
          </p>
        </div>
        <p className="mt-4 text-xs text-ink-500 dark:text-ink-400">
          접수번호를 보관하시면 이후 진행 상황을 문의하실 때 사용할 수 있습니다.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:hover:text-signal-400 dark:border-ink-600 dark:text-ink-200"
          >
            새 제보 작성하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8"
    >
      <div>
        <label htmlFor="tip-title" className={label}>
          제목 <span className="text-signal-600 dark:text-signal-400">*</span>
        </label>
        <input
          id="tip-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제보 내용을 한 줄로 요약해 주세요"
          className={cn(field, "h-11")}
        />
      </div>

      <div>
        <label htmlFor="tip-category" className={label}>
          분류 <span className="text-signal-600 dark:text-signal-400">*</span>
        </label>
        <select
          id="tip-category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={cn(field, "h-11", category === "" && "text-ink-500 dark:text-ink-400")}
        >
          <option value="" disabled>
            분류를 선택하세요
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="text-ink-900">
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="tip-content" className={label}>
          내용 <span className="text-signal-600 dark:text-signal-400">*</span>
        </label>
        <textarea
          id="tip-content"
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="언제, 어디서, 무슨 일이 있었는지 구체적으로 적어 주세요. 관련 인물·기관, 시점, 정황 등 자세할수록 취재에 큰 도움이 됩니다."
          className={cn(field, "min-h-48 py-3 leading-relaxed")}
        />
      </div>

      <div>
        <label htmlFor="tip-file" className={label}>
          증거 자료 첨부 <span className="font-normal text-ink-500 dark:text-ink-400">(선택)</span>
        </label>
        <input
          id="tip-file"
          type="file"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="block w-full text-sm text-ink-500 file:mr-4 file:rounded-md file:border-0 file:bg-signal-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-signal-600 hover:file:bg-signal-100 dark:text-ink-300 dark:file:bg-signal-950/40 dark:file:text-signal-400"
        />
        <p className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">
          {/* 파일 자체는 받지 않는다 — 업로드 저장소·바이러스 검사 없이 첨부를 수신하면 안 된다.
              파일명만 접수에 남겨, 데스크가 회신할 때 무엇을 받아야 하는지 알 수 있게 한다. */}
          {fileName
            ? `선택된 파일: ${fileName} · 파일명만 접수됩니다. 파일 자체는 데스크 회신 후 보내주세요.`
            : "첨부할 자료가 있으면 파일을 선택해 파일명만 알려주세요. 파일 자체는 전송되지 않으며, 데스크 회신 후 받습니다."}
        </p>
      </div>

      <div>
        <label htmlFor="tip-contact" className={label}>
          연락처 <span className="font-normal text-ink-500 dark:text-ink-400">(선택)</span>
        </label>
        <input
          id="tip-contact"
          type="text"
          value={contact}
          disabled={anonymous}
          onChange={(e) => setContact(e.target.value)}
          placeholder={anonymous ? "익명 제보 시 연락처를 받지 않습니다" : "이메일 또는 전화번호"}
          className={cn(field, "h-11 disabled:cursor-not-allowed disabled:opacity-50")}
        />
      </div>

      <div className="space-y-3 border-t border-ink-200 pt-5 dark:border-ink-800">
        <label htmlFor="tip-anon" className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input
            id="tip-anon"
            type="checkbox"
            checked={anonymous}
            onChange={(e) => {
              setAnonymous(e.target.checked);
              if (e.target.checked) setContact("");
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-signal-600 focus:ring-signal-500 dark:border-ink-600"
          />
          <span>
            <strong className="font-semibold text-ink-700 dark:text-ink-200">익명으로 제보</strong>
            하겠습니다. 연락처를 남기지 않으며, 모두일보는 제보자의 신원을 특정하지 않습니다.
          </span>
        </label>

        <label htmlFor="tip-agree" className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input
            id="tip-agree"
            type="checkbox"
            required
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-signal-600 focus:ring-signal-500 dark:border-ink-600"
          />
          <span>
            제보 내용 검토·취재 목적의 <strong className="font-semibold text-ink-700 dark:text-ink-200">개인정보 수집 및 이용</strong>에
            동의합니다. <span className="text-signal-600 dark:text-signal-400">*</span>
          </span>
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !title.trim() || !category || !content.trim() || !agree}
        className="w-full rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {busy ? "접수 중…" : "제보 접수하기"}
      </button>

      <p className="text-xs text-ink-500 dark:text-ink-400">
        접수 내용은 담당 데스크만 열람합니다. 긴급한 제보는 <PlainEmail address={PUBLIC_EMAILS.tips} /> 으로도 보내실 수 있습니다.
      </p>
    </form>
  );
}
