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
    <div className="rounded-[24px] border border-white/8 bg-white/4 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-3 px-2">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
          Demo prompts
        </div>
        <div className="text-[11px] text-slate-500">
          One click mirrors the same prompt into both panels
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onPrompt(prompt)}
            disabled={disabled}
            className="min-w-[260px] flex-1 rounded-full border border-slate-700/50 bg-[linear-gradient(180deg,rgba(20,29,42,0.86),rgba(13,19,29,0.86))] px-4 py-2.5 text-center text-xs leading-tight text-slate-200 transition-all hover:-translate-y-0.5 hover:border-slate-500/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
