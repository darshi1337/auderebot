import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import type { MatchData } from '../core/formatter';

export const menu = new Hono();

menu.post('/auderebot-test', async (c) => {
  try {
    const { reddit } = await import('@devvit/web/server');
    const { formatPost, generateTitle } = await import('../core/formatter');
    const { fetchNextFixture, fetchStandings, fetchTeamNews, fetchHeadToHead } = await import('../core/espn');

    const currentSubreddit = await reddit.getCurrentSubreddit();

    // 0. Search subreddit posts from the last 5 days with 'Team News' flair or tag!
    let customNews: string | undefined;
    let predictedLineup: string | undefined;

    try {
      const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
      const fiveDaysAgo = new Date(Date.now() - FIVE_DAYS_MS);

      const recentPosts = await reddit.getNewPosts({
        subredditName: currentSubreddit.name,
        limit: 30,
      }).all();

      // Filter posts created within the last 5 days
      const postsLast5Days = recentPosts.filter(p => {
        const postDate = p.createdAt ? new Date(p.createdAt) : new Date();
        return postDate >= fiveDaysAgo;
      });

      // Find all posts matching 'Team News' flair or title tag from last 5 days
      const newsPosts = postsLast5Days.filter(p => {
        const flairText = (p.flair?.text || '').toLowerCase();
        const titleText = (p.title || '').toLowerCase();
        return flairText.includes('team news') || titleText.includes('team news') || titleText.includes('[team news]');
      });

      if (newsPosts.length > 0) {
        customNews = newsPosts.map(p => {
          const bodyText = p.body && p.body.trim().length > 0 ? `\n  ${p.body.trim()}` : '';
          return `* [**${p.title}**](${p.url})${bodyText}`;
        }).join('\n\n');
      }

      // Find posts with 'Lineup' flair or tag from last 5 days
      const lineupPost = postsLast5Days.find(p => {
        const flairText = (p.flair?.text || '').toLowerCase();
        const titleText = (p.title || '').toLowerCase();
        return flairText.includes('lineup') || titleText.includes('lineup') || titleText.includes('[lineup]');
      });

      if (lineupPost && lineupPost.body && lineupPost.body.trim().length > 0) {
        predictedLineup = lineupPost.body.trim();
      }
    } catch (e: any) {
      console.warn('Could not search recent subreddit posts:', e.message);
    }

    // 1. Fetch Fixture Details from ESPN
    let fixtureData: any = {};
    try {
      fixtureData = await fetchNextFixture();
    } catch (e: any) {
      console.warn('Could not fetch live fixture:', e.message);
      fixtureData = {
        eventId: '',
        home_team: 'Tottenham Hotspur',
        away_team: 'Opponent',
        competition: 'Premier League',
        date: new Date().toISOString().split('T')[0],
        venue: 'Tottenham Hotspur Stadium',
        kickoff_gmt: '15:00 GMT',
        tv_channels: ['Sky Sports', 'Peacock'],
      };
    }

    // 2. Fetch Standings Table from ESPN
    let standingsData: any[] = [];
    try {
      standingsData = await fetchStandings();
    } catch (e: any) {
      console.warn('Could not fetch standings:', e.message);
    }

    // 3. Fetch Latest Team News from ESPN API (if no custom team news posts from last 5 days)
    let teamNewsArticles: any[] = [];
    if (!customNews) {
      try {
        teamNewsArticles = await fetchTeamNews('367');
      } catch (e: any) {
        console.warn('Could not fetch team news:', e.message);
      }
    }

    // 4. Fetch Historical Head-to-Head Records
    let headToHeadRecords: any[] = [];
    if (fixtureData.eventId) {
      try {
        headToHeadRecords = await fetchHeadToHead(fixtureData.eventId);
      } catch (e: any) {
        console.warn('Could not fetch head to head:', e.message);
      }
    }

    // 5. Generate Match Facts
    const matchFacts: string[] = [];
    const spursStanding = standingsData.find(s => 
      s.teamName.toLowerCase().includes('tottenham') || s.teamName.toLowerCase().includes('spurs')
    );
    const opponentStanding = standingsData.find(s => 
      s.teamName.toLowerCase().includes(fixtureData.away_team.toLowerCase()) ||
      s.teamName.toLowerCase().includes(fixtureData.home_team.toLowerCase())
    );

    if (headToHeadRecords.length > 0) {
      const lastMatch = headToHeadRecords[0];
      matchFacts.push(`Last historical meeting: ${lastMatch.home_team} ${lastMatch.score} ${lastMatch.away_team} on ${lastMatch.date}.`);
      matchFacts.push(`Total historical encounters tracked: ${headToHeadRecords.length} recent match-ups.`);
    }

    if (spursStanding) {
      matchFacts.push(`Tottenham Hotspur season record: ${spursStanding.wins}W - ${spursStanding.draws}D - ${spursStanding.losses}L (${spursStanding.points} pts).`);
    }
    if (opponentStanding) {
      matchFacts.push(`${opponentStanding.teamName} currently rank #${opponentStanding.rank} with ${opponentStanding.points} points.`);
    }

    matchFacts.push(`Kickoff scheduled for ${fixtureData.kickoff_gmt} at ${fixtureData.venue}.`);

    // 6. Construct Match Data Object
    const matchData: MatchData = {
      home_team: fixtureData.home_team,
      away_team: fixtureData.away_team,
      competition: fixtureData.competition,
      date: fixtureData.date,
      venue: fixtureData.venue,
      kickoff_gmt: fixtureData.kickoff_gmt,
      tv_channels: fixtureData.tv_channels || [],
      officials: fixtureData.officials,
      home_form: fixtureData.home_form,
      away_form: fixtureData.away_form,
      odds: fixtureData.odds,
      standings: standingsData,
      team_news_articles: teamNewsArticles,
      custom_team_news: customNews,
      predicted_lineup: predictedLineup,
      head_to_head: headToHeadRecords,
      match_facts: matchFacts,
    };

    // 7. Generate Title and Body
    const title = generateTitle(matchData);
    const textBody = formatPost(matchData);

    // 8. Post to Subreddit
    const post = await reddit.submitPost({
      subredditName: currentSubreddit.name,
      title: title,
      text: textBody,
    });

    return c.json<UiResponse>(
      {
        showToast: {
          text: `Pre-match thread posted! ID: ${post.id}`,
        },
      },
      200
    );
  } catch (err: any) {
    console.error('Error posting thread:', err);
    return c.json<UiResponse>(
      {
        showToast: {
          text: `Failed to post thread: ${err?.message || err}`,
        },
      },
      500
    );
  }
});
