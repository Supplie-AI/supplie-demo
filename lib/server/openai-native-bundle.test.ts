import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  getDatasetTable,
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
      "demo_order_margin_reference.md",
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
