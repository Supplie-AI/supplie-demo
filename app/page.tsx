"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Panel } from "@/components/Panel";
import { PromptButtons } from "@/components/PromptButtons";
import { ModelPicker } from "@/components/ModelPicker";
import { PasswordGate } from "@/components/PasswordGate";
import { useStreamingChat } from "@/hooks/useStreamingChat";

interface DemoConfig {
  anthropicAvailable: boolean;
  openaiAvailable?: boolean;
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
    "Both panels share the same bundled CSV/reference baseline and the same native OpenAI web, sandbox, and file workflow surface.",
    "Only the right panel has Annona-specific grounded tools, calculators, datasets, and grounded analysis over the bundled Annona snapshot.",
  ],
  panels: [
    {
      id: "ungrounded",
      title: "Ungrounded / Raw Agent",
      badge: "OpenAI native tools",
      badgeColor: "amber",
      backendLabel: "OpenAI Responses raw agent",
      description:
        "Ungrounded relative to Annona data, but the raw panel can use native OpenAI web search, bundled file workflows, and a sandboxed code interpreter.",
      emptyStateTitle: "Raw comparison output appears here",
      emptyStateDetail:
        "With an OpenAI model selected, this panel can show native web, file, and code tool use while staying ungrounded relative to Annona data.",
      capabilities: [
        {
          id: "streaming_text",
          label: "Streaming responses",
          enabled: true,
          availability: "available",
          description: "OpenAI Responses output is streamed from the raw panel.",
        },
        {
          id: "native_web_search",
          label: "Native web search",
          enabled: true,
          availability: "available",
          description:
            "OpenAI web search is wired for the raw panel when an OpenAI model is selected.",
        },
        {
          id: "code_sandbox",
          label: "Code sandbox",
          enabled: true,
          availability: "available",
          description:
            "OpenAI code interpreter is wired with a sandboxed container and outbound network disabled.",
        },
        {
          id: "file_access",
          label: "Bundled file workflows",
          enabled: true,
          availability: "available",
          description:
            "OpenAI file search and code interpreter can read a small bundled demo file set. This is not arbitrary local filesystem access or a user upload flow.",
        },
      ],
    },
    {
      id: "grounded",
      title: "Grounded Annona Agent",
      badge: "Superset + Annona",
      badgeColor: "teal",
      backendLabel: "OpenAI Responses grounded Annona agent",
      description:
        "Shares the same native OpenAI web, file, and code baseline as the raw panel, then adds Annona tools, calculators, datasets, and grounded analysis.",
      emptyStateTitle: "Grounded tool-backed answers appear here",
      emptyStateDetail:
        "This panel can use the shared native baseline plus Annona tools, and it should say when a question falls outside the bundled Annona data.",
      capabilities: [
        {
          id: "streaming_text",
          label: "Streaming responses",
          enabled: true,
          availability: "available",
          description:
            "OpenAI Responses output is streamed from the grounded panel.",
        },
        {
          id: "native_web_search",
          label: "Native web search",
          enabled: true,
          availability: "available",
          description:
            "OpenAI web search is available on the grounded panel as part of the shared native baseline.",
        },
        {
          id: "code_sandbox",
          label: "Code sandbox",
          enabled: true,
          availability: "available",
          description:
            "OpenAI code interpreter is available on the grounded panel with the same sandboxed baseline as the raw panel.",
        },
        {
          id: "file_access",
          label: "Bundled file workflows",
          enabled: true,
          availability: "available",
          description:
            "OpenAI file search and code interpreter can read the same bundled reference files as the raw panel.",
        },
        {
          id: "annona_tools",
          label: "Annona grounded tools",
          enabled: true,
          availability: "available",
          description:
            "The grounded panel exposes Annona-specific tool calls over the bundled Annona demo snapshot.",
        },
        {
          id: "annona_calculators",
          label: "Annona calculators",
          enabled: true,
          availability: "available",
          description:
            "The grounded panel adds Annona-specific calculator tools on top of the shared native provider tooling.",
        },
        {
          id: "annona_datasets",
          label: "Annona demo datasets",
          enabled: true,
          availability: "available",
          description:
            "The grounded panel can query the bundled Annona snapshot datasets for orders, stock risk, and supplier leakage.",
        },
        {
          id: "annona_model_analysis",
          label: "Annona model-backed analysis",
          enabled: true,
          availability: "available",
          description:
            "The grounded panel can synthesize Annona findings with model-backed analysis over Annona tools and datasets.",
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
    fetch(`/api/config?provider=${provider}`)
      .then((response) => response.json())
      .then((data: DemoConfig) => setConfig(data))
      .catch(() => setConfig(null));
  }, [provider]);

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
      data-testid="demo-app"
      className="min-h-screen px-4 py-4 sm:px-5"
      style={{
        background: "transparent",
        fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1540px] flex-col rounded-[32px] border border-white/10 bg-[var(--bg-shell)] p-3 shadow-[0_32px_120px_rgba(2,6,14,0.5)] backdrop-blur-xl">
        <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(11,17,25,0.92),rgba(8,13,20,0.92))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-teal-300/20 bg-[linear-gradient(135deg,rgba(20,184,166,0.22),rgba(56,189,248,0.18))] shadow-[0_12px_30px_rgba(20,184,166,0.18)]">
                <div className="h-3 w-3 rounded-full bg-teal-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Annona.ai
                  </span>
                  <span
                    className="text-[11px] uppercase tracking-[0.24em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Grounding Demo
                  </span>
                </div>
                <div className="text-sm text-slate-400">
                  Demo-quality side-by-side review of raw reasoning vs grounded
                  Annona output.
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <ModelPicker value={model} onChange={handleModelChange} />
              <button
                onClick={handleClear}
                className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs text-slate-300 transition-all hover:border-white/20 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1.25fr_0.9fr]">
            <PromptButtons
              onPrompt={handlePrompt}
              disabled={ungroundedChat.isLoading || groundedChat.isLoading}
            />

            <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(9,14,22,0.86),rgba(9,13,20,0.74))] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Live Comparison
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-100">
                Left panel stays raw on {ungroundedPanel.backendLabel}. Right
                panel runs {groundedPanel.backendLabel} with the same native
                tool baseline plus Annona tools and datasets.
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[rgba(243,166,59,0.18)] bg-[rgba(243,166,59,0.08)] px-3 py-1 text-amber-200">
                  Raw: {comparisonMessage.ungroundedCapabilities}
                </span>
                <span className="rounded-full border border-[rgba(46,211,196,0.18)] bg-[rgba(46,211,196,0.08)] px-3 py-1 text-teal-200">
                  Grounded: {comparisonMessage.groundedCapabilities}
                </span>
              </div>
              <div className="mt-3 text-xs leading-5 text-slate-400">
                Shared limits: {comparisonMessage.sharedLimitations}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <Panel
            panelId="ungrounded"
            title={ungroundedPanel.title}
            badge={ungroundedPanel.badge}
            badgeColor={ungroundedPanel.badgeColor}
            bgColor="var(--bg-amber-panel)"
            borderColor="border-amber-300/14"
            note={ungroundedPanel.description}
            emptyStateTitle={ungroundedPanel.emptyStateTitle}
            emptyStateDetail={ungroundedPanel.emptyStateDetail}
            messages={ungroundedChat.messages}
            isLoading={ungroundedChat.isLoading}
            error={ungroundedChat.error}
            onRetry={handleRetryUngrounded}
          />
          <Panel
            panelId="grounded"
            title={groundedPanel.title}
            badge={groundedPanel.badge}
            badgeColor={groundedPanel.badgeColor}
            bgColor="var(--bg-teal-panel)"
            borderColor="border-teal-300/14"
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
