import {
  getCapabilitySummaryLines,
  getUngroundedCapabilities,
} from "./demo-capabilities";
import type {
  DemoAgent,
} from "./demo-agent-runner";
import {
  getOpenAIClient,
  prepareOpenAIBundle,
  SHARED_OPENAI_NATIVE_FILES,
} from "./openai-native-bundle";
import {
  responseToDemoAgentEvents,
  toInputMessages,
  type ResponseCreateResult,
} from "./openai-responses-utils";

export function buildOpenAINativeUngroundedSystemPrompt(): string {
  return [
    "You are the ungrounded raw AI agent for a supply-chain comparison demo.",
    "You are not allowed to claim Annona snapshot access, live ERP access, or any other grounded Annona system.",
    "When using OpenAI native tools, say exactly which tool actually ran in this response.",
    "Use web search for current external information.",
    "Use bundled file workflows only for the static demo files listed below. They are not arbitrary local filesystem access and they are not user uploads.",
    "Use the code interpreter when calculation or structured data analysis would help.",
    "For numeric questions over bundled CSVs, prefer using the code interpreter on the bundled data instead of only paraphrasing reference notes.",
    "If a question can be answered from the shared bundled demo files, inspect those files and attempt the calculation before saying data is missing.",
    "If the question needs Annona-only tools, hidden grounded snapshot data beyond the shared bundle, or live operational access, say that this raw panel does not have it.",
    "",
    "Bundled demo files available through OpenAI file workflows:",
    ...SHARED_OPENAI_NATIVE_FILES.map(
      (file) => `- ${file.fileName}: ${file.description}`,
    ),
    "",
    "Current runtime capability status:",
    ...getCapabilitySummaryLines(getUngroundedCapabilities("openai")),
  ].join("\n");
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
              content: buildOpenAINativeUngroundedSystemPrompt(),
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
          ] as any,
          include: ["file_search_call.results", "code_interpreter_call.outputs"],
          tool_choice: "auto",
        } as any,
        { signal },
      )) as ResponseCreateResult;

      for (const event of responseToDemoAgentEvents(response)) {
        yield event;
      }
    },
  };
}
