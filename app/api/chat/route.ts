import { AIMessageChunk } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getGroundedAgent } from "@/lib/server/grounded-agent";
import {
  createPlaywrightMockChatResponse,
  isPlaywrightTestMode,
} from "@/lib/server/playwright-mock-chat";
import {
  encodeDone,
  encodeError,
  encodeMetadata,
  encodeTextDelta,
} from "@/lib/server/stream-protocol";
import {
  assertProviderIsConfigured,
  getUngroundedAgent,
} from "@/lib/server/ungrounded-agent";
import { DEMO_PANEL_CONFIGS, type DemoAgentMode, type DemoProvider } from "@/lib/server/demo-config";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ChatRequestBody {
  prompt?: string;
  model?: string;
  provider?: DemoProvider;
  agentMode?: DemoAgentMode;
  messages?: Array<{
    role?: string;
    content?: string;
  }>;
}

function normalizeMessages(body: ChatRequestBody) {
  const normalized =
    body.messages
      ?.filter(
        (message): message is { role: string; content: string } =>
          typeof message?.role === "string" &&
          typeof message?.content === "string" &&
          message.content.trim().length > 0,
      )
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      })) ?? [];

  const prompt = body.prompt?.trim();
  if (prompt) {
    const lastMessage = normalized.at(-1);
    if (!lastMessage || lastMessage.content !== prompt) {
      normalized.push({ role: "user", content: prompt });
    }
  }

  return normalized;
}

function extractTextDelta(chunk: unknown): string {
  if (!AIMessageChunk.isInstance(chunk)) {
    return "";
  }

  if (typeof chunk.content === "string") {
    return chunk.content;
  }

  if (!Array.isArray(chunk.content)) {
    return "";
  }

  return chunk.content
    .map((block) => {
      if (typeof block === "string") {
        return block;
      }

      if (
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      ) {
        return block.text;
      }

      return "";
    })
    .join("");
}

function formatToolError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? "Tool execution failed.");
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = (await req.json()) as ChatRequestBody;
  const model = body.model ?? "gpt-5.4-mini-2026-03-17";
  const provider = body.provider ?? "openai";
  const agentMode = body.agentMode ?? "ungrounded";
  const messages = normalizeMessages(body);

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "A prompt is required." },
      { status: 400 },
    );
  }

  if (isPlaywrightTestMode()) {
    return createPlaywrightMockChatResponse({
      agentMode,
      prompt: messages.at(-1)?.content ?? body.prompt ?? "",
    });
  }

  try {
    assertProviderIsConfigured(provider);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Provider not configured.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const startMs = Date.now();
  const agent =
    agentMode === "grounded"
      ? getGroundedAgent({ model, provider })
      : getUngroundedAgent({ model, provider });
  const backendLabel = DEMO_PANEL_CONFIGS[agentMode].backendLabel;

  console.log(
    JSON.stringify({
      event: "request_start",
      route: "chat",
      backend: backendLabel,
      agent_mode: agentMode,
      provider,
      model,
      timestamp: new Date().toISOString(),
    }),
  );

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const eventStream = agent.streamEvents(
          { messages },
          {
            signal: req.signal,
            version: "v2",
          },
        );

        for await (const event of eventStream) {
          if (event.event === "on_chat_model_stream") {
            const delta = extractTextDelta(event.data?.chunk);
            if (delta) {
              controller.enqueue(encodeTextDelta(delta));
            }
          }

          if (event.event === "on_tool_start") {
            controller.enqueue(
              encodeMetadata({
                type: "tool-start",
                toolCallId: event.run_id,
                toolName: event.name,
                args: event.data?.input ?? {},
              }),
            );
          }

          if (event.event === "on_tool_end") {
            controller.enqueue(
              encodeMetadata({
                type: "tool-end",
                toolCallId: event.run_id,
                toolName: event.name,
                result: event.data?.output,
              }),
            );
          }

          if (event.event === "on_tool_error") {
            controller.enqueue(
              encodeMetadata({
                type: "tool-error",
                toolCallId: event.run_id,
                toolName: event.name,
                error: formatToolError(event.data?.error),
              }),
            );
          }
        }

        controller.enqueue(encodeDone());

        console.log(
          JSON.stringify({
            event: "request_complete",
            route: "chat",
            backend: backendLabel,
            agent_mode: agentMode,
            provider,
            model,
            total_ms: Date.now() - startMs,
          }),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Internal streaming error.";
        controller.enqueue(encodeError(message));

        console.error(
          JSON.stringify({
            event: "request_error",
            route: "chat",
            backend: backendLabel,
            agent_mode: agentMode,
            provider,
            model,
            message,
          }),
        );
      } finally {
        controller.close();
      }
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
