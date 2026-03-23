import { tool } from 'ai';
import { z } from 'zod';
import * as ss from 'simple-statistics';
import { ORDERS, Order } from './csv-data';

function calcProfitability(order: Order) {
  const gross_revenue = order.quantity * order.unit_price;
  const rebate_amount = gross_revenue * (order.rebate_pct / 100);
  const net_revenue = gross_revenue - rebate_amount - order.freight_cost;
  const margin_pct = (net_revenue / gross_revenue) * 100;
  return { gross_revenue, rebate_amount, net_revenue, margin_pct };
}

export const tools = {
  get_customer_orders: tool({
    description: 'Filter orders by customer name, returns list of orders with id, date, sku, qty, gross revenue',
    parameters: z.object({ customer_name: z.string().describe('Customer name to filter by') }),
    execute: async ({ customer_name }) => {
      const orders = ORDERS.filter(o => o.customer_name.toLowerCase().includes(customer_name.toLowerCase()));
      return orders.map(o => ({
        order_id: o.order_id,
        date: o.date,
        sku_id: o.sku_id,
        sku_name: o.sku_name,
        quantity: o.quantity,
        unit_price: o.unit_price,
        gross_revenue: o.quantity * o.unit_price,
        status: o.order_status,
      }));
    },
  }),

  calculate_order_profitability: tool({
    description: 'Calculate full profitability breakdown for a specific order including freight and rebate impact',
    parameters: z.object({ order_id: z.string().describe('Order ID to calculate profitability for') }),
    execute: async ({ order_id }) => {
      const order = ORDERS.find(o => o.order_id === order_id);
      if (!order) return { error: `Order ${order_id} not found` };
      const { gross_revenue, rebate_amount, net_revenue, margin_pct } = calcProfitability(order);
      return {
        order_id: order.order_id,
        date: order.date,
        customer: order.customer_name,
        sku: order.sku_name,
        quantity: order.quantity,
        unit_price: order.unit_price,
        gross_revenue,
        rebate_pct: order.rebate_pct,
        rebate_amount: Math.round(rebate_amount * 100) / 100,
        freight_cost: order.freight_cost,
        net_revenue: Math.round(net_revenue * 100) / 100,
        margin_pct: Math.round(margin_pct * 100) / 100,
        is_profitable: net_revenue > 0,
      };
    },
  }),

  get_margin_distribution: tool({
    description: 'Compute net margin distribution statistics across all orders using statistical analysis',
    parameters: z.object({}),
    execute: async () => {
      const margins = ORDERS.map(o => calcProfitability(o).margin_pct);
      const negativeCount = margins.filter(m => m < 0).length;
      const nearZeroCount = margins.filter(m => m >= 0 && m < 10).length;
      return {
        total_orders: ORDERS.length,
        mean_margin_pct: Math.round(ss.mean(margins) * 100) / 100,
        median_margin_pct: Math.round(ss.median(margins) * 100) / 100,
        stddev: Math.round(ss.standardDeviation(margins) * 100) / 100,
        p10: Math.round(ss.quantile(margins, 0.1) * 100) / 100,
        p90: Math.round(ss.quantile(margins, 0.9) * 100) / 100,
        negative_margin_orders: negativeCount,
        near_zero_margin_orders: nearZeroCount,
        pct_unprofitable: Math.round((negativeCount / ORDERS.length) * 100 * 100) / 100,
      };
    },
  }),

  predict_reorder_urgency: tool({
    description: 'Predict reorder urgency for a SKU using linear regression on order history to estimate daily burn rate',
    parameters: z.object({ sku_id: z.string().describe('SKU ID to analyze (e.g. ZDR-006)') }),
    execute: async ({ sku_id }) => {
      const skuOrders = ORDERS.filter(o => o.sku_id === sku_id).sort((a, b) => a.date.localeCompare(b.date));
      if (skuOrders.length === 0) return { error: `No orders found for SKU ${sku_id}` };

      const baseDate = new Date(skuOrders[0].date).getTime();
      let cumQty = 0;
      const points: [number, number][] = skuOrders.map(o => {
        const dayIndex = (new Date(o.date).getTime() - baseDate) / 86400000;
        cumQty += o.quantity;
        return [dayIndex, cumQty];
      });

      const { m: slope } = ss.linearRegression(points);
      const daily_burn_rate = Math.max(slope, 0.01);
      const current_stock = skuOrders[0].current_stock;
      const days_remaining = Math.round(current_stock / daily_burn_rate);

      return {
        sku_id,
        sku_name: skuOrders[0].sku_name,
        current_stock,
        avg_lead_days: skuOrders[0].avg_lead_days,
        total_ordered: cumQty,
        order_count: skuOrders.length,
        daily_burn_rate: Math.round(daily_burn_rate * 100) / 100,
        days_remaining,
        reorder_needed_by: new Date(Date.now() + (days_remaining - skuOrders[0].avg_lead_days) * 86400000).toISOString().split('T')[0],
        urgent: days_remaining < 30,
        critical: days_remaining < skuOrders[0].avg_lead_days,
      };
    },
  }),

  get_supplier_margin_impact: tool({
    description: 'Rank suppliers by average net margin impact — identifies which supplier relationships are most margin-destructive',
    parameters: z.object({}),
    execute: async () => {
      const bySupplier: Record<string, number[]> = {};
      ORDERS.forEach(o => {
        const { margin_pct } = calcProfitability(o);
        if (!bySupplier[o.supplier_country]) bySupplier[o.supplier_country] = [];
        bySupplier[o.supplier_country].push(margin_pct);
      });

      const ranked = Object.entries(bySupplier).map(([country, margins]) => ({
        supplier_country: country,
        order_count: margins.length,
        avg_margin_pct: Math.round(ss.mean(margins) * 100) / 100,
        min_margin_pct: Math.round(Math.min(...margins) * 100) / 100,
        negative_margin_orders: margins.filter(m => m < 0).length,
      })).sort((a, b) => a.avg_margin_pct - b.avg_margin_pct);

      return ranked;
    },
  }),

  get_exception_orders: tool({
    description: 'Return all orders where net margin falls below a threshold percentage',
    parameters: z.object({ margin_threshold_pct: z.number().describe('Margin threshold percentage (e.g. 10 for orders below 10% margin)') }),
    execute: async ({ margin_threshold_pct }) => {
      const exceptions = ORDERS
        .map(o => {
          const { gross_revenue, rebate_amount, net_revenue, margin_pct } = calcProfitability(o);
          return { order: o, gross_revenue, rebate_amount, net_revenue, margin_pct };
        })
        .filter(({ margin_pct }) => margin_pct < margin_threshold_pct)
        .sort((a, b) => a.margin_pct - b.margin_pct)
        .map(({ order, gross_revenue, rebate_amount, net_revenue, margin_pct }) => ({
          order_id: order.order_id,
          date: order.date,
          customer: order.customer_name,
          sku: order.sku_name,
          supplier: order.supplier_country,
          gross_revenue,
          rebate_amount: Math.round(rebate_amount * 100) / 100,
          freight_cost: order.freight_cost,
          net_revenue: Math.round(net_revenue * 100) / 100,
          margin_pct: Math.round(margin_pct * 100) / 100,
        }));

      return {
        threshold: margin_threshold_pct,
        exception_count: exceptions.length,
        orders: exceptions,
      };
    },
  }),
};
