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
    amber:
      "border border-[rgba(243,166,59,0.18)] bg-[rgba(243,166,59,0.12)] text-amber-200",
    teal:
      "border border-[rgba(46,211,196,0.18)] bg-[rgba(46,211,196,0.12)] text-teal-200",
  };
  const accentStyles = {
    amber: {
      orb: "bg-amber-300/80",
      ring: "border-[rgba(243,166,59,0.2)] bg-[rgba(243,166,59,0.06)]",
      note: "from-amber-500/10 to-transparent",
      message:
        "border-[rgba(243,166,59,0.14)] bg-[rgba(243,166,59,0.08)]",
      userMessage: "border-slate-600/50 bg-[linear-gradient(180deg,rgba(33,44,61,0.92),rgba(25,34,49,0.92))]",
      retry:
        "border-[rgba(243,166,59,0.3)] text-amber-200 hover:border-[rgba(243,166,59,0.6)]",
    },
    teal: {
      orb: "bg-teal-300/80",
      ring: "border-[rgba(46,211,196,0.2)] bg-[rgba(46,211,196,0.06)]",
      note: "from-teal-400/10 to-transparent",
      message:
        "border-[rgba(46,211,196,0.14)] bg-[rgba(46,211,196,0.08)]",
      userMessage: "border-slate-600/50 bg-[linear-gradient(180deg,rgba(33,44,61,0.92),rgba(25,34,49,0.92))]",
      retry:
        "border-[rgba(46,211,196,0.3)] text-teal-200 hover:border-[rgba(46,211,196,0.6)]",
    },
  };
  const accent = accentStyles[badgeColor];

  return (
    <div
      data-testid={`panel-${panelId}`}
      className={`flex h-full flex-col overflow-hidden rounded-[28px] border ${borderColor} shadow-[0_24px_60px_rgba(3,8,16,0.28)]`}
      style={{ background: bgColor }}
    >
      <div className="border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${accent.orb} shadow-lg`} />
          <span
            className="text-[15px] font-semibold tracking-[-0.02em]"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${badgeStyles[badgeColor]}`}
          >
            {badge}
          </span>
          {isLoading && (
            <div className="ml-auto flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${badgeColor === "teal" ? "bg-teal-300" : "bg-amber-300"} animate-bounce`}
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>
        <span
          className={`mt-3 block rounded-2xl border border-white/8 bg-gradient-to-r px-4 py-3 text-xs leading-relaxed text-slate-300 ${accent.note}`}
        >
          {note}
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && !error && (
          <div className="flex h-full items-center justify-center">
            <div
              className={`max-w-sm rounded-[28px] border p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${accent.ring}`}
            >
              <div
                className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 ${accent.message}`}
              >
                <div className={`h-3 w-3 rounded-full ${accent.orb}`} />
              </div>
              <p
                className="text-base font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {emptyStateTitle}
              </p>
              <span
                className="mt-3 block text-sm leading-6"
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
                <div
                  className={`max-w-xs rounded-2xl border px-4 py-3 text-sm text-slate-100 shadow-[0_12px_30px_rgba(3,8,16,0.22)] ${accent.userMessage}`}
                >
                  {msg.content}
                </div>
              </div>
            )}
            {msg.role === "assistant" && (
              <div
                className={`space-y-3 rounded-[24px] border px-4 py-4 ${accent.message}`}
              >
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
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-100">
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
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${accent.retry}`}
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
