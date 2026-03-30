import type { DemoCapability } from "./demo-capabilities";
import {
  GROUNDED_CAPABILITIES,
  UNGROUNDED_CAPABILITIES,
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

export const DEMO_PANEL_CONFIGS: Record<DemoAgentMode, DemoPanelConfig> = {
  ungrounded: {
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
    capabilities: UNGROUNDED_CAPABILITIES,
  },
  grounded: {
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
    capabilities: GROUNDED_CAPABILITIES,
  },
};

export function getPublicDemoConfig() {
  return {
    comparisonMode: "dual-agent",
    panels: [
      DEMO_PANEL_CONFIGS.ungrounded,
      DEMO_PANEL_CONFIGS.grounded,
    ] satisfies DemoPanelConfig[],
    sharedLimitations: [
      "No live ERP or warehouse connectivity.",
      "No native web search.",
      "No code sandbox.",
      "No file access or downloads.",
    ],
  };
}
