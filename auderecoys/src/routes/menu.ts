import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { checkAndPostPreMatchThread } from '../core/pmtService';

export const menu = new Hono();

menu.post('/auderebot-test', async (c) => {
  try {
    const result = await checkAndPostPreMatchThread({ force: true });

    if (result.posted) {
      return c.json<UiResponse>(
        {
          showToast: {
            text: `Pre-match thread posted! ID: ${result.postId || 'OK'}`,
          },
        },
        200
      );
    } else {
      return c.json<UiResponse>(
        {
          showToast: {
            text: `Could not post thread: ${result.message}`,
          },
        },
        400
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in manual menu posting:', msg);
    return c.json<UiResponse>(
      {
        showToast: {
          text: `Failed to post thread: ${msg}`,
        },
      },
      500
    );
  }
});
