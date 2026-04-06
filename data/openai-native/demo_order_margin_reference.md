# Demo Order Margin Bundle Reference

Use the multi-table order-margin bundle for the Suspension King scenario:

- `demo_order_margin_bundle_manifest.json`
- `demo_order_margin_customers.csv`
- `demo_order_margin_orders.csv`
- `demo_order_margin_order_lines.csv`
- `demo_order_margin_products.csv`

Relationship path:

- `orders.customer_id -> customers.customer_id`
- `orders.order_id -> order_lines.order_id`
- `order_lines.sku -> products.sku`

Net margin formula:

`net_margin = sum(order_lines.revenue) - sum(order_lines.cogs) - orders.freight - orders.rebates`

For the bundled three-order Suspension King sample:

- revenue = 43,940
- cogs = 31,480
- freight = 3,080
- rebates = 1,390
- net_margin = 7,990

Cross-table supplier drag example:

- top supplier by allocated freight-plus-rebate drag = Atlas Springs
- allocated drag = 1,486

These are static bundled demo files for the shared OpenAI-native baseline. They are not live ERP data.
