import Link from "next/link";
import { getReporterBySlug } from "@/lib/reporters";
import { Card } from "./AccountCard";

type IndexItem = { id: string; slug: string; title: string; category: string; publishedAt: string; author?: string };

/** 구독한 기자 카드 — 기자별 최신 기사 1건 미리보기 + 해제. 상태는 AccountClient 소유. */
export function SubsCard({
  subs,
  artIndex,
  onRemove,
}: {
  subs: { reporter_slug: string }[] | null;
  artIndex: Map<string, IndexItem>;
  onRemove: (slug: string) => void;
}) {
  const latestBy = (name: string): IndexItem | undefined => {
    let best: IndexItem | undefined;
    artIndex.forEach((a) => {
      if (a.author === name && (!best || a.publishedAt > best.publishedAt)) best = a;
    });
    return best;
  };

  return (
    <Card title="구독한 기자">
      {subs === null ? (
        <p className="text-sm text-ink-400">불러오는 중…</p>
      ) : subs.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-500 dark:text-ink-300">
          아직 구독한 기자가 없습니다. 기자 프로필에서 [+ 구독]을 눌러 보세요.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {subs.map((s) => {
            const r = getReporterBySlug(s.reporter_slug);
            if (!r) return null;
            const latest = latestBy(r.name);
            return (
              <li key={s.reporter_slug} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/reporter/${r.slug}`} className="text-sm font-semibold text-ink-900 hover:underline dark:text-white">
                    {r.name} <span className="font-normal text-ink-400">{r.role}</span>
                  </Link>
                  {latest && (
                    <Link href={`/article/${latest.slug}`} className="mt-0.5 block truncate text-xs text-ink-500 hover:underline dark:text-ink-400">
                      최신: {latest.title}
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(s.reporter_slug)}
                  className="shrink-0 text-xs text-ink-400 transition-colors hover:text-ink-700 dark:hover:text-ink-200"
                >
                  구독 해제
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
