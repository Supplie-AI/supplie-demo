import type { DemoAgentMode } from "./demo-config";
import {
  encodeDone,
  encodeMetadata,
  encodeTextDelta,
} from "./stream-protocol";
import {
  getDemoScenarioByPrompt,
  getScenarioExpectation,
} from "@/tests/fixtures/demo-scenarios.js";

interface PlaywrightMockChatResponseOptions {
  agentMode: DemoAgentMode;
  prompt: string;
  headers?: HeadersInit;
}

function chunkText(value: string, size: number) {
  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }

  return chunks;
}

export function isPlaywrightTestMode() {
  return process.env.PLAYWRIGHT_TEST_MODE === "1";
}

export function createPlaywrightMockChatResponse({
  agentMode,
  prompt,
  headers,
}: PlaywrightMockChatResponseOptions) {
  const normalizedPrompt = prompt.trim() || "No prompt provided.";
  const scenario = getDemoScenarioByPrompt(normalizedPrompt);
  const expectation = scenario
    ? getScenarioExpectation(scenario, agentMode)
    : undefined;
  const responseText =
    expectation?.canonicalAnswer ??
    (agentMode === "grounded"
      ? `Grounded mock response: the right panel did not find a canonical demo scenario for "${normalizedPrompt}".`
      : `Ungrounded mock response: the left panel did not find a canonical demo scenario for "${normalizedPrompt}".`);
  const toolInvocations = expectation?.mockToolInvocations ?? [];

  const stream = new ReadableStream({
    start(controller) {
      for (const toolInvocation of toolInvocations) {
        controller.enqueue(
          encodeMetadata({
            type: "tool-start",
            toolCallId: `playwright-${toolInvocation.toolName}`,
            toolName: toolInvocation.toolName,
            args: toolInvocation.args,
          }),
        );
        controller.enqueue(
          encodeMetadata({
            type: "tool-end",
            toolCallId: `playwright-${toolInvocation.toolName}`,
            toolName: toolInvocation.toolName,
            result: toolInvocation.result,
          }),
        );
      }

      for (const chunk of chunkText(responseText, 28)) {
        controller.enqueue(encodeTextDelta(chunk));
      }

      controller.enqueue(encodeDone());
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Vercel-AI-Data-Stream": "v1",
      ...Object.fromEntries(new Headers(headers).entries()),
    },
  });
}
