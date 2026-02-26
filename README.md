# Tijaara

AI-powered trade intelligence and portfolio dashboard for the Indian stock market (NSE/BSE). Autonomous RSS scraping, AI signal analysis, holdings tracking with profit/loss alerts, and Discord notifications.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand
- **Backend:** Next.js API routes, Firebase/Firestore (persistence)
- **AI:** Vercel AI SDK — Pollinations or OpenRouter (configurable)
- **WebSocket:** Bun server (`ws-server.ts`) for live signals and agent status
- **Data:** Firestore (config, signals, holdings, watchlist, notifications), undici for HTTP

## Prerequisites

- Node.js 18+
- Bun (for WebSocket server; optional if you only run Next.js)
- Firebase project with Firestore

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.local.example` to `.env.local` and set:

   - **Firebase (client):** `NEXT_PUBLIC_FIREBASE_*` for client auth
   - **Firebase (server):** `FIREBASE_SERVICE_ACCOUNT_KEY` (full service account JSON as single-line string)
   - **AI:** `AI_PROVIDER` (`pollinations` or `openrouter`), and either `POLLINATIONS_API_KEY` or `OPENROUTER_API_KEY`
   - **WebSocket:** `NEXT_PUBLIC_WS_URL` (e.g. `ws://localhost:3001`)

3. **Run**

   - Next.js (dashboard + API):

     ```bash
     npm run dev
     ```

   - WebSocket server (scraper + live push), in a second terminal:

     ```bash
     npm run dev:ws
     ```

   Open [http://localhost:3000](http://localhost:3000). Dashboard loads signals from API; once the WS client connects, it receives live signals and agent logs.

## Scripts

| Script      | Description                          |
|------------|--------------------------------------|
| `npm run dev`   | Next.js dev server (Turbopack)      |
| `npm run dev:ws`| Bun WebSocket server (hot reload)   |
| `npm run build` | Next.js production build           |
| `npm run start` | Next.js production server          |

## Main features

- **AI Trade Intelligence:** RSS feeds (e.g. ET Markets, LiveMint) scraped on an interval; each headline is analyzed by AI for BUY/SELL/HOLD, confidence, and sentiment. Unique signals are pushed over WebSocket and stored in Firestore.
- **Holdings:** Add positions (symbol, qty, avg price, buy source). Cron job checks prices at a configurable interval and creates notifications when profit/loss crosses thresholds.
- **Watchlist & notifications:** Watchlist and notifications persisted in Firestore; mark read, clear, priorities.
- **AI market analysis (per holding):** Streamed analysis with point-wise conclusion (Verdict, Key metrics, Risks, Catalysts, Action). Optional “Force reanalyze” to skip cache.
- **App config:** All tunables (intervals, thresholds, AI base URLs, limits, buy sources, broker links, Discord webhook) stored in Firestore and editable from the dashboard Config table.
- **Discord:** Optional webhook URL in config; notifications (signals, sell alerts, holdings threshold alerts) are sent with source and broker links.

## Project layout

```
tijaara/
├── src/
│   ├── app/              # Next.js App Router (pages, API routes)
│   ├── components/       # React UI (dashboard, modals, feed)
│   ├── hooks/            # useMarketStream, useAppConfig, useAuth
│   ├── lib/              # Firebase, config, Discord, price-source
│   ├── services/         # AI (analysis, signals), scraper agent
│   ├── store/            # Zustand trading store
│   └── types/            # Shared TypeScript types
├── ws-server.ts          # Bun WebSocket + scraper entry
├── docs/
│   └── ARCHITECTURE.md   # Architecture and logic
└── README.md
```

## Configuration (DB)

After first load, app config is seeded in Firestore `config/app`. Use the **App config** section on the dashboard to edit:

- Scrape / holdings check intervals, profit/loss thresholds, cooldown
- Cache TTL, AI provider/model and base URLs
- Signals and notifications limits, batch sizes
- Buy sources and broker links (JSON)
- Discord webhook URL (for notifications)

See `src/types/config.types.ts` and `CONFIG_SEED` for all keys.

## Cron (optional)

- **Holdings check:** Call `GET /api/cron/check-holdings` at your desired interval (e.g. via Vercel Cron or external scheduler). Optional `Authorization: Bearer <CRON_SECRET>` if `CRON_SECRET` is set.

## Docs

- [Architecture & logic](docs/ARCHITECTURE.md) — system design, data flow, and main logic.
# tradeSignal
