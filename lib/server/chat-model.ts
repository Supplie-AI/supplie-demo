import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import type { DemoProvider } from "./demo-config";

interface ChatModelOptions {
  model: string;
  provider: DemoProvider;
}

const chatModelCache = new Map<string, ChatOpenAI | ChatAnthropic>();

export function getChatModel({ model, provider }: ChatModelOptions) {
  const cacheKey = `${provider}:${model}`;
  const cached = chatModelCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const chatModel =
    provider === "anthropic"
      ? new ChatAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          model,
        })
      : new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          model,
        });

  chatModelCache.set(cacheKey, chatModel);
  return chatModel;
}
