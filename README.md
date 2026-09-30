# Arc Intent Engine

Natural language onchain automation on Arc Mainnet. Write what you want in plain English. Arc executes it automatically.

| Resource | Link |
|---|---|
| Live Demo | https://arc-intent-engine.vercel.app |
| Backend API | https://arc-intent-engine-373439937684.europe-west1.run.app |
| Arc Explorer | https://explorer.arc.io |

## What is this?

Arc Intent Engine lets users and AI agents describe onchain actions in plain English. Gemini AI parses the intent, Arc Mainnet executes it automatically on a schedule or when conditions are met.

**Examples:**
- "Send 5 USDC to 0x... every week for 4 weeks"
- "Every day check if my balance is below 10 USDC, if so top up 20 USDC"
- "Transfer 1 USDC to 0x... every Monday for 8 weeks"

## Why Arc?

Three properties make this possible on Arc that no other chain offers together:

- **USDC as native gas** — no ETH, no volatility, predictable execution cost
- **Sub-second finality** — real-time condition checks, instant confirmations
- **Stable fees** — scheduling becomes economically viable at scale

## Architecture

```
User/Agent writes intent
      ↓
Gemini AI parses → structured intent (type, amount, recipient, schedule)
      ↓
x402 micropayment — 0.01 USDC service fee on Arc Mainnet
      ↓
Intent stored, scheduler monitors conditions every 60s
      ↓
Arc Mainnet execution via ethers.js
```

## Tech Stack

- **Backend:** Node.js + Express + TypeScript, deployed on GCP Cloud Run
- **Frontend:** Next.js, deployed on Vercel
- **AI:** Google Gemini 3.5 Flash for natural language parsing
- **Payment:** x402 Protocol — HTTP 402 micropayment flow
- **Chain:** Arc Mainnet (USDC native gas)

## API

### Health
```
GET /health
```

### Create Intent (x402 protected)
```
POST /api/v1/intent
x-payment-proof: <arc_mainnet_tx_hash>

{
  "raw_text": "Send 5 USDC to 0x... every week for 4 weeks",
  "owner": "0x..."
}
```

### List Intents
```
GET /api/v1/intents/:owner
```

## Environment Variables

```env
GEMINI_API_KEY=
ARC_RPC_URL=https://rpc.mainnet.arc.io
EXECUTOR_PRIVATE_KEY=
EXECUTOR_ADDRESS=
INTENT_FEE_RECIPIENT=
```

## Local Development

```bash
git clone https://github.com/forumevi/arc-intent-engine
cd arc-intent-engine
npm install
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

Built for the **Build with Gemini XPRIZE — Agentic Economy Prize** on Arc Mainnet.
