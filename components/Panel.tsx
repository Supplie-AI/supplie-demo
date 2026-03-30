"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/hooks/useStreamingChat";
import { ToolCallCard } from "./ToolCallCard";

interface PanelProps {
  panelId: "ungrounded" | "grounded";
  title: string;
  badge: string;
  badgeColor: "amber" | "teal";
  bgColor: string;
  borderColor: string;
  note: string;
  emptyStateTitle: string;
  emptyStateDetail: string;
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function Panel({
  panelId,
  title,
  badge,
  badgeColor,
  bgColor,
  borderColor,
  note,
  emptyStateTitle,
  emptyStateDetail,
  messages,
  isLoading,
  error,
  onRetry,
}: PanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const is429 =
    error?.message?.includes("429") || error?.message?.includes("Rate limit");
  const is401 =
    error?.message?.includes("401") || error?.message?.includes("Unauthorized");

  const badgeStyles = {
    amber: "bg-amber-900/40 text-amber-300 border border-amber-700/40",
    teal: "bg-teal-900/40 text-teal-300 border border-teal-700/40",
  };

  return (
    <div
      data-testid={`panel-${panelId}`}
      className={`flex flex-col h-full border-r ${borderColor} overflow-hidden`}
      style={{ background: bgColor }}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </span>
        <span
          className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeStyles[badgeColor]}`}
        >
          {badge}
        </span>
        {isLoading && (
          <div className="ml-auto flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${badgeColor === "teal" ? "bg-teal-400" : "bg-amber-400"} animate-bounce`}
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="px-4 py-2 border-b border-white/5 bg-black/10">
        <p className="text-xs leading-relaxed text-slate-400">{note}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {emptyStateTitle}
              </p>
              <br />
              <span
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {emptyStateDetail}
              </span>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="bg-slate-800/60 text-slate-100 text-sm rounded-lg px-3 py-2 max-w-xs">
                  {msg.content}
                </div>
              </div>
            )}
            {msg.role === "assistant" && (
              <div className="space-y-2">
                {msg.toolInvocations &&
                  msg.toolInvocations.filter(
                    (inv) => inv.toolName !== "__output_file__"
                  ).length > 0 && (
                    <div className="space-y-1">
                      {msg.toolInvocations
                        .filter((inv) => inv.toolName !== "__output_file__")
                        .map((inv, i) => {
                          const result =
                            "result" in inv ? inv.result : undefined;
                          const hasError =
                            result &&
                            typeof result === "object" &&
                            "error" in result;
                          return (
                            <ToolCallCard
                              key={inv.toolCallId}
                              toolName={inv.toolName}
                              args={inv.args}
                              result={result}
                              index={i}
                              hasError={!!hasError}
                            />
                          );
                        })}
                    </div>
                  )}
                {msg.content && (
                  <div className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {error && !is429 && !is401 && (
          <div className="flex items-center gap-2">
            <button
              onClick={onRetry}
              className="text-xs text-teal-400 border border-teal-800/50 hover:border-teal-600/50 rounded-full px-3 py-1 transition-colors"
            >
              ↺ Retry
            </button>
            <span className="text-slate-500 text-xs">{error.message}</span>
          </div>
        )}
        {is429 && (
          <div className="text-slate-400 text-xs">
            Rate limit exceeded. Retry when the minute window resets.
          </div>
        )}
        {is401 && (
          <div className="text-slate-400 text-xs">
            Session expired. Refresh and authenticate again.
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
