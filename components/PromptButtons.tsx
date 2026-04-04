"use client";

interface PromptButtonsProps {
  onPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const PROMPTS = [
  "What's the net margin on last week's Suspension King orders after freight and rebates?",
  "Which SKUs are at risk of stockout in the next 30 days?",
  "Which supplier is causing the most margin leakage?",
  "Search the web for a current ocean freight trend and cite what you used.",
  "Inspect the bundled benchmark files and tell me what they contain.",
  "Use your code sandbox on the bundled CSV and tell me the average transit days.",
];

export function PromptButtons({ onPrompt, disabled }: PromptButtonsProps) {
  return (
    <div
      className="rounded-[24px] px-3 py-3"
      style={{
        border: "1px solid rgba(221, 221, 214, 0.95)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,245,240,0.82))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-2">
        <div
          className="text-[11px] uppercase tracking-[0.22em]"
          style={{ color: "var(--text-muted)" }}
        >
          Demo prompts
        </div>
        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          One click mirrors the same prompt into both panels
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onPrompt(prompt)}
            disabled={disabled}
            className="min-w-[260px] flex-1 rounded-full border px-4 py-2.5 text-center text-xs leading-tight transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: "rgba(0, 95, 119, 0.12)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,251,255,0.9))",
              color: "var(--text-secondary)",
              boxShadow: "0 10px 24px rgba(0, 95, 119, 0.06)",
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
