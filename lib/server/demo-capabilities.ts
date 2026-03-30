export type DemoCapabilityId =
  | "streaming_text"
  | "supplie_demo_tools"
  | "live_systems"
  | "native_web_search"
  | "code_sandbox"
  | "file_access";

export interface DemoCapability {
  id: DemoCapabilityId;
  label: string;
  enabled: boolean;
  availability: "available" | "planned";
  description: string;
}

export const UNGROUNDED_CAPABILITIES: DemoCapability[] = [
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
    enabled: false,
    availability: "planned",
    description:
      "The raw panel does not use grounded Supplie tools and must answer from general reasoning only.",
  },
  {
    id: "live_systems",
    label: "Live ERP / warehouse access",
    enabled: false,
    availability: "planned",
    description:
      "No live operational systems are connected. Do not imply access to current Supplie data.",
  },
  {
    id: "native_web_search",
    label: "Native web search",
    enabled: false,
    availability: "planned",
    description:
      "Not wired yet. Add a real search tool before exposing browsing in the UI.",
  },
  {
    id: "code_sandbox",
    label: "Code sandbox",
    enabled: false,
    availability: "planned",
    description:
      "Not wired yet. Do not imply code execution until a real sandbox is connected.",
  },
  {
    id: "file_access",
    label: "Files",
    enabled: false,
    availability: "planned",
    description:
      "Not wired yet. Do not imply file reads or downloads until file tooling exists.",
  },
];

export const GROUNDED_CAPABILITIES: DemoCapability[] = [
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
  {
    id: "live_systems",
    label: "Live ERP / warehouse access",
    enabled: false,
    availability: "planned",
    description:
      "No live operational systems are connected. Grounded answers are limited to the bundled demo snapshot.",
  },
  {
    id: "native_web_search",
    label: "Native web search",
    enabled: false,
    availability: "planned",
    description:
      "Not wired yet. Add a real search tool before exposing browsing in the UI.",
  },
  {
    id: "code_sandbox",
    label: "Code sandbox",
    enabled: false,
    availability: "planned",
    description:
      "Not wired yet. Do not imply code execution until a real sandbox is connected.",
  },
  {
    id: "file_access",
    label: "Files",
    enabled: false,
    availability: "planned",
    description:
      "Not wired yet. Do not imply file reads or downloads until file tooling exists.",
  },
];

export function getCapabilitySummaryLines(
  capabilities: DemoCapability[],
): string[] {
  return capabilities.map((capability) => {
    const status = capability.enabled ? "available" : "not available";
    return `- ${capability.label}: ${status}. ${capability.description}`;
  });
}
