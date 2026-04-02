import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import type { DemoAgentEvent } from "@/lib/server/demo-agent-runner";
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
import {
  getDemoPanelConfigs,
  type DemoAgentMode,
  type DemoProvider,
} from "@/lib/server/demo-config";
import type { DemoRequestMessage } from "@/lib/server/demo-agent-runner";

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
  const normalized: DemoRequestMessage[] =
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
  const backendLabel = getDemoPanelConfigs(provider)[agentMode].backendLabel;

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
        const eventStream = agent.streamResponse({
          messages,
          signal: req.signal,
        });

        for await (const event of eventStream) {
          handleAgentEvent(controller, event);
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

function handleAgentEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: DemoAgentEvent,
) {
  if (event.type === "text-delta") {
    controller.enqueue(encodeTextDelta(event.delta));
    return;
  }

  if (event.type === "tool-start") {
    controller.enqueue(
      encodeMetadata({
        type: "tool-start",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.args ?? {},
      }),
    );
    return;
  }

  if (event.type === "tool-end") {
    controller.enqueue(
      encodeMetadata({
        type: "tool-end",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        result: event.result,
      }),
    );
    return;
  }

  controller.enqueue(
    encodeMetadata({
      type: "tool-error",
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      error: formatToolError(event.error),
    }),
  );
}
