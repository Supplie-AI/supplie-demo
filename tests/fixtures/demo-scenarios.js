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
 *   sharedBundleAnswerable: boolean;
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
    id: "suspension-king-net-margin",
    prompt:
      "What's the net margin on last week's Suspension King orders after freight and rebates?",
    sharedBundleAnswerable: true,
    expectedRaw: {
      answerPath: "shared-bundle",
      rubric:
        "Raw should answer from the shared bundled margin CSV/reference files, state the net margin result, and stay explicit that this is not Annona-only grounded access.",
      canonicalAnswer:
        "Raw shared-bundle answer: using the bundled demo_order_margin_snapshot.csv and the bundled margin reference, Suspension King's three sample orders total $43,940 revenue, $31,480 COGS, $3,080 freight, and $1,390 rebates, leaving a net margin of $7,990. This comes from the shared demo files, not Annona-only grounded access.",
      mustContainAll: ["Suspension King", "net margin"],
      mustContainOneOf: [
        ["7,990", "7990"],
        ["shared demo files", "shared bundle", "bundled"],
        [
          "not Annona-only grounded access",
          "not grounded Annona access",
          "not Annona-only data",
        ],
      ],
      requiredToolOneOf: [["openai_file_search", "openai_code_interpreter"]],
      mockToolInvocations: [
        {
          toolName: "openai_file_search",
          args: {
            queries: [
              "demo_order_margin_snapshot.csv Suspension King freight rebates",
            ],
          },
          result: {
            status: "completed",
            results: [
              {
                filename: "demo_order_margin_snapshot.csv",
                score: 0.98,
              },
              {
                filename: "demo_order_margin_reference.md",
                score: 0.95,
              },
            ],
          },
        },
        {
          toolName: "openai_code_interpreter",
          args: {
            task: "Calculate net margin from the bundled Suspension King CSV rows.",
          },
          result: {
            outputs: [
              {
                type: "logs",
                content:
                  "revenue=43940, cogs=31480, freight=3080, rebates=1390, net_margin=7990",
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "annona-grounded-snapshot",
      rubric:
        "Grounded should answer from the Annona snapshot path, state the same $7,990 result, and disclose that it came from the static Annona demo snapshot rather than live systems.",
      canonicalAnswer:
        "Grounded Annona answer: the static Annona demo snapshot shows Suspension King's last-week sample orders at $43,940 revenue, $31,480 COGS, $3,080 freight, and $1,390 rebates, for a net margin of $7,990. This is from the bundled Annona demo snapshot, not live ERP data.",
      mustContainAll: ["Suspension King", "Annona demo snapshot", "net margin"],
      mustContainOneOf: [["7,990", "7990"]],
      requiredTools: ["annona_query_order_margin_snapshot"],
      mockToolInvocations: [
        {
          toolName: "openai_file_search",
          args: {
            queries: ["demo_order_margin_reference.md bundled margin formula"],
          },
          result: {
            status: "completed",
            results: [
              {
                filename: "demo_order_margin_reference.md",
                score: 0.92,
              },
            ],
          },
        },
        {
          toolName: "annona_query_order_margin_snapshot",
          args: {
            customer: "Suspension King",
            period: "last_week",
          },
          result: {
            snapshot_id: "annona-demo-snapshot-2026-03-22",
            customer: "Suspension King",
            total_orders: 3,
            revenue: 43940,
            cogs: 31480,
            freight: 3080,
            rebates: 1390,
            net_margin: 7990,
            margin_pct: 18.2,
          },
        },
      ],
    },
  },
  {
    id: "stockout-risk-30-day",
    prompt: "Which SKUs are at risk of stockout in the next 30 days?",
    sharedBundleAnswerable: false,
    expectedRaw: {
      answerPath: "shared-bundle-limitation",
      rubric:
        "Raw should say the shared bundle does not include Annona inventory/forecast snapshot data, so it cannot identify stockout-risk SKUs from the available files.",
      canonicalAnswer:
        "Raw panel limitation: I cannot identify 30-day stockout-risk SKUs from the shared bundle because those shared files only cover margin and benchmark examples; they do not include the Annona inventory and forecast snapshot needed for a stockout answer.",
      mustContainAll: ["stockout", "shared bundle"],
      mustContainOneOf: [
        ["cannot identify", "can't identify", "cannot determine"],
        [
          "do not include the Annona inventory and forecast snapshot",
          "do not include Annona stock snapshot data",
          "do not include Annona inventory data",
        ],
      ],
      requiredToolOneOf: [["openai_file_search"]],
      mockToolInvocations: [
        {
          toolName: "openai_file_search",
          args: {
            queries: ["stockout risk inventory forecast shared bundle files"],
          },
          result: {
            status: "completed",
            results: [
              {
                filename: "capability-baseline-notes.md",
                score: 0.74,
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "annona-grounded-snapshot",
      rubric:
        "Grounded should answer from the Annona stock-risk snapshot, name the at-risk SKUs, and distinguish the urgent items.",
      canonicalAnswer:
        "Grounded Annona answer: in the static Annona demo snapshot, the 30-day stockout-risk SKUs are COIL-PRADO-450, UCA-RANGER-22, SHOCK-HILUX-MT, and BUSH-KIT-80S. The urgent items are COIL-PRADO-450 with 12 days remaining and UCA-RANGER-22 with 14 days remaining.",
      mustContainAll: [
        "Annona demo snapshot",
        "COIL-PRADO-450",
        "UCA-RANGER-22",
        "SHOCK-HILUX-MT",
        "BUSH-KIT-80S",
      ],
      mustContainOneOf: [
        ["urgent", "urgent items"],
        ["12 days remaining", "12 days"],
        ["14 days remaining", "14 days"],
      ],
      requiredTools: ["annona_query_stockout_risk_snapshot"],
      mockToolInvocations: [
        {
          toolName: "annona_query_stockout_risk_snapshot",
          args: {
            horizon_days: 30,
          },
          result: {
            snapshot_id: "annona-demo-snapshot-2026-03-22",
            horizon_days: 30,
            exception_count: 4,
            urgent_count: 2,
            skus: [
              {
                sku: "COIL-PRADO-450",
                days_remaining: 12,
                urgent: true,
              },
              {
                sku: "UCA-RANGER-22",
                days_remaining: 14,
                urgent: true,
              },
              {
                sku: "SHOCK-HILUX-MT",
                days_remaining: 20,
                urgent: false,
              },
              {
                sku: "BUSH-KIT-80S",
                days_remaining: 28,
                urgent: false,
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: "supplier-margin-leakage",
    prompt: "Which supplier is causing the most margin leakage?",
    sharedBundleAnswerable: false,
    expectedRaw: {
      answerPath: "shared-bundle-limitation",
      rubric:
        "Raw should say the shared bundle does not include supplier leakage rankings or the Annona leakage snapshot, so it cannot determine the top leakage supplier from shared files alone.",
      canonicalAnswer:
        "Raw panel limitation: I cannot rank supplier margin leakage from the shared bundle because the shared files do not include the Annona supplier leakage snapshot or any supplier leakage ranking table.",
      mustContainAll: ["supplier margin leakage", "shared bundle"],
      mustContainOneOf: [
        ["cannot rank", "can't rank", "cannot determine"],
        [
          "do not include the Annona supplier leakage snapshot",
          "do not include supplier leakage ranking",
          "missing the Annona leakage snapshot",
        ],
      ],
      requiredToolOneOf: [["openai_file_search"]],
      mockToolInvocations: [
        {
          toolName: "openai_file_search",
          args: {
            queries: ["supplier margin leakage shared bundle files"],
          },
          result: {
            status: "completed",
            results: [
              {
                filename: "capability-baseline-notes.md",
                score: 0.77,
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "annona-grounded-snapshot",
      rubric:
        "Grounded should use the Annona supplier leakage snapshot, identify Atlas Springs as rank 1, and include the leakage amount or primary driver.",
      canonicalAnswer:
        "Grounded Annona answer: Atlas Springs is the biggest source of margin leakage in the static Annona demo snapshot, with $11,200 of leakage. The primary driver is freight variance on bulky coil lines, with expedited inbound freight and rebate slippage compressing margin.",
      mustContainAll: ["Atlas Springs", "Annona demo snapshot"],
      mustContainOneOf: [["11,200", "11200"]],
      requiredTools: ["annona_query_supplier_margin_leakage_snapshot"],
      mockToolInvocations: [
        {
          toolName: "annona_query_supplier_margin_leakage_snapshot",
          args: {
            top_n: 3,
          },
          result: {
            snapshot_id: "annona-demo-snapshot-2026-03-22",
            supplier: "Atlas Springs",
            leakage_amount: 11200,
            primary_driver: "Freight variance on bulky coil lines",
          },
        },
      ],
    },
  },
  {
    id: "current-ocean-freight-trend",
    prompt: "Search the web for a current ocean freight trend and cite what you used.",
    sharedBundleAnswerable: false,
    expectedRaw: {
      answerPath: "shared-native-web",
      rubric:
        "Raw should answer with a current ocean-freight trend from web search, make it explicit that the source is an external citation rather than Annona data, and include some citation-style source text.",
      canonicalAnswer:
        "Raw web answer: a current ocean freight trend is that schedule reliability is improving on major lanes while spot rates remain volatile. Source: Demo web-search citation placeholder, April 4, 2026. This is external web research, not Annona snapshot data.",
      mustContainAll: ["ocean freight", "Source:"],
      mustContainOneOf: [
        ["current", "currently"],
        ["schedule reliability", "reliability"],
        ["spot rates remain volatile", "spot rates are volatile", "volatile"],
      ],
      requiredTools: ["openai_web_search"],
      mockToolInvocations: [
        {
          toolName: "openai_web_search",
          args: {
            query: "current ocean freight trend",
          },
          result: {
            status: "completed",
            citations: [
              {
                title: "Demo web-search citation placeholder",
                published_at: "2026-04-04",
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "shared-native-web",
      rubric:
        "Grounded should also answer via shared native web search for this prompt, include citation-style source text, and avoid implying that the trend came from the Annona snapshot.",
      canonicalAnswer:
        "Grounded web answer: a current ocean freight trend is improving schedule reliability on major lanes alongside volatile spot pricing. Source: Demo web-search citation placeholder, April 4, 2026. This came from shared native web search rather than the Annona snapshot.",
      mustContainAll: ["ocean freight", "Source:"],
      mustContainOneOf: [
        ["current", "currently"],
        ["schedule reliability", "reliability"],
        ["spot pricing", "spot rates", "volatile"],
      ],
      requiredTools: ["openai_web_search"],
      mockToolInvocations: [
        {
          toolName: "openai_web_search",
          args: {
            query: "current ocean freight trend",
          },
          result: {
            status: "completed",
            citations: [
              {
                title: "Demo web-search citation placeholder",
                published_at: "2026-04-04",
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: "inspect-bundled-benchmark-files",
    prompt: "Inspect the bundled benchmark files and tell me what they contain.",
    sharedBundleAnswerable: true,
    expectedRaw: {
      answerPath: "shared-bundle",
      rubric:
        "Raw should inspect the shared bundled files and summarize the file set accurately, including the benchmark CSV and the margin/reference files.",
      canonicalAnswer:
        "Raw file inspection answer: the shared bundle includes capability-baseline-notes.md with native-tool limits, global_freight_benchmarks.csv with lane, mode, carrier, region, transit, cost, and reliability columns, demo_order_margin_snapshot.csv with Suspension King order rows, and demo_order_margin_reference.md with the net-margin formula and the $7,990 worked example.",
      mustContainAll: [
        "capability-baseline-notes.md",
        "global_freight_benchmarks.csv",
        "demo_order_margin_snapshot.csv",
        "demo_order_margin_reference.md",
      ],
      mustContainOneOf: [
        ["lane", "carrier", "reliability"],
        ["net-margin formula", "net margin formula"],
        ["7,990", "7990"],
      ],
      requiredToolOneOf: [["openai_file_search"]],
      mockToolInvocations: [
        {
          toolName: "openai_file_search",
          args: {
            queries: ["bundled benchmark files contents"],
          },
          result: {
            status: "completed",
            results: [
              { filename: "capability-baseline-notes.md", score: 0.89 },
              { filename: "global_freight_benchmarks.csv", score: 0.98 },
              { filename: "demo_order_margin_snapshot.csv", score: 0.96 },
              { filename: "demo_order_margin_reference.md", score: 0.94 },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "shared-bundle",
      rubric:
        "Grounded should describe the same shared bundled files accurately and keep the answer aligned with the shared baseline rather than inventing extra Annona-only files.",
      canonicalAnswer:
        "Grounded file inspection answer: the shared native file bundle contains capability-baseline-notes.md for tool limits, global_freight_benchmarks.csv for freight benchmark lanes and service metrics, demo_order_margin_snapshot.csv for the Suspension King order rows, and demo_order_margin_reference.md for the net-margin formula and $7,990 example.",
      mustContainAll: [
        "capability-baseline-notes.md",
        "global_freight_benchmarks.csv",
        "demo_order_margin_snapshot.csv",
        "demo_order_margin_reference.md",
      ],
      mustContainOneOf: [
        ["freight benchmark", "benchmark lanes", "service metrics"],
        ["net-margin formula", "net margin formula"],
        ["7,990", "7990"],
      ],
      requiredToolOneOf: [["openai_file_search"]],
      mockToolInvocations: [
        {
          toolName: "openai_file_search",
          args: {
            queries: ["bundled benchmark files contents"],
          },
          result: {
            status: "completed",
            results: [
              { filename: "capability-baseline-notes.md", score: 0.89 },
              { filename: "global_freight_benchmarks.csv", score: 0.98 },
              { filename: "demo_order_margin_snapshot.csv", score: 0.96 },
              { filename: "demo_order_margin_reference.md", score: 0.94 },
            ],
          },
        },
      ],
    },
  },
  {
    id: "average-transit-days",
    prompt: "Use your code sandbox on the bundled CSV and tell me the average transit days.",
    sharedBundleAnswerable: true,
    expectedRaw: {
      answerPath: "shared-bundle",
      rubric:
        "Raw should use the shared bundled freight benchmark CSV via the code sandbox, report the average transit days across the CSV, and disclose that the calculation came from the shared bundle rather than Annona-only data.",
      canonicalAnswer:
        "Raw code answer: using the shared bundled global_freight_benchmarks.csv in the code sandbox, the average transit days across all eight rows is 13.875 days, or about 13.9 days rounded. This is from the shared benchmark CSV, not Annona-only data.",
      mustContainAll: ["average transit days", "global_freight_benchmarks.csv"],
      mustContainOneOf: [["13.875", "13.88", "13.9"]],
      requiredTools: ["openai_code_interpreter"],
      mockToolInvocations: [
        {
          toolName: "openai_code_interpreter",
          args: {
            task: "Compute the mean transit_days value from global_freight_benchmarks.csv.",
          },
          result: {
            outputs: [
              {
                type: "logs",
                content:
                  "Rows=8, sum_transit_days=111, average_transit_days=13.875",
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "shared-bundle",
      rubric:
        "Grounded should also use the shared code sandbox path for this prompt, report the same average transit days result, and keep the answer tied to the shared benchmark CSV.",
      canonicalAnswer:
        "Grounded code answer: using the shared bundled global_freight_benchmarks.csv in the code sandbox, the average transit days is 13.875 days across eight rows, about 13.9 days rounded. This is a shared benchmark-file calculation rather than an Annona-only snapshot lookup.",
      mustContainAll: ["average transit days", "global_freight_benchmarks.csv"],
      mustContainOneOf: [["13.875", "13.88", "13.9"]],
      requiredTools: ["openai_code_interpreter"],
      mockToolInvocations: [
        {
          toolName: "openai_code_interpreter",
          args: {
            task: "Compute the mean transit_days value from global_freight_benchmarks.csv.",
          },
          result: {
            outputs: [
              {
                type: "logs",
                content:
                  "Rows=8, sum_transit_days=111, average_transit_days=13.875",
              },
            ],
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
