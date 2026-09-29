'use client';

import { useState, useEffect, useRef } from 'react';

interface ParsedIntent {
  type: string;
  recipient?: string;
  amount_usdc?: number;
  condition?: string;
  schedule?: string;
  duration_weeks?: number;
}

interface Intent {
  id: string;
  raw: string;
  parsed: ParsedIntent;
  status: string;
  created_at: string;
  execution_count: number;
  next_execution?: string;
}

const EXAMPLES = [
  'Send 5 USDC to 0xF329bdaA805adAC4173AC49B621DB618A011d365 every week for 4 weeks',
  'Every day check if my balance is below 10 USDC, if so send 20 USDC to 0xF329bdaA805adAC4173AC49B621DB618A011d365',
  'Transfer 1 USDC to 0xF329bdaA805adAC4173AC49B621DB618A011d365 every Monday for 8 weeks',
];

const TYPE_ICONS: Record<string, string> = {
  scheduled_transfer: '⏰',
  conditional_transfer: '⚡',
  unknown: '?',
};

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-400',
  paused: 'bg-amber-400',
  completed: 'bg-sky-400',
  failed: 'bg-red-400',
  pending_payment: 'bg-orange-400',
};

function TerminalLine({ text, delay = 0 }: { text: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={`font-mono text-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {text}
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState('');
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Intent | null>(null);
  const [parseLog, setParseLog] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadIntents = async () => {
    try {
      const res = await fetch('/api/intents');
      const data = await res.json();
      setIntents(data.intents || []);
    } catch {}
  };

  useEffect(() => { loadIntents(); }, []);

  const simulateParseLog = (intent: Intent) => {
    const logs = [
      `> Parsing natural language input...`,
      `> Type detected: ${intent.parsed.type}`,
      intent.parsed.amount_usdc ? `> Amount: ${intent.parsed.amount_usdc} USDC` : `> Amount: analyzing...`,
      intent.parsed.schedule ? `> Schedule: ${intent.parsed.schedule}` : '',
      intent.parsed.condition ? `> Condition: ${intent.parsed.condition}` : '',
      intent.parsed.recipient ? `> Recipient: ${intent.parsed.recipient.slice(0, 20)}...` : '',
      `> Intent registered on Arc Mainnet`,
      `> ID: ${intent.id.slice(0, 16)}...`,
      `> Status: ${intent.status} ✓`,
    ].filter(Boolean);
    setParseLog([]);
    logs.forEach((log, i) => {
      setTimeout(() => setParseLog(prev => [...prev, log]), i * 180);
    });
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setPreview(null);
    setParseLog([]);

    try {
      const res = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: input }),
      });

      if (res.status === 402) {
        const data = await res.json();
        setError(`Payment required: Send ${data.amount_usdc} USDC to ${data.recipient}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      setIntents(prev => [data, ...prev]);
      setPreview(data);
      simulateParseLog(data);
      setInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pauseResume = async (id: string, status: string) => {
    const action = status === 'active' ? 'pause' : 'resume';
    await fetch(`/api/intent/${id}/${action}`, { method: 'POST' });
    loadIntents();
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-gray-900 font-sans">

      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xs font-mono font-bold">AI</span>
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">Arc Intent Engine</span>
          <span className="text-gray-400 text-sm hidden sm:block">— natural language onchain automation</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
          Arc Mainnet
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-10">

        {/* Hero */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 leading-tight">
            Program money<br />
            <span className="text-gray-400">in plain English.</span>
          </h1>
          <p className="text-gray-500 text-base">
            Describe what you want. Arc Intent Engine parses it with AI and executes it onchain — every time, on schedule, automatically.
          </p>
        </div>

        {/* Steps */}
        <div className="flex gap-6 text-sm">
          {[
            { icon: '✍️', label: 'Write in English' },
            { icon: '🤖', label: 'AI parses it' },
            { icon: '⚡', label: 'Executes on Arc' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-gray-500">
              <span>{s.icon}</span>
              <span>{s.label}</span>
              {i < 2 && <span className="text-gray-300 ml-2">→</span>}
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={4}
              className="w-full border border-gray-300 rounded-xl bg-white px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none shadow-sm transition"
              placeholder="Send 5 USDC to 0x... every week for 4 weeks"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(); }}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-300">⌘↵</div>
          </div>

          {/* Example pills */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => { setInput(ex); textareaRef.current?.focus(); }}
                className="text-xs border border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50 text-gray-600 rounded-full px-3 py-1 transition-colors"
              >
                {ex.slice(0, 42)}…
              </button>
            ))}
          </div>

          {error && (
            <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl py-3 font-semibold text-sm transition-colors shadow-sm"
          >
            {loading ? 'Analyzing intent...' : 'Create Intent →'}
          </button>
        </div>

        {/* Terminal parse log */}
        {parseLog.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-5 space-y-1 border border-gray-800">
            <div className="text-gray-500 text-xs font-mono mb-3">// arc-intent-engine parse log</div>
            {parseLog.map((line, i) => (
              <TerminalLine
                key={i}
                text={line}
                delay={0}
              />
            ))}
            {preview && (
              <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-3">
                {[
                  { k: 'type', v: `${TYPE_ICONS[preview.parsed.type] ?? '?'} ${preview.parsed.type}` },
                  { k: 'amount', v: `${preview.parsed.amount_usdc ?? '—'} USDC` },
                  { k: 'schedule', v: preview.parsed.schedule ?? preview.parsed.condition ?? '—' },
                  { k: 'status', v: preview.status },
                ].map(row => (
                  <div key={row.k} className="font-mono text-xs">
                    <span className="text-gray-500">{row.k}: </span>
                    <span className="text-emerald-400">{row.v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Intent list */}
        {intents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">Your Intents</h2>
              <button onClick={loadIntents} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Refresh
              </button>
            </div>
            {intents.map(intent => (
              <div key={intent.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-gray-800 text-sm flex-1 leading-relaxed">"{intent.raw}"</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[intent.status] ?? 'bg-gray-400'}`}></span>
                    <span className="text-xs text-gray-500">{intent.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{TYPE_ICONS[intent.parsed.type] ?? '?'} {intent.parsed.type}</span>
                  <span>{intent.parsed.amount_usdc ?? '—'} USDC</span>
                  <span>{intent.execution_count}x executed</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => pauseResume(intent.id, intent.status)}
                    className="text-xs border border-gray-200 hover:border-gray-400 text-gray-600 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {intent.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                  {intent.parsed.recipient && (
                    <a
                      href={`https://explorer.arc.io/address/${intent.parsed.recipient}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs border border-gray-200 hover:border-gray-400 text-gray-600 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Arc Explorer ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="text-xs text-gray-400 pt-4 border-t border-gray-200">
          Arc Intent Engine · Arc Mainnet · Gemini AI · x402 Protocol
        </footer>
      </main>
    </div>
  );
}
