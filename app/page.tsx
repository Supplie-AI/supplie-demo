"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Panel } from "@/components/Panel";
import { PromptButtons } from "@/components/PromptButtons";
import { ModelPicker } from "@/components/ModelPicker";
import { PasswordGate } from "@/components/PasswordGate";
import { useStreamingChat } from "@/hooks/useStreamingChat";

interface DemoConfig {
  anthropicAvailable: boolean;
  comparisonMode: string;
  sharedLimitations: string[];
  panels: Array<{
    id: "ungrounded" | "grounded";
    title: string;
    badge: string;
    badgeColor: "amber" | "teal";
    backendLabel: string;
    description: string;
    emptyStateTitle: string;
    emptyStateDetail: string;
    capabilities: Array<{
      id: string;
      label: string;
      enabled: boolean;
      availability: "available" | "planned";
      description: string;
    }>;
  }>;
}

const DEFAULT_CONFIG: Omit<DemoConfig, "anthropicAvailable"> = {
  comparisonMode: "dual-agent",
  sharedLimitations: [
    "No live ERP or warehouse connectivity.",
    "No native web search.",
    "No code sandbox.",
    "No file access or downloads.",
  ],
  panels: [
    {
      id: "ungrounded",
      title: "Ungrounded / Raw Agent",
      badge: "Reasoning only",
      badgeColor: "amber",
      backendLabel: "LangChain ungrounded agent",
      description:
        "Answers from general reasoning only. No grounded Supplie data tools are available on this side.",
      emptyStateTitle: "Raw reasoning appears here",
      emptyStateDetail:
        "This panel stays ungrounded and should disclose when a question needs real data or tools.",
      capabilities: [
        {
          id: "streaming_text",
          label: "Streaming responses",
          enabled: true,
          availability: "available",
          description: "LangChain agent text streaming is live in this slice.",
        },
      ],
    },
    {
      id: "grounded",
      title: "Grounded Supplie Agent",
      badge: "Supplie tools",
      badgeColor: "teal",
      backendLabel: "Supplie grounded demo agent",
      description:
        "Uses built-in Supplie demo tools against a static bundled snapshot. No live ERP, browsing, code execution, or file access.",
      emptyStateTitle: "Grounded tool-backed answers appear here",
      emptyStateDetail:
        "This panel can query the bundled Supplie demo snapshot and should say when a question falls outside that data.",
      capabilities: [
        {
          id: "streaming_text",
          label: "Streaming responses",
          enabled: true,
          availability: "available",
          description: "LangChain agent text streaming is live in this slice.",
        },
        {
          id: "supplie_demo_tools",
          label: "Supplie demo snapshot tools",
          enabled: true,
          availability: "available",
          description:
            "The grounded panel can query built-in Supplie demo data tools against a static snapshot bundled with this app.",
        },
      ],
    },
  ],
};

interface DemoCapability {
  id: string;
  label: string;
  enabled: boolean;
  availability: "available" | "planned";
  description: string;
}

interface DemoPanelConfig {
  id: "ungrounded" | "grounded";
  title: string;
  badge: string;
  badgeColor: "amber" | "teal";
  backendLabel: string;
  description: string;
  emptyStateTitle: string;
  emptyStateDetail: string;
  capabilities: DemoCapability[];
}

function formatCapabilityList(capabilities: DemoCapability[]) {
  const enabled = capabilities.filter((capability) => capability.enabled);
  return enabled.length > 0
    ? enabled.map((capability) => capability.label).join(", ")
    : "No runtime capabilities are enabled.";
}

function findPanelConfig(
  config: DemoConfig | null,
  panelId: DemoPanelConfig["id"],
): DemoPanelConfig {
  return (
    config?.panels.find((panel) => panel.id === panelId) ??
    DEFAULT_CONFIG.panels.find((panel) => panel.id === panelId)!
  );
}

function getLastUserMessageContent(
  messages: ReturnType<typeof useStreamingChat>["messages"],
) {
  return [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;
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

  const ungroundedChat = useStreamingChat({
    api: "/api/chat",
    body: { model, provider, agentMode: "ungrounded" },
    headers: useCallback(
      () => ({ Authorization: `Bearer ${getToken()}` }),
      [getToken],
    ),
    onError: handleChatError,
  });

  const groundedChat = useStreamingChat({
    api: "/api/chat",
    body: { model, provider, agentMode: "grounded" },
    headers: useCallback(
      () => ({ Authorization: `Bearer ${getToken()}` }),
      [getToken],
    ),
    onError: handleChatError,
  });

  const handleClear = useCallback(() => {
    ungroundedChat.stop();
    groundedChat.stop();
    ungroundedChat.setMessages([]);
    groundedChat.setMessages([]);
  }, [groundedChat, ungroundedChat]);

  const handleModelChange = useCallback(
    (modelId: string, newProvider: "openai" | "anthropic") => {
      ungroundedChat.stop();
      groundedChat.stop();
      setModel(modelId);
      setProvider(newProvider);
      ungroundedChat.setMessages([]);
      groundedChat.setMessages([]);
    },
    [groundedChat, ungroundedChat],
  );

  const handlePrompt = useCallback(
    (prompt: string) => {
      void Promise.allSettled([
        ungroundedChat.append({ role: "user", content: prompt }),
        groundedChat.append({ role: "user", content: prompt }),
      ]);
    },
    [groundedChat, ungroundedChat],
  );

  useEffect(() => {
    fetch("/api/config")
      .then((response) => response.json())
      .then((data: DemoConfig) => setConfig(data))
      .catch(() => setConfig(null));
  }, []);

  const ungroundedPanel = useMemo(
    () => findPanelConfig(config, "ungrounded"),
    [config],
  );
  const groundedPanel = useMemo(
    () => findPanelConfig(config, "grounded"),
    [config],
  );

  const comparisonMessage = useMemo(() => {
    const sharedLimitations = (
      config?.sharedLimitations ?? DEFAULT_CONFIG.sharedLimitations
    ).join(" ");

    return {
      ungroundedCapabilities: formatCapabilityList(
        ungroundedPanel.capabilities,
      ),
      groundedCapabilities: formatCapabilityList(groundedPanel.capabilities),
      sharedLimitations,
    };
  }, [config, groundedPanel.capabilities, ungroundedPanel.capabilities]);

  const handleRetryUngrounded = useCallback(() => {
    const lastUser = getLastUserMessageContent(ungroundedChat.messages);
    if (lastUser) {
      void ungroundedChat.append({ role: "user", content: lastUser });
    }
  }, [ungroundedChat]);

  const handleRetryGrounded = useCallback(() => {
    const lastUser = getLastUserMessageContent(groundedChat.messages);
    if (lastUser) {
      void groundedChat.append({ role: "user", content: lastUser });
    }
  }, [groundedChat]);

  if (!authChecked) return null;

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

      <PromptButtons
        onPrompt={handlePrompt}
        disabled={ungroundedChat.isLoading || groundedChat.isLoading}
      />

      <div className="px-5 py-3 border-b border-white/5 bg-slate-950/30">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Live Comparison
        </div>
        <div className="mt-1 text-sm text-slate-200">
          Left panel stays raw on {ungroundedPanel.backendLabel}. Right panel
          runs {groundedPanel.backendLabel} with bundled Supplie snapshot tools.
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Raw panel: {comparisonMessage.ungroundedCapabilities}
        </div>
        <div className="mt-1 text-xs text-teal-300">
          Grounded panel: {comparisonMessage.groundedCapabilities}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Shared limits: {comparisonMessage.sharedLimitations}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2">
          <Panel
            title={ungroundedPanel.title}
            badge={ungroundedPanel.badge}
            badgeColor={ungroundedPanel.badgeColor}
            bgColor="var(--bg-amber-panel)"
            borderColor="border-amber-900/30"
            note={ungroundedPanel.description}
            emptyStateTitle={ungroundedPanel.emptyStateTitle}
            emptyStateDetail={ungroundedPanel.emptyStateDetail}
            messages={ungroundedChat.messages}
            isLoading={ungroundedChat.isLoading}
            error={ungroundedChat.error}
            onRetry={handleRetryUngrounded}
          />
        </div>
        <div className="w-1/2">
          <Panel
            title={groundedPanel.title}
            badge={groundedPanel.badge}
            badgeColor={groundedPanel.badgeColor}
            bgColor="var(--bg-teal-panel)"
            borderColor="border-teal-900/30"
            note={groundedPanel.description}
            emptyStateTitle={groundedPanel.emptyStateTitle}
            emptyStateDetail={groundedPanel.emptyStateDetail}
            messages={groundedChat.messages}
            isLoading={groundedChat.isLoading}
            error={groundedChat.error}
            onRetry={handleRetryGrounded}
          />
        </div>
      </div>
    </div>
  );
}
