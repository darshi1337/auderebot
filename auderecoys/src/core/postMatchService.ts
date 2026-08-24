import type { EspnPostMatchData } from './espn.ts';
import { generatePostMatchTitle, formatPostMatchPost } from './formatter.ts';

export interface CheckAndPostPostMatchOptions {
  force?: boolean;
  targetSubreddit?: string;
  eventId?: string;
}

export interface CheckAndPostPostMatchResult {
  posted: boolean;
  message: string;
  postId?: string;
  fixture?: EspnPostMatchData;
}

/**
 * Executes the full evaluation and posting pipeline for Devvit Post-Match Threads.
 */
export async function checkAndPostPostMatchThread(
  options: CheckAndPostPostMatchOptions = {}
): Promise<CheckAndPostPostMatchResult> {
  const { reddit, redis } = await import('@devvit/web/server');
  const { fetchCompletedFixtureSummary } = await import('./espn.ts');

  const { force = false, targetSubreddit, eventId } = options;

  // 1. Fetch Completed Fixture Details from ESPN
  let postMatchData: EspnPostMatchData;
  try {
    postMatchData = await fetchCompletedFixtureSummary(eventId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      posted: false,
      message: `Failed to fetch completed fixture summary: ${msg}`,
    };
  }

  // 2. Check Redis for past posting deduplication
  const redisKey = `posted_postmatch:${postMatchData.eventId}`;
  let alreadyPosted = false;
  try {
    if (redis && postMatchData.eventId) {
      const val = await redis.get(redisKey);
      if (val) {
        alreadyPosted = true;
      }
    }
  } catch (err: unknown) {
    console.warn('Redis query failed, proceeding with evaluation:', err);
  }

  if (!force && alreadyPosted) {
    return {
      posted: false,
      message: `Post-match thread for event ID ${postMatchData.eventId} has already been posted.`,
      fixture: postMatchData,
    };
  }

  // 3. Resolve Target Subreddit
  let subredditName = targetSubreddit;
  if (!subredditName) {
    try {
      const currentSub = await reddit.getCurrentSubreddit();
      subredditName = currentSub.name;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        posted: false,
        message: `Could not resolve target subreddit: ${msg}`,
        fixture: postMatchData,
      };
    }
  }

  // 4. Format Title & Body and Submit Post
  const title = generatePostMatchTitle(postMatchData);
  const textBody = formatPostMatchPost(postMatchData);

  const post = await reddit.submitPost({
    subredditName: subredditName,
    title: title,
    text: textBody,
  });

  // 5. Sticky post if possible
  try {
    if (typeof post.sticky === 'function') {
      await post.sticky();
    }
  } catch (err: unknown) {
    console.warn(
      'Sticky post action failed or not supported in current environment:',
      err
    );
  }

  // 6. Save deduplication key in Redis (expires in 7 days = 604,800 seconds)
  try {
    if (redis && postMatchData.eventId) {
      await redis.set(redisKey, 'true');
      if (typeof redis.expire === 'function') {
        await redis.expire(redisKey, 7 * 24 * 60 * 60);
      }
    }
  } catch (err: unknown) {
    console.warn('Could not store deduplication key in Redis:', err);
  }

  return {
    posted: true,
    message: `Successfully posted Post-Match Thread for ${postMatchData.home_team} ${postMatchData.home_score} - ${postMatchData.away_score} ${postMatchData.away_team}!`,
    postId: post.id,
    fixture: postMatchData,
  };
}
