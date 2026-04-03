import {
  annonaOpenAIFunctionTools,
  invokeAnnonaTool,
} from "./annona-grounded-tools";
import {
  getCapabilitySummaryLines,
  getGroundedCapabilities,
} from "./demo-capabilities";
import type {
  DemoAgent,
  DemoAgentEvent,
} from "./demo-agent-runner";
import { getOpenAIClient, prepareOpenAIBundle, SHARED_OPENAI_NATIVE_FILES } from "./openai-native-bundle";
import {
  getResponseFunctionCalls,
  parseResponseFunctionArguments,
  responseToDemoAgentEvents,
  toInputMessages,
  type ResponseCreateResult,
} from "./openai-responses-utils";

const MAX_TOOL_TURNS = 6;

function buildSystemPrompt(): string {
  return [
    "You are the grounded Annona agent for a supply-chain comparison demo.",
    "You have the same native OpenAI web, file, and code tooling baseline as the raw panel, plus Annona-specific tools, calculators, and demo datasets.",
    "Always prefer Annona tools for questions about snapshot numbers, rankings, order details, stock risk, margin leakage, or Annona-specific calculations.",
    "Use OpenAI native tools when outside research, file inspection, or sandboxed computation would help, and say explicitly whether each tool used was an OpenAI native tool or an Annona tool.",
    "Your Annona data is limited to the bundled Annona demo snapshot. It is not live production data.",
    "Do not claim live ERP or warehouse access.",
    "",
    "Shared OpenAI-native file baseline available to both panels:",
    ...SHARED_OPENAI_NATIVE_FILES.map(
      (file) => `- ${file.fileName}: ${file.description}`,
    ),
    "",
    "Current runtime capability status:",
    ...getCapabilitySummaryLines(getGroundedCapabilities("openai")),
  ].join("\n");
}

function serializeToolOutput(result: unknown) {
  return typeof result === "string" ? result : JSON.stringify(result);
}

export function createOpenAINativeGroundedAgent(model: string): DemoAgent {
  return {
    async *streamResponse({ messages, signal }) {
      const client = getOpenAIClient();
      const bundle = await prepareOpenAIBundle();

      let response = (await client.responses.create(
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
            ...annonaOpenAIFunctionTools,
          ],
          include: ["file_search_call.results", "code_interpreter_call.outputs"],
          tool_choice: "auto",
        } as any,
        { signal },
      )) as ResponseCreateResult;

      for (let turn = 0; turn < MAX_TOOL_TURNS; turn += 1) {
        for (const event of responseToDemoAgentEvents(response)) {
          yield event;
        }

        const functionCalls = getResponseFunctionCalls(response);
        if (functionCalls.length === 0) {
          return;
        }

        const nextInput: Array<{
          type: "function_call_output";
          call_id: string;
          output: string;
        }> = [];

        for (const call of functionCalls) {
          const toolName = call.name ?? "annona_unknown_tool";
          const toolCallId = call.call_id ?? call.id ?? `${toolName}-${turn}`;
          const args = parseResponseFunctionArguments(call);

          yield {
            type: "tool-start",
            toolCallId,
            toolName,
            args,
          } satisfies DemoAgentEvent;

          try {
            const result = await invokeAnnonaTool(toolName, args);
            yield {
              type: "tool-end",
              toolCallId,
              toolName,
              result,
            } satisfies DemoAgentEvent;
            nextInput.push({
              type: "function_call_output",
              call_id: toolCallId,
              output: serializeToolOutput(result),
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            yield {
              type: "tool-error",
              toolCallId,
              toolName,
              error: message,
            } satisfies DemoAgentEvent;
            nextInput.push({
              type: "function_call_output",
              call_id: toolCallId,
              output: JSON.stringify({ error: message }),
            });
          }
        }

        response = (await client.responses.create(
          {
            model,
            previous_response_id: response.id,
            input: nextInput,
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
              ...annonaOpenAIFunctionTools,
            ],
            include: ["file_search_call.results", "code_interpreter_call.outputs"],
            tool_choice: "auto",
          } as any,
          { signal },
        )) as ResponseCreateResult;
      }

      throw new Error("Grounded OpenAI agent exceeded the tool iteration limit.");
    },
  };
}
