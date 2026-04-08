import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  getDatasetTable,
  getDemoManufacturingDependencyBundle,
  getDemoOrderMarginBundle,
} from "./demo-dataset-bundle.ts";
import { SHARED_OPENAI_NATIVE_FILES } from "./openai-native-bundle.ts";

test("shared OpenAI-native bundle includes the multi-table bundled order-margin files", () => {
  assert.deepEqual(
    SHARED_OPENAI_NATIVE_FILES.map((file) => file.fileName),
    [
      "capability-baseline-notes.md",
      "global_freight_benchmarks.csv",
      "demo_order_margin_bundle_manifest.json",
      "demo_order_margin_customers.csv",
      "demo_order_margin_orders.csv",
      "demo_order_margin_order_lines.csv",
      "demo_order_margin_products.csv",
      "demo_manufacturing_dependency_bundle_manifest.json",
      "demo_manufacturing_customers.csv",
      "demo_manufacturing_factories.csv",
      "demo_manufacturing_machines.csv",
      "demo_manufacturing_parts.csv",
      "demo_manufacturing_sales_orders.csv",
      "demo_manufacturing_sales_order_lines.csv",
      "demo_manufacturing_bom_components.csv",
      "demo_manufacturing_work_orders.csv",
      "demo_manufacturing_purchase_orders.csv",
      "demo_manufacturing_purchase_order_lines.csv",
      "demo_order_margin_reference.md",
      "demo_manufacturing_graph_reference.md",
    ],
  );

  for (const file of SHARED_OPENAI_NATIVE_FILES) {
    assert.ok(
      existsSync(file.absolutePath),
      `Expected bundled file to exist: ${file.absolutePath}`,
    );
  }
});

test("shared bundle manifest declares the expected relationship graph", () => {
  const bundle = getDemoOrderMarginBundle();

  assert.deepEqual(
    bundle.manifest.relationships.map((relationship) => relationship.name),
    ["orders_to_customers", "orders_to_order_lines", "order_lines_to_products"],
  );
  assert.equal(getDatasetTable(bundle, "orders").rows.length, 3);
  assert.equal(getDatasetTable(bundle, "order_lines").rows.length, 6);
});

test("shared manufacturing bundle declares a deep dependency graph fixture", () => {
  const bundle = getDemoManufacturingDependencyBundle();

  assert.equal(getDatasetTable(bundle, "sales_orders").rows.length, 2);
  assert.equal(getDatasetTable(bundle, "work_orders").rows.length, 5);
  assert.equal(getDatasetTable(bundle, "purchase_order_lines").rows.length, 3);
  assert.ok(
    bundle.manifest.relationships.some(
      (relationship) => relationship.name === "purchase_order_lines_to_work_orders",
    ),
  );
});

test("raw OpenAI-native prompt tells the model to calculate from the shared bundle", () => {
  const source = readFileSync(
    new URL("./openai-native-ungrounded-agent.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /attempt the calculation before saying data is missing/i,
  );
  assert.match(source, /SHARED_OPENAI_NATIVE_FILES\.map/);
  assert.doesNotMatch(
    source,
    /Annona-specific live data or grounded Annona snapshot data, say that this raw panel does not have it/,
  );
});

test("grounded OpenAI-native prompt retains the same shared bundle plus Annona-only extras", () => {
  const source = readFileSync(
    new URL("./openai-native-grounded-agent.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /same native OpenAI web, file, and code tooling baseline as the raw panel, plus Annona-specific tools, calculators, and demo datasets/i,
  );
  assert.match(source, /SHARED_OPENAI_NATIVE_FILES\.map/);
  assert.match(source, /annonaOpenAIFunctionTools/);
});
