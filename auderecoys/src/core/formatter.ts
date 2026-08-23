import { StandingsRow, NewsArticle, H2HRecord, TeamStatsComparison } from './espn';

export interface MatchData {
  home_team: string;
  away_team: string;
  competition: string;
  date: string;
  venue: string;
  kickoff_gmt: string;
  tv_channels: string[];
  officials?: string[] | undefined;
  home_form?: string | undefined;
  away_form?: string | undefined;
  team_stats?: TeamStatsComparison | undefined;
  standings?: StandingsRow[] | undefined;
  team_news_articles?: NewsArticle[] | undefined;
  custom_team_news?: string | undefined;
  predicted_lineup?: string | undefined;
  head_to_head?: H2HRecord[] | undefined;
  match_facts?: string[] | undefined;
}

export function generateTitle(data: MatchData): string {
  return `[Pre-Match Thread] ${data.home_team} vs ${data.away_team} (${data.date})`;
}

/**
 * Formats match data into structured r/coys markdown.
 */
export function formatPost(data: MatchData): string {
  let post = '';

  // 1. Header & Match Info
  post += `# ${data.home_team} vs ${data.away_team}\n\n`;
  post += `* **Competition:** ${data.competition}\n`;
  post += `* **Date:** ${data.date}\n`;
  post += `* **Venue:** ${data.venue}\n`;
  post += `* **Kickoff:** ${data.kickoff_gmt}\n`;

  const tvStr = data.tv_channels.length === 0
    ? 'Check local listings'
    : data.tv_channels.join(', ');
  post += `* **TV:** ${tvStr}\n`;

  if (data.officials && data.officials.length > 0) {
    post += `* **Match Officials:** ${data.officials.join(', ')}\n`;
  }

  post += '\n';

  // 2. Recent Form
  if (data.home_form || data.away_form) {
    post += '## Recent Form\n\n';
    if (data.home_form) {
      post += `* **${data.home_team}:** \`${formatFormString(data.home_form)}\`\n`;
    }
    if (data.away_form) {
      post += `* **${data.away_team}:** \`${formatFormString(data.away_form)}\`\n`;
    }
    post += '\n';
  }

  // 3. Team Statistics Comparison
  if (data.team_stats) {
    const s = data.team_stats;
    post += '## 📊 Team Statistics Comparison\n\n';
    post += `| Metric | ${s.home_team} | ${s.away_team} |\n`;
    post += '|:---|:---:|:---:|\n';
    post += `| **League Rank** | #${s.home_rank} | #${s.away_rank} |\n`;
    post += `| **Points (PPG)** | ${s.home_points} (${s.home_ppg}) | ${s.away_points} (${s.away_ppg}) |\n`;
    post += `| **Goals Scored / Game** | ${s.home_gpg} | ${s.away_gpg} |\n`;
    post += `| **Goals Conceded / Game** | ${s.home_gapg} | ${s.away_gapg} |\n`;
    post += `| **Goal Difference** | ${s.home_gd} | ${s.away_gd} |\n`;
    post += `| **Win Rate** | ${s.home_win_pct} | ${s.away_win_pct} |\n\n`;
  }

  // 3. League Standings Context
  if (data.standings && data.standings.length > 0) {
    post += '## League Standings Context\n\n';
    post += '| # | Team | GP | W | D | L | GF | GA | GD | Pts |\n';
    post += '|---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|\n';

    for (const row of data.standings) {
      const isSpurs = row.teamName.toLowerCase().includes('tottenham') || row.teamName.toLowerCase().includes('spurs');
      const isOpponent = row.teamName.toLowerCase().includes(data.home_team.toLowerCase()) || 
                         row.teamName.toLowerCase().includes(data.away_team.toLowerCase());

      const teamFormatted = (isSpurs || isOpponent) ? `**${row.teamName}**` : row.teamName;
      const rankFormatted = (isSpurs || isOpponent) ? `**${row.rank}**` : `${row.rank}`;
      const ptsFormatted = (isSpurs || isOpponent) ? `**${row.points}**` : `${row.points}`;
      const gdFormatted = row.goalDifference > 0 ? `+${row.goalDifference}` : `${row.goalDifference}`;

      post += `| ${rankFormatted} | ${teamFormatted} | ${row.gamesPlayed} | ${row.wins} | ${row.draws} | ${row.losses} | ${row.goalsFor} | ${row.goalsAgainst} | ${gdFormatted} | ${ptsFormatted} |\n`;
    }
    post += '\n';
  }

  // 4. Team News & Latest Updates
  if (data.custom_team_news && data.custom_team_news.trim().length > 0) {
    post += '## Team News & Latest Updates\n\n';
    post += `${data.custom_team_news.trim()}\n\n`;
  } else if (data.team_news_articles && data.team_news_articles.length > 0) {
    post += '## Team News & Latest Updates\n\n';
    for (const article of data.team_news_articles) {
      if (article.url) {
        post += `* [**${article.headline}**](${article.url})\n`;
      } else {
        post += `* **${article.headline}**\n`;
      }

      if (article.description) {
        post += `  ${article.description}\n\n`;
      } else {
        post += '\n';
      }
    }
    post += '\n';
  }

  // 5. Predicted Lineup & Squad Notes
  if (data.predicted_lineup && data.predicted_lineup.trim().length > 0) {
    post += '## Predicted Lineup & Squad Notes\n\n';
    post += `${data.predicted_lineup.trim()}\n\n`;
  }

  // 6. Head-to-Head History
  if (data.head_to_head && data.head_to_head.length > 0) {
    post += '## Head-to-Head History\n\n';
    for (const record of data.head_to_head) {
      post += `* ${record.date} (${record.competition}): ${record.home_team} ${record.score} ${record.away_team}\n`;
    }
    post += '\n';
  }

  // 7. Match Facts
  if (data.match_facts && data.match_facts.length > 0) {
    post += '## Match Facts\n\n';
    for (const fact of data.match_facts) {
      post += `* ${fact}\n`;
    }
    post += '\n';
  }

  post += '**COYS!**\n';

  return post;
}

function formatFormString(form: string): string {
  return form.split('').join(' - ');
}
