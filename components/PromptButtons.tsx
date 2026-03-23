"use client";

interface PromptButtonsProps {
  onPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const PROMPTS = [
  "What's the net margin on last week's Suspension King orders after freight and rebates?",
  "Which SKUs are at risk of stockout in the next 30 days?",
  "Which supplier is causing the most margin leakage?",
];

export function PromptButtons({ onPrompt, disabled }: PromptButtonsProps) {
  return (
    <div className="flex gap-2 px-4 py-2 border-b border-white/5">
      {PROMPTS.map((prompt, i) => (
        <button
          key={i}
          onClick={() => onPrompt(prompt)}
          disabled={disabled}
          className="flex-1 text-xs text-slate-300 bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-500/60 rounded-full px-3 py-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center leading-tight"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
