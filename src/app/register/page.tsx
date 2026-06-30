import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "회원가입",
  description: "모두일보 회원가입 — 신뢰할 수 있는 저널리즘의 구독자가 되어보세요.",
  alternates: { canonical: "/register/" },
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-3xl">
              회원가입
            </h1>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">
              몇 가지 정보만 입력하면 모두일보의 구독자가 됩니다.
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
