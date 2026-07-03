import type { Metadata } from "next";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = {
  title: "비밀번호 재설정",
  description: "모두일보 계정 새 비밀번호 설정",
};

export default function ResetPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-3xl">
              새 비밀번호 설정
            </h1>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">
              새로 사용할 비밀번호를 입력해 주세요.
            </p>
          </div>
          <ResetForm />
        </div>
      </div>
    </div>
  );
}
