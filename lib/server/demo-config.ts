import type { DemoCapability } from "./demo-capabilities";
import {
  GROUNDED_CAPABILITIES,
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
  const openaiRaw =
    provider === "openai" && (options?.openAIConfigured ?? true);

  return {
    ungrounded: {
      id: "ungrounded",
      title: "Ungrounded / Raw Agent",
      badge: openaiRaw ? "OpenAI native tools" : "Reasoning only",
      badgeColor: "amber",
      backendLabel: openaiRaw
        ? "OpenAI Responses raw agent"
        : "LangChain ungrounded agent",
      description: openaiRaw
        ? "Ungrounded relative to Annona data, but the raw panel can use native OpenAI web search, bundled file workflows, and a sandboxed code interpreter."
        : "Answers from general reasoning only. No grounded Annona data tools or OpenAI native tools are available on this side.",
      emptyStateTitle: "Raw comparison output appears here",
      emptyStateDetail: openaiRaw
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
      badge: "Annona tools",
      badgeColor: "teal",
      backendLabel: "Annona grounded demo agent",
      description:
        "Uses built-in Annona demo tools against a static bundled snapshot. No live ERP, browsing, code execution, or file access.",
      emptyStateTitle: "Grounded tool-backed answers appear here",
      emptyStateDetail:
        "This panel can query the bundled Annona demo snapshot and should say when a question falls outside that data.",
      capabilities: GROUNDED_CAPABILITIES,
    },
  };
}

export function getPublicDemoConfig(
  provider: DemoProvider = "openai",
  options?: { openAIConfigured?: boolean },
) {
  const panels = getDemoPanelConfigs(provider, options);

  return {
    comparisonMode: "dual-agent",
    panels: [panels.ungrounded, panels.grounded] satisfies DemoPanelConfig[],
    sharedLimitations: [
      "No live ERP or warehouse connectivity.",
      "The grounded panel is limited to the bundled Annona snapshot and does not browse, execute code, or use OpenAI file workflows.",
      "The raw panel never has live Annona systems or grounded Annona snapshot tools.",
    ],
  };
}
