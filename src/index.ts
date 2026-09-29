import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { x402Middleware } from './middleware/x402.js';
import { parseIntent } from './services/intentParser.js';
import { getUSDCBalance } from './services/executor.js';
import { scheduleIntent, startScheduler } from './services/scheduler.js';
import {
  createIntent,
  getIntent,
  getIntentsByOwner,
  updateIntent,
  getAllActiveIntents,
} from './db/intents.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Arc Intent Engine',
    version: '1.0.0',
    active_intents: getAllActiveIntents().length,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/intent — Parse + create intent (x402 protected)
app.post('/api/v1/intent', x402Middleware, async (req: Request, res: Response) => {
  try {
    const { text, owner } = req.body;

    if (!text || !owner) {
      return res.status(400).json({ error: 'Missing required fields: text, owner' });
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) {
      return res.status(400).json({ error: 'Invalid owner address' });
    }

    console.log(`[API] Parsing intent for ${owner}: "${text}"`);
    const parseResult = await parseIntent(text, owner);

    if (parseResult.confidence < 0.5) {
      return res.status(422).json({
        error: 'Could not parse intent with sufficient confidence',
        confidence: parseResult.confidence,
        explanation: parseResult.explanation,
      });
    }

    const intent = createIntent(owner, text, parseResult.parsed, parseResult.type);

    // Schedule if it's a scheduled transfer
    if (intent.type === 'scheduled_transfer') {
      scheduleIntent(intent);
    }

    return res.json({
      success: true,
      payment_info: (req as any).paymentInfo,
      intent: {
        id: intent.id,
        type: intent.type,
        status: intent.status,
        raw_text: intent.raw_text,
        parsed: intent.parsed,
        explanation: parseResult.explanation,
        confidence: parseResult.confidence,
        created_at: intent.created_at,
      },
    });
  } catch (err: any) {
    console.error('[API] Intent creation error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/intents/:owner — List intents for a wallet
app.get('/api/v1/intents/:owner', (req: Request, res: Response) => {
  const { owner } = req.params;
  if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) {
    return res.status(400).json({ error: 'Invalid owner address' });
  }
  const intents = getIntentsByOwner(owner);
  return res.json({ success: true, intents });
});

// GET /api/v1/intent/:id — Get single intent
app.get('/api/v1/intent/:id', (req: Request, res: Response) => {
  const intent = getIntent(req.params.id);
  if (!intent) return res.status(404).json({ error: 'Intent not found' });
  return res.json({ success: true, intent });
});

// DELETE /api/v1/intent/:id — Pause/cancel intent
app.delete('/api/v1/intent/:id', (req: Request, res: Response) => {
  const intent = getIntent(req.params.id);
  if (!intent) return res.status(404).json({ error: 'Intent not found' });
  const updated = updateIntent(req.params.id, { status: 'paused' });
  return res.json({ success: true, intent: updated });
});

// GET /api/v1/balance/:address — Check USDC balance
app.get('/api/v1/balance/:address', async (req: Request, res: Response) => {
  try {
    const balance = await getUSDCBalance(req.params.address);
    return res.json({ success: true, address: req.params.address, balance_usdc: balance });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Start server + scheduler
app.listen(PORT, () => {
  console.log(`🚀 Arc Intent Engine running on port ${PORT}`);
  startScheduler();
});
