import test from "node:test";
import assert from "node:assert/strict";
import {
  detectAnnonaShadowWobble,
  estimateAnnonaShadowProgress,
  evaluateAnnonaRecommendation,
  propagateAnnonaDependencyImpact,
  prioritizeAnnonaNextAction,
  rankAnnonaServiceRisk,
  traceAnnonaGraphDependencies,
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

test("traceAnnonaGraphDependencies returns the deep manufacturing blocker path", () => {
  const result = traceAnnonaGraphDependencies({
    dataset: "demo_manufacturing_dependency_bundle_manifest.json",
    root_entity_type: "sales_order",
    root_entity_id: "SO-240501-01",
  });

  assert.equal(result.traceability_mode, "exact");
  assert.equal(result.blocker_category, "shared_component_supply");
  assert.equal(result.blocker_part_id, "CAP-STEEL-08");
  assert.equal(result.blocker_purchase_order_id, "PO-7712");
  assert.equal(result.machine_id, "MC-COIL-01");
  assert.equal(result.factory_name, "Brisbane Assembly");
  assert.deepEqual(
    result.critical_path.map((step) => step.entity_id),
    [
      "SO-240501-01",
      "SOL-240501-01",
      "WO-1001",
      "WO-1002",
      "CAP-STEEL-08",
      "POL-7712-1",
      "PO-7712",
    ],
  );
});

test("propagateAnnonaDependencyImpact fans a shared-component blocker into other orders", () => {
  const result = propagateAnnonaDependencyImpact({
    dataset: "demo_manufacturing_dependency_bundle_manifest.json",
    source_entity_type: "purchase_order",
    source_entity_id: "PO-7712",
  });

  assert.equal(result.traceability_mode, "exact");
  assert.equal(result.shared_component_part_id, "CAP-STEEL-08");
  assert.deepEqual(
    result.impacted_sales_orders.map((order) => order.sales_order_id),
    ["SO-240501-01", "SO-240501-02"],
  );
  assert.deepEqual(
    result.impacted_work_orders.map((workOrder) => workOrder.work_order_id),
    ["WO-1001", "WO-1002", "WO-1004", "WO-1005"],
  );
});

test("estimateAnnonaShadowProgress marks missing point-of-use truth as probabilistic", () => {
  const result = estimateAnnonaShadowProgress({
    dataset: "zeder_shadow_progress_snapshot.json",
    entity_id: "ZED-KIT-1042",
    horizon_hours: 24,
  });

  assert.equal(result.traceability_mode, "probabilistic");
  assert.equal(result.virtual_mes_mode, "shadow_factory");
  assert.equal(result.entity_type, "kit");
  assert.equal(result.point_of_use_data_status, "missing");
  assert.equal(result.entity_id, "ZED-KIT-1042");
  assert.equal(result.management_status, "watch");
  assert.equal(result.primary_constraint, "point_of_use_confirmation_missing");
  assert.equal(result.inferred_progress_pct, 72);
  assert.equal(result.wobble_detected, false);
  assert.match(result.recommended_action, /keep the kit on watch/i);
  assert.match(result.caveats.join(" "), /estimated from shadow signals/i);
});

test("detectAnnonaShadowWobble flags unstable inferred progress without claiming scan truth", () => {
  const result = detectAnnonaShadowWobble({
    dataset: "zeder_shadow_progress_snapshot.json",
    entity_id: "ZED-KIT-2088",
  });

  assert.equal(result.traceability_mode, "probabilistic");
  assert.equal(result.virtual_mes_mode, "shadow_factory");
  assert.equal(result.entity_id, "ZED-KIT-2088");
  assert.equal(result.management_status, "verify_now");
  assert.equal(
    result.primary_constraint,
    "eta_regression_and_partial_acknowledgement",
  );
  assert.equal(result.wobble_detected, true);
  assert.equal(result.wobble_score, 0.73);
  assert.match(result.recommended_action, /verify the kit manually/i);
  assert.match(result.wobble_reasons.join(" "), /eta moved backward/i);
  assert.match(result.caveats.join(" "), /manual confirmation/i);
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
  assert.deepEqual(
    evaluateAnnonaRecommendation({ check: "probabilistic estimated-state disclosure" }),
    {
      check: "probabilistic estimated-state disclosure",
      grounded: true,
      estimated_state_labeled: true,
      caveats_present: true,
      confidence_downgraded: true,
    },
  );
  assert.deepEqual(
    evaluateAnnonaRecommendation({
      check: "shadow factory management status clarity",
    }),
    {
      check: "shadow factory management status clarity",
      grounded: true,
      management_status_clear: true,
      caveats_present: true,
      confidence_downgraded: true,
    },
  );
});
