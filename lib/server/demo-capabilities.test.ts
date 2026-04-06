import test from "node:test";
import assert from "node:assert/strict";
import { getGroundedCapabilities, getUngroundedCapabilities } from "./demo-capabilities.ts";

function enabledCapabilityIds(
  capabilities: ReturnType<typeof getUngroundedCapabilities>,
) {
  return capabilities
    .filter((capability) => capability.enabled)
    .map((capability) => capability.id)
    .sort();
}

test("grounded OpenAI capabilities are a strict superset of raw OpenAI capabilities", () => {
  const raw = enabledCapabilityIds(getUngroundedCapabilities("openai", true));
  const grounded = enabledCapabilityIds(getGroundedCapabilities("openai", true));

  for (const capabilityId of raw) {
    assert.ok(
      grounded.includes(capabilityId),
      `Expected grounded capabilities to include ${capabilityId}`,
    );
  }

  assert.ok(
    grounded.length > raw.length,
    "Expected grounded capabilities to include Annona-only capabilities",
  );
  assert.ok(grounded.includes("annona_tools"));
  assert.ok(grounded.includes("annona_datasets"));
  assert.ok(grounded.includes("annona_calculators"));
  assert.ok(grounded.includes("annona_model_analysis"));
});
