import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-headline text-7xl font-black text-signal-600 sm:text-8xl">404</p>
      <h1 className="mt-4 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-3 max-w-md text-ink-500 dark:text-ink-400">
        요청하신 페이지가 삭제되었거나 주소가 변경되었습니다. 입력하신 주소를 다시 확인해 주세요.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-signal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-signal-700"
        >
          홈으로 가기
        </Link>
        <Link
          href="/search"
          className="rounded-md border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200"
        >
          기사 검색
        </Link>
      </div>
    </div>
  );
}
