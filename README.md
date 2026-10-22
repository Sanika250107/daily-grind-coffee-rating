# Daily Grind — Coffee Rating Application

Coffee rating/voting app built with Express and plain JavaScript. Uses JSON file persistence to avoid native modules, so `npm install` works without Visual Studio C++ build tools.

## Requirements
- Node.js 18+ (Node.js 24 is supported)
- npm

## Run on Windows
Open PowerShell in this folder:

```powershell
npm install
npm start
```

Then open http://localhost:3000

## Features
- 60 seeded coffee blends
- Search and roast filters
- 1–5 star votes
- Backend vote endpoint and average rating updates
- JSON persistence in `data/coffees.json`
- Top-five leaderboard
- Responsive layout

## API
- `GET /api/coffees`
- `GET /api/coffees?search=india&roast=Dark`
- `GET /api/leaderboard?limit=5`
- `POST /api/coffees/:id/vote` with JSON body `{"score": 5}`
- `GET /api/health`

## Important deployment note
This version persists votes to `data/coffees.json`. On a hosting provider with an ephemeral filesystem, saved votes may reset when the instance restarts or redeploys. Use a persistent disk or managed database for production.
