import {
  annonaOpenAIFunctionTools,
  invokeAnnonaTool,
} from "./annona-grounded-tools.ts";
import {
  getCapabilitySummaryLines,
  getGroundedCapabilities,
} from "./demo-capabilities.ts";
import type {
  DemoAgent,
  DemoAgentEvent,
} from "./demo-agent-runner.ts";
import {
  getOpenAIClient,
  prepareOpenAIBundle,
  SHARED_OPENAI_NATIVE_FILES,
} from "./openai-native-bundle.ts";
import {
  getResponseFunctionCalls,
  parseResponseFunctionArguments,
  responseToDemoAgentEvents,
  toInputMessages,
  type ResponseCreateResult,
} from "./openai-responses-utils.ts";
import { logInfo } from "./app-logger.ts";

const MAX_TOOL_TURNS = 6;

type GroundedScenarioId =
  | "blocker-traceability"
  | "predictive-service-risk"
  | "prioritization-next-action";

const GROUNDED_SCENARIO_TOOLSETS: Record<GroundedScenarioId, string[]> = {
  "blocker-traceability": [
    "annona_trace_margin_blocker",
    "annona_evaluate_recommendation",
  ],
  "predictive-service-risk": [
    "annona_rank_service_risk",
    "annona_evaluate_recommendation",
  ],
  "prioritization-next-action": [
    "annona_prioritize_next_action",
    "annona_evaluate_recommendation",
  ],
};

export function detectGroundedScenario(
  prompt: string | undefined,
): GroundedScenarioId | null {
  const normalizedPrompt = prompt?.trim().toLowerCase() ?? "";

  if (
    normalizedPrompt.includes("main blocker") &&
    normalizedPrompt.includes("trace")
  ) {
    return "blocker-traceability";
  }

  if (
    normalizedPrompt.includes("freight lane") &&
    normalizedPrompt.includes("predictive service risk")
  ) {
    return "predictive-service-risk";
  }

  if (
    normalizedPrompt.includes("next 24 hours") &&
    normalizedPrompt.includes("prioritize")
  ) {
    return "prioritization-next-action";
  }

  return null;
}

function scenarioSteeringLines(scenarioId: GroundedScenarioId | null): string[] {
  if (scenarioId === "blocker-traceability") {
    return [
      "Current prompt pack scenario: blocker plus traceability.",
      "Use annona_trace_margin_blocker first, then annona_evaluate_recommendation before you finalize the answer.",
      "Keep the answer grounded in the shared order bundle rows, name the blocker as freight-and-rebate drag, and make the evidence and traceability path explicit.",
      "Use the exact section labels 'Evidence:' and 'Traceability:' and include the phrase 'same shared order bundle rows'.",
      "Make the first action explicit by telling the operator to review lookalike orders before the blocker repeats.",
      "Do not drift into supplier-leakage ranking or stockout-risk framing unless the user explicitly asks for those.",
    ];
  }

  if (scenarioId === "predictive-service-risk") {
    return [
      "Current prompt pack scenario: predictive service risk.",
      "Use annona_rank_service_risk first, then annona_evaluate_recommendation before you finalize the answer.",
      "Ground the answer to the shared freight benchmark, identify the top next-month service-risk lane, explain the pre-failure signal, and end with an early operational move.",
      "Use the exact section labels 'Early signal:' and 'Action:' and include the phrase 'same shared freight benchmark'.",
      "Format the lane name as 'Ningbo-Rotterdam' rather than using an arrow or alternate punctuation.",
      "Do not answer with stockout-risk, supplier-leakage, or margin-blocker framing unless the user explicitly asks for those.",
    ];
  }

  if (scenarioId === "prioritization-next-action") {
    return [
      "Current prompt pack scenario: prioritization plus next action.",
      "Use annona_prioritize_next_action first, then annona_evaluate_recommendation before you finalize the answer.",
      "Structure the answer with 'Priority now:', 'Why first:', and 'Next action:' so the next move is explicit.",
      "State that the ordering is traceable to the same shared bundle.",
      "Compare the immediate margin risk against the next-month freight watchpoint and keep the first action on the margin pattern unless the user asks for a different objective.",
      "Do not substitute a stockout-risk or supplier-leakage answer for this prioritization prompt.",
    ];
  }

  return [];
}

export function getAnnonaToolsForPrompt(prompt: string | undefined) {
  const scenarioId = detectGroundedScenario(prompt);
  const allowedToolNames = scenarioId
    ? new Set(GROUNDED_SCENARIO_TOOLSETS[scenarioId])
    : null;

  return {
    scenarioId,
    tools: allowedToolNames
      ? annonaOpenAIFunctionTools.filter((tool) => allowedToolNames.has(tool.name))
      : annonaOpenAIFunctionTools,
  };
}

export function buildOpenAINativeGroundedSystemPrompt(
  prompt?: string,
): string {
  const scenarioId = detectGroundedScenario(prompt);

  return [
    "You are the grounded Annona agent for a supply-chain comparison demo.",
    "You have the same native OpenAI web, file, and code tooling baseline as the raw panel, plus Annona-specific tools, calculators, and demo datasets.",
    "Always prefer Annona tools for questions about snapshot numbers, rankings, order details, stock risk, margin leakage, or Annona-specific calculations.",
    "Use OpenAI native tools when outside research, file inspection, or sandboxed computation would help, and say explicitly whether each tool used was an OpenAI native tool or an Annona tool.",
    "For numeric questions over bundled CSVs, prefer using the code interpreter on the bundled data instead of only paraphrasing reference notes.",
    "Your Annona data is limited to the bundled Annona demo snapshot. It is not live production data.",
    "Do not claim live ERP or warehouse access.",
    "Do not emit citation markup, source handles, or internal reference tokens in the final answer.",
    ...scenarioSteeringLines(scenarioId),
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
      const prompt = messages.at(-1)?.content;
      const { scenarioId, tools: selectedAnnonaTools } = getAnnonaToolsForPrompt(
        prompt,
      );
      logInfo("openai_response_request_started", {
        agent_mode: "grounded",
        model,
        turn: 0,
        scenario_id: scenarioId,
        tool_types: [
          "web_search_preview",
          "file_search",
          "code_interpreter",
          "annona_function_tools",
        ],
        input_messages: messages.length,
      });

      let response = (await client.responses.create(
        {
          model,
          input: [
            {
              type: "message",
              role: "developer",
              content: buildOpenAINativeGroundedSystemPrompt(prompt),
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
            ...selectedAnnonaTools,
          ],
          include: ["file_search_call.results", "code_interpreter_call.outputs"],
          tool_choice: "auto",
        } as any,
        { signal },
      )) as ResponseCreateResult;
        logInfo("openai_response_received", {
          agent_mode: "grounded",
          model,
          turn: 0,
          scenario_id: scenarioId,
          response_id: response.id ?? null,
          output_items: response.output?.length ?? 0,
          function_call_count: getResponseFunctionCalls(response).length,
      });

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
              ...selectedAnnonaTools,
            ],
            include: ["file_search_call.results", "code_interpreter_call.outputs"],
            tool_choice: "auto",
          } as any,
          { signal },
        )) as ResponseCreateResult;
        logInfo("openai_response_received", {
          agent_mode: "grounded",
          model,
          turn: turn + 1,
          scenario_id: scenarioId,
          response_id: response.id ?? null,
          output_items: response.output?.length ?? 0,
          function_call_count: getResponseFunctionCalls(response).length,
        });
      }

      throw new Error("Grounded OpenAI agent exceeded the tool iteration limit.");
    },
  };
}
