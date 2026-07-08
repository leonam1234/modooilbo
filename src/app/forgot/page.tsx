import type { Metadata } from "next";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = {
  title: "비밀번호 찾기",
  description: "모두일보 계정 비밀번호 재설정",
  robots: { index: false, follow: true },
};

export default function ForgotPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-3xl">
              비밀번호 찾기
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
              가입한 이메일 주소를 입력하시면 재설정 링크를 보내드립니다.
            </p>
          </div>
          <ForgotForm />
        </div>
      </div>
    </div>
  );
}
