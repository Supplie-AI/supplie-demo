"use client";

import { useState, useCallback, useRef } from "react";
import { Panel } from "@/components/Panel";
import { PromptButtons } from "@/components/PromptButtons";
import { ModelPicker } from "@/components/ModelPicker";
import { PasswordGate } from "@/components/PasswordGate";

export default function Home() {
  const [model, setModel] = useState("gpt-5.4-mini-2026-03-17");
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [authed, setAuthed] = useState(
    () =>
      typeof window !== "undefined" && !!sessionStorage.getItem("demo_token"),
  );
  const authChecked = true;
  const promptVersion = useRef(0);

  const handleAuth = useCallback((token: string) => {
    sessionStorage.setItem("demo_token", token);
    setAuthed(true);
  }, []);

  const handleAuthError = useCallback(() => {
    sessionStorage.removeItem("demo_token");
    setAuthed(false);
    setClearTrigger((t) => t + 1);
    setPendingPrompt(null);
  }, []);

  const handlePrompt = useCallback((prompt: string) => {
    promptVersion.current += 1;
    setPendingPrompt(`${promptVersion.current}::${prompt}`);
  }, []);

  const handleClear = useCallback(() => {
    setPendingPrompt(null);
    setClearTrigger((t) => t + 1);
  }, []);

  const handleModelChange = useCallback(
    (modelId: string, newProvider: "openai" | "anthropic") => {
      setModel(modelId);
      setProvider(newProvider);
      setClearTrigger((t) => t + 1);
      setPendingPrompt(null);
    },
    [],
  );

  const extractPrompt = (raw: string | null) => {
    if (!raw) return null;
    const idx = raw.indexOf("::");
    return idx >= 0 ? raw.slice(idx + 2) : raw;
  };

  // Don't render anything until we've checked auth (avoids flash)
  if (!authChecked) return null;

  // Show password gate exclusively — no app behind it
  if (!authed) {
    return <PasswordGate onAuth={handleAuth} />;
  }

  return (
    <div
      className="flex flex-col h-screen"
      style={{
        background: "var(--bg-primary)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-teal-500/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-teal-400" />
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Supplie.ai
          </span>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {"/" + "/"}
          </span>
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}
          >
            Grounding Demo
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ModelPicker value={model} onChange={handleModelChange} />
          <button
            onClick={handleClear}
            className="text-xs border border-slate-700/50 hover:border-slate-500/50 rounded-lg px-3 py-1.5 transition-all"
            style={{ color: "var(--text-secondary)" }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Prompt buttons */}
      <PromptButtons onPrompt={handlePrompt} />

      {/* Two panels */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2">
          <Panel
            title="Code Execution Only"
            badge="⚠ Raw Model — Code Execution Only"
            badgeColor="amber"
            bgColor="var(--bg-amber-panel)"
            borderColor="border-amber-900/30"
            apiEndpoint="/api/raw"
            prompt={extractPrompt(pendingPrompt)}
            model={model}
            provider={provider}
            onClear={handleClear}
            clearTrigger={clearTrigger}
            onAuthError={handleAuthError}
          />
        </div>
        <div className="w-1/2">
          <Panel
            title="Supplie Agent"
            badge="✓ Supplie Agent — Grounded Tools + Code"
            badgeColor="teal"
            bgColor="var(--bg-teal-panel)"
            borderColor="border-teal-900/30"
            apiEndpoint="/api/agent"
            prompt={extractPrompt(pendingPrompt)}
            model={model}
            provider={provider}
            onClear={handleClear}
            clearTrigger={clearTrigger}
            onAuthError={handleAuthError}
          />
        </div>
      </div>
    </div>
  );
}
