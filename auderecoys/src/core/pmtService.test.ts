import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldPostPreMatchThread } from './pmtService.ts';
import type { EspnFixtureData } from './espn.ts';

void describe('shouldPostPreMatchThread', () => {
  const baseFixture: EspnFixtureData = {
    eventId: '123456',
    home_team: 'Tottenham Hotspur',
    home_team_id: '367',
    away_team: 'Arsenal',
    away_team_id: '359',
    competition: 'Premier League',
    date: '2026-08-25',
    venue: 'Tottenham Hotspur Stadium',
    kickoff_gmt: '15:00 GMT',
    tv_channels: ['Sky Sports'],
  };

  void it('should return shouldPost: true when kickoff is within 21 hours (e.g. 20 hours remaining)', () => {
    const now = 1000000000000;
    const kickoffMs = now + 20 * 60 * 60 * 1000; // 20 hours later
    const fixture = { ...baseFixture, kickoff_timestamp: kickoffMs };

    const result = shouldPostPreMatchThread(fixture, false, 21, now);
    assert.equal(result.shouldPost, true);
    assert.ok(result.reason.includes('within the 21-hour window'));
    assert.equal(Math.round(result.hoursUntilKickoff ?? 0), 20);
  });

  void it('should return shouldPost: false when kickoff is more than 21 hours away (e.g. 25 hours remaining)', () => {
    const now = 1000000000000;
    const kickoffMs = now + 25 * 60 * 60 * 1000; // 25 hours later
    const fixture = { ...baseFixture, kickoff_timestamp: kickoffMs };

    const result = shouldPostPreMatchThread(fixture, false, 21, now);
    assert.equal(result.shouldPost, false);
    assert.ok(result.reason.includes('Kickoff is in 25.0 hours'));
  });

  void it('should return shouldPost: false when thread has already been posted', () => {
    const now = 1000000000000;
    const kickoffMs = now + 15 * 60 * 60 * 1000; // 15 hours later
    const fixture = { ...baseFixture, kickoff_timestamp: kickoffMs };

    const result = shouldPostPreMatchThread(fixture, true, 21, now);
    assert.equal(result.shouldPost, false);
    assert.ok(result.reason.includes('has already been posted'));
  });

  void it('should return shouldPost: false when match started/ended more than 4 hours ago', () => {
    const now = 1000000000000;
    const kickoffMs = now - 5 * 60 * 60 * 1000; // 5 hours ago
    const fixture = { ...baseFixture, kickoff_timestamp: kickoffMs };

    const result = shouldPostPreMatchThread(fixture, false, 21, now);
    assert.equal(result.shouldPost, false);
    assert.ok(result.reason.includes('passed 5.0 hours ago'));
  });
});
