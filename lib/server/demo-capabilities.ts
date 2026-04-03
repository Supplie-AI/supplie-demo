export type DemoCapabilityId =
  | "streaming_text"
  | "annona_tools"
  | "annona_datasets"
  | "annona_calculators"
  | "annona_model_analysis"
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
      id: "annona_tools",
      label: "Annona grounded tools",
      enabled: false,
      availability: "planned",
      description:
        "The raw panel never uses grounded Annona tools and must stay ungrounded relative to Annona data.",
    },
    {
      id: "annona_datasets",
      label: "Annona demo datasets",
      enabled: false,
      availability: "planned",
      description:
        "The raw panel does not expose Annona-only snapshot datasets.",
    },
    {
      id: "annona_calculators",
      label: "Annona calculators",
      enabled: false,
      availability: "planned",
      description:
        "The raw panel can calculate generically, but it does not expose Annona-specific calculator tools.",
    },
    {
      id: "annona_model_analysis",
      label: "Annona model-backed analysis",
      enabled: false,
      availability: "planned",
      description:
        "The raw panel does not provide grounded Annona analysis over Annona-specific datasets.",
    },
    {
      id: "live_systems",
      label: "Live ERP / warehouse access",
      enabled: false,
      availability: "planned",
      description:
        "No live operational systems are connected. Do not imply access to current Annona data.",
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
          : "Available on both panels only when an OpenAI model is selected.",
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
          : "Available on both panels only when an OpenAI model is selected.",
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
          : "Available on both panels only when an OpenAI model is selected.",
    },
  ];
}

export function getGroundedCapabilities(
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
          ? "OpenAI Responses output is streamed from the grounded panel."
          : "LangChain text streaming is live for the grounded panel.",
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
      id: "annona_datasets",
      label: "Annona demo datasets",
      enabled: true,
      availability: "available",
      description:
        "The grounded panel can query the bundled Annona snapshot datasets for orders, stock risk, and supplier leakage.",
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
      id: "annona_model_analysis",
      label: "Annona model-backed analysis",
      enabled: true,
      availability: "available",
      description:
        "The grounded panel can synthesize Annona findings with model-backed analysis over Annona tools and datasets.",
    },
    {
      id: "live_systems",
      label: "Live ERP / warehouse access",
      enabled: false,
      availability: "planned",
      description:
        "No live operational systems are connected. Grounded answers are limited to the bundled Annona demo snapshot.",
    },
    {
      id: "native_web_search",
      label: "Native web search",
      enabled: openaiNativeToolsEnabled,
      availability: "available",
      description: openaiNativeToolsEnabled
        ? "OpenAI web search is available on the grounded panel as part of the shared native baseline."
        : provider === "openai"
          ? "OpenAI is selected, but the API key is not configured for this deployment."
          : "Only available when an OpenAI model is selected.",
    },
    {
      id: "code_sandbox",
      label: "Code sandbox",
      enabled: openaiNativeToolsEnabled,
      availability: "available",
      description: openaiNativeToolsEnabled
        ? "OpenAI code interpreter is available on the grounded panel with the same sandboxed baseline as the raw panel."
        : provider === "openai"
          ? "OpenAI is selected, but the API key is not configured for this deployment."
          : "Only available when an OpenAI model is selected.",
    },
    {
      id: "file_access",
      label: "Bundled file workflows",
      enabled: openaiNativeToolsEnabled,
      availability: "available",
      description: openaiNativeToolsEnabled
        ? "OpenAI file search and code interpreter can read the same bundled reference files as the raw panel."
        : provider === "openai"
          ? "OpenAI is selected, but the API key is not configured for this deployment."
          : "Only available when an OpenAI model is selected.",
    },
  ];
}

export function getCapabilitySummaryLines(
  capabilities: DemoCapability[],
): string[] {
  return capabilities.map((capability) => {
    const status = capability.enabled ? "available" : "not available";
    return `- ${capability.label}: ${status}. ${capability.description}`;
  });
}
