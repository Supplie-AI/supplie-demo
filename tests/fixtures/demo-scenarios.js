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
    id: "dataset-intake-profile",
    prompt:
      "I uploaded a margin snapshot and a freight benchmark table. What do they cover, and what decisions are they fit for right now?",
    promptClass: "descriptive",
    sharedBundleAnswerable: true,
    dataPrerequisites: [
      "Shared multi-table order-margin bundle with manifest, customers, orders, order lines, and product dimension tables",
      "Shared tabular baseline with global_freight_benchmarks.csv",
      "Basic file inspection or profiling capability",
    ],
    expectedRawBehavior:
      "Raw should summarize the two shared tabular inputs accurately, name the operational questions they support, and stay honest that this is a generic read of the shared dataset.",
    expectedAnnonaBehavior:
      "Annona should frame the same inputs as a profiled decision surface, distinguishing order-economics analysis from lane-risk analysis and translating them into immediate operational decisions.",
    correctnessRubric: [
      "Names both datasets and their operational meaning.",
      "Keeps the answer grounded in the same shared baseline for both panels.",
      "Annona answer reads as intake plus semantic understanding, not just a file listing.",
    ],
    expectedRaw: {
      answerPath: "shared-tabular-baseline",
      rubric:
        "Raw should inspect the shared uploaded or bundled tables, describe them accurately, and identify the decisions they support without implying Annona-only access.",
      canonicalAnswer:
        "Raw baseline answer: the shared tabular baseline contains a multi-table Suspension King order-margin bundle with customers, order headers, order lines, and product dimension rows, plus an eight-row freight benchmark table. From these files I can inspect order economics, join relationships, calculate net margin, compare lane transit, cost, and reliability, and flag where to look next, but this is still a generic read of the shared dataset.",
      mustContainAll: [
        "Suspension King",
        "freight benchmark",
        "shared dataset",
      ],
      mustContainOneOf: [
        ["multi-table", "bundle", "relationships"],
        ["customers", "order headers", "order lines"],
        ["eight-row", "8-row", "eight row"],
        ["net margin", "margin"],
        ["transit", "cost", "reliability"],
      ],
      requiredToolOneOf: [["openai_file_search", "openai_code_interpreter"]],
      mockToolInvocations: [
        {
          toolName: "openai_file_search",
          args: {
            queries: ["profile uploaded margin snapshot and freight benchmark"],
          },
          result: {
            status: "completed",
            results: [
              {
                filename: "demo_order_margin_bundle_manifest.json",
                score: 0.98,
              },
              {
                filename: "global_freight_benchmarks.csv",
                score: 0.97,
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "annona-orchestrated-shared-baseline",
      rubric:
        "Annona should use the same shared baseline, but describe it as a profiled operational dataset and map it to immediate decisions rather than stopping at file description.",
      canonicalAnswer:
        "Annona answer: dataset intake shows two shared tabular inputs, a relationship-aware Suspension King order bundle and a multi-lane freight benchmark table. Annona treats them as an order-economics dataset plus a lane-risk dataset, so the immediate decision surface is margin leakage, service-risk watchpoints, and which action to take first. This is the same shared dataset, but Annona has already profiled it and mapped it to the next operational decisions.",
      mustContainAll: [
        "dataset intake",
        "same shared dataset",
        "order-economics dataset",
        "lane-risk dataset",
      ],
      mustContainOneOf: [
        ["margin leakage", "margin"],
        ["service-risk watchpoints", "service risk", "watchpoints"],
        ["action to take first", "next operational decisions"],
      ],
      requiredTools: ["annona_profile_tabular_inputs"],
      mockToolInvocations: [
        {
          toolName: "annona_profile_tabular_inputs",
          args: {
            datasets: [
              "demo_order_margin_bundle_manifest.json",
              "global_freight_benchmarks.csv",
            ],
          },
          result: {
            datasets: [
              {
                name: "demo_order_margin_bundle_manifest.json",
                inferred_domain: "order_economics",
                row_count: 4,
              },
              {
                name: "global_freight_benchmarks.csv",
                inferred_domain: "lane_risk",
                row_count: 8,
              },
            ],
            suggested_decisions: [
              "margin protection",
              "service-risk review",
              "lane prioritization",
            ],
          },
        },
      ],
    },
  },
  {
    id: "suspension-king-net-margin",
    prompt:
      "What's the net margin on last week's Suspension King orders after freight and rebates?",
    promptClass: "analytical",
    sharedBundleAnswerable: true,
    dataPrerequisites: [
      "Shared multi-table order-margin bundle with explicit customer and order-line relationships",
      "Shared formula reference in demo_order_margin_reference.md",
      "Calculation capability via code or structured reasoning",
    ],
    expectedRawBehavior:
      "Raw should calculate the net margin from the shared margin snapshot and disclose that the answer came from the shared dataset.",
    expectedAnnonaBehavior:
      "Annona should return the same number, but in a traceable form that makes the decomposition and evidence obvious.",
    correctnessRubric: [
      "Uses the correct margin formula.",
      "Returns $7,990 as the total net margin.",
      "Annona answer is explainable and traceable rather than merely numerical.",
    ],
    expectedRaw: {
      answerPath: "shared-tabular-baseline",
      rubric:
        "Raw should answer from the shared uploaded or bundled margin files, state the net margin result, and stay explicit that this came from the shared dataset rather than Annona-only access.",
      canonicalAnswer:
        "Raw shared-baseline answer: using the shared order bundle tables and the margin reference, Suspension King's three sample orders total $43,940 revenue, $31,480 COGS, $3,080 freight, and $1,390 rebates, leaving a net margin of $7,990. This comes from the shared dataset, not Annona-only access.",
      mustContainAll: ["Suspension King", "net margin", "shared dataset"],
      mustContainOneOf: [
        ["7,990", "7990"],
        ["shared order bundle", "shared dataset", "bundle tables"],
        ["43,940", "43940"],
      ],
      requiredToolOneOf: [["openai_file_search", "openai_code_interpreter"]],
      mockToolInvocations: [
        {
          toolName: "openai_file_search",
          args: {
            queries: [
              "demo_order_margin_orders.csv demo_order_margin_order_lines.csv Suspension King freight rebates",
            ],
          },
          result: {
            status: "completed",
            results: [
              {
                filename: "demo_order_margin_orders.csv",
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
            task: "Calculate net margin by joining the bundled Suspension King order headers and order lines.",
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
      answerPath: "annona-orchestrated-shared-baseline",
      rubric:
        "Annona should answer from the same shared dataset, state the same $7,990 result, and show a traceable decomposition rather than implying special hidden data.",
      canonicalAnswer:
        "Annona answer: from the same shared order bundle, Suspension King's last-week sample orders resolve to $43,940 revenue, $31,480 COGS, $3,080 freight, and $1,390 rebates, for a traceable net margin of $7,990. Annona surfaces the decomposition so the recommendation path stays explainable and does not depend on a black box.",
      mustContainAll: [
        "same shared order bundle",
        "traceable net margin",
        "Suspension King",
      ],
      mustContainOneOf: [
        ["7,990", "7990"],
        ["explainable", "traceable"],
        ["black box", "black-box"],
      ],
      requiredTools: ["annona_run_margin_analysis"],
      mockToolInvocations: [
        {
          toolName: "annona_run_margin_analysis",
          args: {
            dataset: "demo_order_margin_bundle_manifest.json",
            metric: "net_margin",
          },
          result: {
            customer: "Suspension King",
            revenue: 43940,
            cogs: 31480,
            freight: 3080,
            rebates: 1390,
            net_margin: 7990,
            margin_pct: 18.2,
            explainability: "Revenue - COGS - freight - rebates across 3 rows",
          },
        },
      ],
    },
  },
  {
    id: "protect-margin-next-week",
    prompt:
      "If we want to protect Suspension King's margin next week, which order pattern should operations intervene on first, and what should they do now?",
    promptClass: "prescriptive",
    sharedBundleAnswerable: true,
    dataPrerequisites: [
      "Shared multi-table order-margin bundle with order headers and order lines",
      "Ability to rank rows by net margin and cost pressure",
      "Operational recommendation framing",
    ],
    expectedRawBehavior:
      "Raw should identify the weakest order pattern from the shared margin data and make a sensible but generic recommendation.",
    expectedAnnonaBehavior:
      "Annona should identify the same weak point, explain the impact, and resolve the answer into a clear situation, impact, and action recommendation.",
    correctnessRubric: [
      "Flags SK-240321-03 or the equivalent lowest-margin pattern first.",
      "Recognizes that the order is near break-even at $490 net margin or 4.4% margin.",
      "Annona answer specifies what to do now, not just what happened.",
    ],
    expectedRaw: {
      answerPath: "shared-tabular-baseline",
      rubric:
        "Raw should use the shared margin snapshot to identify the weakest pattern and recommend a first intervention without pretending to have extra Annona-only context.",
      canonicalAnswer:
        "Raw recommendation: the first pattern to intervene on is the SK-240321-03 order profile because it only leaves $490 of net margin, about 4.4 percent, after $980 freight and $410 rebates. From the shared order bundle, the practical next step is to review freight pass-through and rebate approvals before similar orders ship next week.",
      mustContainAll: ["SK-240321-03", "shared order bundle"],
      mustContainOneOf: [
        ["490", "$490"],
        ["4.4", "4.4 percent", "4.4%"],
        ["freight pass-through", "rebate approvals", "rebates"],
      ],
      requiredTools: ["openai_code_interpreter"],
      mockToolInvocations: [
        {
          toolName: "openai_code_interpreter",
          args: {
            task: "Rank the Suspension King bundled orders by net margin and highlight the weakest pattern.",
          },
          result: {
            outputs: [
              {
                type: "logs",
                content:
                  "Lowest margin row=SK-240321-03, net_margin=490, margin_pct=4.4, freight=980, rebates=410",
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "annona-orchestrated-shared-baseline",
      rubric:
        "Annona should use the same shared margin rows, identify the weak order pattern, and turn it into a clear operational recommendation with context and traceability.",
      canonicalAnswer:
        "Annona recommendation: Situation: the SK-240321-03 pattern is the weak point in the shared margin snapshot at $490 net margin, or 4.4 percent, with freight and rebates consuming most of the gross buffer. Impact: if that pattern repeats next week, the account stays near break-even and small cost movement can erase margin. Action: review freight pass-through and rebate approval on lookalike orders before the next shipment, starting with orders that resemble SK-240321-03. This recommendation is traceable to the uploaded order rows.",
      mustContainAll: [
        "Situation:",
        "Impact:",
        "Action:",
        "SK-240321-03",
        "uploaded order rows",
      ],
      mustContainOneOf: [
        ["490", "$490"],
        ["4.4", "4.4 percent", "4.4%"],
        ["traceable", "explainable"],
      ],
      requiredTools: [
        "annona_plan_margin_intervention",
        "annona_evaluate_recommendation",
      ],
      mockToolInvocations: [
        {
          toolName: "annona_plan_margin_intervention",
          args: {
            dataset: "demo_order_margin_snapshot.csv",
            objective: "protect margin next week",
          },
          result: {
            focus_pattern: "SK-240321-03",
            net_margin: 490,
            margin_pct: 4.4,
            driver: "freight and rebate drag",
            recommended_action:
              "Review freight pass-through and rebate approval before next shipment",
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
    id: "supplier-drag-cross-table",
    prompt:
      "Within the shared order bundle, which supplier absorbs the most freight and rebate drag, and why?",
    promptClass: "analytical",
    sharedBundleAnswerable: true,
    dataPrerequisites: [
      "Shared multi-table order-margin bundle with manifest, order headers, order lines, and product dimension rows",
      "Ability to follow bundle relationships across order_lines.sku and order headers",
      "Structured reasoning over a joined dataset",
    ],
    expectedRawBehavior:
      "Raw should use the shared bundle tables to join orders, line items, and products, then identify the supplier with the largest allocated freight-plus-rebate drag.",
    expectedAnnonaBehavior:
      "Annona should use the same shared bundle, make the relationship path explicit, and turn the joined result into an explainable supplier-level margin-drag readout.",
    correctnessRubric: [
      "Identifies Atlas Springs as the top supplier by allocated freight-plus-rebate drag.",
      "Uses the shared multi-table baseline rather than Annona-only hidden data.",
      "Annona answer makes the relationship path or trace explicit.",
    ],
    expectedRaw: {
      answerPath: "shared-tabular-baseline",
      rubric:
        "Raw should join the shared bundle tables generically, report Atlas Springs as the largest drag point, and disclose that the result came from the shared multi-table baseline.",
      canonicalAnswer:
        "Raw joined-bundle answer: after joining the shared order headers, order lines, and product dimension rows, Atlas Springs carries the most allocated freight-plus-rebate drag at about $1,486 across the Suspension King sample orders. This comes from the shared multi-table dataset, not Annona-only access.",
      mustContainAll: ["Atlas Springs", "shared multi-table dataset"],
      mustContainOneOf: [
        ["1,486", "1486"],
        ["order headers", "order lines", "product dimension"],
        ["joined", "join", "relationship"],
      ],
      requiredTools: ["openai_code_interpreter"],
      mockToolInvocations: [
        {
          toolName: "openai_code_interpreter",
          args: {
            task: "Join the bundled order headers, order lines, and product dimension tables and rank suppliers by allocated freight-plus-rebate drag.",
          },
          result: {
            outputs: [
              {
                type: "logs",
                content:
                  "Top supplier drag=Atlas Springs, allocated_drag=1486, relationship_path=orders->order_lines->products",
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "annona-orchestrated-shared-baseline",
      rubric:
        "Annona should use the same shared bundle, show the join path, and frame the result as a relationship-aware margin-drag finding rather than a black-box answer.",
      canonicalAnswer:
        "Annona answer: using the same shared order bundle and the relationship path orders -> order_lines -> products, Atlas Springs absorbs the most freight-and-rebate drag at $1,486. The finding is traceable to the joined bundle rows, so Annona's advantage here is orchestration and relationship-aware reasoning, not hidden data.",
      mustContainAll: [
        "same shared order bundle",
        "Atlas Springs",
        "relationship path",
      ],
      mustContainOneOf: [
        ["1,486", "1486"],
        ["traceable", "joined bundle rows", "relationship-aware"],
        ["orchestration", "not hidden data"],
      ],
      requiredTools: ["annona_query_supplier_margin_leakage_snapshot"],
      mockToolInvocations: [
        {
          toolName: "annona_query_supplier_margin_leakage_snapshot",
          args: {
            top_n: 1,
          },
          result: {
            supplier: "Atlas Springs",
            leakage_amount: 1486,
            relationship_trace: [
              "orders.order_id -> order_lines.order_id",
              "order_lines.sku -> products.sku",
            ],
          },
        },
      ],
    },
  },
  {
    id: "lane-service-risk-next-month",
    prompt:
      "Which freight lane looks most likely to create service risk next month, and what is the earliest action to take now?",
    promptClass: "predictive",
    sharedBundleAnswerable: true,
    dataPrerequisites: [
      "Shared tabular baseline with global_freight_benchmarks.csv",
      "Ability to compare transit time, cost, and reliability",
      "Future-state risk framing",
    ],
    expectedRawBehavior:
      "Raw should identify the riskiest lane from the shared freight table and give a sensible early action, but it may stay relatively generic.",
    expectedAnnonaBehavior:
      "Annona should identify the same lane, explain why it matters before failure lands, and specify the earliest intervention in operational language.",
    correctnessRubric: [
      "Flags Ningbo-Rotterdam on HarborSpan as the top service-risk watchpoint.",
      "Uses the supporting facts: 28 transit days, 88 percent reliability, $3,340 cost.",
      "Annona answer frames the decision as an early operational intervention.",
    ],
    expectedRaw: {
      answerPath: "shared-tabular-baseline",
      rubric:
        "Raw should use the shared freight benchmark table to rank likely service risk and name a reasonable early action based on the available data.",
      canonicalAnswer:
        "Raw risk view: Ningbo-Rotterdam on HarborSpan looks most likely to create service risk next month because it has the longest transit time at 28 days, the worst reliability at 88 percent, and the highest cost at $3,340 among the benchmark lanes. From the shared freight table, the earliest action is to review upcoming bookings on that lane now and line up a contingency carrier plan.",
      mustContainAll: [
        "Ningbo-Rotterdam",
        "HarborSpan",
        "shared freight table",
      ],
      mustContainOneOf: [
        ["28 days", "28-day", "28"],
        ["88 percent", "88%", "88 percent reliability"],
        ["3,340", "$3,340", "3340"],
        ["contingency carrier plan", "review upcoming bookings", "contingency"],
      ],
      requiredTools: ["openai_code_interpreter"],
      mockToolInvocations: [
        {
          toolName: "openai_code_interpreter",
          args: {
            task: "Rank freight lanes by likely service risk using transit_days, reliability_pct, and cost_usd.",
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
        "Annona should use the same freight table but turn the ranking into an early operating decision with a clear rationale and next action.",
      canonicalAnswer:
        "Annona recommendation: Situation: Ningbo-Rotterdam on HarborSpan is the first service-risk watchpoint in the shared freight benchmark because it combines the longest transit at 28 days with the lowest reliability at 88 percent and the highest benchmark cost at $3,340. Impact: if the next month follows the same pattern, this lane is the easiest place for delay and cost pressure to land before the team reacts. Action: pull the next bookings on this lane forward into review now and prepare a contingency routing decision before service slips. The recommendation is explainable from the benchmark rows.",
      mustContainAll: [
        "Situation:",
        "Impact:",
        "Action:",
        "Ningbo-Rotterdam",
        "HarborSpan",
      ],
      mustContainOneOf: [
        ["28 days", "28-day", "28"],
        ["88 percent", "88%", "88 percent reliability"],
        ["3,340", "$3,340", "3340"],
        ["benchmark rows", "explainable", "traceable"],
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
          },
        },
        {
          toolName: "annona_evaluate_recommendation",
          args: {
            check: "early-action timing",
          },
          result: {
            grounded: true,
            action_oriented: true,
            timing_aligned: true,
          },
        },
      ],
    },
  },
  {
    id: "current-ocean-freight-signal",
    prompt:
      "Search the web for a current ocean freight signal and tell me whether it changes what you would do with this dataset.",
    promptClass: "predictive",
    sharedBundleAnswerable: false,
    dataPrerequisites: [
      "Shared web search capability when provider tooling is available",
      "Shared freight benchmark table for contextualization",
      "Clear separation between external signal and dataset-derived conclusion",
    ],
    expectedRawBehavior:
      "Raw should provide a current cited ocean-freight signal from the web and give a reasonable but generic view on whether it changes the local read of the dataset.",
    expectedAnnonaBehavior:
      "Annona should cite the same kind of web signal, then contextualize it against the shared dataset and state whether the operating recommendation changes.",
    correctnessRubric: [
      "Includes citation-style source text for the web signal.",
      "Keeps web evidence separate from dataset evidence.",
      "Annona turns the external signal into a concrete change or non-change in operating posture.",
    ],
    expectedRaw: {
      answerPath: "shared-native-web",
      rubric:
        "Raw should answer with a current ocean-freight signal from web search, make it explicit that the source is external rather than dataset-derived, and include citation-style source text.",
      canonicalAnswer:
        "Raw web answer: a current ocean freight signal is that schedule reliability is improving on some major lanes while spot rates remain volatile. Source: Demo web-search citation placeholder, April 4, 2026. This is external web research, not a finding from the shared dataset. It does not change the local facts in the dataset, but it does reinforce watching lower-reliability ocean lanes closely.",
      mustContainAll: ["ocean freight", "Source:", "shared dataset"],
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
      answerPath: "annona-contextualized-web-plus-shared-baseline",
      rubric:
        "Annona should answer via the same shared native web search, then contextualize the external signal against the shared dataset and state the operational implication clearly.",
      canonicalAnswer:
        "Annona answer: a current ocean freight signal is improving schedule reliability on some major lanes alongside volatile spot pricing. Source: Demo web-search citation placeholder, April 4, 2026. That signal comes from shared native web search, not the dataset itself. It does not overturn the dataset read, so the recommendation stays the same: keep the earliest attention on the weakest ocean lane in the benchmark set and act before service slips.",
      mustContainAll: ["ocean freight", "Source:", "not the dataset itself"],
      mustContainOneOf: [
        ["current", "currently"],
        ["schedule reliability", "reliability"],
        ["spot pricing", "spot rates", "volatile"],
        ["recommendation stays the same", "keep the earliest attention", "act before service slips"],
      ],
      requiredTools: [
        "openai_web_search",
        "annona_contextualize_external_signal",
      ],
      mockToolInvocations: [
        {
          toolName: "openai_web_search",
          args: {
            query: "current ocean freight signal schedule reliability spot rates",
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
        {
          toolName: "annona_contextualize_external_signal",
          args: {
            dataset: "global_freight_benchmarks.csv",
            signal: "improving schedule reliability with volatile spot pricing",
          },
          result: {
            posture_change: "no_major_change",
            reinforced_focus: "lowest-reliability ocean lane",
          },
        },
      ],
    },
  },
  {
    id: "average-transit-days",
    prompt:
      "Use your code sandbox on the freight benchmark CSV and tell me the average transit days.",
    promptClass: "analytical",
    sharedBundleAnswerable: true,
    dataPrerequisites: [
      "Shared tabular baseline with global_freight_benchmarks.csv",
      "Code execution over CSV rows",
      "Ability to disclose that the result comes from the shared baseline",
    ],
    expectedRawBehavior:
      "Raw should compute the average transit days from the shared freight CSV and disclose that the answer came from the shared baseline.",
    expectedAnnonaBehavior:
      "Annona should return the same computed result, but keep the answer crisp and traceable to the benchmark file.",
    correctnessRubric: [
      "Returns 13.875 days, or an equivalent rounded value.",
      "References the freight benchmark CSV.",
      "Does not imply hidden Annona-only data.",
    ],
    expectedRaw: {
      answerPath: "shared-tabular-baseline",
      rubric:
        "Raw should use the shared freight benchmark CSV via the code sandbox, report the average transit days, and disclose that the result came from the shared baseline.",
      canonicalAnswer:
        "Raw code answer: using the shared global_freight_benchmarks.csv in the code sandbox, the average transit days across all eight rows is 13.875 days, or about 13.9 days rounded. This is from the shared baseline, not hidden Annona-only data.",
      mustContainAll: ["average transit days", "global_freight_benchmarks.csv"],
      mustContainOneOf: [
        ["13.875", "13.88", "13.9"],
        ["shared baseline", "shared dataset"],
      ],
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
      answerPath: "annona-orchestrated-shared-baseline",
      rubric:
        "Annona should also use the shared code path for this prompt, report the same average transit result, and keep the answer tied to the shared freight CSV.",
      canonicalAnswer:
        "Annona answer: using the same shared global_freight_benchmarks.csv in the code sandbox, the average transit days is 13.875 across eight rows, about 13.9 days rounded. The result is traceable to the benchmark file and does not rely on hidden Annona-only data.",
      mustContainAll: ["average transit days", "global_freight_benchmarks.csv"],
      mustContainOneOf: [
        ["13.875", "13.88", "13.9"],
        ["traceable", "benchmark file"],
      ],
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
