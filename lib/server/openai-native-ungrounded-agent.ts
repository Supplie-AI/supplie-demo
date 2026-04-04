import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import {
  getCapabilitySummaryLines,
  getUngroundedCapabilities,
} from "./demo-capabilities";
import type {
  DemoAgent,
  DemoAgentEvent,
  DemoRequestMessage,
} from "./demo-agent-runner";

const RAW_AGENT_BUNDLE_ID = "supplie-demo-ungrounded-openai-bundle-v1";
const RAW_AGENT_VECTOR_STORE_NAME =
  "supplie-demo-ungrounded-openai-reference-files";

const RAW_AGENT_FILES = [
  {
    fileName: "raw-agent-capability-notes.md",
    absolutePath: path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "ungrounded-openai",
      "raw-agent-capability-notes.md",
    ),
    description:
      "Capability and disclosure notes for the OpenAI raw agent demo surface.",
  },
  {
    fileName: "global_freight_benchmarks.csv",
    absolutePath: path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "ungrounded-openai",
      "global_freight_benchmarks.csv",
    ),
    description:
      "A bundled illustrative freight benchmark CSV for file and code workflows.",
  },
] as const;

interface PreparedOpenAIBundle {
  fileIds: string[];
  vectorStoreId: string;
}

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

type ResponseOutputItem =
  | ResponseOutputMessageItem
  | ResponseWebSearchItem
  | ResponseFileSearchItem
  | ResponseCodeInterpreterItem
  | { id?: string; type?: string };

type ResponseCreateResult = {
  output?: ResponseOutputItem[];
};

let openAIClient: OpenAI | null = null;
let preparedBundlePromise: Promise<PreparedOpenAIBundle> | null = null;

function getOpenAIClient() {
  if (openAIClient) {
    return openAIClient;
  }

  openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openAIClient;
}

function buildSystemPrompt(): string {
  return [
    "You are the ungrounded raw AI agent for a supply-chain comparison demo.",
    "You are not allowed to claim Annona snapshot access, live ERP access, or any other grounded Annona system.",
    "When using OpenAI native tools, say exactly which tool actually ran in this response.",
    "Use web search for current external information.",
    "Use bundled file workflows only for the static demo files listed below. They are not arbitrary local filesystem access and they are not user uploads.",
    "Use the code interpreter when calculation or structured data analysis would help.",
    "If the question needs Annona-specific live data or grounded Annona snapshot data, say that this raw panel does not have it.",
    "",
    "Bundled demo files available through OpenAI file workflows:",
    ...RAW_AGENT_FILES.map(
      (file) => `- ${file.fileName}: ${file.description}`,
    ),
    "",
    "Current runtime capability status:",
    ...getCapabilitySummaryLines(getUngroundedCapabilities("openai")),
  ].join("\n");
}

function toInputMessages(messages: DemoRequestMessage[]) {
  return messages.map((message) => ({
    type: "message" as const,
    role: message.role,
    content: message.content,
  }));
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForVectorStoreReady(
  client: OpenAI,
  vectorStoreId: string,
): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const vectorStore = await client.vectorStores.retrieve(vectorStoreId);
    if (vectorStore.status === "completed") {
      return;
    }

    await wait(1000);
  }

  throw new Error("Timed out waiting for the OpenAI vector store to finish.");
}

async function findExistingBundle(
  client: OpenAI,
): Promise<PreparedOpenAIBundle | null> {
  const vectorStores = await client.vectorStores.list({ limit: 100 });
  const existing = vectorStores.data.find(
    (store) => store.metadata?.bundle_id === RAW_AGENT_BUNDLE_ID,
  );

  if (!existing) {
    return null;
  }

  if (existing.status !== "completed") {
    await waitForVectorStoreReady(client, existing.id);
  }

  const filesPage = await client.vectorStores.files.list(existing.id, {
    limit: 20,
  });
  const fileIds = filesPage.data.map((file) => file.id);

  if (fileIds.length === 0) {
    return null;
  }

  return {
    vectorStoreId: existing.id,
    fileIds,
  };
}

async function createBundledFiles(
  client: OpenAI,
): Promise<PreparedOpenAIBundle> {
  const uploadedFiles = await Promise.all(
    RAW_AGENT_FILES.map(async (file) => {
      const contents = await readFile(file.absolutePath);

      const uploaded = await client.files.create({
        file: await toFile(contents, file.fileName),
        purpose: "assistants",
      });

      await client.files.waitForProcessing(uploaded.id, {
        pollInterval: 1000,
        maxWait: 120000,
      });

      return uploaded;
    }),
  );

  const vectorStore = await client.vectorStores.create({
    name: RAW_AGENT_VECTOR_STORE_NAME,
    file_ids: uploadedFiles.map((file) => file.id),
    metadata: {
      bundle_id: RAW_AGENT_BUNDLE_ID,
      app: "supplie-demo",
      panel: "ungrounded",
    },
  });

  await waitForVectorStoreReady(client, vectorStore.id);

  return {
    vectorStoreId: vectorStore.id,
    fileIds: uploadedFiles.map((file) => file.id),
  };
}

async function prepareOpenAIBundle(): Promise<PreparedOpenAIBundle> {
  if (!preparedBundlePromise) {
    preparedBundlePromise = (async () => {
      const client = getOpenAIClient();
      const existing = await findExistingBundle(client);
      if (existing) {
        return existing;
      }

      return createBundledFiles(client);
    })().catch((error) => {
      preparedBundlePromise = null;
      throw error;
    });
  }

  return preparedBundlePromise;
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

export function responseToDemoAgentEvents(
  response: ResponseCreateResult,
): DemoAgentEvent[] {
  const output = response.output ?? [];
  const events: DemoAgentEvent[] = [];

  for (const item of output) {
    if (item.type === "web_search_call") {
      const webSearchItem = item as ResponseWebSearchItem;
      const toolCallId = getToolCallId(webSearchItem, "openai-web-search");
      const args = {
        action: webSearchItem.action?.type ?? "search",
        queries:
          webSearchItem.action?.queries ??
          (webSearchItem.action?.query ? [webSearchItem.action.query] : []),
        url: webSearchItem.action?.url ?? null,
        pattern: webSearchItem.action?.pattern ?? null,
      };

      events.push({
        type: "tool-start",
        toolCallId,
        toolName: "openai_web_search",
        args,
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

export function createOpenAINativeUngroundedAgent(model: string): DemoAgent {
  return {
    async *streamResponse({ messages, signal }) {
      const client = getOpenAIClient();
      const bundle = await prepareOpenAIBundle();
      const response = (await client.responses.create(
        {
          model,
          input: [
            {
              type: "message",
              role: "developer",
              content: buildSystemPrompt(),
            },
            ...toInputMessages(messages),
          ],
          tools: [
            {
              type: "web_search_preview",
              search_context_size: "medium",
            },
            {
              type: "file_search",
              vector_store_ids: [bundle.vectorStoreId],
              max_num_results: 4,
            },
            {
              type: "code_interpreter",
              container: {
                type: "auto",
                file_ids: bundle.fileIds,
                network_policy: {
                  type: "disabled",
                },
              },
            },
          ],
          include: ["file_search_call.results", "code_interpreter_call.outputs"],
          tool_choice: "auto",
        },
        { signal },
      )) as ResponseCreateResult;

      for (const event of responseToDemoAgentEvents(response)) {
        yield event;
      }
    },
  };
}
