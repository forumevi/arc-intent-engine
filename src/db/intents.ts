import { v4 as uuidv4 } from 'uuid';

export type IntentType = 'scheduled_transfer' | 'conditional_transfer';
export type IntentStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface Intent {
  id: string;
  owner: string;           // wallet address of intent creator
  type: IntentType;
  raw_text: string;        // original natural language input
  parsed: ParsedIntent;
  status: IntentStatus;
  created_at: number;
  last_executed?: number;
  execution_count: number;
  tx_hashes: string[];
}

export interface ParsedIntent {
  // Scheduled transfer fields
  recipient?: string;
  amount_usdc?: number;
  cron_expression?: string;  // e.g. "0 9 * * 1" = every Monday 9am
  schedule_description?: string;  // human readable: "every week"

  // Conditional transfer fields
  condition_type?: 'balance_below' | 'balance_above';
  condition_threshold?: number;   // USDC amount
  condition_wallet?: string;      // wallet to monitor (defaults to owner)
  action_amount?: number;         // amount to send when triggered
  action_recipient?: string;

  // Shared
  max_executions?: number;        // null = unlimited
  expiry?: number;                // unix timestamp
}

// In-memory store (production: use PostgreSQL/Redis)
const intentStore = new Map<string, Intent>();

export function createIntent(
  owner: string,
  raw_text: string,
  parsed: ParsedIntent,
  type: IntentType
): Intent {
  const intent: Intent = {
    id: uuidv4(),
    owner,
    type,
    raw_text,
    parsed,
    status: 'active',
    created_at: Date.now(),
    execution_count: 0,
    tx_hashes: [],
  };
  intentStore.set(intent.id, intent);
  console.log(`[IntentDB] Created intent ${intent.id} for ${owner}: "${raw_text}"`);
  return intent;
}

export function getIntent(id: string): Intent | undefined {
  return intentStore.get(id);
}

export function getIntentsByOwner(owner: string): Intent[] {
  return Array.from(intentStore.values()).filter(
    i => i.owner.toLowerCase() === owner.toLowerCase()
  );
}

export function getAllActiveIntents(): Intent[] {
  return Array.from(intentStore.values()).filter(i => i.status === 'active');
}

export function updateIntent(id: string, updates: Partial<Intent>): Intent | null {
  const intent = intentStore.get(id);
  if (!intent) return null;
  const updated = { ...intent, ...updates };
  intentStore.set(id, updated);
  return updated;
}

export function recordExecution(id: string, txHash: string): Intent | null {
  const intent = intentStore.get(id);
  if (!intent) return null;
  const updated: Intent = {
    ...intent,
    last_executed: Date.now(),
    execution_count: intent.execution_count + 1,
    tx_hashes: [...intent.tx_hashes, txHash],
  };
  if (updated.parsed.max_executions && updated.execution_count >= updated.parsed.max_executions) {
    updated.status = 'completed';
  }
  intentStore.set(id, updated);
  return updated;
}
