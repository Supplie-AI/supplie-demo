import fs from "node:fs";
import process from "node:process";

const baseUrl = process.env.SMOKE_BASE_URL?.trim().replace(/\/$/, "");
const demoPassword = process.env.SMOKE_DEMO_PASSWORD?.trim();
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
const chatPrompt =
  "What's the net margin on last week's Suspension King orders after freight and rebates?";

if (!baseUrl) {
  fail("SMOKE_BASE_URL is required.");
}

if (!demoPassword) {
  fail("SMOKE_DEMO_PASSWORD is required.");
}

const summaryLines = [
  "## Dev Smoke Test",
  `- Base URL: ${baseUrl}`,
  "",
];

try {
  const config = await waitForConfig();
  assert(
    Array.isArray(config.panels) && config.panels.length >= 2,
    "Config endpoint returned the expected panel metadata.",
  );
  assert(
    config.panels.some((panel) => panel.id === "grounded"),
    "Config endpoint includes the grounded panel definition.",
  );
  assert(
    config.openaiAvailable === true,
    "Config endpoint reports OpenAI as available in the deployed dev environment.",
  );
  recordCheck(
    "Config endpoint",
    "GET /api/config?provider=openai returned grounded panel metadata and OpenAI availability.",
  );

  const auth = await postJson(`${baseUrl}/api/auth/check`, {
    password: demoPassword,
  });
  assert(auth.response.ok, "Password auth check succeeded.");
  assert(auth.body?.ok === true, "Password auth endpoint returned `{ ok: true }`.");
  recordCheck(
    "Password auth",
    "POST /api/auth/check accepted the deployed demo password.",
  );

  const chat = await runGroundedChatSmoke();
  const marginTool = chat.metadata.find(
    (event) =>
      event?.type === "tool-end" &&
      event.toolName === "annona_query_order_margin_snapshot",
  );

  assert(
    Boolean(marginTool),
    "Grounded chat invoked the Annona order margin tool.",
  );
  assert(
    marginTool.result?.net_margin === 7990,
    "Grounded tool output returned the expected Suspension King net margin.",
  );
  assert(
    marginTool.result?.customer === "Suspension King",
    "Grounded tool output returned the expected customer.",
  );
  assert(
    chat.text.toLowerCase().includes("suspension king"),
    "Grounded chat response mentioned Suspension King.",
  );
  assert(
    chat.text.toLowerCase().includes("annona demo snapshot"),
    "Grounded chat response disclosed the Annona demo snapshot.",
  );
  recordCheck(
    "Grounded chat",
    "POST /api/chat with bearer auth streamed a grounded response backed by `annona_query_order_margin_snapshot`.",
  );

  summaryLines.push("### Grounded response excerpt");
  summaryLines.push("");
  summaryLines.push(`> ${truncate(chat.text.replace(/\s+/g, " ").trim(), 280)}`);
  summaryLines.push("");

  printSummary();
  console.log("Smoke test passed.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  summaryLines.push("### Result");
  summaryLines.push("");
  summaryLines.push(`- Status: FAILED`);
  summaryLines.push(`- Error: ${message}`);
  summaryLines.push("");
  writeSummary();
  console.error(`::error::${message}`);
  process.exit(1);
}

async function waitForConfig() {
  const retries = 18;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const { response, body } = await getJson(
        `${baseUrl}/api/config?provider=openai`,
      );
      assert(response.ok, `Config endpoint returned HTTP ${response.status}.`);
      return body;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `Config endpoint not ready yet (attempt ${attempt}/${retries}): ${message}`,
      );
      await sleep(10_000);
    }
  }

  throw new Error("Config endpoint never became ready.");
}

async function runGroundedChatSmoke() {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${demoPassword}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "openai",
      agentMode: "grounded",
      model: "gpt-5.4-mini-2026-03-17",
      prompt: chatPrompt,
    }),
  });

  assert(response.ok, `Chat endpoint returned HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type") ?? "";
  assert(
    contentType.includes("text/event-stream"),
    `Chat endpoint returned unexpected content type: ${contentType || "none"}.`,
  );

  const streamText = await response.text();
  const lines = streamText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let done = false;
  let text = "";
  const metadata = [];

  for (const line of lines) {
    if (line.startsWith("0:")) {
      text += JSON.parse(line.slice(2));
      continue;
    }

    if (line.startsWith("8:")) {
      metadata.push(JSON.parse(line.slice(2)));
      continue;
    }

    if (line.startsWith("3:")) {
      throw new Error(`Chat stream error: ${JSON.parse(line.slice(2))}`);
    }

    if (line.startsWith("d:")) {
      done = true;
    }
  }

  assert(done, "Chat stream completed with a done event.");
  assert(text.trim().length > 0, "Chat stream returned assistant text.");

  return { text, metadata };
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

function recordCheck(name, detail) {
  console.log(`PASS ${name}: ${detail}`);
  summaryLines.push(`- ${name}: PASS. ${detail}`);
}

function printSummary() {
  summaryLines.push("");
  summaryLines.push("### Result");
  summaryLines.push("");
  summaryLines.push("- Status: PASSED");
  writeSummary();
}

function writeSummary() {
  if (!summaryPath) {
    return;
  }

  process.stdout.write(`Writing smoke summary to ${summaryPath}\n`);
  fs.writeFileSync(summaryPath, `${summaryLines.join("\n")}\n`, {
    flag: "a",
  });
}

function truncate(value, maxLength) {
  return value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength - 3)}...`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function fail(message) {
  throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
