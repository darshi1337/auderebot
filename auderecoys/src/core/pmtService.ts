import type {
  EspnFixtureData,
  StandingsRow,
  NewsArticle,
  H2HRecord,
} from './espn';
import type { MatchData } from './formatter';

export interface EvaluationResult {
  shouldPost: boolean;
  reason: string;
  hoursUntilKickoff?: number;
}

export interface CheckAndPostOptions {
  force?: boolean;
  targetSubreddit?: string;
  currentTime?: number;
  hoursWindow?: number;
}

export interface CheckAndPostResult {
  posted: boolean;
  message: string;
  postId?: string;
  fixture?: EspnFixtureData;
}

/**
 * Evaluates whether a Pre-Match Thread should be posted based on the 21-hour window and deduplication status.
 */
export function shouldPostPreMatchThread(
  fixture: EspnFixtureData,
  alreadyPosted: boolean,
  hoursWindow: number = 21,
  currentTime: number = Date.now()
): EvaluationResult {
  if (alreadyPosted) {
    return {
      shouldPost: false,
      reason: `Pre-match thread for event ID ${fixture.eventId} has already been posted.`,
    };
  }

  const kickoffMs =
    fixture.kickoff_timestamp ??
    (fixture.date ? new Date(fixture.date).getTime() : 0);
  if (!kickoffMs) {
    return {
      shouldPost: true,
      reason: 'No kickoff timestamp available, proceeding with post.',
    };
  }

  const msRemaining = kickoffMs - currentTime;
  const hoursRemaining = msRemaining / (1000 * 60 * 60);

  if (hoursRemaining > hoursWindow) {
    return {
      shouldPost: false,
      reason: `Kickoff is in ${hoursRemaining.toFixed(1)} hours (scheduled trigger window is <= ${hoursWindow} hours).`,
      hoursUntilKickoff: hoursRemaining,
    };
  }

  if (hoursRemaining < -4) {
    return {
      shouldPost: false,
      reason: `Match kickoff passed ${Math.abs(hoursRemaining).toFixed(1)} hours ago.`,
      hoursUntilKickoff: hoursRemaining,
    };
  }

  return {
    shouldPost: true,
    reason: `Fixture is within the ${hoursWindow}-hour window (${hoursRemaining.toFixed(1)} hours until kickoff).`,
    hoursUntilKickoff: hoursRemaining,
  };
}

/**
 * Executes the full evaluation and posting pipeline for Devvit Pre-Match Threads.
 */
export async function checkAndPostPreMatchThread(
  options: CheckAndPostOptions = {}
): Promise<CheckAndPostResult> {
  const { reddit, redis } = await import('@devvit/web/server');
  const {
    fetchNextFixture,
    fetchStandings,
    fetchTeamNews,
    fetchHeadToHead,
    buildTeamStatsComparison,
  } = await import('./espn');
  const { formatPost, generateTitle } = await import('./formatter');

  const {
    force = false,
    targetSubreddit,
    currentTime = Date.now(),
    hoursWindow = 21,
  } = options;

  // 1. Fetch Fixture Details from ESPN
  let fixtureData: EspnFixtureData;
  try {
    fixtureData = await fetchNextFixture();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      posted: false,
      message: `Failed to fetch next fixture: ${msg}`,
    };
  }

  // 2. Check Redis for past posting deduplication
  const redisKey = `posted_pmt:${fixtureData.eventId}`;
  let alreadyPosted = false;
  try {
    if (redis && fixtureData.eventId) {
      const val = await redis.get(redisKey);
      if (val) {
        alreadyPosted = true;
      }
    }
  } catch (err: unknown) {
    console.warn('Redis query failed, proceeding with evaluation:', err);
  }

  // 3. Evaluate timing unless force option is set
  const evaluation = shouldPostPreMatchThread(
    fixtureData,
    alreadyPosted,
    hoursWindow,
    currentTime
  );
  if (!force && !evaluation.shouldPost) {
    return {
      posted: false,
      message: evaluation.reason,
      fixture: fixtureData,
    };
  }

  // 4. Resolve Target Subreddit
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
        fixture: fixtureData,
      };
    }
  }

  // 5. Search recent subreddit posts from last 5 days for custom news/lineups
  let customNews: string | undefined;
  let predictedLineup: string | undefined;

  try {
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
    const fiveDaysAgo = new Date(currentTime - FIVE_DAYS_MS);

    const recentPosts = await reddit
      .getNewPosts({
        subredditName: subredditName,
        limit: 30,
      })
      .all();

    const postsLast5Days = recentPosts.filter((p) => {
      const postDate = p.createdAt ? new Date(p.createdAt) : new Date();
      return postDate >= fiveDaysAgo;
    });

    const newsPosts = postsLast5Days.filter((p) => {
      const flairText = (p.flair?.text || '').toLowerCase();
      const titleText = (p.title || '').toLowerCase();
      return (
        flairText.includes('team news') ||
        titleText.includes('team news') ||
        titleText.includes('[team news]')
      );
    });

    if (newsPosts.length > 0) {
      customNews = newsPosts
        .map((p) => {
          const bodyText =
            p.body && p.body.trim().length > 0 ? `\n  ${p.body.trim()}` : '';
          return `* [**${p.title}**](${p.url})${bodyText}`;
        })
        .join('\n\n');
    }

    const lineupPost = postsLast5Days.find((p) => {
      const flairText = (p.flair?.text || '').toLowerCase();
      const titleText = (p.title || '').toLowerCase();
      return (
        flairText.includes('lineup') ||
        titleText.includes('lineup') ||
        titleText.includes('[lineup]')
      );
    });

    if (lineupPost && lineupPost.body && lineupPost.body.trim().length > 0) {
      predictedLineup = lineupPost.body.trim();
    }
  } catch (err: unknown) {
    console.warn('Could not search recent subreddit posts:', err);
  }

  // 6. Fetch Standings, Team News, Head-to-Head
  let standingsData: StandingsRow[] = [];
  try {
    standingsData = await fetchStandings();
  } catch (err: unknown) {
    console.warn('Could not fetch standings:', err);
  }

  let teamNewsArticles: NewsArticle[] = [];
  if (!customNews) {
    try {
      teamNewsArticles = await fetchTeamNews('367');
    } catch (err: unknown) {
      console.warn('Could not fetch team news:', err);
    }
  }

  let headToHeadRecords: H2HRecord[] = [];
  if (fixtureData.eventId) {
    try {
      headToHeadRecords = await fetchHeadToHead(fixtureData.eventId);
    } catch (err: unknown) {
      console.warn('Could not fetch head to head:', err);
    }
  }

  // 7. Generate Match Facts
  const matchFacts: string[] = [];
  const spursStanding = standingsData.find(
    (s) =>
      s.teamName.toLowerCase().includes('tottenham') ||
      s.teamName.toLowerCase().includes('spurs')
  );
  const opponentStanding = standingsData.find(
    (s) =>
      s.teamName.toLowerCase().includes(fixtureData.away_team.toLowerCase()) ||
      s.teamName.toLowerCase().includes(fixtureData.home_team.toLowerCase())
  );

  if (headToHeadRecords.length > 0) {
    const lastMatch = headToHeadRecords[0];
    if (lastMatch) {
      matchFacts.push(
        `Last historical meeting: ${lastMatch.home_team} ${lastMatch.score} ${lastMatch.away_team} on ${lastMatch.date}.`
      );
      matchFacts.push(
        `Total historical encounters tracked: ${headToHeadRecords.length} recent match-ups.`
      );
    }
  }

  if (spursStanding) {
    matchFacts.push(
      `Tottenham Hotspur season record: ${spursStanding.wins}W - ${spursStanding.draws}D - ${spursStanding.losses}L (${spursStanding.points} pts).`
    );
  }
  if (opponentStanding) {
    matchFacts.push(
      `${opponentStanding.teamName} currently rank #${opponentStanding.rank} with ${opponentStanding.points} points.`
    );
  }

  const teamStats = buildTeamStatsComparison(
    fixtureData.home_team,
    fixtureData.away_team,
    standingsData
  );

  // 8. Format Match Data & Post
  const matchData: MatchData = {
    home_team: fixtureData.home_team,
    home_logo: fixtureData.home_logo,
    away_team: fixtureData.away_team,
    away_logo: fixtureData.away_logo,
    competition: fixtureData.competition,
    date: fixtureData.date,
    venue: fixtureData.venue,
    venue_capacity: fixtureData.venue_capacity,
    venue_city: fixtureData.venue_city,
    kickoff_gmt: fixtureData.kickoff_gmt,
    tv_channels: fixtureData.tv_channels || [],
    officials: fixtureData.officials,
    home_form: fixtureData.home_form,
    away_form: fixtureData.away_form,
    team_stats: teamStats,
    standings: standingsData,
    team_news_articles: teamNewsArticles,
    custom_team_news: customNews,
    predicted_lineup: predictedLineup,
    head_to_head: headToHeadRecords,
    match_facts: matchFacts,
  };

  const title = generateTitle(matchData);
  const textBody = formatPost(matchData);

  const post = await reddit.submitPost({
    subredditName: subredditName,
    title: title,
    text: textBody,
  });

  // 9. Sticky post if possible
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

  // 10. Save deduplication key in Redis (expires in 7 days = 604,800 seconds)
  try {
    if (redis && fixtureData.eventId) {
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
    message: `Successfully posted Pre-Match Thread for ${fixtureData.home_team} vs ${fixtureData.away_team}!`,
    postId: post.id,
    fixture: fixtureData,
  };
}
