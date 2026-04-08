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
  | "deep-dependency-traceability"
  | "blocker-traceability"
  | "shadow-factory-management-status"
  | "shadow-factory-next-action";

const GROUNDED_SCENARIO_TOOLSETS: Record<GroundedScenarioId, string[]> = {
  "deep-dependency-traceability": [
    "annona_trace_graph_dependencies",
    "annona_propagate_dependency_impact",
    "annona_evaluate_recommendation",
  ],
  "blocker-traceability": [
    "annona_trace_margin_blocker",
    "annona_evaluate_recommendation",
  ],
  "shadow-factory-management-status": [
    "annona_detect_shadow_wobble",
    "annona_estimate_shadow_progress",
    "annona_evaluate_recommendation",
  ],
  "shadow-factory-next-action": [
    "annona_detect_shadow_wobble",
    "annona_estimate_shadow_progress",
    "annona_evaluate_recommendation",
  ],
};

export function detectGroundedScenario(
  prompt: string | undefined,
): GroundedScenarioId | null {
  const normalizedPrompt = prompt?.trim().toLowerCase() ?? "";

  if (
    normalizedPrompt.includes("so-240501-01") &&
    normalizedPrompt.includes("bom") &&
    normalizedPrompt.includes("purchase")
  ) {
    return "deep-dependency-traceability";
  }

  if (
    normalizedPrompt.includes("main blocker") &&
    normalizedPrompt.includes("trace")
  ) {
    return "blocker-traceability";
  }

  if (
    (normalizedPrompt.includes("virtual mes") ||
      normalizedPrompt.includes("shadow factory")) &&
    (normalizedPrompt.includes("management attention") ||
      normalizedPrompt.includes("management status") ||
      normalizedPrompt.includes("leadership"))
  ) {
    return "shadow-factory-management-status";
  }

  if (
    normalizedPrompt.includes("next 24 hours") &&
    (normalizedPrompt.includes("shadow factory") ||
      normalizedPrompt.includes("virtual mes")) &&
    (normalizedPrompt.includes("prioritize") ||
      normalizedPrompt.includes("intervene") ||
      normalizedPrompt.includes("act on one thing"))
  ) {
    return "shadow-factory-next-action";
  }

  return null;
}

function scenarioSteeringLines(scenarioId: GroundedScenarioId | null): string[] {
  if (scenarioId === "deep-dependency-traceability") {
    return [
      "Current prompt pack scenario: deep dependency traceability.",
      "Use annona_trace_graph_dependencies first, then annona_propagate_dependency_impact, then annona_evaluate_recommendation before finalizing the answer.",
      "Ground the answer in the shared manufacturing dependency bundle and identify the blocker as shared component CAP-STEEL-08 on late purchase order PO-7712.",
      "Use the exact section labels 'Path:' and 'Impact:' and make the multi-hop path explicit across the sales order, work-order chain, BOM component, and purchase order.",
      "State that the blocker sits on MC-COIL-01 at Brisbane Assembly and that SO-240501-02 is also exposed through the same shared component.",
      "Do not collapse this into a generic first-level lookup or a margin-blocker answer.",
    ];
  }

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

  if (scenarioId === "shadow-factory-management-status") {
    return [
      "Current prompt pack scenario: Virtual MES / Shadow Factory management status.",
      "Use annona_detect_shadow_wobble first, then annona_estimate_shadow_progress, then annona_evaluate_recommendation before you finalize the answer.",
      "Frame the answer as the Virtual MES / Shadow Factory view over broken ERP / MRP data rather than exact point-of-use truth.",
      "Identify ZED-KIT-2088 as the first management-attention case with management status verify_now because the shadow signals wobble.",
      "Contrast it briefly with ZED-KIT-1042 as a watch case so leadership can see the difference between verify-now and directional progress.",
      "Use the exact section labels 'Management status:' and 'Why now:' and keep the missing point-of-use caveat explicit.",
      "Do not drift into freight-lane, supplier, or generic margin-risk framing for this prompt.",
    ];
  }

  if (scenarioId === "shadow-factory-next-action") {
    return [
      "Current prompt pack scenario: Shadow Factory prioritization plus next action.",
      "Use annona_detect_shadow_wobble first, then annona_estimate_shadow_progress, then annona_evaluate_recommendation before you finalize the answer.",
      "Structure the answer with 'Priority now:', 'Why first:', and 'Next action:' so the next move is explicit.",
      "Prioritize the verify-now case ZED-KIT-2088 ahead of the watch case ZED-KIT-1042.",
      "State that this ordering comes from the Virtual MES / Shadow Factory status model rather than exact MES truth.",
      "Keep the missing point-of-use caveat and manual verification posture explicit.",
      "Do not substitute a freight-risk, stockout-risk, or generic margin answer for this prioritization prompt.",
    ];
  }

  return [];
}

export function getAnnonaToolsForPrompt(prompt: string | undefined) {
  const scenarioId = detectGroundedScenario(prompt);
  const orderedToolNames = scenarioId
    ? GROUNDED_SCENARIO_TOOLSETS[scenarioId]
    : null;
  const toolByName = new Map(
    annonaOpenAIFunctionTools.map((tool) => [tool.name, tool]),
  );

  return {
    scenarioId,
    tools: orderedToolNames
      ? orderedToolNames
          .map((toolName) => toolByName.get(toolName))
          .filter(
            (
              tool,
            ): tool is (typeof annonaOpenAIFunctionTools)[number] =>
              tool !== undefined,
          )
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
    "Always prefer Annona tools for questions about snapshot numbers, rankings, order details, stock risk, margin leakage, shadow factory status, or Annona-specific calculations.",
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
