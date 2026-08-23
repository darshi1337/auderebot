import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import { checkAndPostPreMatchThread } from '../core/pmtService';

export const scheduler = new Hono();

scheduler.post('/auto-post-pmt', async (c) => {
  console.log('[Scheduler] Running automated pre-match thread check (21-hour window)...');

  try {
    const result = await checkAndPostPreMatchThread({
      force: false,
      hoursWindow: 21,
    });

    console.log('[Scheduler] Result:', result.message);

    return c.json<TaskResponse>(
      {},
      200
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Scheduler] Error executing auto-post-pmt task:', msg);

    return c.json<TaskResponse>(
      {},
      500
    );
  }
});
