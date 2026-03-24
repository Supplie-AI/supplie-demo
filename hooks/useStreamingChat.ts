"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolInvocations?: ToolInvocation[];
}

export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: unknown;
  result?: unknown;
}

interface UseStreamingChatOptions {
  api: string;
  body?: Record<string, unknown>;
  headers?: () => Record<string, string>;
  onError?: (err: Error) => void;
}

let idCounter = 0;
function genId() {
  return `msg-${Date.now()}-${idCounter++}`;
}

export function useStreamingChat({
  api,
  body = {},
  headers,
  onError,
}: UseStreamingChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setMessagesExported = useCallback(
    (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessages(msgs);
    },
    []
  );

  const append = useCallback(
    async (msg: { role: "user"; content: string }) => {
      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: msg.content,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      const assistantId = genId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const extraHeaders = headers?.() ?? {};
        const resp = await fetch(api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...extraHeaders,
          },
          body: JSON.stringify({
            prompt: msg.content,
            messages: [{ role: "user", content: msg.content }],
            ...body,
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => resp.statusText);
          throw new Error(`${resp.status}: ${text}`);
        }

        const contentType = resp.headers.get("content-type") ?? "";
        const reader = resp.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Process line by line (Vercel AI SDK data stream format)
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            // Vercel AI SDK data stream: "0:..." text delta, "8:..." metadata, "d:..." done
            if (line.startsWith("0:")) {
              try {
                const delta = JSON.parse(line.slice(2)) as string;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + delta }
                      : m
                  )
                );
              } catch {
                // ignore parse error
              }
            } else if (line.startsWith("3:")) {
              // error
              try {
                const errMsg = JSON.parse(line.slice(2)) as string;
                throw new Error(errMsg);
              } catch (e) {
                if (e instanceof Error && e.message !== line.slice(2)) throw e;
              }
            } else if (line.startsWith("8:")) {
              // metadata (output files, etc) — store in message
              try {
                const meta = JSON.parse(line.slice(2)) as unknown[];
                for (const item of meta) {
                  if (typeof item === "string") {
                    const parsed = JSON.parse(item) as {
                      outputFiles?: unknown[];
                    };
                    if (parsed.outputFiles) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId
                            ? {
                                ...m,
                                toolInvocations: parsed.outputFiles?.map(
                                  (f, i) => ({
                                    toolCallId: `file-${i}`,
                                    toolName: "__output_file__",
                                    args: {},
                                    result: f,
                                  })
                                ) as ToolInvocation[],
                              }
                            : m
                        )
                      );
                    }
                  }
                }
              } catch {
                // ignore
              }
            } else if (contentType.includes("text/event-stream")) {
              // Standard SSE format: "data: ..."
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data) as {
                    choices?: Array<{
                      delta?: { content?: string; tool_calls?: unknown[] };
                    }>;
                  };
                  const delta =
                    parsed.choices?.[0]?.delta?.content ?? "";
                  if (delta) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: m.content + delta }
                          : m
                      )
                    );
                  }
                } catch {
                  // ignore
                }
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          // user cancelled
        } else {
          const e = err instanceof Error ? err : new Error(String(err));
          setError(e);
          onError?.(e);
          // Remove empty assistant message on hard error
          setMessages((prev) => {
            const msg = prev.find((m) => m.id === assistantId);
            if (msg && !msg.content) {
              return prev.filter((m) => m.id !== assistantId);
            }
            return prev;
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [api, body, headers, onError]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return { messages, append, setMessages: setMessagesExported, isLoading, error, stop };
}
