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
    id: "deep-dependency-traceability",
    prompt:
      "Sales order SO-240501-01 is escalated. What upstream dependency is blocking it, trace the path through BOM, work orders, and purchase orders, and what else gets hit if the shared component slips?",
    promptClass: "analytical",
    sharedBundleAnswerable: true,
    dataPrerequisites: [
      "Shared manufacturing dependency bundle with sales orders, work orders, BOM edges, purchase orders, customers, machines, and factories",
      "Ability to follow a multi-hop path from a sales order through child work orders and BOM levels to bought-component supply",
      "Ability to propagate impact from a shared component or purchase order into other exposed work orders and sales orders",
    ],
    expectedRawBehavior:
      "Raw should use the shared manufacturing dependency bundle to identify the upstream blocker, make the path explicit across BOM and order levels, and name the additional impacted order without implying Annona-only access.",
    expectedAnnonaBehavior:
      "Annona should identify the same blocker but frame it as an operational dependency path with explicit impact propagation across the shared component.",
    correctnessRubric: [
      "Identifies CAP-STEEL-08 on late PO-7712 as the upstream blocker for SO-240501-01.",
      "Traces the blocker through SO-240501-01, SOL-240501-01, WO-1001, WO-1002, CAP-STEEL-08, and POL-7712-1 or PO-7712.",
      "Names SO-240501-02 as the additional exposed order because the same shared component also feeds WO-1005.",
    ],
    expectedRaw: {
      answerPath: "shared-tabular-baseline",
      rubric:
        "Raw should use the shared manufacturing dependency bundle tables and reference file, trace the blocker across the multi-level path, and call out the shared-component fan-out without implying Annona-only graph access.",
      canonicalAnswer:
        "Raw deep traceability answer: using the shared manufacturing dependency bundle, sales order SO-240501-01 is blocked by shared component CAP-STEEL-08 rather than final-kit capacity. The path is SO-240501-01 -> SOL-240501-01 -> WO-1001 -> WO-1002 -> CAP-STEEL-08 -> POL-7712-1 -> PO-7712, where the purchase order is late into Brisbane Assembly on MC-COIL-01. The same shared component also feeds WO-1005, so SO-240501-02 is exposed if that component slips again.",
      mustContainAll: [
        "shared manufacturing dependency bundle",
        "SO-240501-01",
        "CAP-STEEL-08",
        "PO-7712",
        "SO-240501-02",
      ],
      mustContainOneOf: [
        ["WO-1001", "WO-1002"],
        ["POL-7712-1", "purchase order line"],
        ["Brisbane Assembly", "MC-COIL-01", "Coil Cell 01"],
        ["shared component", "slips again", "exposed"],
      ],
      requiredToolOneOf: [["openai_file_search", "openai_code_interpreter"]],
      mockToolInvocations: [
        {
          toolName: "openai_code_interpreter",
          args: {
            task: "Use the shared manufacturing dependency bundle to trace the blocker for SO-240501-01 through BOM, work orders, and purchase orders, then identify any other impacted orders from the same shared component.",
          },
          result: {
            outputs: [
              {
                type: "logs",
                content:
                  "Path=SO-240501-01>SOL-240501-01>WO-1001>WO-1002>CAP-STEEL-08>POL-7712-1>PO-7712, blocker=shared_component_supply, impacted_sales_orders=SO-240501-02, machine=MC-COIL-01, factory=Brisbane Assembly",
              },
            ],
          },
        },
      ],
    },
    expectedGrounded: {
      answerPath: "annona-orchestrated-shared-baseline",
      rubric:
        "Annona should use graph-backed dependency tools on the same shared manufacturing bundle, make the multi-hop path explicit, and show the impact fan-out to another order.",
      canonicalAnswer:
        "Annona dependency view: SO-240501-01 is blocked by shared component CAP-STEEL-08, not by final-kit capacity. Path: SO-240501-01 -> SOL-240501-01 -> WO-1001 -> WO-1002 -> CAP-STEEL-08 -> POL-7712-1 -> PO-7712, with the blockage sitting on MC-COIL-01 at Brisbane Assembly. Impact: the same shared component also feeds WO-1005, so SO-240501-02 is exposed unless PO-7712 is expedited now.",
      mustContainAll: [
        "SO-240501-01",
        "CAP-STEEL-08",
        "PO-7712",
        "Path:",
        "Impact:",
        "SO-240501-02",
      ],
      mustContainOneOf: [
        ["WO-1001", "WO-1002"],
        ["POL-7712-1", "purchase order line"],
        ["MC-COIL-01", "Brisbane Assembly"],
        ["shared component", "expedited now", "exposed"],
      ],
      requiredTools: [
        "annona_trace_graph_dependencies",
        "annona_propagate_dependency_impact",
        "annona_evaluate_recommendation",
      ],
      mockToolInvocations: [
        {
          toolName: "annona_trace_graph_dependencies",
          args: {
            dataset: "demo_manufacturing_dependency_bundle_manifest.json",
            root_entity_type: "sales_order",
            root_entity_id: "SO-240501-01",
            objective:
              "trace the blocker through BOM, work orders, and purchase orders",
          },
          result: {
            blocker_category: "shared_component_supply",
            blocker_part_id: "CAP-STEEL-08",
            blocker_purchase_order_line_id: "POL-7712-1",
            blocker_purchase_order_id: "PO-7712",
            machine_id: "MC-COIL-01",
            factory_name: "Brisbane Assembly",
            critical_path: [
              "SO-240501-01",
              "SOL-240501-01",
              "WO-1001",
              "WO-1002",
              "CAP-STEEL-08",
              "POL-7712-1",
              "PO-7712",
            ],
          },
        },
        {
          toolName: "annona_propagate_dependency_impact",
          args: {
            dataset: "demo_manufacturing_dependency_bundle_manifest.json",
            source_entity_type: "purchase_order",
            source_entity_id: "PO-7712",
          },
          result: {
            shared_component_part_id: "CAP-STEEL-08",
            impacted_sales_orders: [
              { sales_order_id: "SO-240501-01", status: "blocked" },
              { sales_order_id: "SO-240501-02", status: "at_risk" },
            ],
            impacted_work_orders: [
              { work_order_id: "WO-1002", status: "blocked" },
              { work_order_id: "WO-1005", status: "at_risk" },
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

/** @type {DemoScenario[]} */
export const PROBABILISTIC_TRACEABILITY_SCENARIOS = [
  {
    id: "missing-point-of-use-inferred-progress",
    prompt:
      "We do not have point-of-use scans for Zeder yet. Which kit looks farthest along anyway, and how certain is that estimate?",
    promptClass: "predictive",
    sharedBundleAnswerable: false,
    dataPrerequisites: [
      "Shadow progress signals such as ETA changes, installer bookings, and exception activity",
      "Explicit absence of point-of-use confirmation",
      "Confidence and caveat framing for estimated state rather than exact truth",
    ],
    expectedRawBehavior:
      "Raw should admit the shared baseline does not provide confirmed point-of-use truth and avoid pretending it can name an exact completion state.",
    expectedAnnonaBehavior:
      "Annona should surface an estimated state only, expose the probabilistic traceability range, and attach the missing point-of-use caveat directly to the answer.",
    correctnessRubric: [
      "Marks the state as estimated rather than exact.",
      "Names ZED-KIT-1042 as the farthest-along kit from the heuristic signal set.",
      "Explains that the progress band is directional because point-of-use confirmation is missing.",
    ],
    expectedRaw: {
      answerPath: "insufficient-shared-baseline-for-exact-point-of-use-truth",
      rubric:
        "Raw should decline exact traceability and say the shared baseline lacks point-of-use confirmation for Zeder.",
      canonicalAnswer:
        "Raw heuristic answer: I cannot honestly identify an exact point-of-use state from the shared baseline because the Zeder pilot does not include confirmed point-of-use scans. The best I can say is that some indirect signals may suggest progress, but that would still need manual verification before anyone treats a kit as completed.",
      mustContainAll: ["shared baseline", "point-of-use", "manual verification"],
      mustContainOneOf: [
        ["cannot honestly identify", "cannot confirm", "do not have confirmed point-of-use scans"],
        ["indirect signals", "estimated", "suggest progress"],
      ],
    },
    expectedGrounded: {
      answerPath: "annona-probabilistic-traceability",
      rubric:
        "Annona should show the estimated state, quantify the inferred progress band, and disclose that the traceability is probabilistic because point-of-use truth is missing.",
      canonicalAnswer:
        "Annona estimated-state view: ZED-KIT-1042 looks farthest along, but this is probabilistic traceability rather than exact scan truth. Estimated state: arrived at site, not confirmed at point of use, with roughly 61 to 79 percent inferred progress. Confidence: medium, because the ETA tightened and the installer booking stayed intact, but point-of-use confirmation is still missing. Caveat: treat this as directional until a physical consumption or install event lands.",
      mustContainAll: [
        "ZED-KIT-1042",
        "Estimated state:",
        "probabilistic traceability",
        "point-of-use confirmation is still missing",
      ],
      mustContainOneOf: [
        ["61 to 79 percent", "61-79 percent", "61%-79%"],
        ["medium", "Confidence: medium"],
        ["directional", "not exact scan truth", "probabilistic"],
      ],
      requiredTools: [
        "annona_estimate_shadow_progress",
        "annona_evaluate_recommendation",
      ],
      mockToolInvocations: [
        {
          toolName: "annona_estimate_shadow_progress",
          args: {
            dataset: "zeder_shadow_progress_snapshot.json",
            entity_id: "ZED-KIT-1042",
            horizon_hours: 24,
          },
          result: {
            traceability_mode: "probabilistic",
            point_of_use_data_status: "missing",
            entity_id: "ZED-KIT-1042",
            estimated_state: "arrived_at_site_not_confirmed_at_point_of_use",
            inferred_progress_pct: 72,
            progress_pct_low: 61,
            progress_pct_high: 79,
            evidence_coverage_pct: 68,
            wobble_detected: false,
          },
        },
        {
          toolName: "annona_evaluate_recommendation",
          args: {
            check: "probabilistic estimated-state disclosure",
          },
          result: {
            grounded: true,
            estimated_state_labeled: true,
            caveats_present: true,
            confidence_downgraded: true,
          },
        },
      ],
    },
  },
  {
    id: "shadow-progress-wobble",
    prompt:
      "Without point-of-use truth, which Zeder kit looks wobbly enough that the team should verify it before treating progress as real?",
    promptClass: "predictive",
    sharedBundleAnswerable: false,
    dataPrerequisites: [
      "Shadow progress signals with both forward and regressing movements",
      "Explicit absence of point-of-use confirmation",
      "Heuristic wobble scoring and escalation caveats",
    ],
    expectedRawBehavior:
      "Raw should say the baseline cannot prove a wobble without confirmed point-of-use data and should avoid naming a false exact reversal.",
    expectedAnnonaBehavior:
      "Annona should flag the unstable entity as a wobble case, explain the conflicting signals, and downgrade confidence instead of overclaiming certainty.",
    correctnessRubric: [
      "Flags ZED-KIT-2088 as the wobble case.",
      "Names the ETA reversal and partial-quantity acknowledgement as the conflicting signals.",
      "Downgrades confidence and asks for manual verification.",
    ],
    expectedRaw: {
      answerPath: "insufficient-shared-baseline-for-wobble-proof",
      rubric:
        "Raw should not claim a confirmed reversal when the pilot lacks point-of-use truth.",
      canonicalAnswer:
        "Raw wobble answer: without confirmed point-of-use data, I cannot prove that any Zeder kit truly reversed or stalled. The safest answer is that conflicting indirect signals may indicate instability, but the team would still need a manual check before treating that as real progress wobble.",
      mustContainAll: ["point-of-use data", "manual check"],
      mustContainOneOf: [
        ["cannot prove", "cannot confirm", "do not have confirmed point-of-use data"],
        ["conflicting indirect signals", "instability", "wobble"],
      ],
    },
    expectedGrounded: {
      answerPath: "annona-probabilistic-wobble-detection",
      rubric:
        "Annona should flag the wobble case as an unstable estimated state rather than a confirmed reversal and push the operator toward manual verification.",
      canonicalAnswer:
        "Annona wobble view: ZED-KIT-2088 is the strongest verify-now case. Estimated state: in transit with regression risk, not a confirmed point-of-use reversal. Wobble signal: the ETA moved backward after an earlier forward step and the acknowledgement shifted from a full kit to a partial kit, so confidence should stay low. Next move: verify the kit manually before the team books it as real progress.",
      mustContainAll: [
        "ZED-KIT-2088",
        "Estimated state:",
        "Wobble signal:",
        "verify the kit manually",
      ],
      mustContainOneOf: [
        ["regression risk", "wobble", "unstable"],
        ["ETA moved backward", "eta moved backward"],
        ["partial kit", "partial-quantity acknowledgement", "partial quantity"],
        ["confidence should stay low", "low confidence", "confidence: low"],
      ],
      requiredTools: [
        "annona_detect_shadow_wobble",
        "annona_evaluate_recommendation",
      ],
      mockToolInvocations: [
        {
          toolName: "annona_detect_shadow_wobble",
          args: {
            dataset: "zeder_shadow_progress_snapshot.json",
            entity_id: "ZED-KIT-2088",
          },
          result: {
            traceability_mode: "probabilistic",
            point_of_use_data_status: "missing",
            entity_id: "ZED-KIT-2088",
            estimated_state: "in_transit_with_regression_risk",
            inferred_progress_pct: 58,
            progress_pct_low: 44,
            progress_pct_high: 67,
            wobble_detected: true,
            wobble_score: 0.73,
            wobble_reasons: [
              "ETA moved backward by 2.4 days after an earlier forward step",
              "Quantity acknowledgement dropped from full kit to partial kit",
            ],
          },
        },
        {
          toolName: "annona_evaluate_recommendation",
          args: {
            check: "wobble disclosure and confidence downgrade",
          },
          result: {
            grounded: true,
            estimated_state_labeled: true,
            caveats_present: true,
            confidence_downgraded: true,
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
