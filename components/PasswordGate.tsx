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
          "radial-gradient(circle at top right, rgba(0, 210, 255, 0.16), transparent 24%), radial-gradient(circle at top left, rgba(0, 95, 119, 0.08), transparent 30%), linear-gradient(180deg, #fafaf6 0%, #f5f5f0 54%, #eef9fd 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[12%] top-[18%] h-56 w-56 rounded-full blur-3xl animate-float-slow" style={{ background: "rgba(0, 210, 255, 0.12)" }} />
        <div className="absolute right-[10%] top-[12%] h-64 w-64 rounded-full blur-3xl animate-float-slower" style={{ background: "rgba(0, 95, 119, 0.08)" }} />
        <div className="absolute bottom-[10%] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl animate-float-slow" style={{ background: "rgba(240, 251, 255, 0.84)" }} />
      </div>

      <div className="relative flex min-h-screen items-stretch justify-center px-4 py-4 sm:px-6 sm:py-6">
        <div
          className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border backdrop-blur-xl"
          style={{
            borderColor: "rgba(221, 221, 214, 0.9)",
            background: "rgba(255,255,255,0.76)",
            boxShadow: "0 30px 120px rgba(28,28,26,0.1)",
          }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-40" style={{ background: "linear-gradient(180deg, rgba(0,210,255,0.1), transparent)" }} />
            <div className="absolute inset-y-0 left-0 w-px" style={{ background: "rgba(221, 221, 214, 0.9)" }} />
            <div className="absolute inset-y-0 right-0 w-px" style={{ background: "rgba(221, 221, 214, 0.9)" }} />
            <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: "rgba(221, 221, 214, 0.9)" }} />
          </div>

          <div className="relative flex min-h-[calc(100vh-2rem)] flex-1 items-center justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            <div className="flex w-full items-center justify-center py-10 lg:py-12">
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center text-center">
                <div
                  className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  Annona<span style={{ color: "var(--accent-blue)" }}>.</span>
                </div>
                <div
                  className="mt-3 text-xs tracking-[0.32em]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Grounding Demo
                </div>
                <p
                  className="mt-6 max-w-xl text-sm leading-7 sm:text-base"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Private Annona grounded demo access. Enter the password to
                  unlock the protected workspace.
                </p>
                <div
                  className="mt-8 w-full max-w-xl rounded-[30px] border p-6 sm:p-8"
                  style={{
                    borderColor: "rgba(221, 221, 214, 0.95)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,251,255,0.82))",
                    boxShadow: "0 24px 80px rgba(28,28,26,0.08)",
                  }}
                >
                  <div className="mb-6 text-center">
                    <div
                      className="text-[11px] uppercase tracking-[0.26em]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Invite-only access
                    </div>
                    <p
                      className="mt-3 text-sm leading-6"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Enter the demo password to unlock the protected
                      workspace.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className={`space-y-4 ${shake ? "animate-shake" : ""}`}
                  >
                    <div
                      className="rounded-2xl border p-3"
                      style={{
                        borderColor: "rgba(221, 221, 214, 0.95)",
                        background: "rgba(255,255,255,0.82)",
                      }}
                    >
                      <input
                        data-testid="password-input"
                        ref={inputRef}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter demo password"
                        className="w-full rounded-[14px] border px-4 py-4 text-center text-sm tracking-[0.26em] outline-none transition-colors"
                        style={{
                          borderColor: "rgba(0, 95, 119, 0.12)",
                          background: "rgba(245,245,240,0.96)",
                          color: "var(--text-primary)",
                        }}
                        autoComplete="current-password"
                      />
                    </div>
                    <button
                      data-testid="password-submit"
                      type="submit"
                      disabled={loading || !password.trim()}
                      className="w-full rounded-2xl border py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        borderColor: "rgba(0, 210, 255, 0.18)",
                        background:
                          "linear-gradient(135deg, rgba(0, 95, 119, 0.92), rgba(0, 210, 255, 0.86))",
                        boxShadow: "0 16px 40px rgba(0, 95, 119, 0.18)",
                      }}
                    >
                      {loading ? "Checking..." : "Enter"}
                    </button>
                    {error && (
                      <div
                        data-testid="password-error"
                        className="rounded-2xl border px-4 py-3 text-center text-sm"
                        style={{
                          borderColor: "rgba(185, 28, 28, 0.18)",
                          background: "rgba(254, 242, 242, 0.92)",
                          color: "#b91c1c",
                        }}
                      >
                        {error}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
