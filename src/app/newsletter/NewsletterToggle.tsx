"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function NewsletterToggle({ name }: { name: string }) {
  const [subscribed, setSubscribed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setSubscribed((s) => !s)}
      aria-pressed={subscribed}
      aria-label={`${name} ${subscribed ? "구독 취소" : "구독"}`}
      className={cn(
        "shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
        subscribed
          ? "border border-signal-600 bg-signal-50 text-signal-600 dark:border-signal-400 dark:bg-signal-950/40 dark:text-signal-400"
          : "bg-signal-600 text-white hover:bg-signal-700",
      )}
    >
      {subscribed ? "구독 중 ✓" : "구독"}
    </button>
  );
}
