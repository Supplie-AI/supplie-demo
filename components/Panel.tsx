"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/hooks/useStreamingChat";
import { AnswerEvidencePanel } from "./AnswerEvidencePanel";
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
      "border text-[color:#8a5618]",
    teal:
      "border text-[color:#005f77]",
  };
  const accentStyles = {
    amber: {
      orb: "bg-[color:#c7862f]",
      headerBorder: "rgba(199, 134, 47, 0.18)",
      badgeBorder: "rgba(199, 134, 47, 0.22)",
      badgeBg: "rgba(199, 134, 47, 0.1)",
      ring: "border-[rgba(199,134,47,0.16)] bg-[rgba(255,249,241,0.96)]",
      noteBorder: "rgba(199, 134, 47, 0.14)",
      noteBg:
        "linear-gradient(90deg, rgba(199,134,47,0.08), rgba(255,255,255,0.72))",
      message:
        "border-[rgba(199,134,47,0.16)] bg-[rgba(255,250,244,0.96)]",
      userMessage:
        "border-[rgba(199,134,47,0.12)] bg-[linear-gradient(180deg,rgba(249,244,235,0.98),rgba(244,236,224,0.98))]",
      retryBorder: "rgba(199, 134, 47, 0.28)",
      retryText: "#8a5618",
      indicator: "bg-[color:#c7862f]",
    },
    teal: {
      orb: "bg-[color:#00d2ff]",
      headerBorder: "rgba(0, 210, 255, 0.18)",
      badgeBorder: "rgba(0, 210, 255, 0.22)",
      badgeBg: "rgba(0, 210, 255, 0.1)",
      ring: "border-[rgba(0,210,255,0.16)] bg-[rgba(240,251,255,0.98)]",
      noteBorder: "rgba(0, 210, 255, 0.16)",
      noteBg:
        "linear-gradient(90deg, rgba(0,210,255,0.08), rgba(255,255,255,0.78))",
      message:
        "border-[rgba(0,210,255,0.18)] bg-[rgba(240,251,255,0.98)]",
      userMessage:
        "border-[rgba(0,95,119,0.12)] bg-[linear-gradient(180deg,rgba(244,252,255,0.98),rgba(232,247,252,0.98))]",
      retryBorder: "rgba(0, 95, 119, 0.24)",
      retryText: "#005f77",
      indicator: "bg-[color:#00d2ff]",
    },
  };
  const accent = accentStyles[badgeColor];

  return (
    <div
      data-testid={`panel-${panelId}`}
      className="flex h-full flex-col overflow-hidden rounded-[28px] border shadow-[0_24px_60px_rgba(28,28,26,0.08)]"
      style={{ background: bgColor, borderColor }}
    >
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${accent.headerBorder}` }}>
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${accent.orb} shadow-lg`} />
          <span
            className="text-[15px] font-semibold tracking-[-0.02em]"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-heading)",
            }}
          >
            {title}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${badgeStyles[badgeColor]}`}
            style={{
              borderColor: accent.badgeBorder,
              background: accent.badgeBg,
            }}
          >
            {badge}
          </span>
          {isLoading && (
            <div className="ml-auto flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${accent.indicator} animate-bounce`}
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>
        <span
          className="mt-3 block rounded-2xl border px-4 py-3 text-xs leading-relaxed"
          style={{
            borderColor: accent.noteBorder,
            background: accent.noteBg,
            color: "var(--text-secondary)",
          }}
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

        {messages.map((msg, messageIndex) => (
          <div
            key={msg.id}
            data-testid={`panel-${panelId}-message-${messageIndex}-${msg.role}`}
            className="space-y-2"
          >
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div
                  data-testid={`panel-${panelId}-user-text-${messageIndex}`}
                  className={`max-w-xs rounded-2xl border px-4 py-3 text-sm shadow-[0_12px_30px_rgba(28,28,26,0.08)] ${accent.userMessage}`}
                  style={{ color: "var(--text-primary)" }}
                >
                  {msg.content}
                </div>
              </div>
            )}
            {msg.role === "assistant" && (
              <div
                className={`space-y-3 rounded-[24px] border px-4 py-4 ${accent.message}`}
              >
                {panelId === "grounded" &&
                  msg.toolInvocations &&
                  msg.content && (
                    <AnswerEvidencePanel
                      panelId={panelId}
                      messageIndex={messageIndex}
                      content={msg.content}
                      toolInvocations={msg.toolInvocations}
                    />
                  )}
                {msg.content && (
                  <div
                    data-testid={`panel-${panelId}-assistant-text-${messageIndex}`}
                    className="whitespace-pre-wrap text-sm leading-7"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {msg.content}
                  </div>
                )}
                {msg.toolInvocations &&
                  msg.toolInvocations.filter(
                    (inv) => inv.toolName !== "__output_file__"
                  ).length > 0 && (
                    panelId === "grounded" ? (
                      <details
                        className="rounded-2xl border"
                        style={{
                          borderColor: "rgba(0, 95, 119, 0.1)",
                          background: "rgba(255,255,255,0.76)",
                        }}
                      >
                        <summary
                          className="cursor-pointer list-none px-4 py-3 text-sm font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Tool trace
                        </summary>
                        <div className="space-y-1 px-3 pb-3">
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
                                  testId={`panel-${panelId}-tool-${messageIndex}-${i}`}
                                />
                              );
                            })}
                        </div>
                      </details>
                    ) : (
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
                                testId={`panel-${panelId}-tool-${messageIndex}-${i}`}
                              />
                            );
                          })}
                      </div>
                    )
                )}
              </div>
            )}
          </div>
        ))}

        {error && !is429 && !is401 && (
          <div className="flex items-center gap-2">
            <button
              onClick={onRetry}
              className="rounded-full border px-3 py-1 text-xs transition-colors"
              style={{
                borderColor: accent.retryBorder,
                color: accent.retryText,
              }}
            >
              ↺ Retry
            </button>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {error.message}
            </span>
          </div>
        )}
        {is429 && (
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Rate limit exceeded. Retry when the minute window resets.
          </div>
        )}
        {is401 && (
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Session expired. Refresh and authenticate again.
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
