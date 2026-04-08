"use client";

import type { ToolInvocation } from "@/hooks/useStreamingChat";
import { deriveAnswerInsights } from "@/lib/answer-insights";

interface AnswerEvidencePanelProps {
  panelId: "ungrounded" | "grounded";
  messageIndex: number;
  content: string;
  toolInvocations: ToolInvocation[];
}

export function AnswerEvidencePanel({
  panelId,
  messageIndex,
  content,
  toolInvocations,
}: AnswerEvidencePanelProps) {
  const insights = deriveAnswerInsights(content, toolInvocations);
  const confidenceStyles =
    insights.confidence.label === "High"
      ? {
          border: "rgba(0, 95, 119, 0.18)",
          background: "rgba(0, 210, 255, 0.1)",
          color: "#005f77",
        }
      : insights.confidence.label === "Medium"
        ? {
            border: "rgba(199, 134, 47, 0.2)",
            background: "rgba(199, 134, 47, 0.1)",
            color: "#8a5618",
          }
        : {
            border: "rgba(163, 73, 73, 0.18)",
            background: "rgba(163, 73, 73, 0.08)",
            color: "#8f3e3e",
        };
  const stateStyles =
    insights.confidence.stateLabel === "Estimated"
      ? {
          border: "rgba(199, 134, 47, 0.2)",
          background: "rgba(199, 134, 47, 0.1)",
          color: "#8a5618",
        }
      : {
          border: "rgba(0, 95, 119, 0.18)",
          background: "rgba(0, 210, 255, 0.08)",
          color: "#005f77",
        };

  return (
    <div
      data-testid={`panel-${panelId}-insights-${messageIndex}`}
      className="rounded-[20px] border px-4 py-3"
      style={{
        borderColor: "rgba(0, 95, 119, 0.12)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(236,248,252,0.92))",
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="text-[11px] uppercase tracking-[0.2em]"
          style={{ color: "var(--text-muted)" }}
        >
          Answer confidence
        </span>
        <span
          data-testid={`panel-${panelId}-confidence-${messageIndex}`}
          className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={confidenceStyles}
        >
          {insights.confidence.label}
        </span>
        <span
          data-testid={`panel-${panelId}-state-mode-${messageIndex}`}
          className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={stateStyles}
        >
          {insights.confidence.stateLabel}
        </span>
      </div>

      <p
        className="mt-2 text-sm leading-6"
        style={{ color: "var(--text-primary)" }}
      >
        {insights.confidence.summary}
      </p>

      {insights.evidence.length > 0 && (
        <div className="mt-3 space-y-2">
          <div
            className="text-[11px] uppercase tracking-[0.2em]"
            style={{ color: "var(--text-muted)" }}
          >
            Supporting evidence
          </div>
          {insights.evidence.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              data-testid={`panel-${panelId}-evidence-${messageIndex}-${index}`}
              className="rounded-2xl border px-3 py-3"
              style={{
                borderColor: "rgba(0, 95, 119, 0.1)",
                background: "rgba(255,255,255,0.86)",
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.label}
                </span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
                  style={{
                    borderColor: "rgba(0, 95, 119, 0.1)",
                    background: "rgba(0, 210, 255, 0.08)",
                    color: "#005f77",
                  }}
                >
                  {item.sourceLabel}
                </span>
                {item.stateLabel && (
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
                    style={{
                      borderColor:
                        item.tone === "warning"
                          ? "rgba(163, 73, 73, 0.16)"
                          : item.stateLabel === "Estimated"
                            ? "rgba(199, 134, 47, 0.18)"
                            : "rgba(0, 95, 119, 0.1)",
                      background:
                        item.tone === "warning"
                          ? "rgba(163, 73, 73, 0.08)"
                          : item.stateLabel === "Estimated"
                            ? "rgba(199, 134, 47, 0.1)"
                            : "rgba(0, 210, 255, 0.08)",
                      color:
                        item.tone === "warning"
                          ? "#8f3e3e"
                          : item.stateLabel === "Estimated"
                            ? "#8a5618"
                            : "#005f77",
                    }}
                  >
                    {item.stateLabel}
                  </span>
                )}
              </div>
              <p
                className="mt-1 text-sm leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      )}

      {insights.caveats.length > 0 && (
        <div className="mt-3 rounded-2xl border px-3 py-3"
          style={{
            borderColor: "rgba(199, 134, 47, 0.12)",
            background: "rgba(255, 250, 244, 0.9)",
          }}
        >
          <div
            className="text-[11px] uppercase tracking-[0.2em]"
            style={{ color: "var(--text-muted)" }}
          >
            Assumptions and caveats
          </div>
          <div className="mt-2 space-y-2">
            {insights.caveats.map((caveat, index) => (
              <p
                key={`${caveat}-${index}`}
                data-testid={`panel-${panelId}-caveat-${messageIndex}-${index}`}
                className="text-sm leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                {caveat}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
