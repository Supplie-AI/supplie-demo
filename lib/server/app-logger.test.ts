import assert from "node:assert/strict";
import test from "node:test";
import {
  createRequestContext,
  createResponseHeaders,
  getRequestContext,
  sanitizeForLogs,
  summarizeCapabilities,
  updateRequestContext,
  withRequestContext,
} from "./app-logger.ts";
import type { DemoCapability } from "./demo-capabilities.ts";

test("createRequestContext preserves inbound ids when present", () => {
  const request = new Request("https://example.com/api/chat", {
    method: "POST",
    headers: {
      "x-request-id": "req-123",
      traceparent: "00-1234567890abcdef1234567890abcdef-1234567890abcdef-01",
    },
  });

  const context = createRequestContext(request, {
    route: "chat",
    method: "POST",
  });

  assert.equal(context.requestId, "req-123");
  assert.equal(context.traceId, "1234567890abcdef1234567890abcdef");
  assert.equal(context.route, "chat");
  assert.equal(context.method, "POST");
});

test("request context updates flow into response headers", async () => {
  const request = new Request("https://example.com/api/config", {
    method: "GET",
  });
  const context = createRequestContext(request, {
    route: "config",
    method: "GET",
  });

  await withRequestContext(context, async () => {
    updateRequestContext({
      provider: "openai",
    });

    assert.equal(getRequestContext()?.provider, "openai");
    const headers = createResponseHeaders();
    assert.equal(headers.get("X-Request-Id"), context.requestId);
    assert.equal(headers.get("X-Trace-Id"), context.traceId);
  });
});

test("sanitizeForLogs redacts secrets recursively", () => {
  const sanitized = sanitizeForLogs({
    apiKey: "sk-secret-value",
    nested: {
      authorization: "Bearer abc123",
      safe: "plain-text",
    },
    array: ["sk-ant-secret-value", "keep-me"],
  }) as {
    apiKey: string;
    nested: { authorization: string; safe: string };
    array: string[];
  };

  assert.equal(sanitized.apiKey, "[REDACTED]");
  assert.equal(sanitized.nested.authorization, "[REDACTED]");
  assert.equal(sanitized.nested.safe, "plain-text");
  assert.equal(sanitized.array[0], "[REDACTED]");
  assert.equal(sanitized.array[1], "keep-me");
});

test("summarizeCapabilities splits enabled and disabled capability ids", () => {
  const capabilities: DemoCapability[] = [
    {
      id: "streaming_text",
      label: "Streaming responses",
      enabled: true,
      availability: "available",
      description: "Streaming is enabled.",
    },
    {
      id: "live_systems",
      label: "Live systems",
      enabled: false,
      availability: "planned",
      description: "Live systems are not enabled.",
    },
  ];

  assert.deepEqual(summarizeCapabilities(capabilities), {
    supported: ["streaming_text"],
    unsupported: ["live_systems"],
  });
});
