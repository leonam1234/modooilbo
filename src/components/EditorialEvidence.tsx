export function ReaderChecklist({ items }: { items?: string[] }) {
  if (!items?.length) return null;

  return (
    <section
      aria-labelledby="reader-checklist-title"
      className="my-7 rounded-xl border border-signal-200 bg-signal-50/60 p-5 dark:border-signal-900/70 dark:bg-signal-950/20"
    >
      <h2 id="reader-checklist-title" className="font-headline text-lg font-bold text-ink-900 dark:text-white">
        이 기사로 확인할 것
      </h2>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span aria-hidden className="mt-0.5 font-bold text-signal-600 dark:text-signal-400">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MethodologyNote({ note }: { note?: string }) {
  if (!note) return null;

  return (
    <section
      aria-labelledby="methodology-note-title"
      className="mt-8 rounded-xl border border-ink-200 bg-ink-50/70 p-5 dark:border-ink-800 dark:bg-ink-900/60"
    >
      <h2 id="methodology-note-title" className="font-headline text-base font-bold text-ink-900 dark:text-white">
        분석 방법과 한계
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{note}</p>
    </section>
  );
}
