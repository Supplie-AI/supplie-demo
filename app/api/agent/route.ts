import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { tools as groundedTools } from "@/lib/tools";
import { NextResponse } from "next/server";
import { CSV_STRING } from "@/lib/csv-data";

export const runtime = "nodejs";
export const maxDuration = 120;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const AGENT_SYSTEM = `You are a supply chain analyst with access to tools that query live order data. Always use the available tools to get accurate data — never estimate or compute from memory. Write code to loop over results when needed. Show your reasoning after each tool result.`;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json();
  const prompt = body.prompt || (body.messages?.slice(-1)[0]?.content) || "";
  const model = body.model;
  const provider = body.provider;
  const startMs = Date.now();

  console.log(
    JSON.stringify({
      event: "request_start",
      panel: "agent",
      model,
      provider,
      timestamp: new Date().toISOString(),
    }),
  );

  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Anthropic API key not configured. Please contact the demo administrator.",
      },
      { status: 503 },
    );
  }

  try {
    const result = streamText({
      model:
        provider === "anthropic"
          ? anthropic(model ?? "claude-sonnet-4-5")
          : openai(model ?? "gpt-5.4-mini-2026-03-17"),
      system:
        AGENT_SYSTEM +
        (provider === "anthropic"
          ? `\n\nOrder data for reference:\n${CSV_STRING}`
          : ""),
      messages: [{ role: "user", content: prompt }],
      tools: groundedTools,
      onFinish: ({ usage }) => {
        console.log(
          JSON.stringify({
            event: "request_complete",
            panel: "agent",
            provider,
            total_ms: Date.now() - startMs,
            tokens: usage,
          }),
        );
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    const error = err as Error;
    console.log(
      JSON.stringify({
        event: "error",
        panel: "agent",
        error_type: error.name,
        message: error.message,
      }),
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
