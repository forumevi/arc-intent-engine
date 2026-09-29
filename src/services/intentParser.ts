import { ParsedIntent, IntentType } from '../db/intents.js';

export interface ParseResult {
  type: IntentType;
  parsed: ParsedIntent;
  confidence: number;
  explanation: string;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.status === 503) {
      console.log(`[IntentParser] Gemini 503, retry ${attempt + 1}/3...`);
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

    const data: any = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  throw new Error('Gemini unavailable after 3 retries');
}

export async function parseIntent(
  rawText: string,
  ownerAddress: string
): Promise<ParseResult> {
  const prompt = `You are an onchain intent parser for Arc Mainnet (USDC-native blockchain).

Parse the following natural language instruction into a structured onchain intent.

User address: ${ownerAddress}
Instruction: "${rawText}"

Determine the intent type:
1. "scheduled_transfer" - periodic USDC transfers (daily, weekly, monthly, every X days)
2. "conditional_transfer" - trigger transfer when a balance condition is met

Return ONLY a JSON object with no markdown:
{
  "type": "scheduled_transfer" or "conditional_transfer",
  "confidence": <0.0-1.0>,
  "explanation": "<brief explanation of what you understood>",
  "parsed": {
    // For scheduled_transfer:
    "recipient": "<0x address or null>",
    "amount_usdc": <number>,
    "cron_expression": "<cron string e.g. 0 9 * * 1>",
    "schedule_description": "<human readable e.g. every Monday at 9am>",
    "max_executions": <number or null>,

    // For conditional_transfer:
    "condition_type": "balance_below" or "balance_above",
    "condition_threshold": <USDC amount>,
    "condition_wallet": "<address to monitor, default owner>",
    "action_amount": <USDC to send>,
    "action_recipient": "<0x address>"
  }
}

Rules:
- USDC amounts are always in dollars (e.g. "10 USDC" = 10.0)
- If no recipient is mentioned, set null
- If no max executions, set null
- For weekly = "0 9 * * 1", daily = "0 9 * * *", monthly = "0 9 1 * *"`;

  const rawResponse = await callGemini(prompt);
  console.log(`[IntentParser] Raw: ${rawResponse.slice(0, 300)}`);

  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Gemini response');

  const result = JSON.parse(jsonMatch[0]);

  return {
    type: result.type,
    parsed: result.parsed,
    confidence: result.confidence ?? 0.8,
    explanation: result.explanation ?? 'Intent parsed successfully',
  };
}
