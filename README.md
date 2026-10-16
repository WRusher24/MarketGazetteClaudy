# MarketGazette

A personal stock newspaper: live news with an in-app reader, interactive candlestick/line charts, a watchlist with notes and a reading vault, and a Gemini-powered AI analyst. Next.js 14, TypeScript, Neon PostgreSQL.

- Setup and Vercel deployment: [DEPLOYS_GUIDE.md](DEPLOYS_GUIDE.md)
- How to use it: [USER_GUIDE.md](USER_GUIDE.md)
- Database schema: [db/schema.sql](db/schema.sql)

```bash
npm install
cp .env.example .env.local   # add your keys
npm run db:setup
npm run dev
```
