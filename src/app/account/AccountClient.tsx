"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { logout } from "@/components/AuthMenu";
import { PROVIDER_LABEL, inputCls, isSyntheticEmail, type IndexItem, type User } from "./AccountCard";
import { ProfileCard } from "./ProfileCard";
import { ScrapsCard } from "./ScrapsCard";
import { MyCommentsCard } from "./MyCommentsCard";
import { ProvidersCard } from "./ProvidersCard";
import { PasswordCard } from "./PasswordCard";

/** 마이페이지 — 계정 정보·로그인 수단·비밀번호·탈퇴. 공유 상태는 여기서 소유하고 카드에 props로 전달. */
export function AccountClient() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [providers, setProviders] = useState<string[]>([]);
  const [hasPassword, setHasPassword] = useState(false);

  // 닉네임
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  // 이메일 등록(간편가입)
  const [emailInput, setEmailInput] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

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
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  // 스크랩
  const [scraps, setScraps] = useState<{ article_id: string; created_at: string }[] | null>(null);
  const [artIndex, setArtIndex] = useState<Map<string, IndexItem>>(new Map());

  // 내가 쓴 댓글
  const [myComments, setMyComments] = useState<{ article_id: string; body: string; created_at: string }[] | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const linked = q.get("linked");
    if (linked) setLinkMsg(`${PROVIDER_LABEL[linked] ?? linked} 계정이 연결되었습니다.`);
    if (q.get("error") === "linked-other")
      setLinkMsg("이미 다른 모두일보 계정에 연결된 소셜 계정입니다. 해당 계정으로 로그인해 주세요.");
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
          fetch("/api/bookmarks")
            .then((r) => (r.ok ? r.json() : null))
            .then((b) => setScraps(b?.items ?? []))
            .catch(() => setScraps([]));
          fetch("/api/comments/mine")
            .then((r) => (r.ok ? r.json() : null))
            .then((c) => setMyComments(c?.items ?? []))
            .catch(() => setMyComments([]));
          fetch("/articles-index.json")
            .then((r) => (r.ok ? r.json() : null))
            .then((list: IndexItem[] | null) => {
              if (list) setArtIndex(new Map(list.map((a) => [a.id, a])));
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

  async function sendVerifyEmail() {
    if (busy) return;
    setBusy(true);
    setEmailMsg(null);
    try {
      const r = await fetch("/api/auth/request-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const j: any = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) setEmailMsg("인증 메일을 보냈습니다. 메일함에서 30분 안에 인증을 완료해 주세요.");
      else setEmailMsg(String(j?.error || "발송에 실패했습니다. 잠시 후 다시 시도해 주세요."));
    } catch {
      setEmailMsg("네트워크 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
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

  async function removeScrap(articleId: string) {
    try {
      const r = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ article: articleId }),
      });
      if (r.ok) setScraps((prev) => prev?.filter((x) => x.article_id !== articleId) ?? prev);
    } catch {
      /* noop */
    }
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
      <ProfileCard
        user={user}
        editingName={editingName}
        nameInput={nameInput}
        nameMsg={nameMsg}
        busy={busy}
        emailInput={emailInput}
        emailMsg={emailMsg}
        onEmailInput={setEmailInput}
        onSendVerify={sendVerifyEmail}
        onEditStart={() => setEditingName(true)}
        onCancel={() => {
          setEditingName(false);
          setNameInput(user.name);
        }}
        onNameInput={setNameInput}
        onSave={saveName}
      />

      {/* 스크랩 */}
      <ScrapsCard scraps={scraps} artIndex={artIndex} onRemove={removeScrap} />

      {/* 내가 쓴 댓글 */}
      <MyCommentsCard myComments={myComments} artIndex={artIndex} />

      {/* 로그인 수단 */}
      <ProvidersCard
        providers={providers}
        hasPassword={hasPassword}
        hasRealEmail={!isSyntheticEmail(user.email)}
        linkMsg={linkMsg}
      />

      {/* 비밀번호 */}
      <PasswordCard
        hasPassword={hasPassword}
        hasRealEmail={!isSyntheticEmail(user.email)}
        curPw={curPw}
        newPw={newPw}
        newPw2={newPw2}
        pwMsg={pwMsg}
        busy={busy}
        onCurPw={setCurPw}
        onNewPw={setNewPw}
        onNewPw2={setNewPw2}
        onSubmit={savePassword}
      />

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
