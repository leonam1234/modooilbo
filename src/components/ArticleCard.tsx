import Image from "next/image";
import Link from "next/link";
import type { ArticleListItem } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/categories";
import { cn, formatKoreanDateTime, toKstIso } from "@/lib/utils";
import { PlayIcon } from "./icons";
import { displayImageUrl } from "@/lib/stock";
import { TypeBadge } from "./TypeBadge";

type Variant = "feature" | "horizontal" | "compact" | "list" | "text" | "overlay";

interface ArticleCardProps {
  article: ArticleListItem;
  variant?: Variant;
  priority?: boolean;
  showSummary?: boolean;
  className?: string;
  headingClassName?: string;
}

function CardMeta({ article, light = false }: { article: ArticleListItem; light?: boolean }) {
  const cat = CATEGORY_MAP[article.category];
  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-x-1.5 overflow-hidden whitespace-nowrap text-xs", // 1줄 강제 — 메타 줄바꿈이 2열 행 높이를 어긋내지 않게
        light ? "text-white/80" : "text-ink-500 dark:text-ink-400",
      )}
    >
      <span className={cn("font-semibold", light ? "text-white" : "text-signal-600")}>
        {cat?.name}
      </span>
      <span aria-hidden>·</span>
      <span>{article.author.name}</span>
      <span aria-hidden className="hidden sm:inline">
        ·
      </span>
      <time className="hidden sm:inline" dateTime={toKstIso(article.publishedAt)}>
        {formatKoreanDateTime(article.publishedAt)}
      </time>
    </div>
  );
}

function Thumb({
  article,
  sizes,
  priority,
  className,
  motion,
}: {
  article: ArticleListItem;
  sizes: string;
  priority?: boolean;
  className?: string;
  motion?: "zoom" | "pan";
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-ink-100 dark:bg-ink-800", className)}>
      <Image
        src={displayImageUrl(article)}
        alt={article.title}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        className={cn(
          "object-cover",
          motion === "zoom" && "animate-kenburns",
          motion === "pan" && "animate-pan-y", // 작은 썸네일 전용(대표님 확정: 작은=위아래 팬, 큰=줌)
          !motion && "transition-transform duration-500 group-hover:scale-105",
        )}
      />
      <TypeBadge article={article} className="absolute left-2 top-2 z-10" />
      {article.type === "video" && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            <PlayIcon className="h-5 w-5 translate-x-0.5" />
          </span>
        </span>
      )}
    </div>
  );
}

export function ArticleCard({
  article,
  variant = "feature",
  priority,
  showSummary = true,
  className,
  headingClassName,
}: ArticleCardProps) {
  const href = `/article/${article.slug}`;

  if (variant === "horizontal") {
    return (
      <article className={cn("group flex gap-4 transition-transform duration-300 hover:-translate-y-0.5", className)}>
        <Link prefetch={false} href={href} className="block w-28 shrink-0 sm:w-40">
          <Thumb article={article} sizes="(max-width:640px) 112px, 160px" className="aspect-[4/3]" motion="pan" />
        </Link>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-headline text-base font-bold leading-snug text-ink-900 dark:text-white sm:text-lg",
              headingClassName,
            )}
          >
            <Link prefetch={false} href={href} className="clamp-2 hover:text-signal-700 dark:hover:text-signal-400">
              {article.title}
            </Link>
          </h3>
          {showSummary && (
            <p className="clamp-2 mt-1 hidden text-sm text-ink-500 dark:text-ink-300 sm:block">
              {article.summary}
            </p>
          )}
          <CardMeta article={article} />
        </div>
      </article>
    );
  }

  // 밀도 높은 리스트 행 — 제목·요약 좌측 + 썸네일 우측 (섹션 목록용)
  if (variant === "list") {
    return (
      <article className={cn("group flex items-start gap-4", className)}>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "min-h-[2.75em] text-[15px] font-semibold leading-snug text-ink-900 dark:text-white", // 2줄 공간 고정 — 두 열 나란히 설 때 행 어긋남 방지
              headingClassName,
            )}
          >
            <Link href={href} className="clamp-2 hover:text-signal-700 dark:hover:text-signal-400">
              {article.title}
            </Link>
          </h3>
          {showSummary && (
            <p className="clamp-2 mt-1 hidden min-h-[3.25em] text-[13px] leading-relaxed text-ink-500 dark:text-ink-400 sm:[display:-webkit-box]">
              {article.summary}
            </p>
          )}
          <CardMeta article={article} />
        </div>
        <Link href={href} className="block w-[96px] shrink-0 sm:w-[120px]">
          <Thumb article={article} sizes="120px" className="aspect-[3/2]" motion="pan" />
        </Link>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className={cn("group flex items-start gap-3 transition-transform duration-300 hover:-translate-y-0.5", className)}>
        <Link prefetch={false} href={href} className="block w-[72px] shrink-0">
          <Thumb article={article} sizes="80px" className="aspect-square" motion="pan" />
        </Link>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-sm font-semibold leading-snug text-ink-900 dark:text-white",
              headingClassName,
            )}
          >
            <Link prefetch={false} href={href} className="clamp-2 hover:text-signal-700 dark:hover:text-signal-400">
              {article.title}
            </Link>
          </h3>
          <CardMeta article={article} />
        </div>
      </article>
    );
  }

  if (variant === "text") {
    return (
      <article className={cn("group", className)}>
        <h3
          className={cn(
            "flex gap-2 text-sm font-medium leading-snug text-ink-800 dark:text-ink-100",
            headingClassName,
          )}
        >
          <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-signal-500" />
          <Link prefetch={false} href={href} className="clamp-2 hover:text-signal-700 dark:hover:text-signal-400">
            {article.title}
          </Link>
        </h3>
        {showSummary && (
          <p className="clamp-2 mt-1 pl-3 text-xs text-ink-400">{article.summary}</p>
        )}
      </article>
    );
  }

  if (variant === "overlay") {
    return (
      <article className={cn("group relative overflow-hidden rounded-lg transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl", className)}>
        <Link prefetch={false} href={href} className="block">
          <div className="relative aspect-[4/3] w-full bg-ink-200 dark:bg-ink-800">
            <Image
              src={displayImageUrl(article)}
              alt={article.title}
              fill
              sizes="(max-width:768px) 50vw, 25vw"
              priority={priority}
              unoptimized
              className="object-cover animate-kenburns"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <TypeBadge article={article} onDark className="absolute left-3 top-3 z-10" />
            {article.type === "video" && (
              <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white">
                <PlayIcon className="h-5 w-5 translate-x-0.5" />
              </span>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-signal-300">
              {CATEGORY_MAP[article.category]?.name}
            </span>
            <h3
              className={cn(
                "mt-1 font-headline text-base font-bold leading-snug text-white",
                headingClassName,
              )}
            >
              <span className="clamp-2">{article.title}</span>
            </h3>
          </div>
        </Link>
      </article>
    );
  }

  // variant === "feature" (default)
  return (
    <article className={cn("group flex flex-col transition-transform duration-300 hover:-translate-y-1", className)}>
      <Link prefetch={false} href={href} className="block">
        <Thumb
          article={article}
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
          priority={priority}
          className="aspect-[16/10]"
          motion="zoom"
        />
      </Link>
      <div className="mt-3">
        <h3
          className={cn(
            "min-h-[2.75em] font-headline text-lg font-bold leading-snug text-ink-900 dark:text-white sm:text-xl", // 2줄 공간 고정 — 섹션 2열 오와열(링크의 -webkit-box엔 min-height가 안 먹혀 h3에 건다)
            headingClassName,
          )}
        >
          <Link prefetch={false} href={href} className="clamp-2 clamp-2-fill hover:text-signal-700 dark:hover:text-signal-400">
            {article.title}
          </Link>
        </h3>
        {showSummary && (
          <p className="clamp-2 clamp-2-fill mt-1.5 min-h-[3.25em] text-sm leading-relaxed text-ink-500 dark:text-ink-300">
            {article.summary}
          </p>
        )}
        <CardMeta article={article} />
      </div>
    </article>
  );
}
