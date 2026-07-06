import Image from "next/image";
import Link from "next/link";
import type { ArticleListItem } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/categories";
import { displayImageUrl } from "@/lib/stock";
import { cn } from "@/lib/utils";

/** 영상(유튜브 쇼츠) 전용 세로 9:16 카드 — /media 그리드·홈 영상 선반에서 사용. */
export function ShortsCard({ article, className }: { article: ArticleListItem; className?: string }) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className={cn("group relative block overflow-hidden rounded-xl bg-ink-900", className)}
    >
      <div className="relative aspect-[9/16] w-full">
        <Image
          src={displayImageUrl(article)}
          alt=""
          fill
          sizes="(max-width:640px) 45vw, 220px"
          unoptimized
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* 하단 그라데이션 + 제목 */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pb-3 pt-14" />
        {/* 중앙 재생 버튼 */}
        <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 backdrop-blur-sm transition-transform group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-white" aria-hidden>
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </span>
        <span className="absolute left-2.5 top-2.5 rounded-[3px] bg-white px-1.5 py-0.5 text-[11px] font-bold leading-none text-ink-900">
          영상
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[11px] font-medium text-white/70">{CATEGORY_MAP[article.category]?.name}</p>
          <h3 className="clamp-2 mt-0.5 font-headline text-sm font-bold leading-snug text-white">
            {article.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}
