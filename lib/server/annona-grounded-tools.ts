import { readFileSync } from "node:fs";
import path from "node:path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getDatasetTable,
  getDemoOrderMarginBundle,
  getRelatedRows,
  getSingleRelatedRow,
} from "./demo-dataset-bundle.ts";
import {
  propagateManufacturingGraphImpact,
  traceManufacturingGraphDependencies,
  type DependencyEntityType,
} from "./demo-dependency-graph.ts";

export interface DemoOrderSnapshot {
  order_id: string;
  booked_at: string;
  customer: string;
  revenue: number;
  cogs: number;
  freight: number;
  rebates: number;
}

export interface DemoStockRisk {
  sku: string;
  description: string;
  supplier: string;
  on_hand_units: number;
  forecast_30d_units: number;
  days_remaining: number;
  urgent: boolean;
  recommended_action: string;
}

export interface DemoSupplierLeakage {
  supplier: string;
  leakage_amount: number;
  mean_margin_pct: number;
  negative_margin_orders: number;
  primary_driver: string;
  supporting_detail: string;
}

export interface DemoFreightBenchmark {
  lane: string;
  mode: string;
  carrier_family: string;
  region: string;
  transit_days: number;
  cost_usd: number;
  reliability_pct: number;
}

function toNumber(value: string, fieldName: string) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Expected numeric value for ${fieldName}, received "${value}".`);
  }

  return parsed;
}

function buildOrderSnapshotRows() {
  const bundle = getDemoOrderMarginBundle();
  const orderRows = getDatasetTable(bundle, "orders").rows;

  return orderRows.map((orderRow) => {
    const customerRow = getSingleRelatedRow(bundle, "orders_to_customers", orderRow);
    const lineRows = getRelatedRows(bundle, "orders_to_order_lines", orderRow);
    const revenue = lineRows.reduce(
      (sum, lineRow) => sum + toNumber(lineRow.revenue, "order_lines.revenue"),
      0,
    );
    const cogs = lineRows.reduce(
      (sum, lineRow) => sum + toNumber(lineRow.cogs, "order_lines.cogs"),
      0,
    );

    return {
      order_id: orderRow.order_id,
      booked_at: orderRow.booked_at,
      customer: customerRow.customer_name,
      revenue,
      cogs,
      freight: toNumber(orderRow.freight, "orders.freight"),
      rebates: toNumber(orderRow.rebates, "orders.rebates"),
    };
  });
}

function buildSupplierLeakageRows() {
  const bundle = getDemoOrderMarginBundle();
  const orderRows = getDatasetTable(bundle, "orders").rows;
  const supplierSummary = new Map<
    string,
    {
      revenue: number;
      cogs: number;
      allocated_freight: number;
      allocated_rebates: number;
      perOrderNetMargins: number[];
      skus: Set<string>;
    }
  >();

  for (const orderRow of orderRows) {
    const lineRows = getRelatedRows(bundle, "orders_to_order_lines", orderRow);
    const orderRevenue = lineRows.reduce(
      (sum, lineRow) => sum + toNumber(lineRow.revenue, "order_lines.revenue"),
      0,
    );
    const orderFreight = toNumber(orderRow.freight, "orders.freight");
    const orderRebates = toNumber(orderRow.rebates, "orders.rebates");
    const supplierOrderNetMargins = new Map<string, number>();

    for (const lineRow of lineRows) {
      const productRow = getSingleRelatedRow(
        bundle,
        "order_lines_to_products",
        lineRow,
      );
      const supplier = productRow.supplier;
      const lineRevenue = toNumber(lineRow.revenue, "order_lines.revenue");
      const lineCogs = toNumber(lineRow.cogs, "order_lines.cogs");
      const revenueShare = orderRevenue > 0 ? lineRevenue / orderRevenue : 0;
      const allocatedFreight = orderFreight * revenueShare;
      const allocatedRebates = orderRebates * revenueShare;
      const summary = supplierSummary.get(supplier) ?? {
        revenue: 0,
        cogs: 0,
        allocated_freight: 0,
        allocated_rebates: 0,
        perOrderNetMargins: [],
        skus: new Set<string>(),
      };

      summary.revenue += lineRevenue;
      summary.cogs += lineCogs;
      summary.allocated_freight += allocatedFreight;
      summary.allocated_rebates += allocatedRebates;
      summary.skus.add(lineRow.sku);

      const lineNetMargin =
        lineRevenue - lineCogs - allocatedFreight - allocatedRebates;
      supplierOrderNetMargins.set(
        supplier,
        (supplierOrderNetMargins.get(supplier) ?? 0) + lineNetMargin,
      );
      supplierSummary.set(supplier, summary);
    }

    for (const [supplier, netMargin] of supplierOrderNetMargins) {
      const summary = supplierSummary.get(supplier);
      summary?.perOrderNetMargins.push(netMargin);
    }
  }

  return [...supplierSummary.entries()]
    .map(([supplier, summary]) => {
      const totalLeakage = Math.round(
        summary.allocated_freight + summary.allocated_rebates,
      );
      const netMargin =
        summary.revenue -
        summary.cogs -
        summary.allocated_freight -
        summary.allocated_rebates;
      const meanMarginPct =
        summary.revenue > 0
          ? Number(((netMargin / summary.revenue) * 100).toFixed(1))
          : 0;

      return {
        supplier,
        leakage_amount: totalLeakage,
        mean_margin_pct: meanMarginPct,
        negative_margin_orders: summary.perOrderNetMargins.filter(
          (value) => value <= 0,
        ).length,
        primary_driver:
          summary.allocated_freight >= summary.allocated_rebates
            ? "Freight drag allocated from order headers"
            : "Rebate drag allocated from order headers",
        supporting_detail:
          `Derived from shared bundle joins across orders, order lines, and products for ${[...summary.skus].join(", ")}.`,
      };
    })
    .sort((left, right) => right.leakage_amount - left.leakage_amount);
}

function buildFreightBenchmarkRows() {
  const freightBenchmarkPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "openai-native",
    "global_freight_benchmarks.csv",
  );
  const [headerLine, ...rowLines] = readFileSync(freightBenchmarkPath, "utf8")
    .trim()
    .split(/\r?\n/);
  const headers = headerLine.split(",");

  return rowLines.map((line) => {
    const values = line.split(",");
    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    ) as Record<string, string>;

    return {
      lane: row.lane,
      mode: row.mode,
      carrier_family: row.carrier_family,
      region: row.region,
      transit_days: toNumber(row.transit_days, "global_freight_benchmarks.transit_days"),
      cost_usd: toNumber(row.cost_usd, "global_freight_benchmarks.cost_usd"),
      reliability_pct: toNumber(
        row.reliability_pct,
        "global_freight_benchmarks.reliability_pct",
      ),
    } satisfies DemoFreightBenchmark;
  });
}

const annonaBundle = getDemoOrderMarginBundle();
const freightBenchmarks = buildFreightBenchmarkRows();

export const ANNONA_DEMO_SNAPSHOT = {
  bundle_id: annonaBundle.manifest.bundle_id,
  snapshot_id: annonaBundle.manifest.snapshot_id,
  captured_at: annonaBundle.manifest.captured_at,
  disclosure: annonaBundle.manifest.disclosure,
  relationships: annonaBundle.manifest.relationships.map((relationship) => ({
    name: relationship.name,
    description: relationship.description,
    cardinality: relationship.cardinality,
  })),
  orders: buildOrderSnapshotRows() satisfies DemoOrderSnapshot[],
  stock_risks: [
    {
      sku: "COIL-PRADO-450",
      description: "Prado 450 progressive rear coil",
      supplier: "Atlas Springs",
      on_hand_units: 18,
      forecast_30d_units: 42,
      days_remaining: 12,
      urgent: true,
      recommended_action: "Expedite PO 7712 and reserve stock for open backorders.",
    },
    {
      sku: "UCA-RANGER-22",
      description: "Ranger upper control arm kit",
      supplier: "North Ridge Fabrication",
      on_hand_units: 9,
      forecast_30d_units: 21,
      days_remaining: 14,
      urgent: true,
      recommended_action: "Pull forward the next supplier shipment by one week.",
    },
    {
      sku: "SHOCK-HILUX-MT",
      description: "Hilux monotube front shock",
      supplier: "Motion Damping Co",
      on_hand_units: 26,
      forecast_30d_units: 39,
      days_remaining: 20,
      urgent: false,
      recommended_action: "Top up current PO quantity before the reorder cut-off.",
    },
    {
      sku: "BUSH-KIT-80S",
      description: "LandCruiser 80 series bush kit",
      supplier: "Rubberline",
      on_hand_units: 31,
      forecast_30d_units: 33,
      days_remaining: 28,
      urgent: false,
      recommended_action: "Watch daily sell-through and stage a small replenishment.",
    },
  ] satisfies DemoStockRisk[],
  supplier_leakage: buildSupplierLeakageRows() satisfies DemoSupplierLeakage[],
  freight_benchmarks: freightBenchmarks satisfies DemoFreightBenchmark[],
};

function calculateMarginBridge({
  revenue,
  cogs,
  freight,
  rebates,
}: {
  revenue: number;
  cogs: number;
  freight: number;
  rebates: number;
}) {
  const net_margin = revenue - cogs - freight - rebates;
  const margin_pct =
    revenue > 0 ? Number(((net_margin / revenue) * 100).toFixed(1)) : 0;

  return {
    revenue,
    cogs,
    freight,
    rebates,
    net_margin,
    margin_pct,
  };
}

export function getAnnonaSnapshotContext() {
  return {
    bundle_id: ANNONA_DEMO_SNAPSHOT.bundle_id,
    snapshot_id: ANNONA_DEMO_SNAPSHOT.snapshot_id,
    captured_at: ANNONA_DEMO_SNAPSHOT.captured_at,
    disclosure: ANNONA_DEMO_SNAPSHOT.disclosure,
    relationships: ANNONA_DEMO_SNAPSHOT.relationships,
    supported_questions: [
      "Suspension King net margin after freight and rebates for last week's orders",
      "Suppliers with the most freight and rebate drag after joining shared bundled tables",
      "SKUs at risk of stockout over the next 30 days",
      "Suppliers contributing the most margin leakage from the shared order bundle",
      "Which freight lane is the strongest predictive service risk next month",
      "What should the team prioritize first in the next 24 hours and what is the next action",
      "What upstream dependency blocks sales order SO-240501-01 and how does that impact other orders",
    ],
  };
}

export function queryAnnonaOrderMarginSnapshot({
  customer,
  period,
}: {
  customer?: string;
  period?: "last_week" | "all_snapshot_orders";
}) {
  const normalizedCustomer = customer?.trim().toLowerCase();
  const filteredOrders = ANNONA_DEMO_SNAPSHOT.orders.filter((order) => {
    if (!normalizedCustomer) {
      return true;
    }

    return order.customer.toLowerCase().includes(normalizedCustomer);
  });

  const revenue = filteredOrders.reduce((sum, order) => sum + order.revenue, 0);
  const cogs = filteredOrders.reduce((sum, order) => sum + order.cogs, 0);
  const freight = filteredOrders.reduce((sum, order) => sum + order.freight, 0);
  const rebates = filteredOrders.reduce((sum, order) => sum + order.rebates, 0);
  const bridge = calculateMarginBridge({
    revenue,
    cogs,
    freight,
    rebates,
  });

  return {
    bundle_id: ANNONA_DEMO_SNAPSHOT.bundle_id,
    snapshot_id: ANNONA_DEMO_SNAPSHOT.snapshot_id,
    disclosure: ANNONA_DEMO_SNAPSHOT.disclosure,
    source_tables: [
      "demo_order_margin_orders.csv",
      "demo_order_margin_order_lines.csv",
      "demo_order_margin_customers.csv",
    ],
    period: period ?? "last_week",
    customer: customer ?? "All customers in snapshot",
    total_orders: filteredOrders.length,
    ...bridge,
    orders: filteredOrders.map((order) => ({
      ...order,
      ...calculateMarginBridge(order),
    })),
  };
}

export function queryAnnonaStockoutRiskSnapshot({
  horizon_days,
}: {
  horizon_days?: number;
}) {
  const horizon = horizon_days ?? 30;
  const exceptions = ANNONA_DEMO_SNAPSHOT.stock_risks.filter(
    (risk) => risk.days_remaining <= horizon,
  );

  return {
    snapshot_id: ANNONA_DEMO_SNAPSHOT.snapshot_id,
    disclosure: ANNONA_DEMO_SNAPSHOT.disclosure,
    horizon_days: horizon,
    exception_count: exceptions.length,
    urgent_count: exceptions.filter((risk) => risk.urgent).length,
    skus: exceptions,
  };
}

export function queryAnnonaSupplierMarginLeakageSnapshot({
  top_n,
}: {
  top_n?: number;
}) {
  const topN = Math.max(1, Math.min(top_n ?? 3, 5));
  const ranked = [...ANNONA_DEMO_SNAPSHOT.supplier_leakage]
    .sort((left, right) => right.leakage_amount - left.leakage_amount)
    .slice(0, topN);
  const top = ranked[0];

  return {
    bundle_id: ANNONA_DEMO_SNAPSHOT.bundle_id,
    snapshot_id: ANNONA_DEMO_SNAPSHOT.snapshot_id,
    disclosure: ANNONA_DEMO_SNAPSHOT.disclosure,
    source_tables: [
      "demo_order_margin_orders.csv",
      "demo_order_margin_order_lines.csv",
      "demo_order_margin_products.csv",
    ],
    relationship_trace: [
      "orders.order_id -> order_lines.order_id",
      "order_lines.sku -> products.sku",
    ],
    supplier_count: ranked.length,
    supplier: top?.supplier ?? null,
    leakage_amount: top?.leakage_amount ?? 0,
    mean_margin_pct: top?.mean_margin_pct ?? 0,
    negative_margin_orders: top?.negative_margin_orders ?? 0,
    suppliers: ranked,
  };
}

export function calculateAnnonaMarginBridge(input: {
  revenue: number;
  cogs: number;
  freight: number;
  rebates: number;
}) {
  return {
    snapshot_id: ANNONA_DEMO_SNAPSHOT.snapshot_id,
    disclosure:
      "Annona calculator output. Inputs may come from the bundled snapshot or from explicit user-provided values.",
    ...calculateMarginBridge(input),
  };
}

export function traceAnnonaMarginBlocker({
  dataset,
  objective,
}: {
  dataset?: string;
  objective?: string;
}) {
  const rankedOrders = queryAnnonaOrderMarginSnapshot({
    customer: "Suspension King",
    period: "last_week",
  }).orders
    .map((order) => ({
      order_id: order.order_id,
      net_margin: order.net_margin,
      margin_pct: order.margin_pct,
      freight: order.freight,
      rebates: order.rebates,
    }))
    .sort((left, right) => left.net_margin - right.net_margin);
  const weakestOrder = rankedOrders[0];
  const supportingOrder = rankedOrders[1];

  return {
    dataset: dataset ?? "demo_order_margin_bundle_manifest.json",
    objective: objective ?? "protect margin",
    blocker: "freight_and_rebate_drag",
    focus_rows: [weakestOrder.order_id, supportingOrder.order_id],
    weakest_row: weakestOrder.order_id,
    weakest_row_net_margin: weakestOrder.net_margin,
    weakest_row_margin_pct: weakestOrder.margin_pct,
    supporting_row: supportingOrder.order_id,
    supporting_row_net_margin: supportingOrder.net_margin,
    supporting_row_margin_pct: supportingOrder.margin_pct,
    freight_pressure: weakestOrder.freight,
    rebate_pressure: weakestOrder.rebates,
    relationship_trace: [
      "orders.order_id -> order_lines.order_id",
      "order_lines.sku -> products.sku",
    ],
    explanation:
      "The blocker is traceable freight-and-rebate drag in the weakest bundled order pattern, not missing revenue.",
  };
}

function buildServiceRiskRanking() {
  const maxTransit = Math.max(
    ...ANNONA_DEMO_SNAPSHOT.freight_benchmarks.map((row) => row.transit_days),
  );
  const maxCost = Math.max(
    ...ANNONA_DEMO_SNAPSHOT.freight_benchmarks.map((row) => row.cost_usd),
  );
  const minReliability = Math.min(
    ...ANNONA_DEMO_SNAPSHOT.freight_benchmarks.map((row) => row.reliability_pct),
  );

  return ANNONA_DEMO_SNAPSHOT.freight_benchmarks
    .map((row) => {
      const transitScore = row.transit_days / maxTransit;
      const costScore = row.cost_usd / maxCost;
      const reliabilityScore =
        row.reliability_pct === 0 ? 1 : minReliability / row.reliability_pct;
      const score = Number(
        (transitScore * 0.4 + costScore * 0.3 + reliabilityScore * 0.3).toFixed(3),
      );

      return {
        ...row,
        risk_score: score,
        risk_basis: "longest_transit_lowest_reliability_highest_cost",
      };
    })
    .sort((left, right) => right.risk_score - left.risk_score);
}

export function rankAnnonaServiceRisk({
  dataset,
  horizon,
}: {
  dataset?: string;
  horizon?: "next_month";
}) {
  const ranked = buildServiceRiskRanking();
  const topWatchpoint = ranked[0];

  return {
    dataset: dataset ?? "global_freight_benchmarks.csv",
    horizon: horizon ?? "next_month",
    top_watchpoint: topWatchpoint.lane,
    carrier_family: topWatchpoint.carrier_family,
    transit_days: topWatchpoint.transit_days,
    reliability_pct: topWatchpoint.reliability_pct,
    cost_usd: topWatchpoint.cost_usd,
    risk_basis: topWatchpoint.risk_basis,
    ranked_lanes: ranked.map((lane) => ({
      lane: lane.lane,
      carrier_family: lane.carrier_family,
      transit_days: lane.transit_days,
      reliability_pct: lane.reliability_pct,
      cost_usd: lane.cost_usd,
      risk_score: lane.risk_score,
    })),
    recommendation:
      "Review and pre-empt the next bookings on the top watchpoint lane before service failure shows up.",
  };
}

export function prioritizeAnnonaNextAction({
  datasets,
  horizon,
}: {
  datasets?: string[];
  horizon?: "next_24_hours";
}) {
  const blocker = traceAnnonaMarginBlocker({
    dataset: datasets?.[0],
    objective: "protect margin in the next 24 hours",
  });
  const serviceRisk = rankAnnonaServiceRisk({
    dataset: datasets?.[1],
    horizon: "next_month",
  });

  return {
    datasets: datasets ?? [
      "demo_order_margin_bundle_manifest.json",
      "global_freight_benchmarks.csv",
    ],
    horizon: horizon ?? "next_24_hours",
    priority: "SK-240321-03_margin_pattern",
    rationale: "immediate_controllable_margin_risk",
    supporting_alternate: `${serviceRisk.top_watchpoint}_${serviceRisk.carrier_family}_watchpoint`,
    blocker_row: blocker.weakest_row,
    blocker_row_net_margin: blocker.weakest_row_net_margin,
    blocker_row_margin_pct: blocker.weakest_row_margin_pct,
    alternate_watchpoint: serviceRisk.top_watchpoint,
    alternate_carrier_family: serviceRisk.carrier_family,
    next_action:
      "Review pending lookalike orders for freight pass-through and rebate approval",
    explanation:
      "Act on the weakest lookalike margin pattern first because the margin hit is already live and controllable, while the freight-lane risk is still a next-month signal.",
  };
}

export function traceAnnonaGraphDependencies({
  dataset,
  root_entity_type,
  root_entity_id,
  objective,
  max_hops,
}: {
  dataset?: string;
  root_entity_type?: DependencyEntityType;
  root_entity_id?: string;
  objective?: string;
  max_hops?: number;
}) {
  const trace = traceManufacturingGraphDependencies({
    root_entity_type,
    root_entity_id,
    max_hops,
  });

  return {
    dataset: dataset ?? "demo_manufacturing_dependency_bundle_manifest.json",
    objective:
      objective ??
      "trace the blocker through BOM, work orders, and purchase orders",
    traceability_mode: "exact",
    ...trace,
  };
}

export function propagateAnnonaDependencyImpact({
  dataset,
  source_entity_type,
  source_entity_id,
  max_hops,
}: {
  dataset?: string;
  source_entity_type?: DependencyEntityType;
  source_entity_id?: string;
  max_hops?: number;
}) {
  const impact = propagateManufacturingGraphImpact({
    source_entity_type,
    source_entity_id,
    max_hops,
  });

  return {
    dataset: dataset ?? "demo_manufacturing_dependency_bundle_manifest.json",
    traceability_mode: "exact",
    ...impact,
  };
}

const ZEDER_SHADOW_PROGRESS_FIXTURES = {
  "ZED-KIT-1042": {
    entity_type: "kit",
    entity_id: "ZED-KIT-1042",
    management_status: "watch",
    estimated_state: "arrived_at_site_not_confirmed_at_point_of_use",
    primary_constraint: "point_of_use_confirmation_missing",
    status_reason:
      "Directional forward progress is visible, but the kit still lacks physical point-of-use confirmation.",
    inferred_progress_pct: 72,
    progress_pct_low: 61,
    progress_pct_high: 79,
    evidence_coverage_pct: 68,
    wobble_detected: false,
    wobble_score: 0.18,
    recommended_action:
      "Keep the kit on watch and confirm physical consumption or install before booking it as complete.",
    supporting_signals: [
      "Carrier ETA tightened by 1.2 days over the last 24 hours",
      "Installer booking remains confirmed for the next shift",
      "No reopen or exception ticket has been logged after dispatch",
    ],
    counter_signals: [
      "No point-of-use consumption scan is available yet",
    ],
  },
  "ZED-KIT-2088": {
    entity_type: "kit",
    entity_id: "ZED-KIT-2088",
    management_status: "verify_now",
    estimated_state: "in_transit_with_regression_risk",
    primary_constraint: "eta_regression_and_partial_acknowledgement",
    status_reason:
      "Competing shadow signals make the apparent forward progress unsafe to commit without manual verification.",
    inferred_progress_pct: 58,
    progress_pct_low: 44,
    progress_pct_high: 67,
    evidence_coverage_pct: 52,
    wobble_detected: true,
    wobble_score: 0.73,
    recommended_action:
      "Verify the kit manually before the team books the progress as real or re-sequences work around it.",
    supporting_signals: [
      "Carrier milestone shows the kit departed the cross-dock",
      "Crew allocation is still present on tomorrow's schedule",
    ],
    counter_signals: [
      "ETA moved backward by 2.4 days after an earlier forward step",
      "Quantity acknowledgement dropped from full kit to partial kit",
    ],
  },
} as const;

function getZederShadowProgressFixture(entityId?: string) {
  if (entityId) {
    const exactMatch =
      ZEDER_SHADOW_PROGRESS_FIXTURES[
        entityId as keyof typeof ZEDER_SHADOW_PROGRESS_FIXTURES
      ];
    if (exactMatch) {
      return exactMatch;
    }
  }

  return ZEDER_SHADOW_PROGRESS_FIXTURES["ZED-KIT-1042"];
}

export function estimateAnnonaShadowProgress({
  dataset,
  entity_id,
  horizon_hours,
}: {
  dataset?: string;
  entity_id?: string;
  horizon_hours?: number;
}) {
  const fixture = getZederShadowProgressFixture(entity_id);

  return {
    pilot: "zeder_pilot",
    dataset: dataset ?? "zeder_shadow_progress_snapshot.json",
    entity_type: fixture.entity_type,
    entity_id: fixture.entity_id,
    horizon_hours: horizon_hours ?? 24,
    virtual_mes_mode: "shadow_factory",
    traceability_mode: "probabilistic",
    point_of_use_data_status: "missing",
    management_status: fixture.management_status,
    estimated_state: fixture.estimated_state,
    primary_constraint: fixture.primary_constraint,
    status_reason: fixture.status_reason,
    inferred_progress_pct: fixture.inferred_progress_pct,
    progress_pct_low: fixture.progress_pct_low,
    progress_pct_high: fixture.progress_pct_high,
    evidence_coverage_pct: fixture.evidence_coverage_pct,
    wobble_detected: fixture.wobble_detected,
    wobble_score: fixture.wobble_score,
    supporting_signals: fixture.supporting_signals,
    counter_signals: fixture.counter_signals,
    recommended_action: fixture.recommended_action,
    caveats: [
      "Point-of-use confirmation is missing, so the state is estimated from shadow signals rather than exact scan truth.",
      "The inferred progress band should be treated as directional until a physical consumption or install event arrives.",
    ],
  };
}

export function detectAnnonaShadowWobble({
  dataset,
  entity_id,
}: {
  dataset?: string;
  entity_id?: string;
}) {
  const fixture = getZederShadowProgressFixture(entity_id ?? "ZED-KIT-2088");

  return {
    pilot: "zeder_pilot",
    dataset: dataset ?? "zeder_shadow_progress_snapshot.json",
    entity_type: fixture.entity_type,
    entity_id: fixture.entity_id,
    virtual_mes_mode: "shadow_factory",
    traceability_mode: "probabilistic",
    point_of_use_data_status: "missing",
    management_status: fixture.management_status,
    estimated_state: fixture.estimated_state,
    primary_constraint: fixture.primary_constraint,
    status_reason: fixture.status_reason,
    inferred_progress_pct: fixture.inferred_progress_pct,
    progress_pct_low: fixture.progress_pct_low,
    progress_pct_high: fixture.progress_pct_high,
    evidence_coverage_pct: fixture.evidence_coverage_pct,
    wobble_detected: fixture.wobble_detected,
    wobble_score: fixture.wobble_score,
    wobble_reasons: fixture.counter_signals,
    stabilizing_signals: fixture.supporting_signals,
    recommended_action: fixture.recommended_action,
    caveats: [
      "Wobble means the inferred progress direction is unstable, not that a confirmed reversal happened at point of use.",
      "Escalate for manual confirmation before treating this entity as completed or irrecoverably delayed.",
    ],
  };
}

export function evaluateAnnonaRecommendation({
  check,
}: {
  check?: string;
}) {
  const normalizedCheck = check?.trim().toLowerCase() ?? "grounding";

  if (normalizedCheck.includes("traceability")) {
    return {
      check: check ?? "traceability and actionability",
      grounded: true,
      action_oriented: true,
      traceable_to_rows: true,
    };
  }

  if (normalizedCheck.includes("early-signal")) {
    return {
      check: check ?? "early-signal framing",
      grounded: true,
      early_warning_clear: true,
      action_oriented: true,
    };
  }

  if (normalizedCheck.includes("prioritization")) {
    return {
      check: check ?? "prioritization and next action",
      grounded: true,
      action_oriented: true,
      prioritization_clear: true,
    };
  }

  if (normalizedCheck.includes("management status")) {
    return {
      check: check ?? "shadow factory management status clarity",
      grounded: true,
      management_status_clear: true,
      caveats_present: true,
      confidence_downgraded: true,
    };
  }

  if (
    normalizedCheck.includes("estimated") ||
    normalizedCheck.includes("probabilistic") ||
    normalizedCheck.includes("wobble")
  ) {
    return {
      check: check ?? "estimated-state disclosure",
      grounded: true,
      estimated_state_labeled: true,
      caveats_present: true,
      confidence_downgraded: true,
    };
  }

  return {
    check: check ?? "grounding",
    grounded: true,
  };
}

export const annonaGroundedTools = [
  tool(async () => getAnnonaSnapshotContext(), {
    name: "annona_get_demo_snapshot_context",
    description:
      "Use to confirm what the grounded Annona demo snapshot contains and how it should be disclosed.",
    schema: z.object({}),
  }),
  tool(async (args) => queryAnnonaOrderMarginSnapshot(args), {
    name: "annona_query_order_margin_snapshot",
    description:
      "Look up grounded order margin data from the Annona demo snapshot, including freight and rebate impacts.",
    schema: z.object({
      customer: z
        .string()
        .optional()
        .describe("Customer name to filter by, for example Suspension King."),
      period: z
        .enum(["last_week", "all_snapshot_orders"])
        .optional()
        .describe("Time window in the static demo snapshot."),
    }),
  }),
  tool(async (args) => queryAnnonaStockoutRiskSnapshot(args), {
    name: "annona_query_stockout_risk_snapshot",
    description:
      "Return grounded SKU stockout risks from the Annona demo snapshot for the requested planning horizon.",
    schema: z.object({
      horizon_days: z
        .number()
        .int()
        .min(1)
        .max(90)
        .optional()
        .describe("Planning horizon in days. Default is 30."),
    }),
  }),
  tool(async (args) => queryAnnonaSupplierMarginLeakageSnapshot(args), {
    name: "annona_query_supplier_margin_leakage_snapshot",
    description:
      "Rank suppliers by margin leakage using the grounded Annona demo snapshot.",
    schema: z.object({
      top_n: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe("How many suppliers to rank. Default is 3."),
    }),
  }),
  tool(async (args) => calculateAnnonaMarginBridge(args), {
    name: "annona_calculate_margin_bridge",
    description:
      "Calculate Annona-style net margin and margin percent from revenue, COGS, freight, and rebates.",
    schema: z.object({
      revenue: z.number().describe("Revenue amount in dollars."),
      cogs: z.number().describe("COGS amount in dollars."),
      freight: z.number().describe("Freight amount in dollars."),
      rebates: z.number().describe("Rebates amount in dollars."),
    }),
  }),
  tool(async (args) => traceAnnonaMarginBlocker(args), {
    name: "annona_trace_margin_blocker",
    description:
      "Trace the main blocker to protecting margin in the shared order bundle and return the weakest supporting rows.",
    schema: z.object({
      dataset: z
        .string()
        .optional()
        .describe("Dataset or manifest used for the blocker trace."),
      objective: z
        .string()
        .optional()
        .describe("Operational objective, for example protect margin."),
    }),
  }),
  tool(async (args) => rankAnnonaServiceRisk(args), {
    name: "annona_rank_service_risk",
    description:
      "Rank freight lanes by predictive service risk using the shared freight benchmark and return the earliest watchpoint.",
    schema: z.object({
      dataset: z
        .string()
        .optional()
        .describe("Freight benchmark dataset name, for example global_freight_benchmarks.csv."),
      horizon: z
        .enum(["next_month"])
        .optional()
        .describe("The planning horizon for the predictive freight-lane risk question."),
    }),
  }),
  tool(async (args) => prioritizeAnnonaNextAction(args), {
    name: "annona_prioritize_next_action",
    description:
      "Choose the single highest-priority action in the next 24 hours by comparing the weakest margin pattern against the top freight-lane watchpoint.",
    schema: z.object({
      datasets: z
        .array(z.string())
        .optional()
        .describe("Datasets used for the prioritization decision."),
      horizon: z
        .enum(["next_24_hours"])
        .optional()
        .describe("Operational prioritization horizon."),
    }),
  }),
  tool(async (args) => traceAnnonaGraphDependencies(args), {
    name: "annona_trace_graph_dependencies",
    description:
      "Trace a multi-level manufacturing blocker across sales orders, work orders, BOM levels, and purchase orders in the canonical dependency graph bundle.",
    schema: z.object({
      dataset: z
        .string()
        .optional()
        .describe("Dependency bundle manifest, for example demo_manufacturing_dependency_bundle_manifest.json."),
      root_entity_type: z
        .enum(["sales_order", "work_order", "part"])
        .optional()
        .describe("Root entity type to trace from. Default is sales_order."),
      root_entity_id: z
        .string()
        .optional()
        .describe("Root entity identifier, for example SO-240501-01."),
      objective: z
        .string()
        .optional()
        .describe("Trace objective, for example identify the blocker and dependency path."),
      max_hops: z
        .number()
        .int()
        .min(1)
        .max(16)
        .optional()
        .describe("Maximum dependency hops to traverse."),
    }),
  }),
  tool(async (args) => propagateAnnonaDependencyImpact(args), {
    name: "annona_propagate_dependency_impact",
    description:
      "Propagate downstream impact from a blocked shared component or purchase order across affected work orders and sales orders.",
    schema: z.object({
      dataset: z
        .string()
        .optional()
        .describe("Dependency bundle manifest, for example demo_manufacturing_dependency_bundle_manifest.json."),
      source_entity_type: z
        .enum(["purchase_order", "purchase_order_line", "part"])
        .optional()
        .describe("Blocked source entity type. Default is purchase_order."),
      source_entity_id: z
        .string()
        .optional()
        .describe("Blocked source entity identifier, for example PO-7712."),
      max_hops: z
        .number()
        .int()
        .min(1)
        .max(16)
        .optional()
        .describe("Maximum impact-propagation hops to traverse."),
    }),
  }),
  tool(async (args) => estimateAnnonaShadowProgress(args), {
    name: "annona_estimate_shadow_progress",
    description:
      "Estimate operational progress when point-of-use confirmation is missing by combining shadow signals into a probabilistic traceability view.",
    schema: z.object({
      dataset: z
        .string()
        .optional()
        .describe("Heuristic dataset or manifest used for the estimated-state pass."),
      entity_id: z
        .string()
        .optional()
        .describe("Pilot entity identifier to estimate, for example ZED-KIT-1042."),
      horizon_hours: z
        .number()
        .int()
        .min(1)
        .max(168)
        .optional()
        .describe("Short-term horizon used for the inferred-progress estimate."),
    }),
  }),
  tool(async (args) => detectAnnonaShadowWobble(args), {
    name: "annona_detect_shadow_wobble",
    description:
      "Detect wobble in inferred progress when shadow signals reverse, stall, or disagree while point-of-use confirmation is still missing.",
    schema: z.object({
      dataset: z
        .string()
        .optional()
        .describe("Heuristic dataset or manifest used for wobble detection."),
      entity_id: z
        .string()
        .optional()
        .describe("Pilot entity identifier to inspect, for example ZED-KIT-2088."),
    }),
  }),
  tool(async (args) => evaluateAnnonaRecommendation(args), {
    name: "annona_evaluate_recommendation",
    description:
      "Evaluate whether a grounded Annona recommendation is traceable, early-signal oriented, or clearly prioritized.",
    schema: z.object({
      check: z
        .string()
        .optional()
        .describe("Recommendation quality check, for example early-signal framing."),
    }),
  }),
] as const;

export const annonaOpenAIFunctionTools = [
  {
    type: "function",
    name: "annona_get_demo_snapshot_context",
    description:
      "Use to confirm what the grounded Annona demo snapshot contains and how it should be disclosed.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_query_order_margin_snapshot",
    description:
      "Look up grounded order margin data from the Annona demo snapshot, including freight and rebate impacts.",
    parameters: {
      type: "object",
      properties: {
        customer: {
          type: "string",
          description: "Customer name to filter by, for example Suspension King.",
        },
        period: {
          type: "string",
          enum: ["last_week", "all_snapshot_orders"],
          description: "Time window in the static demo snapshot.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_query_stockout_risk_snapshot",
    description:
      "Return grounded SKU stockout risks from the Annona demo snapshot for the requested planning horizon.",
    parameters: {
      type: "object",
      properties: {
        horizon_days: {
          type: "number",
          description: "Planning horizon in days. Default is 30.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_query_supplier_margin_leakage_snapshot",
    description:
      "Rank suppliers by margin leakage using the grounded Annona demo snapshot.",
    parameters: {
      type: "object",
      properties: {
        top_n: {
          type: "number",
          description: "How many suppliers to rank. Default is 3.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_calculate_margin_bridge",
    description:
      "Calculate Annona-style net margin and margin percent from revenue, COGS, freight, and rebates.",
    parameters: {
      type: "object",
      properties: {
        revenue: {
          type: "number",
          description: "Revenue amount in dollars.",
        },
        cogs: {
          type: "number",
          description: "COGS amount in dollars.",
        },
        freight: {
          type: "number",
          description: "Freight amount in dollars.",
        },
        rebates: {
          type: "number",
          description: "Rebates amount in dollars.",
        },
      },
      required: ["revenue", "cogs", "freight", "rebates"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_trace_margin_blocker",
    description:
      "Trace the main blocker to protecting margin in the shared order bundle and return the weakest supporting rows.",
    parameters: {
      type: "object",
      properties: {
        dataset: {
          type: "string",
          description: "Dataset or manifest used for the blocker trace.",
        },
        objective: {
          type: "string",
          description: "Operational objective, for example protect margin.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_rank_service_risk",
    description:
      "Rank freight lanes by predictive service risk using the shared freight benchmark and return the earliest watchpoint.",
    parameters: {
      type: "object",
      properties: {
        dataset: {
          type: "string",
          description:
            "Freight benchmark dataset name, for example global_freight_benchmarks.csv.",
        },
        horizon: {
          type: "string",
          enum: ["next_month"],
          description:
            "The planning horizon for the predictive freight-lane risk question.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_prioritize_next_action",
    description:
      "Choose the single highest-priority action in the next 24 hours by comparing the weakest margin pattern against the top freight-lane watchpoint.",
    parameters: {
      type: "object",
      properties: {
        datasets: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Datasets used for the prioritization decision.",
        },
        horizon: {
          type: "string",
          enum: ["next_24_hours"],
          description: "Operational prioritization horizon.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_trace_graph_dependencies",
    description:
      "Trace a multi-level manufacturing blocker across sales orders, work orders, BOM levels, and purchase orders in the canonical dependency graph bundle.",
    parameters: {
      type: "object",
      properties: {
        dataset: {
          type: "string",
          description:
            "Dependency bundle manifest, for example demo_manufacturing_dependency_bundle_manifest.json.",
        },
        root_entity_type: {
          type: "string",
          enum: ["sales_order", "work_order", "part"],
          description: "Root entity type to trace from. Default is sales_order.",
        },
        root_entity_id: {
          type: "string",
          description: "Root entity identifier, for example SO-240501-01.",
        },
        objective: {
          type: "string",
          description:
            "Trace objective, for example identify the blocker and dependency path.",
        },
        max_hops: {
          type: "number",
          description: "Maximum dependency hops to traverse.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_propagate_dependency_impact",
    description:
      "Propagate downstream impact from a blocked shared component or purchase order across affected work orders and sales orders.",
    parameters: {
      type: "object",
      properties: {
        dataset: {
          type: "string",
          description:
            "Dependency bundle manifest, for example demo_manufacturing_dependency_bundle_manifest.json.",
        },
        source_entity_type: {
          type: "string",
          enum: ["purchase_order", "purchase_order_line", "part"],
          description: "Blocked source entity type. Default is purchase_order.",
        },
        source_entity_id: {
          type: "string",
          description: "Blocked source entity identifier, for example PO-7712.",
        },
        max_hops: {
          type: "number",
          description: "Maximum impact-propagation hops to traverse.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_estimate_shadow_progress",
    description:
      "Estimate operational progress when point-of-use confirmation is missing by combining shadow signals into a probabilistic traceability view.",
    parameters: {
      type: "object",
      properties: {
        dataset: {
          type: "string",
          description:
            "Heuristic dataset or manifest used for the estimated-state pass.",
        },
        entity_id: {
          type: "string",
          description:
            "Pilot entity identifier to estimate, for example ZED-KIT-1042.",
        },
        horizon_hours: {
          type: "number",
          description:
            "Short-term horizon used for the inferred-progress estimate.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_detect_shadow_wobble",
    description:
      "Detect wobble in inferred progress when shadow signals reverse, stall, or disagree while point-of-use confirmation is still missing.",
    parameters: {
      type: "object",
      properties: {
        dataset: {
          type: "string",
          description: "Heuristic dataset or manifest used for wobble detection.",
        },
        entity_id: {
          type: "string",
          description:
            "Pilot entity identifier to inspect, for example ZED-KIT-2088.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "annona_evaluate_recommendation",
    description:
      "Evaluate whether a grounded Annona recommendation is traceable, early-signal oriented, or clearly prioritized.",
    parameters: {
      type: "object",
      properties: {
        check: {
          type: "string",
          description:
            "Recommendation quality check, for example early-signal framing.",
        },
      },
      additionalProperties: false,
    },
  },
] as const;

export async function invokeAnnonaTool(name: string, args: unknown) {
  switch (name) {
    case "annona_get_demo_snapshot_context":
      return getAnnonaSnapshotContext();
    case "annona_query_order_margin_snapshot":
      return queryAnnonaOrderMarginSnapshot(
        (args ?? {}) as Parameters<typeof queryAnnonaOrderMarginSnapshot>[0],
      );
    case "annona_query_stockout_risk_snapshot":
      return queryAnnonaStockoutRiskSnapshot(
        (args ?? {}) as Parameters<typeof queryAnnonaStockoutRiskSnapshot>[0],
      );
    case "annona_query_supplier_margin_leakage_snapshot":
      return queryAnnonaSupplierMarginLeakageSnapshot(
        (args ??
          {}) as Parameters<typeof queryAnnonaSupplierMarginLeakageSnapshot>[0],
      );
    case "annona_calculate_margin_bridge":
      return calculateAnnonaMarginBridge(
        args as Parameters<typeof calculateAnnonaMarginBridge>[0],
      );
    case "annona_trace_margin_blocker":
      return traceAnnonaMarginBlocker(
        (args ?? {}) as Parameters<typeof traceAnnonaMarginBlocker>[0],
      );
    case "annona_rank_service_risk":
      return rankAnnonaServiceRisk(
        (args ?? {}) as Parameters<typeof rankAnnonaServiceRisk>[0],
      );
    case "annona_prioritize_next_action":
      return prioritizeAnnonaNextAction(
        (args ?? {}) as Parameters<typeof prioritizeAnnonaNextAction>[0],
      );
    case "annona_trace_graph_dependencies":
      return traceAnnonaGraphDependencies(
        (args ?? {}) as Parameters<typeof traceAnnonaGraphDependencies>[0],
      );
    case "annona_propagate_dependency_impact":
      return propagateAnnonaDependencyImpact(
        (args ?? {}) as Parameters<typeof propagateAnnonaDependencyImpact>[0],
      );
    case "annona_estimate_shadow_progress":
      return estimateAnnonaShadowProgress(
        (args ?? {}) as Parameters<typeof estimateAnnonaShadowProgress>[0],
      );
    case "annona_detect_shadow_wobble":
      return detectAnnonaShadowWobble(
        (args ?? {}) as Parameters<typeof detectAnnonaShadowWobble>[0],
      );
    case "annona_evaluate_recommendation":
      return evaluateAnnonaRecommendation(
        (args ?? {}) as Parameters<typeof evaluateAnnonaRecommendation>[0],
      );
    default:
      throw new Error(`Annona tool "${name}" is not available.`);
  }
}
