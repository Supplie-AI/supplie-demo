import { NextResponse } from "next/server";
import {
  createRequestContext,
  createResponseHeaders,
  logCapabilitySnapshot,
  logInfo,
  updateRequestContext,
  withRequestContext,
} from "@/lib/server/app-logger";
import {
  getDemoPanelConfigs,
  getPublicDemoConfig,
} from "@/lib/server/demo-config";
import { isPlaywrightTestMode } from "@/lib/server/playwright-mock-chat";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const requestContext = createRequestContext(req, {
    route: "config",
    method: "GET",
  });

  return withRequestContext(requestContext, async () => {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") === "anthropic"
      ? "anthropic"
      : "openai";
    const openAIConfigured =
      provider === "openai" &&
      (isPlaywrightTestMode() || !!process.env.OPENAI_API_KEY);
    const anthropicAvailable = !!process.env.ANTHROPIC_API_KEY;
    const panelConfigs = getDemoPanelConfigs(provider, {
      openAIConfigured,
    });

    updateRequestContext({ provider });
    logInfo("api_request_started", {
      route: "config",
      provider,
      openai_available: openAIConfigured,
      anthropic_available: anthropicAvailable,
    });
    logCapabilitySnapshot({
      provider,
      agentMode: "ungrounded",
      backend: panelConfigs.ungrounded.backendLabel,
      capabilities: panelConfigs.ungrounded.capabilities,
    });
    logCapabilitySnapshot({
      provider,
      agentMode: "grounded",
      backend: panelConfigs.grounded.backendLabel,
      capabilities: panelConfigs.grounded.capabilities,
    });

    logInfo("api_request_completed", {
      route: "config",
      provider,
      openai_available: openAIConfigured,
      anthropic_available: anthropicAvailable,
    });

    return NextResponse.json(
      {
        ...getPublicDemoConfig(provider, { openAIConfigured }),
        openaiAvailable: openAIConfigured,
        anthropicAvailable,
      },
      {
        headers: createResponseHeaders(),
      },
    );
  });
}
