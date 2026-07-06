"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { shareKakao, shareSns } from "@/lib/share";
import { ShareIcon, PrintIcon, BookmarkIcon } from "./icons";

const SIZES = [16, 17, 18, 20, 22];
// 리드문도 함께 확대(기본 18px 유지, 항상 본문보다 크거나 같게 — 위계 역전 방지)
const LEDE_SIZES = [17, 18, 20, 22, 24];
const FONT_KEY = "modoo-fontsize";

export function ArticleActions({ title, articleId }: { title: string; articleId: string }) {
  const [size, setSize] = useState(1);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false); // 비로그인 스크랩 → 로그인 동선 안내
  const [canShare, setCanShare] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // 모바일 공유 메뉴

  // 기기 공유 시트(Web Share API) 지원 시에만 '공유' 버튼 노출 — 주로 모바일
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // ESC로 공유 메뉴 닫기 (바깥 탭은 백드롭이 흡수)
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function nativeShare() {
    navigator.share({ title, url: window.location.href }).catch(() => {
      /* 사용자가 시트를 닫음 등 — 무시 */
    });
  }

  useEffect(() => {
    fetch(`/api/bookmarks?article=${encodeURIComponent(articleId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSaved(!!d?.saved))
      .catch(() => {});
  }, [articleId]);

  async function toggleSave() {
    let holdMs = 1500;
    try {
      const r = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ article: articleId }),
      });
      const d = await r.json().catch(() => null);
      if (r.ok && d) {
        setSaved(!!d.saved);
        setSaveMsg(d.saved ? "스크랩됨" : "스크랩 해제");
        setNeedLogin(false);
      } else if (r.status === 401 || r.status === 403) {
        // 1초짜리 툴팁만 떴다 사라지면 다음 행동을 알 수 없음 — 로그인 링크를 충분히 오래 노출
        setNeedLogin(true);
        setSaveMsg(null);
        holdMs = 5000;
      } else {
        setSaveMsg("오류가 났습니다");
      }
    } catch {
      setSaveMsg("오류가 났습니다");
    }
    setTimeout(() => {
      setSaveMsg(null);
      setNeedLogin(false);
    }, holdMs);
  }

  // 저장된 글자 크기 복원(가+/가− 기억)
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(FONT_KEY));
      if (Number.isInteger(saved) && saved >= 0 && saved < SIZES.length) setSize(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const el = document.getElementById("article-body");
    if (el) {
      el.style.fontSize = `${SIZES[size]}px`;
      el.style.lineHeight = "1.9";
    }
    // 리드문도 확대 — 가+ 직후 첫 화면에서 바로 커진 게 보여야 "고장" 오해가 없다
    const lede = document.getElementById("article-lede");
    if (lede) lede.style.fontSize = `${LEDE_SIZES[size]}px`;
    try {
      localStorage.setItem(FONT_KEY, String(size));
    } catch {
      /* ignore */
    }
  }, [size]);

  async function copyLink() {
    try {
      // 실제 복사가 성공했을 때만 "복사됨" 표시 (권한 거부·비보안 컨텍스트 대비)
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const iconBtn =
    "inline-grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-300";
  const snsBtn =
    "inline-grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-sm font-bold text-ink-600 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-300";

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-full border border-ink-200 dark:border-ink-700">
        <button
          type="button"
          onClick={() => setSize((s) => Math.max(0, s - 1))}
          aria-label="글자 작게"
          className="px-3.5 py-2 text-sm text-ink-500 hover:text-signal-600"
        >
          가−
        </button>
        <span className="h-4 w-px bg-ink-200 dark:bg-ink-700" />
        <button
          type="button"
          onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))}
          aria-label="글자 크게"
          className="px-3.5 py-2 text-sm font-semibold text-ink-600 hover:text-signal-600 dark:text-ink-300"
        >
          가+
        </button>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={toggleSave}
          aria-label="스크랩"
          aria-pressed={saved}
          className={cn(iconBtn, saved && "border-signal-500 bg-signal-50 text-signal-600 dark:bg-signal-950")}
        >
          <BookmarkIcon className="h-4 w-4" />
        </button>
        {saveMsg && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-xs text-white">
            {saveMsg}
          </span>
        )}
        {needLogin && (
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2.5 py-1.5 text-xs text-white">
            로그인이 필요합니다 ·{" "}
            <Link href="/login" className="font-bold underline underline-offset-2">
              로그인하기
            </Link>
          </span>
        )}
      </div>
      <button type="button" onClick={() => window.print()} aria-label="인쇄" className={iconBtn}>
        <PrintIcon className="h-4 w-4" />
      </button>
      {/* PC(sm+): 공유 수단 인라인 나열 — 모바일에서는 아래 '공유' 메뉴로 접힘(두 줄 감김 방지) */}
      <div className="relative hidden sm:block">
        <button type="button" onClick={copyLink} aria-label="링크 복사" className={iconBtn}>
          <ShareIcon className="h-4 w-4" />
        </button>
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-xs text-white">
            복사됨
          </span>
        )}
      </div>
      {canShare && (
        <button
          type="button"
          onClick={nativeShare}
          aria-label="기기 공유"
          className={cn(iconBtn, "hidden sm:inline-grid")}
        >
          <DeviceShareIcon />
        </button>
      )}
      <button
        type="button"
        onClick={shareKakao}
        aria-label="카카오톡 공유"
        className={cn(snsBtn, "hidden sm:inline-grid")}
      >
        톡
      </button>
      <button
        type="button"
        onClick={() => shareSns("x", title)}
        aria-label="X(트위터) 공유"
        className={cn(snsBtn, "hidden sm:inline-grid")}
      >
        X
      </button>
      <button
        type="button"
        onClick={() => shareSns("f", title)}
        aria-label="페이스북 공유"
        className={cn(snsBtn, "hidden sm:inline-grid")}
      >
        f
      </button>

      {/* 모바일: '공유' 버튼 하나 → 세부 공유 메뉴 */}
      {menuOpen && (
        <button
          type="button"
          aria-label="공유 메뉴 닫기"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-transparent sm:hidden"
        />
      )}
      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-200 px-3.5 text-sm font-semibold text-ink-600 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-300"
        >
          <ShareIcon className="h-4 w-4" />
          공유
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-lg animate-[slide-down-in_.2s_ease-out] dark:border-ink-700 dark:bg-ink-900"
          >
            {canShare && (
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  nativeShare();
                }}
                icon={<DeviceShareIcon />}
                label="기기로 공유…"
              />
            )}
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                shareKakao();
              }}
              icon={<span className={menuBadge}>톡</span>}
              label="카카오톡"
            />
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                share("x");
              }}
              icon={<span className={menuBadge}>X</span>}
              label="X(트위터)"
            />
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                share("f");
              }}
              icon={<span className={menuBadge}>f</span>}
              label="페이스북"
            />
            <MenuItem
              onClick={async () => {
                await copyLink();
                setTimeout(() => setMenuOpen(false), 900);
              }}
              icon={<ShareIcon className="h-4 w-4" />}
              label={copied ? "복사됨!" : "링크 복사"}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const menuBadge =
  "inline-grid h-6 w-6 place-items-center rounded-full border border-ink-200 text-[11px] font-bold dark:border-ink-700";

function MenuItem({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-700 transition-colors hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
    >
      <span className="grid w-6 shrink-0 place-items-center text-ink-500 dark:text-ink-400">{icon}</span>
      {label}
    </button>
  );
}

function DeviceShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}
