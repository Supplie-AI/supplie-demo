import type { DemoCapability } from "./demo-capabilities";
import {
  getGroundedCapabilities,
  getUngroundedCapabilities,
} from "./demo-capabilities";

export type DemoProvider = "openai" | "anthropic";
export type DemoAgentMode = "ungrounded" | "grounded";
export type DemoBadgeColor = "amber" | "teal";

export interface DemoPanelConfig {
  id: DemoAgentMode;
  title: string;
  badge: string;
  badgeColor: DemoBadgeColor;
  backendLabel: string;
  description: string;
  emptyStateTitle: string;
  emptyStateDetail: string;
  capabilities: DemoCapability[];
}

export function getDemoPanelConfigs(
  provider: DemoProvider,
  options?: { openAIConfigured?: boolean },
): Record<DemoAgentMode, DemoPanelConfig> {
  const openaiNativeToolsEnabled =
    provider === "openai" && (options?.openAIConfigured ?? true);

  return {
    ungrounded: {
      id: "ungrounded",
      title: "Ungrounded / Raw Agent",
      badge: openaiNativeToolsEnabled ? "OpenAI native tools" : "Reasoning only",
      badgeColor: "amber",
      backendLabel: openaiNativeToolsEnabled
        ? "OpenAI Responses raw agent"
        : "LangChain ungrounded agent",
      description: openaiNativeToolsEnabled
        ? "Ungrounded relative to Annona data, but the raw panel can use native OpenAI web search, bundled file workflows, and a sandboxed code interpreter."
        : "Answers from general reasoning only. No grounded Annona tools or native OpenAI tools are available on this side.",
      emptyStateTitle: "Raw comparison output appears here",
      emptyStateDetail: openaiNativeToolsEnabled
        ? "With an OpenAI model selected, this panel can show native web, file, and code tool use while staying ungrounded relative to Annona data."
        : "This panel stays ungrounded and should disclose when a question needs real data or tools.",
      capabilities: getUngroundedCapabilities(
        provider,
        options?.openAIConfigured,
      ),
    },
    grounded: {
      id: "grounded",
      title: "Grounded Annona Agent",
      badge: openaiNativeToolsEnabled ? "Superset + Annona" : "Annona tools",
      badgeColor: "teal",
      backendLabel: openaiNativeToolsEnabled
        ? "OpenAI Responses grounded Annona agent"
        : "Annona grounded demo agent",
      description: openaiNativeToolsEnabled
        ? "Shares the same native OpenAI web, file, and code baseline as the raw panel, then adds Annona grounding, calculators, and model-backed analysis over that same bundled baseline."
        : "Uses Annona-specific grounding and calculators over the static bundled baseline.",
      emptyStateTitle: "Grounded tool-backed answers appear here",
      emptyStateDetail: openaiNativeToolsEnabled
        ? "This panel can use the shared native baseline plus Annona tools, and it should say when a question falls outside the bundled Annona data."
        : "This panel can use Annona tools and should say when a question falls outside the bundled Annona data.",
      capabilities: getGroundedCapabilities(
        provider,
        options?.openAIConfigured,
      ),
    },
  };
}

export function getPublicDemoConfig(
  provider: DemoProvider = "openai",
  options?: { openAIConfigured?: boolean },
) {
  const openaiNativeToolsEnabled =
    provider === "openai" && (options?.openAIConfigured ?? true);
  const panels = getDemoPanelConfigs(provider, options);

  return {
    comparisonMode: "dual-agent",
    panels: [panels.ungrounded, panels.grounded] satisfies DemoPanelConfig[],
    sharedLimitations: [
      "No live ERP or warehouse connectivity.",
      openaiNativeToolsEnabled
        ? "Both panels share the same bundled CSV/reference baseline and the same native OpenAI web, sandbox, and file workflow surface."
        : "With the current provider selection, neither panel should claim native provider web search, code sandbox, or file workflows.",
      "Only the right panel adds Annona-specific grounding, calculators, and model-backed orchestration over that same bundled baseline.",
    ],
  };
}
