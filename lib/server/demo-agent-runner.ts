import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

export interface DemoRequestMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DemoAgentOptions {
  messages: DemoRequestMessage[];
  signal?: AbortSignal;
}

export interface TextDeltaEvent {
  type: "text-delta";
  delta: string;
}

export interface ToolStartEvent {
  type: "tool-start";
  toolCallId: string;
  toolName: string;
  args: unknown;
}

export interface ToolEndEvent {
  type: "tool-end";
  toolCallId: string;
  toolName: string;
  result: unknown;
}

export interface ToolErrorEvent {
  type: "tool-error";
  toolCallId: string;
  toolName: string;
  error: string;
}

export type DemoAgentEvent =
  | TextDeltaEvent
  | ToolStartEvent
  | ToolEndEvent
  | ToolErrorEvent;

export interface DemoAgent {
  streamResponse(
    options: DemoAgentOptions,
  ): AsyncGenerator<DemoAgentEvent, void, void>;
}

interface DemoTool {
  name: string;
  invoke(
    input: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<unknown> | unknown;
}

interface InvokeOnlyModel {
  invoke(
    messages: Array<HumanMessage | AIMessage | SystemMessage | ToolMessage>,
    options?: { signal?: AbortSignal },
  ): Promise<AIMessage>;
}

interface StreamCapableModel extends InvokeOnlyModel {
  stream?:
    | ((
        messages: Array<HumanMessage | AIMessage | SystemMessage | ToolMessage>,
        options?: { signal?: AbortSignal },
      ) => AsyncIterable<AIMessageChunk> | Promise<AsyncIterable<AIMessageChunk>>)
    | undefined;
}

interface ToolBindableModel extends StreamCapableModel {
  bindTools?: ((tools: DemoTool[]) => InvokeOnlyModel) | undefined;
}

function toConversationMessages(messages: DemoRequestMessage[]) {
  return messages.map((message) =>
    message.role === "assistant"
      ? new AIMessage({ content: message.content })
      : new HumanMessage({ content: message.content }),
  );
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (typeof block === "string") {
        return block;
      }

      if (
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      ) {
        return block.text;
      }

      return "";
    })
    .join("");
}

function stringifyToolResult(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }

  const serialized = JSON.stringify(result, null, 2);
  return serialized ?? String(result);
}

export function createStreamingTextAgent(options: {
  model: StreamCapableModel;
  systemPrompt: string;
}): DemoAgent {
  const { model, systemPrompt } = options;

  return {
    async *streamResponse({ messages, signal }) {
      const conversation = [
        new SystemMessage(systemPrompt),
        ...toConversationMessages(messages),
      ];

      if (!model.stream) {
        const response = await model.invoke(conversation, { signal });
        const text = extractTextContent(response.content);
        if (text) {
          yield { type: "text-delta", delta: text };
        }
        return;
      }

      const stream = await model.stream(conversation, { signal });
      for await (const chunk of stream) {
        const delta = extractTextContent(chunk.content);
        if (delta) {
          yield { type: "text-delta", delta };
        }
      }
    },
  };
}

export function createToolAgent(options: {
  model: ToolBindableModel;
  systemPrompt: string;
  tools: DemoTool[];
  maxIterations?: number;
}): DemoAgent {
  const { model, systemPrompt, tools, maxIterations = 4 } = options;

  if (!model.bindTools) {
    throw new Error("Model does not support tool binding.");
  }

  const toolEnabledModel = model.bindTools(tools);
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

  return {
    async *streamResponse({ messages, signal }) {
      let conversation: Array<
        HumanMessage | AIMessage | SystemMessage | ToolMessage
      > = [new SystemMessage(systemPrompt), ...toConversationMessages(messages)];

      for (let step = 0; step < maxIterations; step += 1) {
        const response = await toolEnabledModel.invoke(conversation, { signal });
        const text = extractTextContent(response.content);

        if (text) {
          yield { type: "text-delta", delta: text };
        }

        const toolCalls = response.tool_calls ?? [];
        if (toolCalls.length === 0) {
          return;
        }

        conversation = [...conversation, response];

        for (const toolCall of toolCalls) {
          const toolName = toolCall.name;
          const toolCallId = toolCall.id ?? `${toolName}-${step}`;
          const tool = toolMap.get(toolName);

          if (!tool) {
            const error = `Tool "${toolName}" is not available.`;
            yield {
              type: "tool-error",
              toolCallId,
              toolName,
              error,
            };
            conversation.push(
              new ToolMessage({
                tool_call_id: toolCallId,
                name: toolName,
                content: error,
              }),
            );
            continue;
          }

          yield {
            type: "tool-start",
            toolCallId,
            toolName,
            args: toolCall.args,
          };

          try {
            const result = await tool.invoke(toolCall.args, { signal });
            yield {
              type: "tool-end",
              toolCallId,
              toolName,
              result,
            };
            conversation.push(
              new ToolMessage({
                tool_call_id: toolCallId,
                name: toolName,
                content: stringifyToolResult(result),
              }),
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            yield {
              type: "tool-error",
              toolCallId,
              toolName,
              error: message,
            };
            conversation.push(
              new ToolMessage({
                tool_call_id: toolCallId,
                name: toolName,
                content: message,
              }),
            );
          }
        }
      }

      throw new Error(
        "Grounded agent exceeded the maximum number of tool iterations.",
      );
    },
  };
}
