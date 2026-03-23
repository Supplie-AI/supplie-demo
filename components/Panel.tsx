'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useCallback, useState } from 'react';
import { ToolCallCard } from './ToolCallCard';

interface OutputFile {
  fileId: string;
  containerId?: string;
  name: string;
  provider: 'openai' | 'anthropic';
}

interface PanelProps {
  title: string;
  badge: string;
  badgeColor: 'amber' | 'teal';
  bgColor: string;
  borderColor: string;
  apiEndpoint: string;
  prompt: string | null;
  model: string;
  provider: 'openai' | 'anthropic';
  onClear: () => void;
  clearTrigger: number;
  onAuthError: () => void;
}

export function Panel({ title, badge, badgeColor, bgColor, borderColor, apiEndpoint, prompt, model, provider, clearTrigger, onAuthError }: PanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPromptRef = useRef<string | null>(null);
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);

  const getToken = () => (typeof window !== 'undefined' ? sessionStorage.getItem('demo_token') ?? '' : '');

  const { messages, append, setMessages, isLoading, error } = useChat({
    api: apiEndpoint,
    headers: { Authorization: `Bearer ${getToken()}` },
    body: { model, provider },
    onError: (err) => {
      const msg = err?.message ?? '';
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        sessionStorage.removeItem('demo_token');
        onAuthError();
      }
    },
  });

  useEffect(() => {
    if (clearTrigger > 0) {
      setMessages([]);
      setOutputFiles([]);
      lastPromptRef.current = null;
    }
  }, [clearTrigger, setMessages]);

  useEffect(() => {
    if (prompt && prompt !== lastPromptRef.current) {
      lastPromptRef.current = prompt;
      setOutputFiles([]);
      append({ role: 'user', content: prompt });
    }
  }, [prompt, append]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRetry = useCallback(() => {
    if (lastPromptRef.current) {
      append({ role: 'user', content: lastPromptRef.current });
    }
  }, [append]);

  const is429 = error?.message?.includes('429') || error?.message?.includes('Rate limit');
  const is401 = error?.message?.includes('401') || error?.message?.includes('Unauthorized');

  useEffect(() => {
    if (is429) {
      retryTimerRef.current = setTimeout(() => handleRetry(), 10000);
    }
    return () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); };
  }, [is429, handleRetry]);

  useEffect(() => {
    if (is401) {
      sessionStorage.removeItem('demo_token');
      onAuthError();
    }
  }, [is401, onAuthError]);

  const badgeStyles = {
    amber: 'bg-amber-900/40 text-amber-300 border border-amber-700/40',
    teal: 'bg-teal-900/40 text-teal-300 border border-teal-700/40',
  };

  const downloadFile = (f: OutputFile) => {
    const params = new URLSearchParams({ provider: f.provider, fileId: f.fileId });
    if (f.containerId) params.set('containerId', f.containerId);
    window.open(`/api/files/download?${params}`, '_blank');
  };

  return (
    <div className={`flex flex-col h-full border-r ${borderColor} overflow-hidden`} style={{ background: bgColor }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <span className="text-sm font-semibold text-slate-200">{title}</span>
        <span className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeStyles[badgeColor]}`}>{badge}</span>
        {isLoading && (
          <div className="ml-auto flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${badgeColor === 'teal' ? 'bg-teal-400' : 'bg-amber-400'} animate-bounce`} style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-600 text-sm text-center">
              Select a prompt above to begin<br />
              <span className="text-slate-700 text-xs">or type your own question</span>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {msg.role === 'user' && (
              <div className="flex justify-end">
                <div className="bg-slate-800/60 text-slate-200 text-sm rounded-lg px-3 py-2 max-w-xs">{msg.content}</div>
              </div>
            )}
            {msg.role === 'assistant' && (
              <div className="space-y-2">
                {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                  <div className="space-y-1">
                    {msg.toolInvocations.map((inv, i) => {
                      const result = 'result' in inv ? inv.result : undefined;
                      const hasError = result && typeof result === 'object' && 'error' in result;
                      return (
                        <ToolCallCard
                          key={inv.toolCallId}
                          toolName={inv.toolName}
                          args={inv.args}
                          result={result}
                          index={i}
                          hasError={!!hasError}
                        />
                      );
                    })}
                  </div>
                )}
                {msg.content && (
                  <div className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            )}
          </div>
        ))}

        {outputFiles.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Output files</div>
            {outputFiles.map((f, i) => (
              <button
                key={i}
                onClick={() => downloadFile(f)}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-slate-500/50 transition-all"
              >
                <span className="text-base">📄</span>
                <span className="text-sm text-slate-300 flex-1">{f.name}</span>
                <span className="text-xs text-slate-500">Generated by agent</span>
                <span className="text-xs text-teal-400 ml-2">Download ↓</span>
              </button>
            ))}
          </div>
        )}

        {error && !is429 && !is401 && badgeColor === 'amber' && (
          <div className="border border-amber-700/50 bg-amber-950/30 rounded-lg p-4 space-y-1">
            <div className="text-amber-400 text-sm font-semibold">⚠ Model Error</div>
            <div className="text-amber-200/80 text-sm">{error.message}</div>
            <div className="text-amber-600 text-xs mt-2 italic">This is what happens without grounding.</div>
          </div>
        )}
        {error && !is429 && !is401 && badgeColor === 'teal' && (
          <div className="flex items-center gap-2">
            <button onClick={handleRetry} className="text-xs text-teal-400 border border-teal-800/50 hover:border-teal-600/50 rounded-full px-3 py-1 transition-colors">
              ↺ Retry
            </button>
            <span className="text-slate-500 text-xs">{error.message}</span>
          </div>
        )}
        {is429 && (
          <div className="text-slate-400 text-xs animate-pulse">
            Rate limit — retrying in 10s…
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
