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
  assert.equal(insights.confidence.stateLabel, "Observed");
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
  assert.equal(insights.confidence.stateLabel, "Observed");
  assert.match(insights.evidence[0]?.detail ?? "", /Ningbo-Rotterdam/);
  assert.match(insights.caveats.join(" "), /directional|not live ERP/i);
});

test("deriveAnswerInsights downgrades confidence and marks estimated state for probabilistic traceability", () => {
  const insights = deriveAnswerInsights(
    "Estimated state: the kit is likely at site but not yet confirmed at point of use, so treat the progress as directional.",
    [
      {
        toolCallId: "tool-1",
        toolName: "annona_estimate_shadow_progress",
        args: {},
        result: {
          traceability_mode: "probabilistic",
          point_of_use_data_status: "missing",
          estimated_state: "arrived_at_site_not_confirmed_at_point_of_use",
          inferred_progress_pct: 72,
          progress_pct_low: 61,
          progress_pct_high: 79,
          evidence_coverage_pct: 68,
          wobble_detected: false,
          caveats: [
            "Point-of-use confirmation is missing, so the state is estimated from shadow signals rather than exact scan truth.",
          ],
        },
      },
    ],
  );

  assert.equal(insights.confidence.label, "Medium");
  assert.equal(insights.confidence.stateLabel, "Estimated");
  assert.equal(insights.evidence[0]?.label, "Estimated progress");
  assert.equal(insights.evidence[0]?.stateLabel, "Estimated");
  assert.match(insights.evidence[0]?.detail ?? "", /61%-79% inferred progress/i);
  assert.match(insights.caveats.join(" "), /point-of-use confirmation is missing/i);
});

test("deriveAnswerInsights treats wobble as an unstable estimated state", () => {
  const insights = deriveAnswerInsights(
    "Estimated state: progress looks unstable, so the team should verify before moving the job forward.",
    [
      {
        toolCallId: "tool-1",
        toolName: "annona_detect_shadow_wobble",
        args: {},
        result: {
          traceability_mode: "probabilistic",
          point_of_use_data_status: "missing",
          estimated_state: "in_transit_with_regression_risk",
          inferred_progress_pct: 58,
          progress_pct_low: 44,
          progress_pct_high: 67,
          wobble_detected: true,
          wobble_score: 0.73,
          caveats: [
            "Wobble means the inferred progress direction is unstable, not that a confirmed reversal happened at point of use.",
          ],
        },
      },
    ],
  );

  assert.equal(insights.confidence.label, "Low");
  assert.equal(insights.confidence.stateLabel, "Estimated");
  assert.equal(insights.evidence[0]?.label, "Wobble alert");
  assert.equal(insights.evidence[0]?.stateLabel, "Wobble");
  assert.match(insights.caveats.join(" "), /unstable/i);
});
