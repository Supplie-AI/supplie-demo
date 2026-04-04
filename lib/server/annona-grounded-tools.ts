import { tool } from "@langchain/core/tools";
import { z } from "zod";

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

export const ANNONA_DEMO_SNAPSHOT = {
  snapshot_id: "annona-demo-snapshot-2026-03-22",
  captured_at: "2026-03-22T18:00:00Z",
  disclosure:
    "This is a static Annona demo snapshot bundled with the app. It is not live production data.",
  orders: [
    {
      order_id: "SK-240317-01",
      booked_at: "2026-03-17",
      customer: "Suspension King",
      revenue: 18420,
      cogs: 11980,
      freight: 920,
      rebates: 460,
    },
    {
      order_id: "SK-240319-02",
      booked_at: "2026-03-19",
      customer: "Suspension King",
      revenue: 14280,
      cogs: 10140,
      freight: 1180,
      rebates: 520,
    },
    {
      order_id: "SK-240321-03",
      booked_at: "2026-03-21",
      customer: "Suspension King",
      revenue: 11240,
      cogs: 9360,
      freight: 980,
      rebates: 410,
    },
  ] satisfies DemoOrderSnapshot[],
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
  supplier_leakage: [
    {
      supplier: "Atlas Springs",
      leakage_amount: 11200,
      mean_margin_pct: 11.8,
      negative_margin_orders: 4,
      primary_driver: "Freight variance on bulky coil lines",
      supporting_detail:
        "Expedited inbound freight and rebate slippage are compressing margin on high-volume lift-kit orders.",
    },
    {
      supplier: "North Ridge Fabrication",
      leakage_amount: 8400,
      mean_margin_pct: 13.4,
      negative_margin_orders: 2,
      primary_driver: "Late cost updates",
      supporting_detail:
        "Quoted sell prices lagged revised supplier costs on premium Ranger kits.",
    },
    {
      supplier: "Motion Damping Co",
      leakage_amount: 5900,
      mean_margin_pct: 15.1,
      negative_margin_orders: 1,
      primary_driver: "Rebate under-collection",
      supporting_detail:
        "Expected promo rebates were not fully accrued on bundled shock packages.",
    },
  ] satisfies DemoSupplierLeakage[],
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
    snapshot_id: ANNONA_DEMO_SNAPSHOT.snapshot_id,
    captured_at: ANNONA_DEMO_SNAPSHOT.captured_at,
    disclosure: ANNONA_DEMO_SNAPSHOT.disclosure,
    supported_questions: [
      "Suspension King net margin after freight and rebates for last week's orders",
      "SKUs at risk of stockout over the next 30 days",
      "Suppliers contributing the most margin leakage",
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
    snapshot_id: ANNONA_DEMO_SNAPSHOT.snapshot_id,
    disclosure: ANNONA_DEMO_SNAPSHOT.disclosure,
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
    snapshot_id: ANNONA_DEMO_SNAPSHOT.snapshot_id,
    disclosure: ANNONA_DEMO_SNAPSHOT.disclosure,
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
    default:
      throw new Error(`Annona tool "${name}" is not available.`);
  }
}
