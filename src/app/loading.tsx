export default function Loading() {
  return (
    <div className="container-page flex min-h-[50vh] items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-signal-600 dark:border-ink-700 dark:border-t-signal-500"
          aria-hidden
        />
        <p className="text-sm text-ink-400">불러오는 중…</p>
      </div>
    </div>
  );
}
