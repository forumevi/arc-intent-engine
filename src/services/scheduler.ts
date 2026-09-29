import cron from 'node-cron';
import { getAllActiveIntents, Intent } from '../db/intents.js';
import { executeIntent } from './executor.js';

const scheduledJobs = new Map<string, cron.ScheduledTask>();

export function scheduleIntent(intent: Intent): void {
  if (intent.type !== 'scheduled_transfer') return;
  const expression = intent.parsed.cron_expression;
  if (!expression) return;

  if (!cron.validate(expression)) {
    console.warn(`[Scheduler] Invalid cron expression for intent ${intent.id}: ${expression}`);
    return;
  }

  // Cancel existing job if any
  cancelIntent(intent.id);

  const job = cron.schedule(expression, async () => {
    console.log(`[Scheduler] Cron triggered for intent ${intent.id}`);
    await executeIntent(intent);
  });

  scheduledJobs.set(intent.id, job);
  console.log(`[Scheduler] Scheduled intent ${intent.id}: ${expression} (${intent.parsed.schedule_description})`);
}

export function cancelIntent(intentId: string): void {
  const job = scheduledJobs.get(intentId);
  if (job) {
    job.stop();
    scheduledJobs.delete(intentId);
    console.log(`[Scheduler] Cancelled job for intent ${intentId}`);
  }
}

// Conditional intents: check every 60 seconds
export function startConditionalChecker(): void {
  cron.schedule('* * * * *', async () => {
    const activeIntents = getAllActiveIntents().filter(i => i.type === 'conditional_transfer');
    if (activeIntents.length === 0) return;

    console.log(`[Scheduler] Checking ${activeIntents.length} conditional intent(s)...`);
    for (const intent of activeIntents) {
      await executeIntent(intent);
    }
  });

  console.log('[Scheduler] Conditional checker started (every 60s)');
}

export function startScheduler(): void {
  // Load and schedule all existing active intents on startup
  const activeIntents = getAllActiveIntents().filter(i => i.type === 'scheduled_transfer');
  for (const intent of activeIntents) {
    scheduleIntent(intent);
  }

  startConditionalChecker();
  console.log('[Scheduler] Engine started');
}
