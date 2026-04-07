import test from "node:test";
import assert from "node:assert/strict";
// @ts-ignore Node's built-in test runner needs the explicit .ts suffix here.
import { deriveAnswerInsights } from "./answer-insights.ts";

test("deriveAnswerInsights summarizes Annona blocker evidence and caveats", () => {
  const insights = deriveAnswerInsights(
    "Annona blocker view: the blocker is traceable to shared rows, and the first action is to review lookalike orders before it repeats.",
    [
      {
        toolCallId: "tool-1",
        toolName: "annona_trace_margin_blocker",
        args: {},
        result: {
          blocker: "freight_and_rebate_drag",
          weakest_row: "SK-240321-03",
          weakest_row_net_margin: 490,
          weakest_row_margin_pct: 4.4,
        },
      },
      {
        toolCallId: "tool-2",
        toolName: "annona_evaluate_recommendation",
        args: {},
        result: {
          grounded: true,
          action_oriented: true,
          traceable_to_rows: true,
        },
      },
    ],
  );

  assert.equal(insights.confidence.label, "Medium");
  assert.equal(insights.evidence[0]?.label, "Blocking row");
  assert.match(insights.evidence[0]?.detail ?? "", /SK-240321-03/);
  assert.match(insights.caveats.join(" "), /not live ERP or warehouse data/i);
});

test("deriveAnswerInsights summarizes predictive evidence from Annona watchpoints", () => {
  const insights = deriveAnswerInsights(
    "Annona predictive-risk view: this lane is the earliest service-risk watchpoint and the team should review bookings now.",
    [
      {
        toolCallId: "tool-1",
        toolName: "annona_rank_service_risk",
        args: {},
        result: {
          top_watchpoint: "Ningbo-Rotterdam",
          carrier_family: "HarborSpan",
          transit_days: 28,
          reliability_pct: 88,
          cost_usd: 3340,
        },
      },
    ],
  );

  assert.equal(insights.evidence[0]?.label, "Early warning signal");
  assert.match(insights.evidence[0]?.detail ?? "", /Ningbo-Rotterdam/);
  assert.match(insights.caveats.join(" "), /directional|not live ERP/i);
});
