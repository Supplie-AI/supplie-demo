import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_ORDER_MARGIN_BUNDLE_SHARED_FILES,
  getDatasetTable,
  getDemoOrderMarginBundle,
  getRelatedRows,
  getSingleRelatedRow,
} from "./demo-dataset-bundle.ts";
import {
  ANNONA_DEMO_SNAPSHOT,
  queryAnnonaSupplierMarginLeakageSnapshot,
} from "./annona-grounded-tools.ts";

function sumNumberField(
  rows: Array<Record<string, string>>,
  fieldName: string,
) {
  return rows.reduce((total, row) => total + Number(row[fieldName] ?? 0), 0);
}

test("demo order bundle declares multiple tables and explicit relationships", () => {
  const bundle = getDemoOrderMarginBundle();

  assert.equal(bundle.manifest.bundle_id, "supplie-demo-order-margin-bundle-v1");
  assert.deepEqual(
    [...bundle.tablesByName.keys()],
    ["customers", "orders", "order_lines", "products"],
  );
  assert.deepEqual(
    [...bundle.relationshipsByName.keys()],
    ["orders_to_customers", "orders_to_order_lines", "order_lines_to_products"],
  );
  assert.equal(getDatasetTable(bundle, "customers").rows.length, 1);
  assert.equal(getDatasetTable(bundle, "orders").rows.length, 3);
  assert.equal(getDatasetTable(bundle, "order_lines").rows.length, 6);
  assert.equal(getDatasetTable(bundle, "products").rows.length, 4);
  assert.equal(DEMO_ORDER_MARGIN_BUNDLE_SHARED_FILES.length, 5);
});

test("bundle relationship helpers resolve order headers to customers and products", () => {
  const bundle = getDemoOrderMarginBundle();
  const firstOrder = getDatasetTable(bundle, "orders").rows[0];

  const customer = getSingleRelatedRow(bundle, "orders_to_customers", firstOrder);
  const orderLines = getRelatedRows(bundle, "orders_to_order_lines", firstOrder);
  const firstProduct = getSingleRelatedRow(
    bundle,
    "order_lines_to_products",
    orderLines[0],
  );

  assert.equal(customer.customer_name, "Suspension King");
  assert.equal(orderLines.length, 2);
  assert.equal(firstProduct.supplier, "Atlas Springs");
});

test("Annona order snapshot rows are derived from the shared multi-table bundle", () => {
  const bundle = getDemoOrderMarginBundle();
  const orders = getDatasetTable(bundle, "orders").rows.map((orderRow) => {
    const customer = getSingleRelatedRow(bundle, "orders_to_customers", orderRow);
    const orderLines = getRelatedRows(bundle, "orders_to_order_lines", orderRow);

    return {
      order_id: orderRow.order_id,
      booked_at: orderRow.booked_at,
      customer: customer.customer_name,
      revenue: sumNumberField(orderLines, "revenue"),
      cogs: sumNumberField(orderLines, "cogs"),
      freight: Number(orderRow.freight),
      rebates: Number(orderRow.rebates),
    };
  });

  assert.deepEqual(orders, ANNONA_DEMO_SNAPSHOT.orders);
});

test("supplier leakage ranking is derived from joined shared bundle tables", () => {
  const ranking = queryAnnonaSupplierMarginLeakageSnapshot({
    top_n: 4,
  });

  assert.equal(ranking.supplier, "Atlas Springs");
  assert.equal(ranking.leakage_amount, 1486);
  assert.deepEqual(
    ranking.suppliers.map((supplier) => supplier.supplier),
    [
      "Atlas Springs",
      "Motion Damping Co",
      "North Ridge Fabrication",
      "Rubberline",
    ],
  );
});
