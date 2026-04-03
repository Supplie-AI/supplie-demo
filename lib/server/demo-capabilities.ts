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

export function getUngroundedCapabilities(
  provider: "openai" | "anthropic",
  openAIConfigured = provider === "openai",
): DemoCapability[] {
  const openaiNativeToolsEnabled = provider === "openai" && openAIConfigured;

  return [
    {
      id: "streaming_text",
      label: "Streaming responses",
      enabled: true,
      availability: "available",
      description:
        provider === "openai"
          ? "OpenAI Responses output is streamed from the raw panel."
          : "LangChain text streaming is live for the raw panel.",
    },
    {
      id: "supplie_demo_tools",
      label: "Supplie demo snapshot tools",
      enabled: false,
      availability: "planned",
      description:
        "The raw panel never uses grounded Supplie snapshot tools and must stay ungrounded relative to Supplie data.",
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
      enabled: openaiNativeToolsEnabled,
      availability: "available",
      description: openaiNativeToolsEnabled
        ? "OpenAI web search is wired for the raw panel when an OpenAI model is selected."
        : provider === "openai"
          ? "OpenAI is selected, but the API key is not configured for this deployment."
          : "Only available on the raw panel when an OpenAI model is selected.",
    },
    {
      id: "code_sandbox",
      label: "Code sandbox",
      enabled: openaiNativeToolsEnabled,
      availability: "available",
      description: openaiNativeToolsEnabled
        ? "OpenAI code interpreter is wired with a sandboxed container and outbound network disabled."
        : provider === "openai"
          ? "OpenAI is selected, but the API key is not configured for this deployment."
          : "Only available on the raw panel when an OpenAI model is selected.",
    },
    {
      id: "file_access",
      label: "Bundled file workflows",
      enabled: openaiNativeToolsEnabled,
      availability: "available",
      description: openaiNativeToolsEnabled
        ? "OpenAI file search and code interpreter can read a small bundled demo file set. This is not arbitrary local filesystem access or a user upload flow."
        : provider === "openai"
          ? "OpenAI is selected, but the API key is not configured for this deployment."
          : "Only available on the raw panel when an OpenAI model is selected.",
    },
  ];
}

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
      "Not available on the grounded panel. It stays limited to bundled Supplie snapshot tools only.",
  },
  {
    id: "code_sandbox",
    label: "Code sandbox",
    enabled: false,
    availability: "planned",
    description:
      "Not available on the grounded panel. It does not execute code.",
  },
  {
    id: "file_access",
    label: "Bundled file workflows",
    enabled: false,
    availability: "planned",
    description:
      "Not available on the grounded panel. It does not expose OpenAI file workflows or arbitrary file reads.",
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
