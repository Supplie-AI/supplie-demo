"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

interface ToolCallCardProps {
  toolName: string;
  args: unknown;
  result: unknown;
  index: number;
  hasError?: boolean;
  testId?: string;
}

export function ToolCallCard({
  toolName,
  args,
  result,
  index,
  hasError,
  testId,
}: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatPercent = (value: unknown) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }

    const normalized = value > 0 && value <= 1 ? value * 100 : value;
    return `${Math.round(normalized)}%`;
  };

  const toolSource =
    toolName.startsWith("openai_")
      ? {
          label: "OpenAI native",
          className:
            "border-[rgba(0,210,255,0.16)] bg-[rgba(0,210,255,0.08)] text-[color:#005f77]",
        }
      : toolName.startsWith("annona_")
        ? {
            label: "Annona tool",
            className:
              "border-[rgba(0,95,119,0.16)] bg-[rgba(0,95,119,0.08)] text-[color:#005f77]",
          }
        : {
            label: "Demo tool",
            className:
              "border-[rgba(28,28,26,0.08)] bg-[rgba(255,255,255,0.82)] text-[color:var(--text-secondary)]",
          };

  const formatValue = (v: unknown): string => {
    if (typeof v === "object") return JSON.stringify(v, null, 2);
    return String(v);
  };

  const getResultSummary = () => {
    if (!result) return "Loading...";
    if (
      hasError &&
      typeof result === "object" &&
      result !== null &&
      "error" in result
    ) {
      return `⚠ Tool error: ${(result as Record<string, unknown>).error}`;
    }
    if (Array.isArray(result)) return `${result.length} results`;
    if (typeof result === "object" && result !== null) {
      const r = result as Record<string, unknown>;
      if (toolName === "openai_web_search") {
        return "Web search complete";
      }
      if (toolName === "openai_file_search") {
        const count = Array.isArray(r.results) ? r.results.length : 0;
        return `${count} file hits`;
      }
      if (toolName === "openai_code_interpreter") {
        const outputs = Array.isArray(r.outputs) ? r.outputs.length : 0;
        return `${outputs} sandbox outputs`;
      }
      if (r.traceability_mode === "probabilistic") {
        const progress = formatPercent(r.inferred_progress_pct);
        if (r.wobble_detected === true) {
          return progress ? `Wobble at ${progress}` : "Wobble detected";
        }
        return progress ? `Estimated progress ${progress}` : "Probabilistic traceability";
      }
      if ("margin_pct" in r) return `Margin: ${r.margin_pct}%`;
      if ("days_remaining" in r)
        return `${r.days_remaining} days remaining${r.urgent ? " ⚠ URGENT" : ""}`;
      if ("mean_margin_pct" in r)
        return `Mean: ${r.mean_margin_pct}%, ${r.negative_margin_orders} negative`;
      if ("exception_count" in r)
        return `${r.exception_count} exceptions found`;
    }
    return "Complete";
  };

  return (
    <div
      data-testid={testId}
      data-tool-name={toolName}
      className={`mb-2 overflow-hidden rounded-2xl border ${hasError ? "border-red-500/25 bg-red-500/10" : "border-[rgba(0,95,119,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,251,255,0.94))]"} animate-slide-in shadow-[0_12px_32px_rgba(28,28,26,0.06)]`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[rgba(0,210,255,0.04)]"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 flex-shrink-0 text-[color:#00d2ff]" />
        ) : (
          <ChevronRight className="h-3 w-3 flex-shrink-0 text-[color:#00d2ff]" />
        )}
        {hasError && (
          <AlertTriangle className="h-3 w-3 flex-shrink-0 text-red-400" />
        )}
        <span
          data-testid={testId ? `${testId}-name` : undefined}
          className="rounded-full border border-[rgba(0,95,119,0.08)] bg-[rgba(255,255,255,0.82)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[color:#005f77]"
        >
          {toolName}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${toolSource.className}`}
        >
          {toolSource.label}
        </span>
        <span
          className={`ml-auto font-mono text-[11px] ${hasError ? "text-red-500" : "text-[color:var(--text-muted)]"}`}
        >
          {getResultSummary()}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Inputs
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-[rgba(0,95,119,0.08)] bg-[rgba(255,255,255,0.82)] p-3 font-mono text-xs text-[color:var(--text-secondary)]">
              {formatValue(args)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Result
              </div>
              <pre
                className={`max-h-48 overflow-x-auto whitespace-pre-wrap rounded-xl border border-[rgba(0,95,119,0.08)] bg-[rgba(255,255,255,0.82)] p-3 font-mono text-xs ${hasError ? "text-red-600" : "text-[color:var(--text-primary)]"}`}
              >
                {formatValue(result)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
