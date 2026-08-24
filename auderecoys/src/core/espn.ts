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

export interface TeamStatsComparison {
  home_team: string;
  away_team: string;
  home_rank: number;
  away_rank: number;
  home_points: number;
  away_points: number;
  home_gpg: string;
  away_gpg: string;
  home_gapg: string;
  away_gapg: string;
  home_ppg: string;
  away_ppg: string;
  home_win_pct: string;
  away_win_pct: string;
  home_gd: string;
  away_gd: string;
}

export interface EspnFixtureData {
  eventId: string;
  home_team: string;
  home_team_id: string;
  home_logo?: string | undefined;
  away_team: string;
  away_team_id: string;
  away_logo?: string | undefined;
  home_form?: string | undefined;
  away_form?: string | undefined;
  competition: string;
  date: string;
  kickoff_timestamp?: number | undefined;
  venue: string;
  venue_capacity?: number | undefined;
  venue_city?: string | undefined;
  kickoff_gmt: string;
  tv_channels: string[];
  officials?: string[] | undefined;
}

export interface PostMatchGoal {
  time: string;
  teamName: string;
  scorer: string;
  assist?: string | undefined;
  text?: string | undefined;
}

export interface PostMatchStats {
  possession: [string, string];
  totalShots: [string, string];
  shotsOnTarget: [string, string];
  passPct: [string, string];
  corners: [string, string];
  fouls: [string, string];
  yellowCards: [string, string];
  redCards: [string, string];
  saves: [string, string];
}

export interface PostMatchRoster {
  teamName: string;
  formation?: string | undefined;
  starters: string[];
}

export interface EspnPostMatchData {
  eventId: string;
  home_team: string;
  home_team_id: string;
  home_logo?: string | undefined;
  home_score: string;
  away_team: string;
  away_team_id: string;
  away_logo?: string | undefined;
  away_score: string;
  competition: string;
  date: string;
  venue: string;
  venue_city?: string | undefined;
  attendance?: number | undefined;
  referee?: string | undefined;
  goals: PostMatchGoal[];
  stats?: PostMatchStats | undefined;
  rosters?: PostMatchRoster[] | undefined;
}

interface EspnLogo {
  href?: string;
}

interface EspnCompetitor {
  homeAway?: string;
  team?: {
    id?: string;
    displayName?: string;
    name?: string;
    abbreviation?: string;
    logos?: EspnLogo[];
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
  displayValue?: string;
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
  const espnUrl =
    'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/367';
  const response = await fetch(espnUrl);

  if (!response.ok) {
    throw new Error(
      `ESPN Team API returned ${response.status} ${response.statusText}`
    );
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

  const homeComp = comp?.competitors?.find(
    (c: EspnCompetitor) => c.homeAway === 'home'
  );
  const awayComp = comp?.competitors?.find(
    (c: EspnCompetitor) => c.homeAway === 'away'
  );

  const tvChannels: string[] =
    comp?.broadcasts
      ?.map((b: EspnBroadcast) => b.media?.shortName)
      .filter(Boolean) || [];

  const officials: string[] =
    comp?.officials
      ?.map((off: EspnOfficial) => {
        const pos = off.position?.name || off.role || 'Official';
        return `${off.fullName || off.displayName} (${pos})`;
      })
      .filter(Boolean) || [];

  const homeLogo = homeComp?.team?.logos?.[0]?.href;
  const awayLogo = awayComp?.team?.logos?.[0]?.href;
  const venueCap = comp?.venue?.capacity
    ? Number(comp.venue.capacity)
    : undefined;
  const venueCity = comp?.venue?.address?.city || comp?.venue?.city;

  const result: EspnFixtureData = {
    eventId: String(nextEvent.id || ''),
    home_team: homeComp?.team?.displayName || 'Home Team',
    home_team_id: homeComp?.team?.id || '',
    home_logo: homeLogo,
    away_team: awayComp?.team?.displayName || 'Away Team',
    away_team_id: awayComp?.team?.id || '',
    away_logo: awayLogo,
    competition:
      nextEvent.league?.name || comp?.league?.name || 'Premier League',
    date: dateStr,
    kickoff_timestamp: dateObj.getTime(),
    venue: comp?.venue?.fullName || 'TBD',
    venue_capacity: venueCap,
    venue_city: venueCity,
    kickoff_gmt: kickoff,
    tv_channels: tvChannels.length > 0 ? tvChannels : ['Sky Sports', 'Peacock'],
  };

  if (homeComp?.form) result.home_form = homeComp.form;
  if (awayComp?.form) result.away_form = awayComp.form;
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

        const homeComp =
          ev.competitors.find((c: EspnCompetitor) => c.homeAway === 'home') ||
          ev.competitors[0];
        const awayComp =
          ev.competitors.find((c: EspnCompetitor) => c.homeAway === 'away') ||
          ev.competitors[1];

        const dateStr = ev.date
          ? new Date(ev.date).toISOString().split('T')[0]
          : '';
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

async function fetchStandingsForSeason(
  seasonYear: number
): Promise<StandingsRow[]> {
  const url = `https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings?season=${seasonYear}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    const entries: EspnStandingEntry[] =
      json.children?.[0]?.standings?.entries || [];

    return entries
      .map((entry) => {
        const statsMap = new Map<string, EspnStat>();
        (entry.stats || []).forEach((s) => {
          statsMap.set(s.name || s.type || '', s);
        });

        const getStatVal = (name: string, fallbackName?: string): number => {
          const item =
            statsMap.get(name) ||
            (fallbackName ? statsMap.get(fallbackName) : undefined);
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
      })
      .sort((a: StandingsRow, b: StandingsRow) => a.rank - b.rank);
  } catch (err) {
    console.error('Failed to fetch standings:', err);
    return [];
  }
}

/**
 * Fetches latest team news articles from ESPN API.
 */
export async function fetchTeamNews(
  teamId: string = '367'
): Promise<NewsArticle[]> {
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
      const webUrl =
        art.links?.web?.href ||
        (articleId
          ? `https://www.espn.com/soccer/story/_/id/${articleId}`
          : '');

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

/**
 * Builds a team statistics comparison object between home and away teams from standings data.
 */
export function buildTeamStatsComparison(
  homeTeamName: string,
  awayTeamName: string,
  standings: StandingsRow[]
): TeamStatsComparison | undefined {
  const homeRow = standings.find((s) =>
    s.teamName.toLowerCase().includes(homeTeamName.toLowerCase())
  );
  const awayRow = standings.find((s) =>
    s.teamName.toLowerCase().includes(awayTeamName.toLowerCase())
  );

  if (!homeRow || !awayRow) return undefined;

  const calcGpg = (row: StandingsRow) =>
    row.gamesPlayed > 0 ? (row.goalsFor / row.gamesPlayed).toFixed(2) : '0.00';
  const calcGapg = (row: StandingsRow) =>
    row.gamesPlayed > 0
      ? (row.goalsAgainst / row.gamesPlayed).toFixed(2)
      : '0.00';
  const calcPpg = (row: StandingsRow) =>
    row.gamesPlayed > 0 ? (row.points / row.gamesPlayed).toFixed(2) : '0.00';
  const calcWinPct = (row: StandingsRow) =>
    row.gamesPlayed > 0
      ? `${((row.wins / row.gamesPlayed) * 100).toFixed(1)}%`
      : '0.0%';
  const formatGd = (gd: number) => (gd > 0 ? `+${gd}` : `${gd}`);

  return {
    home_team: homeRow.teamName,
    away_team: awayRow.teamName,
    home_rank: homeRow.rank,
    away_rank: awayRow.rank,
    home_points: homeRow.points,
    away_points: awayRow.points,
    home_gpg: calcGpg(homeRow),
    away_gpg: calcGpg(awayRow),
    home_gapg: calcGapg(homeRow),
    away_gapg: calcGapg(awayRow),
    home_ppg: calcPpg(homeRow),
    away_ppg: calcPpg(awayRow),
    home_win_pct: calcWinPct(homeRow),
    away_win_pct: calcWinPct(awayRow),
    home_gd: formatGd(homeRow.goalDifference),
    away_gd: formatGd(awayRow.goalDifference),
  };
}

interface EspnKeyEvent {
  id?: string;
  type?: { id?: string; text?: string; type?: string };
  clock?: { displayValue?: string };
  scoringPlay?: boolean;
  text?: string;
  shortText?: string;
  team?: { id?: string; displayName?: string };
  participants?: Array<{ athlete?: { id?: string; displayName?: string } }>;
}

interface EspnTeamBoxscore {
  homeAway?: string;
  team?: { id?: string; displayName?: string };
  statistics?: EspnStat[];
}

interface EspnRosterPlayer {
  starter?: boolean;
  athlete?: { displayName?: string };
  position?: { abbreviation?: string };
}

interface EspnTeamRoster {
  team?: { displayName?: string };
  formation?: string;
  roster?: EspnRosterPlayer[];
}

interface EspnScheduleEvent {
  id?: string;
  competitions?: Array<{
    status?: {
      type?: {
        completed?: boolean;
        state?: string;
      };
    };
  }>;
}

/**
 * Fetches the last completed match summary for Tottenham Hotspur (ESPN team ID 367)
 * or for a specific event ID.
 */
export async function fetchCompletedFixtureSummary(
  specificEventId?: string
): Promise<EspnPostMatchData> {
  let eventId = specificEventId;

  if (!eventId) {
    const scheduleUrl =
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/367/schedule';
    const scheduleRes = await fetch(scheduleUrl);
    if (!scheduleRes.ok) {
      throw new Error(
        `ESPN Schedule API returned ${scheduleRes.status} ${scheduleRes.statusText}`
      );
    }
    const scheduleData = await scheduleRes.json();
    const events: EspnScheduleEvent[] = scheduleData.events || [];
    const completedEvents = events.filter(
      (e) =>
        e.competitions?.[0]?.status?.type?.completed ||
        e.competitions?.[0]?.status?.type?.state === 'post'
    );
    const lastCompleted = completedEvents[completedEvents.length - 1];

    if (!lastCompleted || !lastCompleted.id) {
      throw new Error('No recent completed fixture found in schedule.');
    }
    eventId = String(lastCompleted.id);
  }

  const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=${eventId}`;
  const res = await fetch(summaryUrl);
  if (!res.ok) {
    throw new Error(
      `ESPN Summary API returned ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();
  const comp = data.header?.competitions?.[0];
  if (!comp) {
    throw new Error(
      'Invalid ESPN summary payload: missing competition header.'
    );
  }

  const homeComp = comp.competitors?.find(
    (c: EspnCompetitor) => c.homeAway === 'home'
  );
  const awayComp = comp.competitors?.find(
    (c: EspnCompetitor) => c.homeAway === 'away'
  );

  const homeTeamName = homeComp?.team?.displayName || 'Home Team';
  const awayTeamName = awayComp?.team?.displayName || 'Away Team';
  const homeScore = String(homeComp?.score ?? '0');
  const awayScore = String(awayComp?.score ?? '0');

  const dateObj = new Date(comp.date || Date.now());
  const dateStr = dateObj.toISOString().split('T')[0] || '';

  const venueName =
    data.gameInfo?.venue?.fullName || comp.venue?.fullName || 'TBD';
  const venueCity =
    data.gameInfo?.venue?.address?.city || comp.venue?.address?.city;
  const attendance = data.gameInfo?.attendance
    ? Number(data.gameInfo.attendance)
    : undefined;
  const referee =
    data.gameInfo?.officials?.[0]?.fullName ||
    data.gameInfo?.officials?.[0]?.displayName;

  // Goals
  const keyEvents: EspnKeyEvent[] = data.keyEvents || [];
  const goals: PostMatchGoal[] = keyEvents
    .filter(
      (k) => k.type?.text?.toLowerCase().includes('goal') || k.scoringPlay
    )
    .map((k) => {
      const teamId = String(k.team?.id || '');
      const teamName =
        k.team?.displayName ||
        (teamId === String(homeComp?.team?.id) ? homeTeamName : awayTeamName);
      const scorer =
        k.participants?.[0]?.athlete?.displayName || k.shortText || 'Goal';
      const assist = k.participants?.[1]?.athlete?.displayName;
      return {
        time: k.clock?.displayValue || '',
        teamName,
        scorer,
        assist,
        text: k.text,
      };
    });

  // Stats
  const boxscoreTeams: EspnTeamBoxscore[] = data.boxscore?.teams || [];
  const homeStats: EspnStat[] =
    boxscoreTeams.find((t) => t.homeAway === 'home')?.statistics || [];
  const awayStats: EspnStat[] =
    boxscoreTeams.find((t) => t.homeAway === 'away')?.statistics || [];

  const getStatVal = (teamStatsArr: EspnStat[], statName: string): string => {
    const item = teamStatsArr.find((s) => s.name === statName);
    return item ? String(item.displayValue ?? item.value ?? '-') : '-';
  };

  const formatPct = (val: string): string => {
    if (val === '-') return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (num <= 1) return `${(num * 100).toFixed(0)}%`;
    return `${num.toFixed(1)}%`;
  };

  const stats: PostMatchStats = {
    possession: [
      formatPct(getStatVal(homeStats, 'possessionPct')),
      formatPct(getStatVal(awayStats, 'possessionPct')),
    ],
    totalShots: [
      getStatVal(homeStats, 'totalShots'),
      getStatVal(awayStats, 'totalShots'),
    ],
    shotsOnTarget: [
      getStatVal(homeStats, 'shotsOnTarget'),
      getStatVal(awayStats, 'shotsOnTarget'),
    ],
    passPct: [
      formatPct(getStatVal(homeStats, 'passPct')),
      formatPct(getStatVal(awayStats, 'passPct')),
    ],
    corners: [
      getStatVal(homeStats, 'wonCorners'),
      getStatVal(awayStats, 'wonCorners'),
    ],
    fouls: [
      getStatVal(homeStats, 'foulsCommitted'),
      getStatVal(awayStats, 'foulsCommitted'),
    ],
    yellowCards: [
      getStatVal(homeStats, 'yellowCards'),
      getStatVal(awayStats, 'yellowCards'),
    ],
    redCards: [
      getStatVal(homeStats, 'redCards'),
      getStatVal(awayStats, 'redCards'),
    ],
    saves: [getStatVal(homeStats, 'saves'), getStatVal(awayStats, 'saves')],
  };

  // Rosters
  const rawRosters: EspnTeamRoster[] = data.rosters || [];
  const rosters: PostMatchRoster[] = rawRosters.map((r) => {
    const starters = (r.roster || [])
      .filter((p) => p.starter)
      .map(
        (p) =>
          `${p.athlete?.displayName || 'Player'} (${p.position?.abbreviation || ''})`
      );
    return {
      teamName: r.team?.displayName || 'Team',
      formation: r.formation,
      starters,
    };
  });

  return {
    eventId,
    home_team: homeTeamName,
    home_team_id: String(homeComp?.team?.id || ''),
    home_logo: homeComp?.team?.logos?.[0]?.href,
    home_score: homeScore,
    away_team: awayTeamName,
    away_team_id: String(awayComp?.team?.id || ''),
    away_logo: awayComp?.team?.logos?.[0]?.href,
    away_score: awayScore,
    competition: comp.league?.name || 'Premier League',
    date: dateStr,
    venue: venueName,
    venue_city: venueCity,
    attendance,
    referee,
    goals,
    stats,
    rosters,
  };
}
