import { NextResponse } from "next/server";
import { getPublicDemoConfig } from "@/lib/server/ungrounded-agent";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ...getPublicDemoConfig(),
    anthropicAvailable: !!process.env.ANTHROPIC_API_KEY,
  });
}
