import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenAINativeGroundedSystemPrompt,
  detectGroundedScenario,
  getAnnonaToolsForPrompt,
} from "./openai-native-grounded-agent.ts";

const shadowFactoryManagementPrompt =
  "Zeder's ERP statuses are unreliable. In the Virtual MES / Shadow Factory view, which kit needs management attention first, what status should leadership see, and why before the floor reports a confirmed miss?";
const deepTraceabilityPrompt =
  "Sales order SO-240501-01 is escalated. What upstream dependency is blocking it, trace the path through BOM, work orders, and purchase orders, and what else gets hit if the shared component slips?";
const shadowFactoryNextActionPrompt =
  "If the team can only act on one Shadow Factory case in the next 24 hours, what should they prioritize first, and what is the next action?";

test("detectGroundedScenario recognizes the harder prompt-pack scenarios", () => {
  assert.equal(
    detectGroundedScenario(deepTraceabilityPrompt),
    "deep-dependency-traceability",
  );
  assert.equal(
    detectGroundedScenario(shadowFactoryManagementPrompt),
    "shadow-factory-management-status",
  );
  assert.equal(
    detectGroundedScenario(shadowFactoryNextActionPrompt),
    "shadow-factory-next-action",
  );
});

test("deep dependency prompt routing exposes only the graph-trace Annona tools", () => {
  const { scenarioId, tools } = getAnnonaToolsForPrompt(deepTraceabilityPrompt);

  assert.equal(scenarioId, "deep-dependency-traceability");
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "annona_trace_graph_dependencies",
      "annona_propagate_dependency_impact",
      "annona_evaluate_recommendation",
    ],
  );
});

test("shadow factory management prompt routing exposes the shadow-status Annona tools", () => {
  const { scenarioId, tools } = getAnnonaToolsForPrompt(
    shadowFactoryManagementPrompt,
  );

  assert.equal(scenarioId, "shadow-factory-management-status");
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "annona_detect_shadow_wobble",
      "annona_estimate_shadow_progress",
      "annona_evaluate_recommendation",
    ],
  );
});

test("shadow factory prioritization prompt routing exposes the shadow-status Annona tools", () => {
  const { scenarioId, tools } = getAnnonaToolsForPrompt(
    shadowFactoryNextActionPrompt,
  );

  assert.equal(scenarioId, "shadow-factory-next-action");
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "annona_detect_shadow_wobble",
      "annona_estimate_shadow_progress",
      "annona_evaluate_recommendation",
    ],
  );
});

test("grounded system prompt injects scenario-specific steering for shadow factory and prioritization prompts", () => {
  const deepTraceabilitySystemPrompt =
    buildOpenAINativeGroundedSystemPrompt(deepTraceabilityPrompt);
  const shadowFactoryManagementSystemPrompt =
    buildOpenAINativeGroundedSystemPrompt(shadowFactoryManagementPrompt);
  const prioritizationSystemPrompt =
    buildOpenAINativeGroundedSystemPrompt(shadowFactoryNextActionPrompt);

  assert.match(
    deepTraceabilitySystemPrompt,
    /Current prompt pack scenario: deep dependency traceability\./,
  );
  assert.match(deepTraceabilitySystemPrompt, /Path:/);
  assert.match(deepTraceabilitySystemPrompt, /SO-240501-02 is also exposed/i);
  assert.match(
    shadowFactoryManagementSystemPrompt,
    /Current prompt pack scenario: Virtual MES \/ Shadow Factory management status\./,
  );
  assert.match(
    shadowFactoryManagementSystemPrompt,
    /Management status:/,
  );
  assert.match(
    shadowFactoryManagementSystemPrompt,
    /ZED-KIT-2088 as the first management-attention case/i,
  );
  assert.match(prioritizationSystemPrompt, /Priority now:/);
  assert.match(
    prioritizationSystemPrompt,
    /Virtual MES \/ Shadow Factory status model/i,
  );
  assert.match(
    prioritizationSystemPrompt,
    /Do not substitute a freight-risk, stockout-risk, or generic margin answer/i,
  );
  assert.match(
    deepTraceabilitySystemPrompt,
    /explicitly say it came from the Annona demo snapshot in the final answer/i,
  );
});
