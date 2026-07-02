"use client";

import { useState } from "react";

type Inquiry = "subscription" | "ad" | "tip" | "etc";

const TYPES: { value: Inquiry; label: string }[] = [
  { value: "subscription", label: "구독" },
  { value: "ad", label: "광고" },
  { value: "tip", label: "제보" },
  { value: "etc", label: "기타" },
];

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<Inquiry>("subscription");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  function handleReset() {
    setName("");
    setEmail("");
    setType("subscription");
    setSubject("");
    setMessage("");
    setSubmitted(false);
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
        <button
          type="button"
          onClick={handleReset}
          className="mt-6 rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200"
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
            className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
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
            className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
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
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
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
          className="min-h-32 w-full rounded-md border border-ink-200 bg-white px-4 py-3 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-400">
          문의는 이메일 help@modooilbo.com 으로 보내주세요.
        </p>
        <button
          type="submit"
          className="rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50"
        >
          문의 보내기
        </button>
      </div>
    </form>
  );
}
