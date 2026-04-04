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
      ? `Grounded mock response: the Annona snapshot points to Atlas Springs as the main source of margin leakage for "${normalizedPrompt}", and the right panel can also use the shared native provider tools when needed.`
      : `Ungrounded mock response: without grounded Annona data I can only hypothesize about "${normalizedPrompt}" based on general reasoning and any shared native provider tools.`;

  const stream = new ReadableStream({
    start(controller) {
      if (agentMode === "grounded") {
        controller.enqueue(
          encodeMetadata({
            type: "tool-start",
            toolCallId: "playwright-openai-file-search",
            toolName: "openai_file_search",
            args: {
              queries: ["global freight benchmark csv"],
            },
          }),
        );
        controller.enqueue(
          encodeMetadata({
            type: "tool-end",
            toolCallId: "playwright-openai-file-search",
            toolName: "openai_file_search",
            result: {
              status: "completed",
              queries: ["global freight benchmark csv"],
              results: [
                {
                  filename: "global_freight_benchmarks.csv",
                  score: 0.93,
                },
              ],
            },
          }),
        );
        controller.enqueue(
          encodeMetadata({
            type: "tool-start",
            toolCallId: "playwright-grounded-lookup",
            toolName: "annona_query_supplier_margin_leakage_snapshot",
            args: {
              top_n: 3,
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
            toolName: "annona_query_supplier_margin_leakage_snapshot",
            result: {
              supplier: "Atlas Springs",
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
