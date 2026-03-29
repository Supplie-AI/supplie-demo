"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Panel } from "@/components/Panel";
import { PromptButtons } from "@/components/PromptButtons";
import { ModelPicker } from "@/components/ModelPicker";
import { PasswordGate } from "@/components/PasswordGate";
import { useStreamingChat } from "@/hooks/useStreamingChat";

interface DemoConfig {
  anthropicAvailable: boolean;
  backendLabel: string;
  sharedAcrossPanels: boolean;
  capabilities: Array<{
    id: string;
    label: string;
    enabled: boolean;
    availability: "available" | "planned";
    description: string;
  }>;
}

export default function Home() {
  const [model, setModel] = useState("gpt-5.4-mini-2026-03-17");
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [authed, setAuthed] = useState(
    () =>
      typeof window !== "undefined" && !!sessionStorage.getItem("demo_token"),
  );
  const authChecked = true;

  const handleAuth = useCallback((token: string) => {
    sessionStorage.setItem("demo_token", token);
    setAuthed(true);
  }, []);

  const handleAuthError = useCallback(() => {
    sessionStorage.removeItem("demo_token");
    setAuthed(false);
  }, []);

  const getToken = useCallback(
    () =>
      typeof window !== "undefined"
        ? (sessionStorage.getItem("demo_token") ?? "")
        : "",
    [],
  );

  const handleChatError = useCallback(
    (error: Error) => {
      if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        handleAuthError();
      }
    },
    [handleAuthError],
  );

  const { messages, append, setMessages, isLoading, error } = useStreamingChat({
    api: "/api/chat",
    body: { model, provider },
    headers: useCallback(
      () => ({ Authorization: `Bearer ${getToken()}` }),
      [getToken],
    ),
    onError: handleChatError,
  });

  const handleClear = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const handleModelChange = useCallback(
    (modelId: string, newProvider: "openai" | "anthropic") => {
      setModel(modelId);
      setProvider(newProvider);
      setMessages([]);
    },
    [setMessages],
  );

  const handlePrompt = useCallback(
    (prompt: string) => {
      append({ role: "user", content: prompt });
    },
    [append],
  );

  useEffect(() => {
    fetch("/api/config")
      .then((response) => response.json())
      .then((data: DemoConfig) => setConfig(data))
      .catch(() => setConfig(null));
  }, []);

  const handleRetry = useCallback(() => {
    const lastUser = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    if (lastUser) {
      append({ role: "user", content: lastUser.content });
    }
  }, [append, messages]);

  const currentSliceMessage = useMemo(() => {
    const availableCapabilities =
      config?.capabilities.filter((capability) => capability.enabled) ?? [];
    const plannedCapabilities =
      config?.capabilities.filter((capability) => !capability.enabled) ?? [];

    const availableText =
      availableCapabilities.length > 0
        ? availableCapabilities.map((capability) => capability.label).join(", ")
        : "No runtime capabilities are enabled.";
    const plannedText =
      plannedCapabilities.length > 0
        ? plannedCapabilities.map((capability) => capability.label).join(", ")
        : "No planned capabilities listed.";

    return {
      availableText,
      plannedText,
    };
  }, [config]);

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

      <div className="px-5 py-3 border-b border-white/5 bg-slate-950/30">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Current Slice
        </div>
        <div className="mt-1 text-sm text-slate-200">
          Both panels mirror the same{" "}
          {config?.backendLabel ?? "LangChain ungrounded agent"} for now.
          Streaming text is live, but the comparison UI is intentionally backed
          by one shared session until grounded capabilities are implemented.
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Available now: {currentSliceMessage.availableText}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Not wired yet: {currentSliceMessage.plannedText}
        </div>
      </div>

      {/* Two panels */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2">
          <Panel
            title="Ungrounded Agent"
            badge="Shared backend"
            badgeColor="amber"
            bgColor="var(--bg-amber-panel)"
            borderColor="border-amber-900/30"
            messages={messages}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
          />
        </div>
        <div className="w-1/2">
          <Panel
            title="Ungrounded Agent Mirror"
            badge="Shared backend"
            badgeColor="teal"
            bgColor="var(--bg-teal-panel)"
            borderColor="border-teal-900/30"
            messages={messages}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
          />
        </div>
      </div>
    </div>
  );
}
