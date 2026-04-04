"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

interface ToolCallCardProps {
  toolName: string;
  args: unknown;
  result: unknown;
  index: number;
  hasError?: boolean;
}

export function ToolCallCard({
  toolName,
  args,
  result,
  index,
  hasError,
}: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toolSource =
    toolName.startsWith("openai_")
      ? {
          label: "OpenAI native",
          className:
            "border-sky-400/20 bg-sky-400/10 text-sky-200",
        }
      : toolName.startsWith("annona_")
        ? {
            label: "Annona tool",
            className:
              "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
          }
        : {
            label: "Demo tool",
            className:
              "border-white/10 bg-white/5 text-slate-300",
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
      className={`mb-2 overflow-hidden rounded-2xl border ${hasError ? "border-red-500/25 bg-red-500/10" : "border-teal-400/20 bg-[linear-gradient(180deg,rgba(11,42,43,0.42),rgba(5,18,22,0.55))]"} animate-slide-in shadow-[0_12px_32px_rgba(0,0,0,0.18)]`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-white/4"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 flex-shrink-0 text-teal-300" />
        ) : (
          <ChevronRight className="h-3 w-3 flex-shrink-0 text-teal-300" />
        )}
        {hasError && (
          <AlertTriangle className="h-3 w-3 flex-shrink-0 text-red-400" />
        )}
        <span className="rounded-full border border-white/8 bg-white/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-200">
          {toolName}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${toolSource.className}`}
        >
          {toolSource.label}
        </span>
        <span
          className={`ml-auto font-mono text-[11px] ${hasError ? "text-red-300" : "text-slate-400"}`}
        >
          {getResultSummary()}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Inputs
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/6 bg-black/25 p-3 font-mono text-xs text-slate-300">
              {formatValue(args)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Result
              </div>
              <pre
                className={`max-h-48 overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/6 bg-black/25 p-3 font-mono text-xs ${hasError ? "text-red-200" : "text-teal-100"}`}
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
