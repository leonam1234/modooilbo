"use client";

import { useState } from "react";
import { PlainEmail, PUBLIC_EMAILS } from "@/components/PlainEmail";

type Inquiry = "subscription" | "ad" | "tip" | "etc";

const TYPES: { value: Inquiry; label: string }[] = [
  { value: "subscription", label: "구독" },
  { value: "ad", label: "광고" },
  { value: "tip", label: "제보" },
  { value: "etc", label: "기타" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errorCls = "mt-1.5 text-xs text-signal-600 dark:text-signal-400";

/** 접수 메일·DB에 사람이 읽을 수 있는 유형명으로 남기기 위한 표. TYPES 와 같은 값을 쓴다. */
const INQUIRY_LABEL: Record<Inquiry, string> = {
  subscription: "구독",
  ad: "광고",
  tip: "제보",
  etc: "기타",
};

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<Inquiry>("subscription");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [receiptNo, setReceiptNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "이름을 입력해 주세요.";
    if (!email.trim()) next.email = "이메일을 입력해 주세요.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "올바른 이메일 형식이 아닙니다.";
    if (!subject.trim()) next.subject = "제목을 입력해 주세요.";
    if (!message.trim()) next.message = "문의 내용을 입력해 주세요.";
    // ⚠️ 2026-08-11 신설. 종전에는 이 폼이 아무 데도 전송하지 않아 동의 절차가 없었는데,
    //    이제 이름·이메일을 D1 에 저장하므로 수집 동의를 받아야 한다(개인정보 보호법).
    if (!agree) next.agree = "개인정보 수집·이용에 동의해 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setSendError("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "contact",
          category: INQUIRY_LABEL[type] ?? type,
          title: subject,
          body: message,
          name,
          email,
          agree,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { receiptNo?: string; error?: string };
      if (!res.ok || !data.receiptNo) {
        setSendError(data.error || "접수에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setReceiptNo(data.receiptNo);
      setSubmitted(true);
    } catch {
      setSendError("네트워크 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setName("");
    setEmail("");
    setType("subscription");
    setSubject("");
    setMessage("");
    setAgree(false);
    setErrors({});
    setSubmitted(false);
    setReceiptNo("");
    setSendError("");
  }

  if (submitted) {
    const typeLabel = TYPES.find((t) => t.value === type)?.label ?? "기타";
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-signal-200 bg-signal-50 p-8 text-center dark:border-signal-900 dark:bg-signal-950/40"
      >
        <h3 className="font-headline text-xl font-extrabold text-ink-900 dark:text-white">
          문의가 접수되었습니다
        </h3>
        <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
          {name ? `${name}님, ` : ""}소중한 의견 감사합니다. ‘{typeLabel}’ 문의는 담당 부서에서
          확인 후 입력하신 이메일로 답변드리겠습니다.
        </p>
        {receiptNo && (
          <div className="mt-5 inline-block rounded-lg border border-ink-200 bg-white px-5 py-3 dark:border-ink-700 dark:bg-ink-900">
            <p className="text-xs text-ink-500 dark:text-ink-400">접수번호</p>
            <p className="font-mono text-lg font-bold text-ink-900 dark:text-white">{receiptNo}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleReset}
          className="mt-6 rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:hover:text-signal-400 dark:border-ink-600 dark:text-ink-200"
        >
          새 문의 작성
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-name"
            className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
          >
            이름
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            autoComplete="name"
            className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
          {errors.name && <p className={errorCls}>{errors.name}</p>}
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
          >
            이메일
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
          {errors.email && <p className={errorCls}>{errors.email}</p>}
        </div>
      </div>

      <div className="mt-5">
        <label
          htmlFor="contact-type"
          className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          문의 유형
        </label>
        <select
          id="contact-type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as Inquiry)}
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label
          htmlFor="contact-subject"
          className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          제목
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="문의 제목을 입력하세요"
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
        {errors.subject && <p className={errorCls}>{errors.subject}</p>}
      </div>

      <div className="mt-5">
        <label
          htmlFor="contact-message"
          className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          내용
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="문의 내용을 자세히 적어주세요."
          className="min-h-32 w-full rounded-md border border-ink-200 bg-white px-4 py-3 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
        {errors.message && <p className={errorCls}>{errors.message}</p>}
      </div>

      <div className="mt-6">
        <label className="flex items-start gap-2.5 text-sm text-ink-700 dark:text-ink-200">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-signal-600"
          />
          <span>
            문의 처리를 위해 이름·이메일·문의 내용을 수집·이용하는 데 동의합니다. 보유 기간은 처리 완료 후 3년입니다(
            <a href="/privacy/" className="underline">개인정보처리방침</a>).
          </span>
        </label>
        {errors.agree && <p className={errorCls}>{errors.agree}</p>}
      </div>

      {sendError && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {sendError}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-500 dark:text-ink-400">
          이메일 <PlainEmail address={PUBLIC_EMAILS.help} /> 으로도 보내실 수 있습니다.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "보내는 중…" : "문의 보내기"}
        </button>
      </div>
    </form>
  );
}
