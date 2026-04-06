/**
 * @typedef {{
 *   toolName: string;
 *   args: Record<string, unknown>;
 *   result: unknown;
 * }} MockToolInvocation
 */

/**
 * @typedef {{
 *   answerPath: string;
 *   rubric: string;
 *   canonicalAnswer: string;
 *   mustContainAll?: string[];
 *   mustContainOneOf?: string[][];
 *   mustNotContain?: string[];
 *   requiredTools?: string[];
 *   requiredToolOneOf?: string[][];
 *   mockToolInvocations?: MockToolInvocation[];
 * }} DemoScenarioExpectation
 */

/**
 * @typedef {{
 *   id: string;
 *   prompt: string;
 *   promptClass: "descriptive" | "analytical" | "predictive" | "prescriptive";
 *   sharedBundleAnswerable: boolean;
 *   dataPrerequisites: string[];
 *   expectedRawBehavior: string;
 *   expectedAnnonaBehavior: string;
 *   correctnessRubric: string[];
 *   expectedRaw: DemoScenarioExpectation;
 *   expectedGrounded: DemoScenarioExpectation;
 * }} DemoScenario
 */

/**
 * @typedef {{
 *   answerText: string;
 *   toolNames?: string[];
 * }} RenderedPanelOutput
 */

/**
 * @typedef {{
 *   raw: RenderedPanelOutput;
 *   grounded: RenderedPanelOutput;
 * }} RenderedScenarioOutput
 */

/**
 * @typedef {{
 *   pass: boolean;
 *   failures: string[];
 * }} PanelExpectationResult
 */

/**
 * @typedef {{
 *   pass: boolean;
 *   raw: PanelExpectationResult;
 *   grounded: PanelExpectationResult;
 * }} ScenarioExpectationResult
 */

/** @type {DemoScenario[]} */
export const DEMO_SCENARIOS = [
  {
    id: "blocker-traceability",
    prompt:
      "What is the main blocker to protecting margin in this bundle, and trace it to the exact rows driving it?",
    promptClass: "analytical",
    sharedBundleAnswerable: true,
    dataPrerequisites: [
      "Shared multi-table order-margin bundle with explicit customer and order-line relationships",
      "Shared formula reference in demo_order_margin_reference.md",
      "Ability to calculate row-level net margin and name exact supporting rows",
    ],
    expectedRawBehavior:
      "Raw should identify the blocker from the shared order-margin bundle, trace it to the exact order rows, and stay explicit that the answer comes from the shared baseline.",
    expectedAnnonaBehavior:
      "Annona should identify the same blocker but present it as a traceable blocker with row evidence and an immediate operational implication.",
    correctnessRubric: [
      "Identifies freight and rebate drag as the blocker to margin protection.",
      "Traces the blocker to SK-240321-03 as the weakest row at $490 net margin and 4.4 percent.",
      "Annona answer makes the blocker and evidence path obvious instead of just naming a low-margin row.",
    ],
    expectedRaw: {
      answerPath: "shared-tabular-baseline",
      rubric:
        "Raw should use the shared order bundle tables and reference file, identify the blocker, and trace it to the exact order rows without implying Annona-only access.",
      canonicalAnswer:
        "Raw blocker answer: using the shared order bundle tables and the margin reference, the main blocker to protecting margin is freight-and-rebate drag concentrated in the weakest order pattern. The exact order to trace first is SK-240321-03, which falls to $490 of net margin, or 4.4 percent, after $980 freight and $410 rebates. SK-240319-02 shows the same pressure at $2,440 net margin, so the blocker is visible in the shared order bundle rows rather than hidden Annona-only data.",
      mustContainAll: ["shared order bundle", "SK-240321-03", "blocker"],
      mustContainOneOf: [
        ["freight-and-rebate drag", "freight and rebate drag", "freight", "rebates"],
        ["490", "$490"],
        ["4.4", "4.4 percent", "4.4%"],
        ["SK-240319-02", "2440", "$2,440"],
      ],
      requiredToolOneOf: [["openai_file_search", "openai_code_interpreter"]],
      mockToolInvocations: [
        {
          toolName: "openai_code_interpreter",
          args: {
            task: "Join the bundled Suspension King order headers and order lines, calculate row-level net margin, and identify the main blocker to protecting margin.",
          },
          result: {
            outputs: [
              {
                type: "logs",
                content:
                  "SK-240317-01 net_margin=5060, SK-240319-02 net_margin=2440, SK-240321-03 net_margin=490, blocker=freight_and_rebates, relationship_path=orders->order_lines",
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "annona-orchestrated-shared-baseline",
      rubric:
        "Annona should use the same shared margin rows, name the blocker, and make the traceability path explicit enough that an operator can act on it immediately.",
      canonicalAnswer:
        "Annona blocker view: the blocker is not lack of revenue, it is traceable freight-and-rebate drag in the weakest order pattern. Evidence: SK-240321-03 resolves to only $490 of net margin, or 4.4 percent, after $980 freight and $410 rebates, and SK-240319-02 shows the same direction at $2,440 net margin. Traceability: this comes directly from the same shared order bundle rows, so the first action is to review lookalike orders before that blocker repeats.",
      mustContainAll: [
        "Traceability:",
        "same shared order bundle rows",
        "SK-240321-03",
        "blocker",
      ],
      mustContainOneOf: [
        ["490", "$490"],
        ["4.4", "4.4 percent", "4.4%"],
        ["freight-and-rebate drag", "freight and rebate drag"],
        ["lookalike orders", "review lookalike orders", "first action"],
      ],
      requiredTools: [
        "annona_trace_margin_blocker",
        "annona_evaluate_recommendation",
      ],
      mockToolInvocations: [
        {
          toolName: "annona_trace_margin_blocker",
          args: {
            dataset: "demo_order_margin_bundle_manifest.json",
            objective: "protect margin",
          },
          result: {
            blocker: "freight_and_rebate_drag",
            focus_rows: ["SK-240321-03", "SK-240319-02"],
            weakest_row: "SK-240321-03",
            weakest_row_net_margin: 490,
            weakest_row_margin_pct: 4.4,
            relationship_trace: [
              "orders.order_id -> order_lines.order_id",
              "order_lines.sku -> products.sku",
            ],
          },
        },
        {
          toolName: "annona_evaluate_recommendation",
          args: {
            check: "traceability and actionability",
          },
          result: {
            grounded: true,
            action_oriented: true,
            traceable_to_rows: true,
          },
        },
      ],
    },
  },
  {
    id: "predictive-service-risk",
    prompt:
      "Which freight lane is the strongest predictive service risk next month, and what signal makes it risky before failure shows up?",
    promptClass: "predictive",
    sharedBundleAnswerable: true,
    dataPrerequisites: [
      "Shared tabular baseline with global_freight_benchmarks.csv",
      "Ability to compare transit time, reliability, and cost",
      "Future-state risk framing from the shared freight table",
    ],
    expectedRawBehavior:
      "Raw should identify the top predictive service-risk lane from the shared freight benchmark and explain the early warning signal without implying hidden data.",
    expectedAnnonaBehavior:
      "Annona should identify the same lane but frame the answer as an early operational risk with a clear pre-failure signal and next move.",
    correctnessRubric: [
      "Flags Ningbo-Rotterdam on HarborSpan as the strongest predictive service risk.",
      "Uses the supporting signal of 28 transit days, 88 percent reliability, and $3,340 cost.",
      "Annona answer explains why the risk matters before an actual failure lands.",
    ],
    expectedRaw: {
      answerPath: "shared-tabular-baseline",
      rubric:
        "Raw should use the shared freight benchmark CSV to rank predictive service risk and explain the signal directly from the benchmark rows.",
      canonicalAnswer:
        "Raw predictive-risk answer: from the shared global_freight_benchmarks.csv, Ningbo-Rotterdam on HarborSpan is the strongest service-risk watchpoint for next month because it already combines the longest transit at 28 days, the lowest reliability at 88 percent, and the highest cost at $3,340. Those three benchmark signals make it risky before failure shows up, so the earliest move is to review upcoming bookings on that lane now.",
      mustContainAll: [
        "Ningbo-Rotterdam",
        "HarborSpan",
        "shared global_freight_benchmarks.csv",
      ],
      mustContainOneOf: [
        ["28 days", "28-day", "28"],
        ["88 percent", "88%", "88 percent reliability"],
        ["3,340", "$3,340", "3340"],
        ["review upcoming bookings", "earliest move", "watchpoint"],
      ],
      requiredTools: ["openai_code_interpreter"],
      mockToolInvocations: [
        {
          toolName: "openai_code_interpreter",
          args: {
            task: "Rank freight lanes by predictive service risk using transit_days, reliability_pct, and cost_usd from global_freight_benchmarks.csv.",
          },
          result: {
            outputs: [
              {
                type: "logs",
                content:
                  "Top watchpoint=Ningbo-Rotterdam / HarborSpan, transit_days=28, reliability_pct=88, cost_usd=3340",
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "annona-orchestrated-shared-baseline",
      rubric:
        "Annona should use the same shared freight table, explain the predictive signal before failure lands, and turn it into an early operational recommendation.",
      canonicalAnswer:
        "Annona predictive-risk view: Ningbo-Rotterdam on HarborSpan is the earliest service-risk watchpoint in the same shared freight benchmark. Early signal: the lane is already at 28 transit days, 88 percent reliability, and $3,340 cost, so it is where delay and cost pressure are most likely to show up before the team sees an actual failure. Action: review and pre-empt the next bookings on that lane now rather than waiting for service to slip.",
      mustContainAll: [
        "Early signal:",
        "same shared freight benchmark",
        "Ningbo-Rotterdam",
        "HarborSpan",
      ],
      mustContainOneOf: [
        ["28 days", "28-day", "28"],
        ["88 percent", "88%", "88 percent reliability"],
        ["3,340", "$3,340", "3340"],
        ["before the team sees an actual failure", "before failure", "pre-empt"],
      ],
      requiredTools: [
        "annona_rank_service_risk",
        "annona_evaluate_recommendation",
      ],
      mockToolInvocations: [
        {
          toolName: "annona_rank_service_risk",
          args: {
            dataset: "global_freight_benchmarks.csv",
            horizon: "next_month",
          },
          result: {
            top_watchpoint: "Ningbo-Rotterdam",
            carrier_family: "HarborSpan",
            transit_days: 28,
            reliability_pct: 88,
            cost_usd: 3340,
            risk_basis: "longest_transit_lowest_reliability_highest_cost",
          },
        },
        {
          toolName: "annona_evaluate_recommendation",
          args: {
            check: "early-signal framing",
          },
          result: {
            grounded: true,
            early_warning_clear: true,
            action_oriented: true,
          },
        },
      ],
    },
  },
  {
    id: "prioritization-next-action",
    prompt:
      "If the team can only act on one thing in the next 24 hours, what should they prioritize first, and what is the next action?",
    promptClass: "prescriptive",
    sharedBundleAnswerable: true,
    dataPrerequisites: [
      "Shared multi-table order-margin bundle with explicit customer and order-line relationships",
      "Shared tabular baseline with global_freight_benchmarks.csv",
      "Ability to compare immediate margin risk against next-month service risk",
      "Operational prioritization and next-action framing",
    ],
    expectedRawBehavior:
      "Raw should prioritize one action from the shared bundle, justify why it comes first, and give a concrete next step.",
    expectedAnnonaBehavior:
      "Annona should prioritize the same action but resolve it into a clearer why-first decision and immediate next action.",
    correctnessRubric: [
      "Prioritizes the SK-240321-03 margin pattern ahead of the freight lane risk because the margin hit is immediate and controllable.",
      "Uses the facts that SK-240321-03 is at $490 net margin or 4.4 percent while Ningbo-Rotterdam is a next-month watchpoint.",
      "Annona answer gives a concrete next action in the next 24 hours.",
    ],
    expectedRaw: {
      answerPath: "shared-tabular-baseline",
      rubric:
        "Raw should use the shared margin and freight bundle to choose one first priority, justify the ordering, and stay explicit that the answer comes from the shared baseline.",
      canonicalAnswer:
        "Raw prioritization answer: in the next 24 hours, prioritize the SK-240321-03 lookalike margin pattern before the Ningbo-Rotterdam lane watchpoint. The reason is immediacy: SK-240321-03 is already down to $490 of net margin, or 4.4 percent, so another similar order can erase margin now, while the HarborSpan lane risk is a next-month signal. The next action from the shared bundle is to review pending lookalike orders today for freight pass-through and rebate approval.",
      mustContainAll: ["SK-240321-03", "next 24 hours", "Ningbo-Rotterdam"],
      mustContainOneOf: [
        ["490", "$490"],
        ["4.4", "4.4 percent", "4.4%"],
        ["freight pass-through", "rebate approval", "pending lookalike orders"],
        ["HarborSpan", "next-month signal", "lane watchpoint"],
      ],
      requiredTools: ["openai_code_interpreter"],
      mockToolInvocations: [
        {
          toolName: "openai_code_interpreter",
          args: {
            task: "Compare the immediate action priority between the weakest bundled order-margin pattern and the top freight-lane service-risk watchpoint using the shared demo files.",
          },
          result: {
            outputs: [
              {
                type: "logs",
                content:
                  "Priority=SK-240321-03 margin pattern first, net_margin=490, margin_pct=4.4, alternate_watchpoint=Ningbo-Rotterdam / HarborSpan next_month",
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "annona-orchestrated-shared-baseline",
      rubric:
        "Annona should use the same shared bundle, justify why the first action comes before the alternate risk, and express the next step as a concrete operator move.",
      canonicalAnswer:
        "Annona prioritization: Priority now: act on the SK-240321-03 lookalike margin pattern before the freight-lane watchpoint. Why first: the shared order rows show only $490 of net margin, or 4.4 percent, so the account can lose margin on the very next similar shipment, whereas Ningbo-Rotterdam on HarborSpan is still a next-month risk signal. Next action: in the next 24 hours, review pending lookalike orders for freight pass-through and rebate approval, then queue the lane contingency review second. This ordering is traceable to the same shared bundle.",
      mustContainAll: [
        "SK-240321-03",
        "Priority now:",
        "Why first:",
        "Next action:",
        "same shared bundle",
      ],
      mustContainOneOf: [
        ["490", "$490"],
        ["4.4", "4.4 percent", "4.4%"],
        ["Ningbo-Rotterdam", "HarborSpan"],
        ["traceable", "ordering is traceable", "same shared bundle"],
      ],
      requiredTools: [
        "annona_prioritize_next_action",
        "annona_evaluate_recommendation",
      ],
      mockToolInvocations: [
        {
          toolName: "annona_prioritize_next_action",
          args: {
            datasets: [
              "demo_order_margin_bundle_manifest.json",
              "global_freight_benchmarks.csv",
            ],
            horizon: "next_24_hours",
          },
          result: {
            priority: "SK-240321-03_margin_pattern",
            rationale: "immediate_controllable_margin_risk",
            supporting_alternate: "Ningbo-Rotterdam_HarborSpan_watchpoint",
            next_action:
              "Review pending lookalike orders for freight pass-through and rebate approval",
          },
        },
        {
          toolName: "annona_evaluate_recommendation",
          args: {
            check: "prioritization and next action",
          },
          result: {
            grounded: true,
            action_oriented: true,
            prioritization_clear: true,
          },
        },
      ],
    },
  },
];

export const DEMO_PROMPTS = DEMO_SCENARIOS.map((scenario) => scenario.prompt);

export const DEMO_SCENARIOS_BY_ID = new Map(
  DEMO_SCENARIOS.map((scenario) => [scenario.id, scenario]),
);

export const DEMO_SCENARIOS_BY_PROMPT = new Map(
  DEMO_SCENARIOS.map((scenario) => [scenario.prompt, scenario]),
);

/**
 * @param {string} prompt
 * @returns {DemoScenario | undefined}
 */
export function getDemoScenarioByPrompt(prompt) {
  return DEMO_SCENARIOS_BY_PROMPT.get(prompt.trim());
}

/**
 * @param {string} id
 * @returns {DemoScenario | undefined}
 */
export function getDemoScenarioById(id) {
  return DEMO_SCENARIOS_BY_ID.get(id);
}

/**
 * @param {DemoScenario} scenario
 * @param {"ungrounded" | "grounded"} agentMode
 * @returns {DemoScenarioExpectation}
 */
export function getScenarioExpectation(scenario, agentMode) {
  return agentMode === "grounded"
    ? scenario.expectedGrounded
    : scenario.expectedRaw;
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeForMatch(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * @param {RenderedPanelOutput | undefined} rendered
 * @param {DemoScenarioExpectation} expectation
 * @returns {PanelExpectationResult}
 */
export function evaluatePanelExpectation(rendered, expectation) {
  const failures = [];
  const answerText = rendered?.answerText ?? "";
  const toolNames = rendered?.toolNames ?? [];
  const normalizedAnswer = normalizeForMatch(answerText);
  const normalizedTools = toolNames.map(normalizeForMatch);

  for (const phrase of expectation.mustContainAll ?? []) {
    if (!normalizedAnswer.includes(normalizeForMatch(phrase))) {
      failures.push(`Missing required phrase: ${phrase}`);
    }
  }

  for (const group of expectation.mustContainOneOf ?? []) {
    const matched = group.some((phrase) =>
      normalizedAnswer.includes(normalizeForMatch(phrase)),
    );

    if (!matched) {
      failures.push(`Missing one-of phrase group: ${group.join(" | ")}`);
    }
  }

  for (const phrase of expectation.mustNotContain ?? []) {
    if (normalizedAnswer.includes(normalizeForMatch(phrase))) {
      failures.push(`Contains forbidden phrase: ${phrase}`);
    }
  }

  for (const toolName of expectation.requiredTools ?? []) {
    if (!normalizedTools.includes(normalizeForMatch(toolName))) {
      failures.push(`Missing required tool: ${toolName}`);
    }
  }

  for (const group of expectation.requiredToolOneOf ?? []) {
    const matched = group.some((toolName) =>
      normalizedTools.includes(normalizeForMatch(toolName)),
    );

    if (!matched) {
      failures.push(`Missing one-of tool group: ${group.join(" | ")}`);
    }
  }

  return {
    pass: failures.length === 0,
    failures,
  };
}

/**
 * @param {DemoScenario} scenario
 * @param {RenderedScenarioOutput} rendered
 * @returns {ScenarioExpectationResult}
 */
export function evaluateScenarioOutputs(scenario, rendered) {
  const raw = evaluatePanelExpectation(rendered.raw, scenario.expectedRaw);
  const grounded = evaluatePanelExpectation(
    rendered.grounded,
    scenario.expectedGrounded,
  );

  return {
    pass: raw.pass && grounded.pass,
    raw,
    grounded,
  };
}
