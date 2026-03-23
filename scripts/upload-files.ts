#!/usr/bin/env npx tsx
/**
 * Upload orders.csv to OpenAI and Anthropic file stores.
 * Run: npx tsx scripts/upload-files.ts
 * Then set the printed IDs as env vars in Vercel:
 *   OPENAI_CSV_FILE_ID
 *   ANTHROPIC_CSV_FILE_ID
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createReadStream, writeFileSync } from "fs";
import { join } from "path";

// Build CSV from embedded data (same source as lib/csv-data.ts)
const CSV_HEADER =
  "order_id,date,customer_name,sku_id,sku_name,category,supplier_country,quantity,unit_price,freight_cost,rebate_pct,warehouse,current_stock,avg_lead_days,order_status";
import { CSV_STRING } from "../lib/csv-data";

async function main() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Write temp CSV file
  const csvPath = join(process.cwd(), "orders.csv");
  writeFileSync(csvPath, CSV_STRING);
  console.log(`Wrote orders.csv (${CSV_STRING.length} chars)`);

  // ── OpenAI ───────────────────────────────────────────────────────────────
  if (openaiKey) {
    const client = new OpenAI({ apiKey: openaiKey });
    console.log("\nUploading to OpenAI...");
    const file = await client.files.create({
      file: createReadStream(csvPath),
      purpose: "user_data",
    });
    console.log(`✓ OpenAI file uploaded`);
    console.log(`  OPENAI_CSV_FILE_ID=${file.id}`);
  } else {
    console.log("\n⚠ OPENAI_API_KEY not set — skipping OpenAI upload");
  }

  // ── Anthropic ────────────────────────────────────────────────────────────
  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    console.log("\nUploading to Anthropic...");
    const { Blob } = await import("buffer");
    const csvBlob = new Blob([CSV_STRING], { type: "text/plain" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = await (client.beta.files as any).upload(
      {
        file: new File([csvBlob as unknown as BlobPart], "orders.csv", {
          type: "text/plain",
        }),
      },
      { headers: { "anthropic-beta": "files-api-2025-04-14" } },
    );
    console.log(`✓ Anthropic file uploaded`);
    console.log(`  ANTHROPIC_CSV_FILE_ID=${file.id}`);
  } else {
    console.log("\n⚠ ANTHROPIC_API_KEY not set — skipping Anthropic upload");
  }

  console.log("\nDone. Set these as Vercel env vars, then redeploy.");
}

main().catch(console.error);
