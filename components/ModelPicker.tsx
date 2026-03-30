"use client";

import { useEffect, useState } from "react";

export interface ModelOption {
  label: string;
  modelId: string;
  provider: "openai" | "anthropic";
  requiresKey?: boolean;
}

export const MODELS: ModelOption[] = [
  {
    label: "GPT-5.4 mini — Fast",
    modelId: "gpt-5.4-mini-2026-03-17",
    provider: "openai",
  },
  { label: "GPT-5.4 — Full", modelId: "gpt-5.4", provider: "openai" },
  {
    label: "Claude Sonnet 4.5 ✦",
    modelId: "claude-sonnet-4-5",
    provider: "anthropic",
    requiresKey: true,
  },
];

interface ModelPickerProps {
  value: string;
  onChange: (modelId: string, provider: "openai" | "anthropic") => void;
}

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  const [anthropicAvailable, setAnthropicAvailable] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setAnthropicAvailable(d.anthropicAvailable ?? false))
      .catch(() => setAnthropicAvailable(false));
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
        Model
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const m = MODELS.find((m) => m.modelId === e.target.value)!;
            onChange(m.modelId, m.provider);
          }}
          className="cursor-pointer appearance-none rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(20,29,42,0.9),rgba(10,15,24,0.9))] py-2 pl-3 pr-8 text-xs text-slate-200 outline-none transition-colors focus:border-teal-400/50"
        >
          {MODELS.map((m) => (
            <option key={m.modelId} value={m.modelId}>
              {m.label}
              {m.requiresKey && anthropicAvailable === false
                ? " [key needed]"
                : ""}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <svg
            className="h-3 w-3 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
