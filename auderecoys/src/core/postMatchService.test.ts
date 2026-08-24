import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generatePostMatchTitle, formatPostMatchPost } from './formatter.ts';
import type { PostMatchData } from './formatter.ts';

void describe('Post-Match Thread Formatter', () => {
  const sampleData: PostMatchData = {
    eventId: '401879321',
    home_team: 'Brentford',
    home_team_id: '337',
    home_score: '3',
    away_team: 'Tottenham Hotspur',
    away_team_id: '367',
    away_score: '0',
    competition: 'English Premier League',
    date: '2026-08-22',
    venue: 'Gtech Community Stadium',
    venue_city: 'Brentford',
    attendance: 17180,
    referee: 'Michael Oliver',
    goals: [
      {
        time: "12'",
        teamName: 'Brentford',
        scorer: 'Keane Lewis-Potter',
        assist: 'Mamadou Sangare',
      },
      {
        time: "33'",
        teamName: 'Brentford',
        scorer: 'Vitaly Janelt',
      },
      {
        time: "49'",
        teamName: 'Brentford',
        scorer: 'Michael Kayode',
      },
    ],
    stats: {
      possession: ['41.1%', '58.9%'],
      totalShots: ['26', '9'],
      shotsOnTarget: ['8', '4'],
      passPct: ['80%', '90%'],
      corners: ['7', '3'],
      fouls: ['17', '14'],
      yellowCards: ['1', '1'],
      redCards: ['0', '0'],
      saves: ['4', '5'],
    },
    rosters: [
      {
        teamName: 'Brentford',
        formation: '4-2-3-1',
        starters: [
          'Caoimhín Kelleher (G)',
          'Keane Lewis-Potter (LB)',
          'Vitaly Janelt (RM)',
        ],
      },
      {
        teamName: 'Tottenham Hotspur',
        formation: '4-2-3-1',
        starters: [
          'Antonín Kinsky (G)',
          'Richarlison (F)',
          'Mikey Moore (AM-R)',
        ],
      },
    ],
  };

  void it('should generate standard post-match thread title', () => {
    const title = generatePostMatchTitle(sampleData);
    assert.equal(
      title,
      '[POST-MATCH THREAD] Brentford 3 - 0 Tottenham Hotspur'
    );
  });

  void it('should format complete post-match thread markdown containing score, goals, stats, and lineups', () => {
    const markdown = formatPostMatchPost(sampleData);

    // Header & Info
    assert.ok(markdown.includes('Brentford 3 - 0 Tottenham Hotspur'));
    assert.ok(markdown.includes('English Premier League'));
    assert.ok(markdown.includes('Gtech Community Stadium, Brentford'));
    assert.ok(markdown.includes('17,180'));
    assert.ok(markdown.includes('Michael Oliver'));

    // Goals
    assert.ok(markdown.includes("12'"));
    assert.ok(markdown.includes('Keane Lewis-Potter'));
    assert.ok(markdown.includes('Mamadou Sangare'));
    assert.ok(markdown.includes('Vitaly Janelt'));
    assert.ok(markdown.includes('Michael Kayode'));

    // Match Stats
    assert.ok(markdown.includes('41.1%'));
    assert.ok(markdown.includes('58.9%'));
    assert.ok(markdown.includes('Possession'));
    assert.ok(markdown.includes('Shots on Target'));

    // Lineups
    assert.ok(markdown.includes('Brentford'));
    assert.ok(markdown.includes('Caoimhín Kelleher'));
    assert.ok(markdown.includes('Tottenham Hotspur'));
    assert.ok(markdown.includes('Antonín Kinsky'));
    assert.ok(markdown.includes('COYS!'));
  });
});
