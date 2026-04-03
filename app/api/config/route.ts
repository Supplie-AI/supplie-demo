import { NextResponse } from "next/server";
import { getPublicDemoConfig } from "@/lib/server/demo-config";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") === "anthropic"
    ? "anthropic"
    : "openai";
  const openAIConfigured = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    ...getPublicDemoConfig(provider, { openAIConfigured }),
    openaiAvailable: openAIConfigured,
    anthropicAvailable: !!process.env.ANTHROPIC_API_KEY,
  });
}
