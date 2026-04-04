import test from "node:test";
import assert from "node:assert/strict";
import { AIMessage, AIMessageChunk } from "@langchain/core/messages";
// @ts-ignore Node's built-in test runner needs the explicit .ts suffix here.
import { createStreamingTextAgent, createToolAgent } from "./demo-agent-runner.ts";

test("createStreamingTextAgent yields streamed text deltas", async () => {
  const agent = createStreamingTextAgent({
    systemPrompt: "You are helpful.",
    model: {
      async invoke() {
        return new AIMessage({ content: "unused" });
      },
      async *stream() {
        yield new AIMessageChunk({ content: "Hello" });
        yield new AIMessageChunk({ content: " world" });
      },
    },
  });

  const deltas: string[] = [];
  for await (const event of agent.streamResponse({
    messages: [{ role: "user", content: "Hi" }],
  })) {
    assert.equal(event.type, "text-delta");
    deltas.push(event.delta);
  }

  assert.deepEqual(deltas, ["Hello", " world"]);
});

test("createToolAgent runs tools and returns the final grounded answer", async () => {
  let invocationCount = 0;

  const agent = createToolAgent({
    systemPrompt: "Use tools before answering.",
    tools: [
      {
        name: "query_order_margin_snapshot",
        async invoke(args) {
          assert.deepEqual(args, {
            customer: "Suspension King",
            period: "last_week",
          });

          return {
            net_margin: 7990,
            customer: "Suspension King",
          };
        },
      },
    ],
    model: {
      async invoke() {
        invocationCount += 1;

        if (invocationCount === 1) {
          return new AIMessage({
            content: "",
            tool_calls: [
              {
                id: "tool-1",
                name: "query_order_margin_snapshot",
                type: "tool_call",
                args: {
                  customer: "Suspension King",
                  period: "last_week",
                },
              },
            ],
          });
        }

        return new AIMessage({
          content:
            "The Annona demo snapshot shows Suspension King's net margin is 7,990.",
        });
      },
      bindTools() {
        return this;
      },
    },
  });

  const events = [];
  for await (const event of agent.streamResponse({
    messages: [
      {
        role: "user",
        content:
          "What's the net margin on last week's Suspension King orders after freight and rebates?",
      },
    ],
  })) {
    events.push(event);
  }

  assert.deepEqual(events, [
    {
      type: "tool-start",
      toolCallId: "tool-1",
      toolName: "query_order_margin_snapshot",
      args: {
        customer: "Suspension King",
        period: "last_week",
      },
    },
    {
      type: "tool-end",
      toolCallId: "tool-1",
      toolName: "query_order_margin_snapshot",
      result: {
        net_margin: 7990,
        customer: "Suspension King",
      },
    },
    {
      type: "text-delta",
      delta:
        "The Annona demo snapshot shows Suspension King's net margin is 7,990.",
    },
  ]);
});
