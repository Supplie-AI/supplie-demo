export type DemoCapabilityId =
  | "streaming_text"
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

export const DEMO_CAPABILITIES: DemoCapability[] = [
  {
    id: "streaming_text",
    label: "Streaming responses",
    enabled: true,
    availability: "available",
    description: "LangChain agent text streaming is live in this slice.",
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

export function getAgentTools() {
  // Keep this empty until the actual capabilities are implemented.
  // The UI and system prompt both surface these as unavailable so the demo
  // stays honest while the backend structure remains ready for expansion.
  return [];
}

export function getCapabilitySummaryLines(): string[] {
  return DEMO_CAPABILITIES.map((capability) => {
    const status = capability.enabled ? "available" : "not available";
    return `- ${capability.label}: ${status}. ${capability.description}`;
  });
}
