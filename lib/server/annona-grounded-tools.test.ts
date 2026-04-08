import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAnnonaRecommendation,
  prioritizeAnnonaNextAction,
  rankAnnonaServiceRisk,
  traceAnnonaMarginBlocker,
} from "./annona-grounded-tools.ts";

test("traceAnnonaMarginBlocker returns the weakest traceable order pattern", () => {
  const result = traceAnnonaMarginBlocker({
    dataset: "demo_order_margin_bundle_manifest.json",
    objective: "protect margin",
  });

  assert.equal(result.blocker, "freight_and_rebate_drag");
  assert.equal(result.weakest_row, "SK-240321-03");
  assert.equal(result.weakest_row_net_margin, 490);
  assert.equal(result.weakest_row_margin_pct, 4.4);
  assert.deepEqual(result.focus_rows, ["SK-240321-03", "SK-240319-02"]);
});

test("rankAnnonaServiceRisk picks Ningbo-Rotterdam on HarborSpan as the top watchpoint", () => {
  const result = rankAnnonaServiceRisk({
    dataset: "global_freight_benchmarks.csv",
    horizon: "next_month",
  });

  assert.equal(result.top_watchpoint, "Ningbo-Rotterdam");
  assert.equal(result.carrier_family, "HarborSpan");
  assert.equal(result.transit_days, 28);
  assert.equal(result.reliability_pct, 88);
  assert.equal(result.cost_usd, 3340);
});

test("prioritizeAnnonaNextAction keeps the next-24-hours decision on the margin pattern", () => {
  const result = prioritizeAnnonaNextAction({
    datasets: [
      "demo_order_margin_bundle_manifest.json",
      "global_freight_benchmarks.csv",
    ],
    horizon: "next_24_hours",
  });

  assert.equal(result.priority, "SK-240321-03_margin_pattern");
  assert.equal(result.blocker_row, "SK-240321-03");
  assert.equal(
    result.supporting_alternate,
    "Ningbo-Rotterdam_HarborSpan_watchpoint",
  );
  assert.match(
    result.next_action,
    /freight pass-through and rebate approval/i,
  );
});

test("evaluateAnnonaRecommendation returns scenario-specific quality checks", () => {
  assert.deepEqual(
    evaluateAnnonaRecommendation({ check: "early-signal framing" }),
    {
      check: "early-signal framing",
      grounded: true,
      early_warning_clear: true,
      action_oriented: true,
    },
  );
  assert.deepEqual(
    evaluateAnnonaRecommendation({ check: "prioritization and next action" }),
    {
      check: "prioritization and next action",
      grounded: true,
      action_oriented: true,
      prioritization_clear: true,
    },
  );
});
