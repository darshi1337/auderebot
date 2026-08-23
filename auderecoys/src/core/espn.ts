export interface StandingsRow {
  rank: number;
  teamId: string;
  teamName: string;
  abbreviation: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  published: string;
  url: string;
  paragraphs?: string[] | undefined;
}

export interface H2HRecord {
  date: string;
  competition: string;
  home_team: string;
  score: string;
  away_team: string;
}

export interface EspnFixtureData {
  eventId: string;
  home_team: string;
  home_team_id: string;
  away_team: string;
  away_team_id: string;
  home_form?: string | undefined;
  away_form?: string | undefined;
  competition: string;
  date: string;
  kickoff_timestamp?: number | undefined;
  venue: string;
  kickoff_gmt: string;
  tv_channels: string[];
  officials?: string[] | undefined;
  odds?: string | undefined;
}

interface EspnCompetitor {
  homeAway?: string;
  team?: {
    id?: string;
    displayName?: string;
    name?: string;
    abbreviation?: string;
  };
  form?: string;
  score?: string | number;
}

interface EspnBroadcast {
  media?: {
    shortName?: string;
  };
}

interface EspnOfficial {
  fullName?: string;
  displayName?: string;
  position?: {
    name?: string;
  };
  role?: string;
}

interface EspnStat {
  name?: string;
  type?: string;
  value?: number | string;
}

interface EspnStandingEntry {
  team?: {
    id?: string;
    displayName?: string;
    name?: string;
    abbreviation?: string;
  };
  stats?: EspnStat[];
}

interface EspnArticle {
  id?: string | number;
  headline?: string;
  description?: string;
  published?: string;
  links?: {
    web?: {
      href?: string;
    };
  };
}

/**
 * Fetches the next fixture for Tottenham Hotspur (ESPN team ID 367)
 */
export async function fetchNextFixture(): Promise<EspnFixtureData> {
  const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/367';
  const response = await fetch(espnUrl);

  if (!response.ok) {
    throw new Error(`ESPN Team API returned ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const nextEvent = data.team?.nextEvent?.[0];

  if (!nextEvent) {
    throw new Error('No upcoming fixture event returned from ESPN API.');
  }

  const comp = nextEvent.competitions?.[0];
  const dateObj = new Date(nextEvent.date || Date.now());
  const dateStr = dateObj.toISOString().split('T')[0] || '';
  const kickoff = `${dateObj.getUTCHours().toString().padStart(2, '0')}:${dateObj.getUTCMinutes().toString().padStart(2, '0')} GMT`;

  const homeComp = comp?.competitors?.find((c: EspnCompetitor) => c.homeAway === 'home');
  const awayComp = comp?.competitors?.find((c: EspnCompetitor) => c.homeAway === 'away');

  const tvChannels: string[] = comp?.broadcasts?.map((b: EspnBroadcast) => b.media?.shortName).filter(Boolean) || [];

  const officials: string[] = comp?.officials?.map((off: EspnOfficial) => {
    const pos = off.position?.name || off.role || 'Official';
    return `${off.fullName || off.displayName} (${pos})`;
  }).filter(Boolean) || [];

  let oddsStr: string | undefined;
  if (comp?.odds && comp.odds.length > 0) {
    const primaryOdds = comp.odds[0];
    if (primaryOdds.details) {
      oddsStr = primaryOdds.details;
    } else if (primaryOdds.summary) {
      oddsStr = primaryOdds.summary;
    }
  }

  const result: EspnFixtureData = {
    eventId: String(nextEvent.id || ''),
    home_team: homeComp?.team?.displayName || 'Home Team',
    home_team_id: homeComp?.team?.id || '',
    away_team: awayComp?.team?.displayName || 'Away Team',
    away_team_id: awayComp?.team?.id || '',
    competition: nextEvent.league?.name || comp?.league?.name || 'Premier League',
    date: dateStr,
    kickoff_timestamp: dateObj.getTime(),
    venue: comp?.venue?.fullName || 'TBD',
    kickoff_gmt: kickoff,
    tv_channels: tvChannels.length > 0 ? tvChannels : ['Sky Sports', 'Peacock'],
  };

  if (homeComp?.form) result.home_form = homeComp.form;
  if (awayComp?.form) result.away_form = awayComp.form;
  if (oddsStr) result.odds = oddsStr;
  if (officials.length > 0) result.officials = officials;

  return result;
}

/**
 * Fetches historical Head-to-Head records from ESPN match summary endpoint.
 */
export async function fetchHeadToHead(eventId: string): Promise<H2HRecord[]> {
  if (!eventId) return [];

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=${eventId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    const seasonSeries = json.seasonseries || [];
    const records: H2HRecord[] = [];

    for (const series of seasonSeries) {
      const events = series.events || [];
      for (const ev of events) {
        if (!ev.competitors || ev.competitors.length < 2) continue;

        const homeComp = ev.competitors.find((c: EspnCompetitor) => c.homeAway === 'home') || ev.competitors[0];
        const awayComp = ev.competitors.find((c: EspnCompetitor) => c.homeAway === 'away') || ev.competitors[1];

        const dateStr = ev.date ? new Date(ev.date).toISOString().split('T')[0] : '';
        const homeName = homeComp.team?.displayName || 'Home Team';
        const awayName = awayComp.team?.displayName || 'Away Team';
        const homeScore = homeComp.score ?? '0';
        const awayScore = awayComp.score ?? '0';

        records.push({
          date: dateStr || '',
          competition: ev.competitionName || 'Premier League',
          home_team: homeName,
          score: `${homeScore}-${awayScore}`,
          away_team: awayName,
        });
      }
    }

    return records.slice(0, 5);
  } catch (err) {
    console.error('Failed to fetch head to head:', err);
    return [];
  }
}

/**
 * Fetches Premier League standings table from ESPN.
 */
export async function fetchStandings(): Promise<StandingsRow[]> {
  const currentYear = new Date().getFullYear();
  const yearsToTry = [currentYear, currentYear - 1, currentYear - 2];

  for (const year of yearsToTry) {
    const rows = await fetchStandingsForSeason(year);
    if (rows && rows.length > 0) {
      return rows;
    }
  }

  return [];
}

async function fetchStandingsForSeason(seasonYear: number): Promise<StandingsRow[]> {
  const url = `https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings?season=${seasonYear}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    const entries: EspnStandingEntry[] = json.children?.[0]?.standings?.entries || [];

    return entries.map((entry) => {
      const statsMap = new Map<string, EspnStat>();
      (entry.stats || []).forEach((s) => {
        statsMap.set(s.name || s.type || '', s);
      });

      const getStatVal = (name: string, fallbackName?: string): number => {
        const item = statsMap.get(name) || (fallbackName ? statsMap.get(fallbackName) : undefined);
        return item ? Number(item.value) : 0;
      };

      return {
        rank: getStatVal('rank'),
        teamId: entry.team?.id || '',
        teamName: entry.team?.displayName || entry.team?.name || 'Unknown',
        abbreviation: entry.team?.abbreviation || '',
        gamesPlayed: getStatVal('gamesPlayed'),
        wins: getStatVal('wins'),
        draws: getStatVal('ties'),
        losses: getStatVal('losses'),
        goalsFor: getStatVal('pointsFor'),
        goalsAgainst: getStatVal('pointsAgainst'),
        goalDifference: getStatVal('pointDifferential'),
        points: getStatVal('points'),
      };
    }).sort((a: StandingsRow, b: StandingsRow) => a.rank - b.rank);
  } catch (err) {
    console.error('Failed to fetch standings:', err);
    return [];
  }
}

/**
 * Fetches latest team news articles from ESPN API.
 */
export async function fetchTeamNews(teamId: string = '367'): Promise<NewsArticle[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?team=${teamId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    const articles: EspnArticle[] = json.articles || [];

    return articles.slice(0, 5).map((art) => {
      const articleId = String(art.id || '');
      const headline = art.headline || '';
      const description = art.description || '';
      const webUrl = art.links?.web?.href || (articleId ? `https://www.espn.com/soccer/story/_/id/${articleId}` : '');

      return {
        id: articleId,
        headline,
        description,
        published: art.published || '',
        url: webUrl,
      };
    });
  } catch (err) {
    console.error('Failed to fetch team news:', err);
    return [];
  }
}
