import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
// @ts-expect-error TypeScript does not allow TS extensions without allowImportingTsExtensions.
import { ANNONA_DEMO_SNAPSHOT } from "./annona-grounded-tools.ts";
// @ts-expect-error TypeScript does not allow TS extensions without allowImportingTsExtensions.
import { SHARED_OPENAI_NATIVE_FILES } from "./openai-native-bundle.ts";

interface CsvOrderRow {
  order_id: string;
  booked_at: string;
  customer: string;
  revenue: number;
  cogs: number;
  freight: number;
  rebates: number;
}

function parseOrderSnapshotCsv(contents: string): CsvOrderRow[] {
  const [headerLine, ...rows] = contents.trim().split("\n");

  assert.equal(
    headerLine,
    "order_id,booked_at,customer,revenue,cogs,freight,rebates",
  );

  return rows.map((row) => {
    const [order_id, booked_at, customer, revenue, cogs, freight, rebates] =
      row.split(",");

    return {
      order_id,
      booked_at,
      customer,
      revenue: Number(revenue),
      cogs: Number(cogs),
      freight: Number(freight),
      rebates: Number(rebates),
    };
  });
}

test("shared OpenAI-native bundle includes the bundled order-margin files", () => {
  assert.deepEqual(
    SHARED_OPENAI_NATIVE_FILES.map((file) => file.fileName),
    [
      "capability-baseline-notes.md",
      "global_freight_benchmarks.csv",
      "demo_order_margin_snapshot.csv",
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

test("shared order-margin CSV stays aligned with the Annona demo snapshot rows", () => {
  const csvFile = SHARED_OPENAI_NATIVE_FILES.find(
    (file) => file.fileName === "demo_order_margin_snapshot.csv",
  );

  assert.ok(csvFile, "Expected demo order margin snapshot CSV in bundle");

  const csvOrders = parseOrderSnapshotCsv(readFileSync(csvFile.absolutePath, "utf8"));

  assert.deepEqual(csvOrders, ANNONA_DEMO_SNAPSHOT.orders);
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
