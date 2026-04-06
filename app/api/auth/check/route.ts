import { NextResponse } from "next/server";
import {
  createRequestContext,
  createResponseHeaders,
  logInfo,
  logWarn,
  serializeError,
  withRequestContext,
} from "@/lib/server/app-logger";

export async function POST(req: Request) {
  const requestContext = createRequestContext(req, {
    route: "auth_check",
    method: "POST",
  });

  return withRequestContext(requestContext, async () => {
    let password: unknown;

    try {
      ({ password } = (await req.json()) as { password?: unknown });
    } catch (error) {
      logWarn("api_request_invalid_json", {
        route: "auth_check",
        error: serializeError(error),
      });
      return NextResponse.json(
        { ok: false, error: "Request body must be valid JSON." },
        {
          status: 400,
          headers: createResponseHeaders(),
        },
      );
    }

    logInfo("api_request_started", {
      route: "auth_check",
      password_present: typeof password === "string" && password.length > 0,
    });

    const demoPassword = process.env.DEMO_PASSWORD;
    if (!demoPassword || password !== demoPassword) {
      logWarn("auth_check_failed", {
        route: "auth_check",
        password_configured: !!demoPassword,
      });
      return NextResponse.json(
        { ok: false },
        {
          status: 401,
          headers: createResponseHeaders(),
        },
      );
    }

    logInfo("auth_check_succeeded", {
      route: "auth_check",
    });
    return NextResponse.json(
      { ok: true },
      {
        headers: createResponseHeaders(),
      },
    );
  });
}
