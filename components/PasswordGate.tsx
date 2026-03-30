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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "#0a0a0f" }}
    >
      <div className="flex flex-col items-center gap-6 sm:gap-8 w-full max-w-sm px-6 sm:px-8">
        {/* Wordmark */}
        <div className="text-center">
          <div className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight">
            supplie<span className="text-teal-400">.</span>
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mt-1 sm:mt-2">
            Grounding Demo
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className={`w-full space-y-3 ${shake ? "animate-shake" : ""}`}
        >
          <input
            data-testid="password-input"
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter demo password"
            className="w-full bg-slate-900/80 text-slate-100 border border-slate-700/60 focus:border-teal-600/60 rounded-xl px-4 py-3.5 sm:py-4 text-base sm:text-sm outline-none transition-colors placeholder-slate-600 text-center tracking-widest"
            autoComplete="current-password"
          />
          <button
            data-testid="password-submit"
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-teal-600/80 hover:bg-teal-500/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm sm:text-base font-medium rounded-xl py-3.5 sm:py-3 transition-colors"
          >
            {loading ? "Checking…" : "Enter"}
          </button>
          {error && (
            <div
              data-testid="password-error"
              className="text-red-400 text-xs sm:text-sm text-center mt-2"
            >
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
