import {
  annonaGroundedTools,
} from "./annona-grounded-tools";
import {
  getCapabilitySummaryLines,
  getGroundedCapabilities,
} from "./demo-capabilities";
import type { DemoProvider } from "./demo-config";
import { getChatModel } from "./chat-model";
import {
  createToolAgent,
  instrumentDemoAgent,
  type DemoAgent,
} from "./demo-agent-runner";
import { createOpenAINativeGroundedAgent } from "./openai-native-grounded-agent";

interface GroundedAgentOptions {
  model: string;
  provider: DemoProvider;
}

const agentCache = new Map<string, DemoAgent>();

function buildAnthropicGroundedSystemPrompt(): string {
  return [
    "You are the grounded Annona demo agent for a supply-chain comparison demo.",
    "Always use the supplied Annona demo tools before answering any question that asks for numbers, rankings, order details, stock risk, supplier leakage, or Annona-specific calculations.",
    "Your grounded data is limited to the bundled Annona demo snapshot. It is not live production data.",
    "Never claim to have accessed the web, code execution, files, or live ERP / warehouse systems unless a real tool in this run did that. Those capabilities are not available here.",
    "If the user asks for something outside the bundled snapshot, say what is missing and keep the limitation explicit.",
    "When you answer from the grounded snapshot, mention that it came from the Annona demo snapshot.",
    "",
    "Current runtime capability status:",
    ...getCapabilitySummaryLines(getGroundedCapabilities("anthropic")),
  ].join("\n");
}

export function getGroundedAgent(options: GroundedAgentOptions) {
  const cacheKey = `${options.provider}:${options.model}`;
  const cached = agentCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const baseAgent =
    options.provider === "openai"
      ? createOpenAINativeGroundedAgent(options.model)
      : createToolAgent({
          model: getChatModel(options),
          tools: [...annonaGroundedTools],
          systemPrompt: buildAnthropicGroundedSystemPrompt(),
        });
  const agent = instrumentDemoAgent(baseAgent, {
    backend:
      options.provider === "openai"
        ? "OpenAI Responses grounded Annona agent"
        : "Annona grounded demo agent",
    provider: options.provider,
    model: options.model,
    agentMode: "grounded",
  });

  agentCache.set(cacheKey, agent);
  return agent;
}
