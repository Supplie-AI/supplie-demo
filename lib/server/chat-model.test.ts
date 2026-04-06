import test from "node:test";
import assert from "node:assert/strict";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { getChatModel } from "./chat-model.ts";

test("getChatModel returns a concrete OpenAI chat model instance", () => {
  process.env.OPENAI_API_KEY = "test-openai-key";

  const chatModel = getChatModel({
    model: "gpt-5.4-mini-2026-03-17",
    provider: "openai",
  });

  assert.ok(chatModel instanceof ChatOpenAI);
});

test("getChatModel returns a concrete Anthropic chat model instance", () => {
  process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

  const chatModel = getChatModel({
    model: "claude-sonnet-4-5",
    provider: "anthropic",
  });

  assert.ok(chatModel instanceof ChatAnthropic);
});

test("getChatModel caches provider/model instances", () => {
  process.env.OPENAI_API_KEY = "test-openai-key";

  const first = getChatModel({
    model: "gpt-5.4-mini-2026-03-17",
    provider: "openai",
  });
  const second = getChatModel({
    model: "gpt-5.4-mini-2026-03-17",
    provider: "openai",
  });

  assert.equal(first, second);
});
