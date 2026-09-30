'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://arc-intent-engine-373439937684.europe-west1.run.app';

interface Intent {
  id: string;
  type: string;
  status: string;
  raw_text: string;
  parsed: Record<string, any>;
  created_at: string;
}

export default function Home() {
  const [text, setText] = useState('');
  const [wallet, setWallet] = useState('');
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'write' | 'pay' | 'done'>('write');
  const [pendingText, setPendingText] = useState('');

  const examples = [
    'Send 5 USDC to 0xF329bdaA805adAC4173AC49B621DB618A011d365 every week for 4 weeks',
    'Every day check if my balance is below 10 USDC, if so top up 20 USDC',
    'Transfer 1 USDC to 0xF329bdaA805adAC4173AC49B621DB618A011d365 every Monday for 8 weeks',
  ];

  useEffect(() => {
    if (wallet && /^0x[0-9a-fA-F]{40}$/.test(wallet)) fetchIntents();
  }, [wallet]);

  async function fetchIntents() {
    try {
      const res = await fetch(`${API_URL}/api/v1/intents/${wallet}`);
      if (res.ok) {
        const data = await res.json();
        setIntents(data.intents || []);
      }
    } catch {}
  }

  async function handleSubmit() {
    if (!text.trim()) return setError('Please write an intent.');
    if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) return setError('Enter a valid wallet address.');
    setError('');
    setLoading(true);
    setPendingText(text);

    try {
      const res = await fetch(`${API_URL}/api/v1/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, owner: wallet }),
      });

      if (res.status === 402) {
        const data = await res.json();
        setStep('pay');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create intent.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSuccess(`Intent created: ${data.intent?.explanation || 'Scheduled successfully.'}`);
      setText('');
      setStep('done');
      fetchIntents();
    } catch {
      setError('Connection error. Check backend.');
    }
    setLoading(false);
  }

  async function handlePayAndSubmit(txHash: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-payment-proof': txHash },
        body: JSON.stringify({ text: pendingText, owner: wallet }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Intent created: ${data.intent?.explanation || 'Scheduled.'}`);
        setText('');
        setStep('done');
        fetchIntents();
      } else {
        setError(data.error || 'Payment verification failed.');
        setStep('write');
      }
    } catch {
      setError('Connection error.');
      setStep('write');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #1a0533 50%, #0d1b3e 100%)', fontFamily: 'Inter, -apple-system, sans-serif', color: '#fff' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Arc Intent Engine</span>
          <span style={{ fontSize: 11, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 6, padding: '2px 8px', color: '#a78bfa' }}>v1.0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Arc Mainnet
          </span>
          <a href="https://github.com/forumevi/arc-intent-engine" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px' }}>GitHub</a>
        </div>
      </header>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '60px 24px 40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#c4b5fd', marginBottom: 24 }}>
          ⚡ Powered by Gemini AI · x402 Protocol · Arc Mainnet
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 16px', background: 'linear-gradient(135deg, #fff 0%, #a78bfa 50%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Say what you want.<br />Arc handles the rest.
        </h1>
        <p style={{ fontSize: 16, color: '#94a3b8', maxWidth: 480, margin: '0 auto 40px' }}>
          Write any USDC automation in plain English. AI parses it, Arc executes it automatically — scheduled or conditional.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          {[['⚡', '< 500ms', 'Finality on Arc'], ['🟢', 'USDC', 'Gas token'], ['🔒', '0.01 USDC', 'Per intent']].map(([icon, val, label]) => (
            <div key={val} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 24px', minWidth: 120, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{val}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Wallet Input */}
        <div style={{ marginBottom: 16 }}>
          <input
            value={wallet}
            onChange={e => setWallet(e.target.value)}
            placeholder="Your wallet address (0x...)"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {step === 'write' && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#64748b', textTransform: 'uppercase' }}>New Intent</span>
              <span style={{ fontSize: 11, color: '#7c3aed' }}>0.01 USDC · x402</span>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
              placeholder={'Send 5 USDC to 0x... every week for 4 weeks\nOr: Top up my wallet when balance drops below 10 USDC'}
              style={{ width: '100%', minHeight: 100, background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 15, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span style={{ fontSize: 11, color: '#475569' }}>⌘+Enter to submit</span>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', border: 'none', borderRadius: 10, padding: '10px 20px', color: '#fff', fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Processing...' : 'Parse Intent →'}
              </button>
            </div>
          </div>
        )}

        {step === 'pay' && (
          <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20, padding: 24, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>🔒 Payment Required (x402)</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 16px' }}>
              Send <strong style={{ color: '#a78bfa' }}>0.01 USDC</strong> to the address below on Arc Mainnet, then paste the transaction hash:
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#a78bfa', marginBottom: 16, wordBreak: 'break-all' }}>
              Recipient: 0x95773C1f40B82DD8D0529471f6A6016fdfE990Aa
            </div>
            <input
              placeholder="Transaction hash (0x...)"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box', marginBottom: 12, outline: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter') handlePayAndSubmit((e.target as HTMLInputElement).value); }}
              id="txHashInput"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('write')} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button
                onClick={() => handlePayAndSubmit((document.getElementById('txHashInput') as HTMLInputElement)?.value)}
                disabled={loading}
                style={{ flex: 2, background: 'linear-gradient(135deg, #7c3aed, #2563eb)', border: 'none', borderRadius: 10, padding: '10px', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                {loading ? 'Verifying...' : 'Verify & Create Intent →'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: 24, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <p style={{ color: '#10b981', fontWeight: 600, margin: '0 0 8px' }}>Intent created successfully!</p>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 16px' }}>{success}</p>
            <button onClick={() => { setStep('write'); setSuccess(''); }} style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', border: 'none', borderRadius: 10, padding: '10px 20px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Create Another Intent
            </button>
          </div>
        )}

        {/* Examples */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Examples</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {examples.map((ex, i) => (
              <button key={i} onClick={() => { setText(ex); setStep('write'); }}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 16px', color: '#94a3b8', fontSize: 13, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <span style={{ color: '#7c3aed', marginRight: 8 }}>{i + 1}.</span>{ex}
              </button>
            ))}
          </div>
        </div>

        {/* Active Intents */}
        {wallet && intents.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Active Intents</p>
              <button onClick={fetchIntents} style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>Refresh</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {intents.map(intent => (
                <div key={intent.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#e2e8f0', flex: 1, marginRight: 12 }}>{intent.raw_text}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: intent.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: intent.status === 'active' ? '#10b981' : '#64748b', whiteSpace: 'nowrap' }}>
                      {intent.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    {new Date(intent.created_at).toLocaleDateString()} · {intent.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {wallet && intents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
            <p style={{ margin: 0, fontSize: 14 }}>No intents yet. Create your first onchain automation.</p>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 48 }}>
          Built on Arc Mainnet · USDC native gas · Powered by Circle
        </p>
      </div>
    </div>
  );
}
