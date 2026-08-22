import { fetchNextFixture as fetchEspnFixture, EspnFixtureData } from './espn';
import { MatchData } from './formatter';

export async function fetchNextFixture(): Promise<Partial<MatchData>> {
  const espnData: EspnFixtureData = await fetchEspnFixture();

  const res: Partial<MatchData> = {
    home_team: espnData.home_team,
    away_team: espnData.away_team,
    competition: espnData.competition,
    date: espnData.date,
    venue: espnData.venue,
    kickoff_gmt: espnData.kickoff_gmt,
    tv_channels: espnData.tv_channels,
  };

  if (espnData.home_form !== undefined) res.home_form = espnData.home_form;
  if (espnData.away_form !== undefined) res.away_form = espnData.away_form;
  if (espnData.odds !== undefined) res.odds = espnData.odds;

  return res;
}
