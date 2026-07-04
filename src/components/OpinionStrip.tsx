import Link from "next/link";
import { getOpinion } from "@/lib/queries";
import { SectionHeading } from "./SectionHeading";

export function OpinionStrip() {
  const items = getOpinion(3);
  if (!items.length) return null;

  return (
    <section className="paper-band border-y border-ink-100 dark:border-ink-800">
      <div className="container-page py-10">
        <SectionHeading title="오피니언" en="Opinion" href="/opinion" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <article key={a.id} className="group border-l-2 border-signal-500 pl-4">
              <span className="text-xs font-bold text-signal-600">칼럼</span>
              <h3 className="clamp-2 mt-1 font-headline text-lg font-bold leading-snug text-ink-900 dark:text-white">
                <Link href={`/article/${a.slug}`} className="hover:text-signal-700 dark:hover:text-signal-400">
                  {a.title}
                </Link>
              </h3>
              <p className="clamp-3 mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
                {a.summary}
              </p>
              <p className="mt-3 text-sm font-medium text-ink-700 dark:text-ink-200">
                {a.author.name} <span className="font-normal text-ink-400">{a.author.role}</span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
