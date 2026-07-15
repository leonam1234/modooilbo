"use client";

import { useState } from "react";

const INQUIRY_TYPES = [
  "디스플레이 배너",
  "네이티브 광고",
  "뉴스레터 스폰서십",
  "브랜디드 콘텐츠",
  "콘텐츠 제휴",
  "API · 신디케이션",
  "이벤트 공동주최",
  "기타 문의",
] as const;

const BUDGET_RANGES = [
  "1,000만 원 미만",
  "1,000만 ~ 3,000만 원",
  "3,000만 ~ 5,000만 원",
  "5,000만 ~ 1억 원",
  "1억 원 이상",
  "미정 · 협의 필요",
] as const;

const labelCls = "mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200";
const fieldCls =
  "h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";
const textareaCls =
  "min-h-32 w-full rounded-md border border-ink-200 bg-white px-4 py-3 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";
const errorCls = "mt-1.5 text-xs text-signal-600 dark:text-signal-400";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdInquiryForm() {
  const [company, setCompany] = useState("");
  const [manager, setManager] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!company.trim()) next.company = "회사명을 입력해 주세요.";
    if (!manager.trim()) next.manager = "담당자를 입력해 주세요.";
    if (!email.trim()) next.email = "이메일을 입력해 주세요.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "올바른 이메일 형식이 아닙니다.";
    if (!phone.trim()) next.phone = "연락처를 입력해 주세요.";
    if (!inquiryType) next.inquiryType = "문의 유형을 선택해 주세요.";
    if (!message.trim()) next.message = "문의 내용을 입력해 주세요.";
    if (!agree) next.agree = "개인정보 수집·이용에 동의해 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-signal-200 bg-signal-50 p-8 text-center dark:border-signal-900 dark:bg-signal-950/40">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-600 text-white">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h3 className="mt-4 font-headline text-xl font-bold text-ink-900 dark:text-white">
          문의가 접수되었습니다
        </h3>
        <p className="mt-2 text-ink-600 dark:text-ink-300">
          {company ? `${company} 담당자님, ` : ""}문의해 주셔서 감사합니다. 영업일 기준 2일
          이내에 담당 매니저가 기재해 주신 연락처로 회신드리겠습니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setCompany("");
            setManager("");
            setEmail("");
            setPhone("");
            setInquiryType("");
            setBudget("");
            setMessage("");
            setAgree(false);
            setErrors({});
          }}
          className="mt-6 rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:hover:text-signal-400 dark:border-ink-600 dark:text-ink-200"
        >
          새 문의 작성
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ad-company" className={labelCls}>
            회사명 <span className="text-signal-600 dark:text-signal-400">*</span>
          </label>
          <input
            id="ad-company"
            type="text"
            required
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="(주)예시컴퍼니"
            className={fieldCls}
          />
          {errors.company && <p className={errorCls}>{errors.company}</p>}
        </div>
        <div>
          <label htmlFor="ad-manager" className={labelCls}>
            담당자 <span className="text-signal-600 dark:text-signal-400">*</span>
          </label>
          <input
            id="ad-manager"
            type="text"
            required
            autoComplete="name"
            value={manager}
            onChange={(e) => setManager(e.target.value)}
            placeholder="홍길동 / 마케팅팀"
            className={fieldCls}
          />
          {errors.manager && <p className={errorCls}>{errors.manager}</p>}
        </div>
        <div>
          <label htmlFor="ad-email" className={labelCls}>
            이메일 <span className="text-signal-600 dark:text-signal-400">*</span>
          </label>
          <input
            id="ad-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className={fieldCls}
          />
          {errors.email && <p className={errorCls}>{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="ad-phone" className={labelCls}>
            연락처 <span className="text-signal-600 dark:text-signal-400">*</span>
          </label>
          <input
            id="ad-phone"
            type="tel"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="02-1234-5678"
            className={fieldCls}
          />
          {errors.phone && <p className={errorCls}>{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="ad-type" className={labelCls}>
            문의 유형 <span className="text-signal-600 dark:text-signal-400">*</span>
          </label>
          <select
            id="ad-type"
            required
            value={inquiryType}
            onChange={(e) => setInquiryType(e.target.value)}
            className={fieldCls}
          >
            <option value="" disabled>
              문의 유형을 선택하세요
            </option>
            {INQUIRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.inquiryType && <p className={errorCls}>{errors.inquiryType}</p>}
        </div>
        <div>
          <label htmlFor="ad-budget" className={labelCls}>
            예상 예산
          </label>
          <select
            id="ad-budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className={fieldCls}
          >
            <option value="" disabled>
              예상 예산을 선택하세요
            </option>
            {BUDGET_RANGES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="ad-message" className={labelCls}>
          문의 내용 <span className="text-signal-600 dark:text-signal-400">*</span>
        </label>
        <textarea
          id="ad-message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="캠페인 목표, 희망 집행 시기, 타깃 등을 자유롭게 적어 주시면 맞춤 제안서를 준비해 드립니다."
          className={textareaCls}
        />
        {errors.message && <p className={errorCls}>{errors.message}</p>}
      </div>

      <div className="mt-6">
        <label className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input
            type="checkbox"
            required
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-signal-600 focus:ring-signal-500 dark:border-ink-600"
          />
          <span>
            개인정보 수집·이용에 동의합니다. 제출하신 정보는 문의 응대 목적으로만 활용됩니다.{" "}
            <span className="text-signal-600 dark:text-signal-400">*</span>
          </span>
        </label>
        {errors.agree && <p className={errorCls}>{errors.agree}</p>}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={!agree}
          className="rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50"
        >
          문의 보내기
        </button>
        <p className="text-xs text-ink-500 dark:text-ink-400">
          문의는 이메일 help@modooilbo.com 으로 보내주세요.
        </p>
      </div>
    </form>
  );
}
