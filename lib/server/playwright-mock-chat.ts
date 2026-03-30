import type { DemoAgentMode } from "./demo-config";
import {
  encodeDone,
  encodeMetadata,
  encodeTextDelta,
} from "./stream-protocol";

interface PlaywrightMockChatResponseOptions {
  agentMode: DemoAgentMode;
  prompt: string;
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
}: PlaywrightMockChatResponseOptions) {
  const normalizedPrompt = prompt.trim() || "No prompt provided.";
  const responseText =
    agentMode === "grounded"
      ? `Grounded mock response: the Supplie snapshot points to Suspension King as the main source of margin leakage for "${normalizedPrompt}".`
      : `Ungrounded mock response: without grounded data I can only hypothesize about "${normalizedPrompt}" based on general reasoning.`;

  const stream = new ReadableStream({
    start(controller) {
      if (agentMode === "grounded") {
        controller.enqueue(
          encodeMetadata({
            type: "tool-start",
            toolCallId: "playwright-grounded-lookup",
            toolName: "query_supplie_snapshot",
            args: {
              question: normalizedPrompt,
              dataset: "static-demo-snapshot",
            },
          }),
        );
      }

      for (const chunk of chunkText(responseText, 28)) {
        controller.enqueue(encodeTextDelta(chunk));
      }

      if (agentMode === "grounded") {
        controller.enqueue(
          encodeMetadata({
            type: "tool-end",
            toolCallId: "playwright-grounded-lookup",
            toolName: "query_supplie_snapshot",
            result: {
              supplier: "Suspension King",
              finding: "margin_leakage_rank_1",
            },
          }),
        );
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
    },
  });
}
