# MarketGazette

A personal stock newspaper: live news with an in-app reader, interactive candlestick/line charts, a watchlist with notes and a reading vault, a Gemini-powered AI analyst (with an ask-anything chat per stock), AI-written daily and weekly editions, a market overview, named watchlists with earnings reminders, insider and analyst activity, technical indicators, and a stock screener. Next.js 14, TypeScript, Neon PostgreSQL.

- Setup and Vercel deployment: [DEPLOYS_GUIDE.md](DEPLOYS_GUIDE.md)
- How to use it: [USER_GUIDE.md](USER_GUIDE.md)
- Database schema: [db/schema.sql](db/schema.sql)

```bash
npm install
cp .env.example .env.local   # add your keys
npm run db:setup
npm run dev
```

Scheduled jobs (Vercel Cron, see `vercel.json`) write the daily and weekly editions and refresh the screener. They need `CRON_SECRET` in the environment. Run tests with `npm test`.
