import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
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

async function handleOpenAI(model: string, prompt: string): Promise<Response> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const startMs = Date.now();

  const fileId = process.env.OPENAI_CSV_FILE_ID;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] = fileId
    ? [
        {
          type: "code_interpreter",
          container: { type: "auto", file_ids: [fileId] },
        },
      ]
    : [{ type: "code_interpreter", container: { type: "auto" } }];

  const systemMsg = fileId
    ? "The order data is in orders.csv in your sandbox. Use Python to analyse it. Write output reports as files."
    : `You are a supply chain analyst. The order data is below as CSV — load it into pandas from a string.\n\nCSV DATA:\n${CSV_STRING}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (client.responses as any).create({
          model,
          instructions: systemMsg,
          input: prompt,
          tools,
          stream: true,
        });

        const outputFiles: {
          fileId: string;
          containerId: string;
          name: string;
        }[] = [];

        for await (const event of response) {
          const evType = (event as { type: string }).type;

          if (evType === "response.output_text.delta") {
            const delta = (event as { delta: string }).delta ?? "";
            if (delta) {
              controller.enqueue(
                encoder.encode(`0:${JSON.stringify(delta)}\n`),
              );
            }
          }

          if (evType === "response.output_item.done") {
            const item = (event as { item: Record<string, unknown> }).item;
            if (item?.type === "code_interpreter_call") {
              const outputs =
                (item.outputs as Array<{ type: string; url?: string }>) ?? [];
              const containerId = (item.container_id as string) ?? "";
              for (const out of outputs) {
                if (out.type === "image" && out.url) {
                  const m = out.url.match(/file-[a-zA-Z0-9]+/);
                  if (m)
                    outputFiles.push({
                      fileId: m[0],
                      containerId,
                      name: "output.png",
                    });
                }
              }
            }
          }
        }

        if (outputFiles.length > 0) {
          const meta = JSON.stringify({
            outputFiles: outputFiles.map((f) => ({ ...f, provider: "openai" })),
          });
          controller.enqueue(encoder.encode(`8:${JSON.stringify([meta])}\n`));
        }

        controller.enqueue(
          encoder.encode(
            `d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`,
          ),
        );
        console.log(
          JSON.stringify({
            event: "request_complete",
            panel: "raw",
            provider: "openai",
            total_ms: Date.now() - startMs,
          }),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`3:${JSON.stringify(msg)}\n`));
        console.error("raw/openai error", msg);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "X-Vercel-AI-Data-Stream": "v1",
      "Cache-Control": "no-cache",
    },
  });
}

async function handleAnthropic(
  model: string,
  prompt: string,
): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Anthropic API key not configured. Please contact the demo administrator.",
      },
      { status: 503 },
    );
  }

  const client = new Anthropic({ apiKey });
  const startMs = Date.now();
  const fileId = process.env.ANTHROPIC_CSV_FILE_ID;

  const systemMsg = fileId
    ? "The order data is provided as a file. Use the code execution tool to analyse it with Python."
    : `You are a supply chain analyst. The order data is provided as CSV below. Use code execution to analyse it.\n\nCSV DATA:\n${CSV_STRING}`;

  type UserContent = Anthropic.MessageParam["content"];
  const userContent: UserContent = fileId
    ? [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { type: "document", source: { type: "file", file_id: fileId } } as any,
        { type: "text", text: prompt },
      ]
    : prompt;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.beta.messages.create(
          {
            model,
            max_tokens: 8192,
            system: systemMsg,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tools: [
              {
                type: "code_execution_20250825",
                name: "code_execution",
              } as any,
            ],
            messages: [{ role: "user", content: userContent }],
            stream: true,
          },
          {
            headers: {
              "anthropic-beta": "files-api-2025-04-14,code-execution-20250825",
            },
          },
        );

        for await (const event of response) {
          if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta.type === "text_delta") {
              controller.enqueue(
                encoder.encode(`0:${JSON.stringify(delta.text)}\n`),
              );
            }
          }
        }

        controller.enqueue(
          encoder.encode(
            `d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`,
          ),
        );
        console.log(
          JSON.stringify({
            event: "request_complete",
            panel: "raw",
            provider: "anthropic",
            total_ms: Date.now() - startMs,
          }),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`3:${JSON.stringify(msg)}\n`));
        console.error("raw/anthropic error", msg);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "X-Vercel-AI-Data-Stream": "v1",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { prompt, model, provider } = await req.json();
  console.log(
    JSON.stringify({
      event: "request_start",
      panel: "raw",
      model,
      provider,
      timestamp: new Date().toISOString(),
    }),
  );

  if (provider === "anthropic") {
    return handleAnthropic(model, prompt);
  }
  return handleOpenAI(model ?? "gpt-5.4-mini-2026-03-17", prompt);
}
