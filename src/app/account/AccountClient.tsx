"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { logout } from "@/components/AuthMenu";

type User = { name: string; email: string };

const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일",
  kakao: "카카오",
  naver: "네이버",
  google: "구글",
};

const inputCls =
  "h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
      <h2 className="font-headline text-lg font-bold text-ink-900 dark:text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** 마이페이지 — 계정 정보·로그인 수단·비밀번호·탈퇴. */
export function AccountClient() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [providers, setProviders] = useState<string[]>([]);
  const [hasPassword, setHasPassword] = useState(false);

  // 닉네임
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  // 비밀번호
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  // 탈퇴
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [delMsg, setDelMsg] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setUser(d?.user ?? null);
        if (d?.user) {
          setNameInput(d.user.name);
          fetch("/api/auth/identities")
            .then((r) => (r.ok ? r.json() : null))
            .then((i) => {
              if (i?.providers) setProviders(i.providers);
              setHasPassword(!!i?.hasPassword);
            })
            .catch(() => {});
        }
      })
      .catch(() => setUser(null));
  }, []);

  async function saveName() {
    if (busy) return;
    setBusy(true);
    setNameMsg(null);
    try {
      const r = await fetch("/api/auth/update-name", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nameInput }),
      });
      const d = await r.json();
      if (r.ok && d?.user) {
        setUser(d.user);
        setEditingName(false);
        setNameMsg("닉네임이 변경되었습니다.");
        window.location.reload();
        return;
      }
      setNameMsg(d?.error || "변경에 실패했습니다.");
    } catch {
      setNameMsg("네트워크 오류입니다.");
    }
    setBusy(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (newPw !== newPw2) {
      setPwMsg("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    setPwMsg(null);
    try {
      const r = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ current: curPw, next: newPw }),
      });
      const d = await r.json();
      if (r.ok && d?.ok) {
        setPwMsg(hasPassword ? "비밀번호가 변경되었습니다." : "비밀번호가 설정되었습니다. 이제 이메일로도 로그인할 수 있습니다.");
        setHasPassword(true);
        setCurPw("");
        setNewPw("");
        setNewPw2("");
        if (!providers.includes("email")) setProviders((p) => [...p, "email"]);
      } else {
        setPwMsg(d?.error || "처리에 실패했습니다.");
      }
    } catch {
      setPwMsg("네트워크 오류입니다.");
    }
    setBusy(false);
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setDelMsg(null);
    try {
      const r = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: confirmText }),
      });
      const d = await r.json();
      if (r.ok && d?.ok) {
        window.location.href = "/";
        return;
      }
      setDelMsg(d?.error || "탈퇴 처리에 실패했습니다.");
    } catch {
      setDelMsg("네트워크 오류입니다.");
    }
    setBusy(false);
  }

  if (user === undefined) return <p className="py-16 text-center text-ink-400">불러오는 중…</p>;

  if (user === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-500 dark:text-ink-300">로그인이 필요한 페이지입니다.</p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* 계정 정보 */}
      <Card title="계정 정보">
        <dl className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-ink-100 pb-4 dark:border-ink-800">
            <dt className="shrink-0 font-medium text-ink-500 dark:text-ink-400">닉네임</dt>
            <dd className="flex min-w-0 items-center gap-2">
              {editingName ? (
                <>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={20}
                    className="h-9 w-40 rounded-md border border-ink-200 bg-white px-3 text-right text-ink-900 outline-none focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
                  />
                  <button type="button" onClick={saveName} disabled={busy} className="shrink-0 rounded-md bg-signal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-signal-700 disabled:opacity-50">
                    저장
                  </button>
                  <button type="button" onClick={() => { setEditingName(false); setNameInput(user.name); }} className="shrink-0 text-xs text-ink-400 hover:text-ink-700">
                    취소
                  </button>
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink-900 dark:text-white">{user.name}</span>
                  <button type="button" onClick={() => setEditingName(true)} className="shrink-0 text-xs font-medium text-signal-600 hover:text-signal-700">
                    변경
                  </button>
                </>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="shrink-0 font-medium text-ink-500 dark:text-ink-400">이메일</dt>
            <dd className="break-all font-semibold text-ink-900 dark:text-white">{user.email}</dd>
          </div>
        </dl>
        {nameMsg && <p className="mt-3 text-xs text-signal-600 dark:text-signal-400">{nameMsg}</p>}
      </Card>

      {/* 로그인 수단 */}
      <Card title="연결된 로그인 수단">
        <div className="flex flex-wrap gap-2">
          {(providers.length ? providers : ["email"]).map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 dark:border-ink-700 dark:text-ink-200">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-600" />
              {PROVIDER_LABEL[p] ?? p}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-400">
          같은 이메일의 카카오·네이버·구글로 로그인하면 이 계정에 자동으로 연결됩니다.
        </p>
      </Card>

      {/* 비밀번호 */}
      <Card title={hasPassword ? "비밀번호 변경" : "비밀번호 설정"}>
        {!hasPassword && (
          <p className="mb-4 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
            간편 로그인으로 가입한 계정입니다. 비밀번호를 설정하면 이메일로도 로그인할 수 있습니다.
          </p>
        )}
        <form onSubmit={savePassword} className="space-y-3">
          {hasPassword && (
            <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder="현재 비밀번호" autoComplete="current-password" className={inputCls} />
          )}
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="새 비밀번호 (8자 이상)" autoComplete="new-password" className={inputCls} />
          <input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} placeholder="새 비밀번호 확인" autoComplete="new-password" className={inputCls} />
          {pwMsg && <p className="text-xs text-signal-600 dark:text-signal-400">{pwMsg}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50">
            {hasPassword ? "비밀번호 변경" : "비밀번호 설정"}
          </button>
        </form>
      </Card>

      {/* 로그아웃 */}
      <button type="button" onClick={logout} className="w-full rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200">
        로그아웃
      </button>

      {/* 탈퇴 */}
      <div className="pt-2 text-center">
        {!showDelete ? (
          <button type="button" onClick={() => setShowDelete(true)} className="text-xs text-ink-400 underline hover:text-ink-600">
            회원 탈퇴
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="rounded-xl border border-ink-200 p-5 text-left dark:border-ink-800">
            <p className="text-sm font-semibold text-ink-900 dark:text-white">정말 탈퇴하시겠어요?</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
              계정과 로그인 정보가 즉시 삭제되며 되돌릴 수 없습니다. 계속하려면 아래에 <b>탈퇴</b>라고 입력하세요.
            </p>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="탈퇴" className={`mt-3 ${inputCls}`} />
            {delMsg && <p className="mt-2 text-xs text-signal-600 dark:text-signal-400">{delMsg}</p>}
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={busy || confirmText !== "탈퇴"} className="flex-1 rounded-md bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-700 disabled:opacity-40 dark:bg-white dark:text-ink-900">
                탈퇴하기
              </button>
              <button type="button" onClick={() => { setShowDelete(false); setConfirmText(""); }} className="flex-1 rounded-md border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-700 dark:border-ink-600 dark:text-ink-200">
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
