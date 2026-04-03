import type {
  DemoAgentEvent,
  DemoRequestMessage,
} from "./demo-agent-runner";

interface ResponseOutputMessageItem {
  type: "message";
  content?: Array<
    | { type: "output_text"; text: string }
    | { type: "refusal"; refusal: string }
  >;
}

interface ResponseWebSearchItem {
  id?: string;
  type: "web_search_call";
  status?: string;
  action?: {
    type?: string;
    query?: string;
    queries?: string[];
    url?: string | null;
    pattern?: string;
    sources?: Array<{ type?: string; url?: string }>;
  };
}

interface ResponseFileSearchItem {
  id?: string;
  type: "file_search_call";
  status?: string;
  queries?: string[];
  results?: Array<{
    file_id?: string;
    filename?: string;
    score?: number;
    text?: string;
  }> | null;
}

interface ResponseCodeInterpreterItem {
  id?: string;
  type: "code_interpreter_call";
  status?: string;
  code?: string | null;
  container_id?: string;
  outputs?: Array<
    | { type: "logs"; logs: string }
    | { type: "image"; url: string }
  > | null;
}

export interface ResponseFunctionCallItem {
  id?: string;
  call_id?: string;
  type: "function_call";
  name?: string;
  arguments?: string;
  status?: string;
}

export interface ResponseCreateResult {
  id?: string;
  output?: Array<
    | ResponseOutputMessageItem
    | ResponseWebSearchItem
    | ResponseFileSearchItem
    | ResponseCodeInterpreterItem
    | ResponseFunctionCallItem
    | { id?: string; type?: string }
  >;
}

function getToolCallId(item: { id?: string }, fallback: string) {
  return item.id ?? fallback;
}

function messageText(content: ResponseOutputMessageItem["content"]): string {
  if (!content) {
    return "";
  }

  return content
    .map((part) =>
      part.type === "output_text" ? part.text : `Refusal: ${part.refusal}`,
    )
    .join("");
}

export function toInputMessages(messages: DemoRequestMessage[]) {
  return messages.map((message) => ({
    type: "message" as const,
    role: message.role,
    content: message.content,
  }));
}

export function getResponseFunctionCalls(
  response: ResponseCreateResult,
): ResponseFunctionCallItem[] {
  return (response.output ?? []).filter(
    (item): item is ResponseFunctionCallItem => item.type === "function_call",
  );
}

export function parseResponseFunctionArguments(
  item: ResponseFunctionCallItem,
): unknown {
  if (!item.arguments) {
    return {};
  }

  try {
    return JSON.parse(item.arguments) as unknown;
  } catch {
    return {};
  }
}

export function responseToDemoAgentEvents(
  response: ResponseCreateResult,
): DemoAgentEvent[] {
  const output = response.output ?? [];
  const events: DemoAgentEvent[] = [];

  for (const item of output) {
    if (item.type === "web_search_call") {
      const webSearchItem = item as ResponseWebSearchItem;
      const toolCallId = getToolCallId(webSearchItem, "openai-web-search");
      events.push({
        type: "tool-start",
        toolCallId,
        toolName: "openai_web_search",
        args: {
          action: webSearchItem.action?.type ?? "search",
          queries:
            webSearchItem.action?.queries ??
            (webSearchItem.action?.query ? [webSearchItem.action.query] : []),
          url: webSearchItem.action?.url ?? null,
          pattern: webSearchItem.action?.pattern ?? null,
        },
      });

      if (webSearchItem.status === "failed") {
        events.push({
          type: "tool-error",
          toolCallId,
          toolName: "openai_web_search",
          error: "OpenAI web search failed.",
        });
        continue;
      }

      events.push({
        type: "tool-end",
        toolCallId,
        toolName: "openai_web_search",
        result: {
          status: webSearchItem.status ?? "completed",
          action: webSearchItem.action ?? null,
        },
      });
      continue;
    }

    if (item.type === "file_search_call") {
      const fileSearchItem = item as ResponseFileSearchItem;
      const toolCallId = getToolCallId(fileSearchItem, "openai-file-search");
      events.push({
        type: "tool-start",
        toolCallId,
        toolName: "openai_file_search",
        args: {
          queries: fileSearchItem.queries ?? [],
        },
      });

      if (fileSearchItem.status === "failed") {
        events.push({
          type: "tool-error",
          toolCallId,
          toolName: "openai_file_search",
          error: "OpenAI file search failed.",
        });
        continue;
      }

      events.push({
        type: "tool-end",
        toolCallId,
        toolName: "openai_file_search",
        result: {
          status: fileSearchItem.status ?? "completed",
          queries: fileSearchItem.queries ?? [],
          results: fileSearchItem.results ?? [],
        },
      });
      continue;
    }

    if (item.type === "code_interpreter_call") {
      const codeInterpreterItem = item as ResponseCodeInterpreterItem;
      const toolCallId = getToolCallId(
        codeInterpreterItem,
        "openai-code-interpreter",
      );
      events.push({
        type: "tool-start",
        toolCallId,
        toolName: "openai_code_interpreter",
        args: {
          code: codeInterpreterItem.code ?? "",
        },
      });

      if (codeInterpreterItem.status === "failed") {
        events.push({
          type: "tool-error",
          toolCallId,
          toolName: "openai_code_interpreter",
          error: "OpenAI code interpreter failed.",
        });
        continue;
      }

      events.push({
        type: "tool-end",
        toolCallId,
        toolName: "openai_code_interpreter",
        result: {
          status: codeInterpreterItem.status ?? "completed",
          code: codeInterpreterItem.code ?? "",
          container_id: codeInterpreterItem.container_id ?? null,
          outputs: codeInterpreterItem.outputs ?? [],
        },
      });
      continue;
    }

    if (item.type === "message") {
      const messageItem = item as ResponseOutputMessageItem;
      const text = messageText(messageItem.content);
      if (text) {
        events.push({
          type: "text-delta",
          delta: text,
        });
      }
    }
  }

  return events;
}
