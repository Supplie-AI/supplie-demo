import {
  getCapabilitySummaryLines,
  getUngroundedCapabilities,
} from "./demo-capabilities";
import type { DemoProvider } from "./demo-config";
import { getChatModel } from "./chat-model";
import { createStreamingTextAgent } from "./demo-agent-runner";
import { createOpenAINativeUngroundedAgent } from "./openai-native-ungrounded-agent";

interface UngroundedAgentOptions {
  model: string;
  provider: DemoProvider;
}

const agentCache = new Map<
  string,
  ReturnType<typeof createStreamingTextAgent>
>();

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
    throw new Error(
      "Anthropic API key not configured. Please contact the demo administrator.",
    );
  }

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
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

  const agent =
    options.provider === "openai"
      ? createOpenAINativeUngroundedAgent(options.model)
      : createStreamingTextAgent({
          model: getChatModel(options),
          systemPrompt: buildSystemPrompt(),
        });

  agentCache.set(cacheKey, agent);
  return agent;
}
