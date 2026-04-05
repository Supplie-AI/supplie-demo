import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { DemoCapability } from "./demo-capabilities";
import type { DemoAgentMode, DemoProvider } from "./demo-config";

export interface RequestLogContext {
  requestId: string;
  traceId: string;
  route: string;
  method: string;
  provider?: DemoProvider;
  agentMode?: DemoAgentMode;
  model?: string;
  backend?: string;
}

const requestContextStore = new AsyncLocalStorage<RequestLogContext>();
const SENSITIVE_KEY_PATTERN =
  /(api[-_]?key|authorization|cookie|credential|password|secret|set-cookie|token)/i;
const TOKEN_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /gh[pousr]_[A-Za-z0-9_]{8,}/g,
  /sk-[A-Za-z0-9_-]{8,}/g,
  /sk-ant-[A-Za-z0-9_-]{8,}/g,
];
const MAX_STRING_LENGTH = 320;
const MAX_ITEMS = 20;

function newTraceId() {
  return randomUUID().replaceAll("-", "");
}

function parseTraceId(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (/^[0-9a-f]{32}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const traceparentMatch = trimmed.match(
    /^[0-9a-f]{2}-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/i,
  );
  if (traceparentMatch) {
    return traceparentMatch[1].toLowerCase();
  }

  return null;
}

function truncate(value: string) {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...<truncated>`;
}

function redactSensitiveString(value: string) {
  return TOKEN_VALUE_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, "[REDACTED]"),
    value,
  );
}

function sanitizeValue(
  value: unknown,
  keyHint?: string,
  depth = 0,
): unknown {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (keyHint && SENSITIVE_KEY_PATTERN.test(keyHint)) {
      return "[REDACTED]";
    }

    return truncate(redactSensitiveString(value));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeValue(value.message),
      stack: sanitizeValue(value.stack ?? ""),
    };
  }

  if (depth >= 4) {
    return "[Truncated]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ITEMS).map((item) =>
      sanitizeValue(item, keyHint, depth + 1)
    );
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).slice(0, MAX_ITEMS).map(([key, entryValue]) => [
        key,
        sanitizeValue(entryValue, key, depth + 1),
      ]),
    );
  }

  return String(value);
}

function writeLog(
  level: "info" | "warn" | "error",
  event: string,
  data?: Record<string, unknown>,
) {
  const context = requestContextStore.getStore();
  const entry = {
    timestamp: new Date().toISOString(),
    service: "supplie-demo",
    level,
    event,
    ...context,
    ...(sanitizeValue(data) as Record<string, unknown> | undefined),
  };

  const serialized = JSON.stringify(entry);
  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export function createRequestContext(
  request: Request,
  overrides: Pick<RequestLogContext, "route" | "method"> &
    Partial<
      Omit<RequestLogContext, "requestId" | "traceId" | "route" | "method">
    >,
): RequestLogContext {
  const requestId =
    request.headers.get("x-request-id")?.trim() ||
    request.headers.get("x-correlation-id")?.trim() ||
    randomUUID();
  const traceId =
    parseTraceId(request.headers.get("traceparent")) ||
    parseTraceId(request.headers.get("x-trace-id")) ||
    parseTraceId(request.headers.get("x-b3-traceid")) ||
    newTraceId();

  return {
    requestId,
    traceId,
    ...overrides,
  };
}

export function withRequestContext<T>(
  context: RequestLogContext,
  fn: () => Promise<T> | T,
) {
  return requestContextStore.run(context, fn);
}

export function updateRequestContext(updates: Partial<RequestLogContext>) {
  const context = requestContextStore.getStore();
  if (!context) {
    return;
  }

  Object.assign(context, updates);
}

export function getRequestContext() {
  return requestContextStore.getStore();
}

export function createResponseHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  const context = getRequestContext();
  if (context) {
    headers.set("X-Request-Id", context.requestId);
    headers.set("X-Trace-Id", context.traceId);
  }

  return headers;
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return sanitizeValue(error);
  }

  return sanitizeValue(String(error));
}

export function summarizeCapabilities(capabilities: DemoCapability[]) {
  return {
    supported: capabilities
      .filter((capability) => capability.enabled)
      .map((capability) => capability.id),
    unsupported: capabilities
      .filter((capability) => !capability.enabled)
      .map((capability) => capability.id),
  };
}

export function logCapabilitySnapshot(options: {
  provider: DemoProvider;
  agentMode: DemoAgentMode;
  backend: string;
  capabilities: DemoCapability[];
}) {
  const summary = summarizeCapabilities(options.capabilities);

  writeLog("info", "capability_snapshot", {
    provider: options.provider,
    agent_mode: options.agentMode,
    backend: options.backend,
    supported_capabilities: summary.supported,
    unsupported_capabilities: summary.unsupported,
  });
}

export function logInfo(event: string, data?: Record<string, unknown>) {
  writeLog("info", event, data);
}

export function logWarn(event: string, data?: Record<string, unknown>) {
  writeLog("warn", event, data);
}

export function logError(event: string, data?: Record<string, unknown>) {
  writeLog("error", event, data);
}

export function sanitizeForLogs(value: unknown) {
  return sanitizeValue(value);
}
