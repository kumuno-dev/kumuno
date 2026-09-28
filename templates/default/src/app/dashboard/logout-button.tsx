"use client";
import { useState } from "react";
export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function logout() {
    if (pending) return;
    setPending(true); setError(false);
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error();
      window.location.assign("/login");
    } catch { setError(true); setPending(false); }
  }
  return <><button onClick={logout} disabled={pending} className="rounded border border-slate-500 px-5 py-3 disabled:opacity-60">{pending ? "処理中…" : "ログアウト"}</button>
    {error && <p role="alert" className="mt-4 text-red-800">ログアウトできませんでした。再試行してください。</p>}</>;
}
