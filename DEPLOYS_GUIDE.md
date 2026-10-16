# MarketGazette Deployment Guide

Stack: Next.js 14 (App Router, TypeScript), Neon PostgreSQL, Finnhub, Yahoo Finance RSS/charts, Google Gemini. Hosting on Vercel's free Hobby plan costs $0.

## 1. Run locally

Requirements: Node.js 20.6 or newer (npm is included) and Git. Download both from nodejs.org and git-scm.com.

```bash
npm install
```

Create `.env.local` from the template and fill in your keys (never commit it):

```bash
cp .env.example .env.local
```

Create the tables and seed the starter data (watchlist NVDA, AAPL, MSFT, TSLA, GOOGL plus cached news):

```bash
npm run db:setup
```

Start the dev server and open http://localhost:3000:

```bash
npm run dev
```

Other commands: `npm run typecheck`, `npm test`, `npm run build`, `npm run start`, `npm run db:migrate`, `npm run db:seed`.

For local testing of the scheduled jobs, add `CRON_SECRET` to `.env.local` and call `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-briefing`.

The app also creates any missing tables on first request (`CREATE TABLE IF NOT EXISTS`), so a fresh Neon database works even if you skip `db:migrate`.

## 2. Push to GitHub (from the zip)

If you received this project as `MarketGazette.zip`, it already contains a local git commit on `main` and your `.env.local`. On the new PC install Node.js 20+ and Git, unzip, then run:

```bash
npm install
npm run db:setup
npm run dev
git remote -v
git push -u origin main
```

If `git remote -v` shows nothing, run `git remote add origin https://github.com/WRusher24/MarketGazetteClaudy` first. Git will ask you to sign in to GitHub (browser or personal access token). `.env.local` is git-ignored and is never pushed. If the zip has no `.git` folder, run `git init -b main`, `git add .`, `git commit -m "feat: complete MarketGazette production platform build"` and then the remote and push commands above. Delete `.env.local` from the zip if it will be shared with anyone else.

## 3. Deploy to Vercel

1. Make sure the repo is pushed to https://github.com/WRusher24/MarketGazetteClaudy (branch `main`).
2. Go to https://vercel.com/new and import `WRusher24/MarketGazetteClaudy`.
3. Framework preset: **Next.js** (auto-detected). Leave build and output settings at their defaults.
4. Under **Environment Variables**, add all three (Production, Preview and Development):

| Name | Value |
| --- | --- |
| `FINNHUB_API_KEY` | your Finnhub key |
| `GEMINI_API_KEY` | your Gemini key |
| `DATABASE_URL` | your Neon connection string (use the pooled one, `sslmode=require`) |
| `CRON_SECRET` | a long random string (for example `openssl rand -hex 32`). Vercel Cron sends it to the scheduled jobs; the jobs refuse requests without it |

Optional: `GEMINI_MODEL` to override the default `gemini-3.8-flash`.

Add `CRON_SECRET` before the first deploy. Without it the scheduled briefings fail with a clear error in the Vercel logs.

5. Click **Deploy**. Every later push to `main` redeploys automatically.

If you change environment variables after deploying, redeploy for them to take effect.

## 3a. Scheduled jobs

`vercel.json` registers two Vercel Cron jobs (Hobby plan: at most one run per job per day, timing may drift by up to an hour). Both require `CRON_SECRET`, which Vercel sends as `Authorization: Bearer <CRON_SECRET>`.

| Route | Schedule (UTC) | What it does |
| --- | --- | --- |
| `/api/cron/daily-briefing` | `0 11 * * *` (every day) | Writes today's Morning Edition. On Sundays it also writes the Weekly Recap. |
| `/api/cron/market-data` | `30 22 * * 1-5` (weekdays, after the US close) | Rebuilds the stock screener snapshot from Finnhub metrics and Yahoo price history. |

Editions are saved in the Neon `briefings` table and the screener in `market_snapshots` (one row per kind and date, or one row for the screener). You can also press **Regenerate** on the dashboard and **Refresh data** on the Screener page; each is limited (one minute and five minutes respectively). After changing `vercel.json`, redeploy so Vercel picks up the schedule.

**Finnhub plan.** The Earnings calendar (`/calendar/earnings`) and insider trades (`/stock/insider-transactions`) endpoints were not verified against the free tier while this was built. If your Finnhub plan does not include them, those panels show "unavailable" with Finnhub's status code instead of empty data. Everything else uses endpoints the app already used (quote, profile, metrics, earnings, recommendations, company news) plus Yahoo Finance.

**Watchlists migration.** On first start after this update, the old single watchlist is copied into a list called **Default** exactly once. The old `watchlist` table is kept, not deleted, and is no longer written.

## 4. Security notes

- `.env.local` is git-ignored. Only `.env.example` (no secrets) is committed.
- **Rotate keys that have been shared in chat or tickets.** Regenerate the Finnhub key, Gemini key and Neon password if they were exposed anywhere, then update `.env.local` and Vercel.
- `CRON_SECRET` protects the scheduled routes only. The rest of the app has no login.
- MarketGazette is a single-user app with no login. Anyone who knows the deployed URL can read and change the watchlist, vault and notes, and can trigger Gemini calls on your quota. Keep the URL private, or enable Vercel Deployment Protection (Project Settings, Deployment Protection) before sharing it.

## 5. Troubleshooting

- **Empty news**: check `FINNHUB_API_KEY`; Yahoo RSS is used as a second source and the Neon cache as a fallback.
- **Scheduled job errors** (`Unauthorized` or `CRON_SECRET is not set` in the logs): check `CRON_SECRET` in Vercel and redeploy.
- **Earnings or insider panels say unavailable**: your Finnhub plan may not include that endpoint (see section 3a).
- **Screener shows gaps**: Finnhub allows 60 calls a minute; press Refresh data after a few minutes, or read the list of partly loaded symbols on the page.
- **AI errors**: check `GEMINI_API_KEY` and that your key can use the configured model (set `GEMINI_MODEL`).
- **Database errors**: confirm `DATABASE_URL` includes `sslmode=require` and the Neon project is not suspended.
- **Free-tier limits**: Finnhub allows 60 calls/minute; responses are cached for 15-120 seconds to stay within it.
