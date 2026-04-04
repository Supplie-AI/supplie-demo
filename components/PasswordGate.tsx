"use client";

import { useState, useEffect, useRef } from "react";

interface PasswordGateProps {
  onAuth: (token: string) => void;
}

export function PasswordGate({ onAuth }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem("demo_token", password);
        onAuth(password);
      } else {
        setError("Incorrect password");
        setShake(true);
        setPassword("");
        setTimeout(() => setShake(false), 600);
        inputRef.current?.focus();
      }
    } catch {
      setError("Connection error — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="password-gate"
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(46, 211, 196, 0.2), transparent 28%), radial-gradient(circle at top right, rgba(243, 166, 59, 0.14), transparent 26%), linear-gradient(180deg, #061018 0%, #070d14 52%, #050a0f 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[12%] top-[18%] h-56 w-56 rounded-full bg-teal-400/10 blur-3xl animate-float-slow" />
        <div className="absolute right-[10%] top-[12%] h-64 w-64 rounded-full bg-sky-400/10 blur-3xl animate-float-slower" />
        <div className="absolute bottom-[10%] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl animate-float-slow" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-[30px] border border-white/12 bg-[rgba(6,12,18,0.78)] p-8 shadow-[0_30px_120px_rgba(2,6,14,0.55)] backdrop-blur-xl sm:p-10">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-300">
              Private Preview
            </div>
            <div className="text-4xl font-semibold tracking-[-0.04em] text-slate-50 sm:text-5xl">
              Annona<span className="text-teal-400">.</span>
            </div>
            <div className="mt-2 text-xs tracking-[0.32em] text-slate-400">
              Grounding Demo
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Compare raw reasoning with tool-backed Annona answers in a gated
              demo environment.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className={`space-y-4 ${shake ? "animate-shake" : ""}`}
          >
            <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-3">
              <input
                data-testid="password-input"
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter demo password"
                className="w-full rounded-[14px] border border-white/10 bg-slate-950/60 px-4 py-4 text-center text-sm tracking-[0.26em] text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-teal-400/50 focus:bg-slate-950/80"
                autoComplete="current-password"
              />
            </div>
            <button
              data-testid="password-submit"
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full rounded-2xl border border-teal-300/20 bg-[linear-gradient(135deg,rgba(16,185,166,0.9),rgba(34,211,238,0.72))] py-4 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(20,184,166,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(20,184,166,0.34)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Checking..." : "Enter"}
            </button>
            {error && (
              <div
                data-testid="password-error"
                className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300"
              >
                {error}
              </div>
            )}
          </form>

          <div className="mt-6 flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.18em] text-slate-500">
            <span>Protected comparison</span>
            <span>Invite-only access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
