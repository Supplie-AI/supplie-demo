'use client';

import { useEffect, useState } from 'react';

export interface ModelOption {
  label: string;
  modelId: string;
  provider: 'openai' | 'anthropic';
  requiresKey?: boolean;
}

export const MODELS: ModelOption[] = [
  { label: 'GPT-5.4 mini — Fast', modelId: 'gpt-5.4-mini-2026-03-17', provider: 'openai' },
  { label: 'GPT-5.4 — Full', modelId: 'gpt-5.4', provider: 'openai' },
  { label: 'Claude Sonnet 4.6 ✦', modelId: 'claude-sonnet-4-5', provider: 'anthropic', requiresKey: true },
];

interface ModelPickerProps {
  value: string;
  onChange: (modelId: string, provider: 'openai' | 'anthropic') => void;
}

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  const [anthropicAvailable, setAnthropicAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => setAnthropicAvailable(d.anthropicAvailable ?? false))
      .catch(() => setAnthropicAvailable(false));
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Model:</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => {
            const m = MODELS.find(m => m.modelId === e.target.value)!;
            onChange(m.modelId, m.provider);
          }}
          className="text-xs bg-slate-800/60 text-slate-300 border border-slate-700/50 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-teal-600/50 cursor-pointer appearance-none"
        >
          {MODELS.map(m => (
            <option key={m.modelId} value={m.modelId}>
              {m.label}{m.requiresKey && anthropicAvailable === false ? ' [key needed]' : ''}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
