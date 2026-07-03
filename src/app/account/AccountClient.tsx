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
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  // 스크랩
  type IndexItem = { id: string; slug: string; title: string; category: string; publishedAt: string };
  const [scraps, setScraps] = useState<{ article_id: string; created_at: string }[] | null>(null);
  const [artIndex, setArtIndex] = useState<Map<string, IndexItem>>(new Map());

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

      {/* 스크랩 */}
      <Card title="스크랩한 기사">
        {scraps === null ? (
          <p className="text-sm text-ink-400">불러오는 중…</p>
        ) : scraps.length === 0 ? (
          <p className="text-sm leading-relaxed text-ink-500 dark:text-ink-300">
            스크랩한 기사가 없습니다. 기사 제목 아래 책갈피 버튼으로 저장해 두고 여기서 다시 볼 수 있어요.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {scraps.map((s) => {
              const a = artIndex.get(s.article_id);
              return (
                <li key={s.article_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    {a ? (
                      <Link
                        href={`/article/${a.slug}`}
                        className="block truncate text-sm font-medium text-ink-900 hover:underline dark:text-white"
                      >
                        {a.title}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm text-ink-500">{s.article_id}</span>
                    )}
                    <span className="text-xs text-ink-400">{s.created_at.slice(0, 10).replaceAll("-", ".")}. 저장</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const r = await fetch("/api/bookmarks", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ article: s.article_id }),
                        });
                        if (r.ok) setScraps((prev) => prev?.filter((x) => x.article_id !== s.article_id) ?? prev);
                      } catch {
                        /* noop */
                      }
                    }}
                    className="shrink-0 text-xs text-ink-400 transition-colors hover:text-ink-700 dark:hover:text-ink-200"
                  >
                    해제
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* 로그인 수단 */}
      <Card title="연결된 로그인 수단">
        {linkMsg && (
          <p className="mb-4 rounded-md border border-signal-200 bg-signal-50 px-4 py-3 text-sm text-signal-700 dark:border-signal-900 dark:bg-signal-950/40 dark:text-signal-300">
            {linkMsg}
          </p>
        )}
        <div className="space-y-2.5">
          {(["email", "kakao", "naver", "google"] as const).map((p) => {
            const connected = p === "email" ? providers.includes("email") || hasPassword : providers.includes(p);
            return (
              <div key={p} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-4 py-2.5 dark:border-ink-800">
                <span className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
                  <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-signal-600" : "bg-ink-200 dark:bg-ink-700"}`} />
                  {PROVIDER_LABEL[p]}
                </span>
                {connected ? (
                  <span className="text-xs font-medium text-ink-400">연결됨</span>
                ) : p === "email" ? (
                  <span className="text-xs text-ink-400">아래 비밀번호 설정 시 사용 가능</span>
                ) : (
                  <a
                    href={`/api/auth/${p}/start?link=1`}
                    className="rounded-md border border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200"
                  >
                    연결하기
                  </a>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-400">
          연결해 두면 어떤 방법으로 로그인해도 같은 계정으로 들어옵니다.
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
