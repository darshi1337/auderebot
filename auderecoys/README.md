# AudereBot (`auderecoys`)

A Reddit Devvit application for **r/coys** (Tottenham Hotspur) that automates the generation and posting of **Pre-Match Threads** and **Post-Match Threads**.

## Features

- **Pre-Match Threads**: Automatically fetches upcoming match info, venue details, referee assignments, league standings, head-to-head records, recent form, and news via ESPN APIs.
- **Post-Match Threads**: Automatically extracts finished match results, final score lines, goal scorers with assists, detailed boxscore statistics, starting lineups, and venue information.
- **Redis Deduplication**: Prevents duplicate thread submissions using 7-day Redis key expiration.
- **Moderator Context Menu**: Allows subreddit moderators to manually trigger thread creation directly on Reddit.
- **Automated Scheduler**: Runs background checks via cron triggers.

## Tech Stack

- **[Devvit](https://developers.reddit.com/)**: Reddit's developer platform for building app experiences
- **[Hono](https://hono.dev/)**: Lightweight web framework for route handling
- **[Vite](https://vite.dev/)**: Build tool and server bundler
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe development

## Project Structure

```
src/
├── index.ts                     # Main entry point mounting Hono routes
├── core/
│   ├── espn.ts                  # ESPN API client for fixtures, summaries, standings, stats & news
│   ├── formatter.ts             # Pre-match and post-match markdown formatters
│   ├── pmtService.ts            # Pre-match thread evaluation & posting pipeline
│   ├── pmtService.test.ts       # Pre-match unit tests
│   ├── postMatchService.ts      # Post-match thread evaluation & posting pipeline
│   └── postMatchService.test.ts # Post-match unit tests
└── routes/
    ├── menu.ts                  # Moderator menu action endpoints
    └── scheduler.ts             # Cron scheduler task endpoints
```

## Commands

- `npm run dev`: Starts development mode with live reload
- `npm run build`: Builds the application bundle via Vite
- `npm run test:unit`: Runs Node.js native unit tests
- `npm run test:types`: Runs TypeScript compiler check (`tsc --build`)
- `npm run lint`: Runs ESLint code style checks
