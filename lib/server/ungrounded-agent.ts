import {
  getCapabilitySummaryLines,
  getUngroundedCapabilities,
} from "./demo-capabilities";
import type { DemoProvider } from "./demo-config";
import { getChatModel } from "./chat-model";
import {
  createStreamingTextAgent,
  instrumentDemoAgent,
  type DemoAgent,
} from "./demo-agent-runner";
import { createOpenAINativeUngroundedAgent } from "./openai-native-ungrounded-agent";
import { logWarn } from "./app-logger.ts";

interface UngroundedAgentOptions {
  model: string;
  provider: DemoProvider;
}

const agentCache = new Map<string, DemoAgent>();

function buildSystemPrompt(): string {
  return [
    "You are the ungrounded AI agent for a supply-chain demo.",
    "Answer with general reasoning only.",
    "Never claim to have accessed live order data, searched the web, executed code, or opened files unless a real tool did that in this run.",
    "If the user asks for analysis that depends on unavailable data or tools, say exactly what is missing and what would need to be wired in.",
    "Keep answers direct and useful, but be explicit about capability limits.",
    "",
    "Current runtime capability status:",
    ...getCapabilitySummaryLines(getUngroundedCapabilities("anthropic")),
  ].join("\n");
}

export function assertProviderIsConfigured(provider: DemoProvider) {
  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    logWarn("provider_not_configured", {
      provider,
      missing_env: "ANTHROPIC_API_KEY",
    });
    throw new Error(
      "Anthropic API key not configured. Please contact the demo administrator.",
    );
  }

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    logWarn("provider_not_configured", {
      provider,
      missing_env: "OPENAI_API_KEY",
    });
    throw new Error(
      "OpenAI API key not configured. Please contact the demo administrator.",
    );
  }
}

export function getUngroundedAgent(options: UngroundedAgentOptions) {
  const cacheKey = `${options.provider}:${options.model}`;
  const cached = agentCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const baseAgent =
    options.provider === "openai"
      ? createOpenAINativeUngroundedAgent(options.model)
      : createStreamingTextAgent({
          model: getChatModel(options),
          systemPrompt: buildSystemPrompt(),
        });
  const agent = instrumentDemoAgent(baseAgent, {
    backend:
      options.provider === "openai"
        ? "OpenAI Responses raw agent"
        : "LangChain ungrounded agent",
    provider: options.provider,
    model: options.model,
    agentMode: "ungrounded",
  });

  agentCache.set(cacheKey, agent);
  return agent;
}
