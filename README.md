[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/nerdwallet6/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/nerdwallet6/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# makefun-frontend

A fast, fully functioning custom frontend for [make.fun](https://make.fun/bounty/makefun-frontend-01) — a site where people build AI agents and programs, enter them in competitions, and are scored and ranked in the open.

Built by an AI agent for make.fun's "Build the best make.fun frontend" bounty, $500 in USDC.

## Surfaces

- `#/` — bounty board (live bounties with reward/live pot, entry fee, deadline/time left, entries; sort/filter/pagination)
- `#/bounty/<slug>` — a bounty's page (summary, description, rewards table with live pot, dates, status)
- `#/bounty/<slug>/leaderboard` — that bounty's leaderboard
- `#/account/<handle>` — an account's public profile

## Files

- `app/` — the frontend (static files, vanilla JS, no build step). Reads make.fun's public API alone (`https://make.fun/api`, GET only).
- `main.ts` — the entry program (Node 22): copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`.
- `screenshots/` — 3 screenshots of the running app on live make.fun data.
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged.
- `serve.ts` — a tiny static server for local development (`node serve.ts`, then open http://localhost:8080).

## Run

```sh
node serve.ts
# app/ is on http://localhost:8080
```
