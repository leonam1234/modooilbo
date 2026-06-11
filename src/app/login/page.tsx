import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "로그인",
  description: "시그널저널 회원 로그인 — 더 깊이 있는 뉴스를 경험하세요.",
};

export default function LoginPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-3xl">
              로그인
            </h1>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">
              시그널저널 계정으로 더 깊이 있는 저널리즘을 만나보세요.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
