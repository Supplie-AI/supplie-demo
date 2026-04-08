import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenAINativeGroundedSystemPrompt,
  detectGroundedScenario,
  getAnnonaToolsForPrompt,
} from "./openai-native-grounded-agent.ts";

const predictivePrompt =
  "Which freight lane is the strongest predictive service risk next month, and what signal makes it risky before failure shows up?";
const prioritizationPrompt =
  "If the team can only act on one thing in the next 24 hours, what should they prioritize first, and what is the next action?";

test("detectGroundedScenario recognizes the harder prompt-pack scenarios", () => {
  assert.equal(detectGroundedScenario(predictivePrompt), "predictive-service-risk");
  assert.equal(
    detectGroundedScenario(prioritizationPrompt),
    "prioritization-next-action",
  );
});

test("predictive prompt routing exposes only the service-risk Annona tools", () => {
  const { scenarioId, tools } = getAnnonaToolsForPrompt(predictivePrompt);

  assert.equal(scenarioId, "predictive-service-risk");
  assert.deepEqual(
    tools.map((tool) => tool.name),
    ["annona_rank_service_risk", "annona_evaluate_recommendation"],
  );
});

test("prioritization prompt routing exposes only the next-action Annona tools", () => {
  const { scenarioId, tools } = getAnnonaToolsForPrompt(prioritizationPrompt);

  assert.equal(scenarioId, "prioritization-next-action");
  assert.deepEqual(
    tools.map((tool) => tool.name),
    ["annona_prioritize_next_action", "annona_evaluate_recommendation"],
  );
});

test("grounded system prompt injects scenario-specific steering for predictive and prioritization prompts", () => {
  const predictiveSystemPrompt =
    buildOpenAINativeGroundedSystemPrompt(predictivePrompt);
  const prioritizationSystemPrompt =
    buildOpenAINativeGroundedSystemPrompt(prioritizationPrompt);

  assert.match(predictiveSystemPrompt, /Current prompt pack scenario: predictive service risk\./);
  assert.match(predictiveSystemPrompt, /Do not answer with stockout-risk, supplier-leakage, or margin-blocker framing/i);
  assert.match(prioritizationSystemPrompt, /Priority now:/);
  assert.match(prioritizationSystemPrompt, /Do not substitute a stockout-risk or supplier-leakage answer/i);
});
