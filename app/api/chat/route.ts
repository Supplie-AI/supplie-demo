import { NextResponse } from "next/server";
import {
  createRequestContext,
  createResponseHeaders,
  logCapabilitySnapshot,
  logError,
  logInfo,
  logWarn,
  serializeError,
  updateRequestContext,
  withRequestContext,
} from "@/lib/server/app-logger";
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
  const requestContext = createRequestContext(req, {
    route: "chat",
    method: "POST",
  });

  return withRequestContext(requestContext, async () => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
      logWarn("api_request_rate_limited", {
        route: "chat",
        forwarded_for_present: req.headers.has("x-forwarded-for"),
      });
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: createResponseHeaders(),
        },
      );
    }

    let body: ChatRequestBody;
    try {
      body = (await req.json()) as ChatRequestBody;
    } catch (error) {
      logWarn("api_request_invalid_json", {
        route: "chat",
        error: serializeError(error),
      });
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        {
          status: 400,
          headers: createResponseHeaders(),
        },
      );
    }

    const model = body.model ?? "gpt-5.4-mini-2026-03-17";
    const provider = body.provider ?? "openai";
    const agentMode = body.agentMode ?? "ungrounded";
    const messages = normalizeMessages(body);
    const openAIConfigured =
      provider === "openai" &&
      (isPlaywrightTestMode() || !!process.env.OPENAI_API_KEY);
    const panelConfig = getDemoPanelConfigs(provider, {
      openAIConfigured,
    })[agentMode];
    const backendLabel = panelConfig.backendLabel;

    updateRequestContext({
      provider,
      agentMode,
      model,
      backend: backendLabel,
    });

    logInfo("api_request_started", {
      route: "chat",
      backend: backendLabel,
      provider,
      model,
      agent_mode: agentMode,
      message_count: messages.length,
      last_user_message_chars: messages.at(-1)?.content.length ?? 0,
    });
    logCapabilitySnapshot({
      provider,
      agentMode,
      backend: backendLabel,
      capabilities: panelConfig.capabilities,
    });

    if (messages.length === 0) {
      logWarn("api_request_rejected", {
        route: "chat",
        reason: "missing_prompt",
      });
      return NextResponse.json(
        { error: "A prompt is required." },
        {
          status: 400,
          headers: createResponseHeaders(),
        },
      );
    }

    if (isPlaywrightTestMode()) {
      logInfo("api_request_mocked", {
        route: "chat",
        backend: "playwright-mock",
        agent_mode: agentMode,
      });
      return createPlaywrightMockChatResponse({
        agentMode,
        prompt: messages.at(-1)?.content ?? body.prompt ?? "",
        headers: createResponseHeaders(),
      });
    }

    try {
      assertProviderIsConfigured(provider);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Provider not configured.";
      logWarn("api_request_provider_unavailable", {
        route: "chat",
        provider,
        error: serializeError(error),
      });
      return NextResponse.json(
        { error: message },
        {
          status: 503,
          headers: createResponseHeaders(),
        },
      );
    }

    const startMs = Date.now();
    const agent =
      agentMode === "grounded"
        ? getGroundedAgent({ model, provider })
        : getUngroundedAgent({ model, provider });

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

          logInfo("api_request_completed", {
            route: "chat",
            backend: backendLabel,
            provider,
            model,
            agent_mode: agentMode,
            duration_ms: Date.now() - startMs,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Internal streaming error.";
          controller.enqueue(encodeError(message));
          logError("api_request_failed", {
            route: "chat",
            backend: backendLabel,
            provider,
            model,
            agent_mode: agentMode,
            duration_ms: Date.now() - startMs,
            error: serializeError(error),
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: createResponseHeaders({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Vercel-AI-Data-Stream": "v1",
      }),
    });
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
    logInfo("tool_call_started", {
      tool_call_id: event.toolCallId,
      tool_name: event.toolName,
      args: event.args,
    });
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
    logInfo("tool_call_completed", {
      tool_call_id: event.toolCallId,
      tool_name: event.toolName,
      result: event.result,
    });
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

  logWarn("tool_call_failed", {
    tool_call_id: event.toolCallId,
    tool_name: event.toolName,
    error: event.error,
  });
  controller.enqueue(
    encodeMetadata({
      type: "tool-error",
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      error: formatToolError(event.error),
    }),
  );
}
