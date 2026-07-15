"use client";

import { useEffect, useState } from "react";
import { formatCount } from "@/lib/utils";

/**
 * 기사 상세 실시간 조회수 — KV 집계값(GET /api/view)을 받아 표시.
 * 정적 빌드 시점 수치(항상 0) 대신 실제 누적 조회수를 보여준다. 실패·0이면 렌더 안 함.
 */
export function ViewCount({ articleId }: { articleId: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/view?article=${encodeURIComponent(articleId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.count === "number" && d.count > 0) setCount(d.count);
      })
      .catch(() => {});
  }, [articleId]);

  if (count === null) return null;
  return <span className="ml-2 text-ink-500 dark:text-ink-400">조회 {formatCount(count)}</span>;
}
