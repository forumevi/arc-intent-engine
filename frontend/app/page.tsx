'use client';

import { useState, useEffect, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://arc-intent-engine-373439937684.europe-west1.run.app';

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
  wallet_address: string;
}

const EXAMPLES = [
  'Send 5 USDC to 0xF329bdaA805adAC4173AC49B621DB618A011d365 every week for 4 weeks',
  'Every day check if my balance is below 10 USDC, if so top up 20 USDC',
  'Transfer 1 USDC to 0xF329bdaA805adAC4173AC49B621DB618A011d365 every Monday for 8 weeks',
];

const STATUS_COLOR: Record<string, string> = {
  active: '#22c55e',
  paused: '#f59e0b',
  completed: '#6366f1',
  failed: '#ef4444',
};

export default function Home() {
  const [input, setInput] = useState('');
  const [wallet, setWallet] = useState('');
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedIntent | null>(null);
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [error, setError] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (wallet) fetchIntents();
  }, [wallet]);

  async function fetchIntents() {
    if (!wallet) return;
    const res = await fetch(`${API_URL}/api/v1/intents?wallet=${wallet}`);
    const data = await res.json();
    setIntents(data.intents || []);
  }

  async function handleParse() {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_intent: input }),
      });
      const data = await res.json();
      if (data.parsed) {
        setParsed(data.parsed);
        setStep('confirm');
      } else {
        setError('Could not parse intent. Try rephrasing.');
      }
    } catch {
      setError('Connection error. Check backend.');
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!wallet) { setError('Enter your wallet address first.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/intents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_intent: input, wallet_address: wallet }),
      });
      const data = await res.json();
      if (data.intent) {
        setStep('success');
        fetchIntents();
        setTimeout(() => { setStep('input'); setInput(''); setParsed(null); }, 3000);
      }
    } catch {
      setError('Failed to create intent.');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 30%, #24243e 60%, #0f3460 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,80,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,200,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>Arc Intent Engine</span>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa' }}>v1.0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
            Arc Mainnet
          </div>
          <a href="https://github.com/forumevi/arc-intent-engine" target="_blank" rel="noreferrer"
            style={{ padding: '7px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', fontSize: '12px', textDecoration: 'none', cursor: 'pointer' }}>
            GitHub
          </a>
        </div>
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '30px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', fontSize: '12px', color: '#c4b5fd', marginBottom: '20px' }}>
            <span>⚡</span> Powered by Gemini AI · x402 Protocol · Arc Mainnet
          </div>
          <h1 style={{ fontSize: '44px', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '16px', background: 'linear-gradient(135deg, #fff 0%, #a78bfa 50%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Say what you want.<br />Arc handles the rest.
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' }}>
            Write any USDC automation in plain English. AI parses it, Arc executes it automatically — scheduled or conditional.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {[
            { label: 'Finality', value: '< 500ms', icon: '⚡' },
            { label: 'Gas token', value: 'USDC', icon: '💵' },
            { label: 'Service fee', value: '0.01 USDC', icon: '🔒' },
          ].map(s => (
            <div key={s.label} style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div style={{ borderRadius: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', overflow: 'hidden', marginBottom: '24px' }}>

          {step === 'success' ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>Intent Created!</div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Your automation is now active on Arc Mainnet.</div>
            </div>
          ) : step === 'confirm' && parsed ? (
            <div style={{ padding: '28px' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Review Intent</div>
              <div style={{ borderRadius: '14px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#c4b5fd', marginBottom: '8px' }}>Parsed by Gemini AI</div>
                {Object.entries(parsed).filter(([,v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{String(v)}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <input
                  value={wallet}
                  onChange={e => setWallet(e.target.value)}
                  placeholder="Your wallet address (0x...)"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setStep('input'); setParsed(null); }}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                  ← Back
                </button>
                <button onClick={handleCreate} disabled={loading}
                  style={{ flex: 2, padding: '12px', borderRadius: '12px', background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #2563eb)', border: 'none', color: '#fff', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                  {loading ? 'Creating...' : 'Confirm & Activate ⚡'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Intent</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>0.01 USDC · x402</span>
              </div>
              <textarea
                ref={textRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse(); }}
                placeholder={'Send 5 USDC to 0x... every week for 4 weeks\n\nOr: Top up my wallet when balance drops below 10 USDC'}
                rows={4}
                style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '15px', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              {error && <div style={{ color: '#f87171', fontSize: '13px', margin: '8px 0' }}>{error}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '12px', color: '#475569' }}>⌘+Enter to submit</span>
                <button onClick={handleParse} disabled={loading || !input.trim()}
                  style={{ padding: '10px 20px', borderRadius: '12px', background: input.trim() ? 'linear-gradient(135deg, #7c3aed, #2563eb)' : 'rgba(255,255,255,0.06)', border: 'none', color: input.trim() ? '#fff' : '#475569', fontSize: '13px', cursor: input.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, transition: 'all 0.2s' }}>
                  {loading ? 'Parsing...' : 'Parse Intent →'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Examples */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Examples</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => { setInput(ex); textRef.current?.focus(); }}
                style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8', fontSize: '13px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1.5 }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(124,58,237,0.1)'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.3)'; (e.target as HTMLButtonElement).style.color = '#c4b5fd'; }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.target as HTMLButtonElement).style.color = '#94a3b8'; }}>
                <span style={{ color: '#7c3aed', fontWeight: 700, marginRight: '8px' }}>{i + 1}.</span>{ex}
              </button>
            ))}
          </div>
        </div>

        {/* Active intents */}
        {intents.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Active Intents</span>
              <button onClick={fetchIntents} style={{ fontSize: '12px', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>Refresh</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {intents.map(intent => (
                <div key={intent.id} style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.4, flex: 1, marginRight: '12px' }}>{intent.raw}</span>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: `${STATUS_COLOR[intent.status]}20`, color: STATUS_COLOR[intent.status], border: `1px solid ${STATUS_COLOR[intent.status]}40`, whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {intent.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#475569' }}>
                    <span>Executions: <b style={{ color: '#94a3b8' }}>{intent.execution_count}</b></span>
                    <span>Created: <b style={{ color: '#94a3b8' }}>{new Date(intent.created_at).toLocaleDateString()}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '48px', fontSize: '12px', color: '#334155' }}>
          Built on Arc Mainnet · USDC native gas · Powered by Circle
        </div>
      </main>
    </div>
  );
}
