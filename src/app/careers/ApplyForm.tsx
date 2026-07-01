"use client";

import { useState } from "react";

/** 채용 공고와 동일한 직무 목록 (page.tsx의 POSITIONS와 일치) */
const FIELD_OPTIONS = [
  "정치부 기자",
  "경제부 기자",
  "디지털 뉴스 PD",
  "데이터 저널리스트",
  "프론트엔드 개발자",
  "그로스 마케터",
] as const;

const labelCls = "mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200";
const fieldCls =
  "h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";
const textareaCls =
  "min-h-32 w-full rounded-md border border-ink-200 bg-white px-4 py-3 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";

export function ApplyForm({ defaultField }: { defaultField?: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [field, setField] = useState(defaultField ?? "");
  const [portfolio, setPortfolio] = useState("");
  const [intro, setIntro] = useState("");
  const [fileName, setFileName] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
          지원이 접수되었습니다
        </h3>
        <p className="mt-2 text-ink-600 dark:text-ink-300">
          {name ? `${name} 님, ` : ""}소중한 지원에 감사드립니다. 서류 검토 후 기재해 주신
          연락처로 결과를 안내해 드리겠습니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setName("");
            setPhone("");
            setEmail("");
            setField(defaultField ?? "");
            setPortfolio("");
            setIntro("");
            setFileName("");
            setAgree(false);
          }}
          className="mt-6 rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200"
        >
          새 지원서 작성
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
          <label htmlFor="apply-name" className={labelCls}>
            이름 <span className="text-signal-600">*</span>
          </label>
          <input
            id="apply-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className={fieldCls}
          />
        </div>
        <div>
          <label htmlFor="apply-phone" className={labelCls}>
            연락처 <span className="text-signal-600">*</span>
          </label>
          <input
            id="apply-phone"
            type="tel"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            className={fieldCls}
          />
        </div>
        <div>
          <label htmlFor="apply-email" className={labelCls}>
            이메일 <span className="text-signal-600">*</span>
          </label>
          <input
            id="apply-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={fieldCls}
          />
        </div>
        <div>
          <label htmlFor="apply-field" className={labelCls}>
            지원 분야 <span className="text-signal-600">*</span>
          </label>
          <select
            id="apply-field"
            required
            value={field}
            onChange={(e) => setField(e.target.value)}
            className={fieldCls}
          >
            <option value="" disabled>
              지원할 직무를 선택하세요
            </option>
            {FIELD_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="apply-portfolio" className={labelCls}>
          포트폴리오 · 링크 URL
        </label>
        <input
          id="apply-portfolio"
          type="url"
          inputMode="url"
          value={portfolio}
          onChange={(e) => setPortfolio(e.target.value)}
          placeholder="https:// — 개인 사이트, 깃허브, 기사 모음 등"
          className={fieldCls}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="apply-intro" className={labelCls}>
          자기소개 <span className="text-signal-600">*</span>
        </label>
        <textarea
          id="apply-intro"
          required
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="지원 동기와 본인의 강점, 모두일보에서 만들고 싶은 저널리즘을 자유롭게 들려주세요."
          className={textareaCls}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="apply-file" className={labelCls}>
          이력서 첨부
        </label>
        <input
          id="apply-file"
          type="file"
          accept=".pdf,.doc,.docx,.hwp,.hwpx"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="block w-full cursor-pointer rounded-md border border-ink-200 bg-white text-sm text-ink-600 outline-none transition-colors file:mr-4 file:cursor-pointer file:border-0 file:bg-ink-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-ink-700 hover:file:bg-ink-200 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:file:bg-ink-800 dark:file:text-ink-200"
        />
        <p className="mt-1.5 text-xs text-ink-400">
          {fileName ? `선택된 파일: ${fileName}` : "PDF · DOCX · HWP, 최대 10MB (데모)"}
        </p>
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
            개인정보 수집·이용에 동의합니다. 제출하신 정보는 채용 전형 목적으로만 활용되며,
            전형 종료 후 관련 법령에 따라 파기됩니다. <span className="text-signal-600">*</span>
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={!agree}
          className="rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50"
        >
          지원서 제출하기
        </button>
        <p className="text-xs text-ink-400">
          정식 오픈 준비 중입니다.
        </p>
      </div>
    </form>
  );
}
