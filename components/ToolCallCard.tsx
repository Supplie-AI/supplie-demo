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
      className={`border-l-2 ${hasError ? "border-red-600" : "border-teal-500"} ${hasError ? "bg-red-950/20" : "bg-teal-950/20"} rounded-r-lg mb-2 overflow-hidden animate-slide-in`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-teal-950/30 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-teal-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-teal-400 flex-shrink-0" />
        )}
        {hasError && (
          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
        )}
        <span className="text-teal-300 font-mono text-xs font-semibold">
          {toolName}
        </span>
        <span
          className={`font-mono text-xs ml-auto ${hasError ? "text-red-400" : "text-slate-400"}`}
        >
          {getResultSummary()}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              Inputs
            </div>
            <pre className="text-xs text-slate-300 font-mono bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">
              {formatValue(args)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Result
              </div>
              <pre
                className={`text-xs font-mono bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 ${hasError ? "text-red-300" : "text-teal-200"}`}
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
