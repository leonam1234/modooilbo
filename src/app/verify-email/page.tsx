import type { Metadata } from "next";
import { VerifyEmailClient } from "./VerifyEmailClient";

export const metadata: Metadata = {
  title: "이메일 인증",
  description: "모두일보 계정 이메일 등록 인증",
};

export default function VerifyEmailPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="glass-card rounded-xl border border-ink-200 p-6 dark:border-ink-800 sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-3xl">
              이메일 인증
            </h1>
          </div>
          <VerifyEmailClient />
        </div>
      </div>
    </div>
  );
}
