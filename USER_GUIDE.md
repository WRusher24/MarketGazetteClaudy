# MarketGazette User Guide

## Switching themes
Use the four icons at the top right (sun, moon, contrast, terminal) to switch instantly, or open **Settings** and pick a theme card:
- **Minimalist Light**: white, high contrast, blue accents.
- **Sleek Dark**: deep slate with green gains and red losses.
- **Off-Black**: true black with soft grey panels, for dim rooms and OLED screens.
- **Bloomberg Terminal**: black with amber headers and compact, monospaced data.

Your choice is remembered on that device.

## Navigating
- **Desktop**: the left sidebar has Dashboard, Gazette Feed, Newsroom, Watchlist, AI Analyst and Settings. Click **Collapse** to shrink it to icons.
- **Phone**: the same six sections appear in a floating bar at the bottom of the screen.
- The scrolling bar under the header shows live index prices (S&P 500, NASDAQ, Dow, Bitcoin and more). Hover to pause it.
- Type a ticker or company name in the search box and press Enter to open its stock page.

## Pages
- **Dashboard**: the Morning Edition (or Weekly Recap) at the top, the Market Overview, the front-page lead, top headlines, watchlist news, the AI Sentiment Radar gauge and your live watchlist prices.
- **Gazette Feed**: the full newspaper edition with Top Headlines and Watchlist News.
- **Newsroom**: a live stream you can filter by text and source, switch between Top, Watchlist or any single ticker. It refreshes every minute.
- **Watchlist**: keep several named lists (for example Long-term, Ideas, Tech), add and remove tickers, see the **Earnings** dates for the list you are viewing, open the **Saved Vault** and see all your **Notes**.
- **Screener**: filter stocks by sector, market cap, P/E and 3-month momentum.

## Morning Edition and Weekly Recap
The top of the dashboard holds an AI-written edition for your watchlist:
- **Daily** (the Morning Edition) gives a short lead on the day, up to five headlines with a line on why each matters, the biggest moves today and a paragraph on what to watch today.
- **Weekly** (the Weekly Recap) covers the last five sessions, the biggest moves over that period, up to six headlines and what to watch next week.

Editions are written automatically (every day around 11:00 UTC; the Weekly Recap is written on Sundays at the same time) and saved, so they are there when you open the app. Press **Regenerate** to write a fresh one; it can be run once a minute. Headline links always go to real articles. If a new edition fails, the last saved one stays on screen with a message. Editions are AI-generated and are not financial advice.

## Market Overview
Below the edition: the major indices, a sector heat map built from sector ETFs (darker tiles mean bigger moves), and the top gainers and losers among about forty large US stocks. If some quotes cannot be loaded you see how many are missing instead of a blank section.

## Reading news in the app
Click any headline or card. A reading drawer opens (side panel on desktop, full screen on phones) with the publisher, time, cover image and article text. If a publisher blocks text extraction you see the feed summary and a link to the original. Click the bookmark icon to save a story to your vault, **Open original article** to visit the publisher, and press Esc or the X to close.

Click **Summarize with AI** for an AI Executive Summary: 3 key takeaways, impact on the stock price and market sentiment.

## Watchlists
- The **Watchlist** page shows one list at a time. Pick a list from the chips, or press **Create** to make a new one. Rename a list in the box beside it, or delete it with the bin icon (you must keep at least one list).
- A ticker can sit in several lists. Add or remove it from any list on its stock page with the chips under the header (a tick means it is in that list).
- Your existing tickers now live in a list called **Default**.
- The dashboard watchlist table, watchlist news and the AI briefings use every ticker across all your lists.

## Earnings calendar and reminders
The **Earnings** card on the Watchlist page lists the next three weeks of earnings for the list you are viewing: date, timing (before the open or after the close), and the EPS and revenue estimates. Once a day-before reminder is due, a banner appears at the top of every page: "Earnings tomorrow". Press **Dismiss** to hide it for that company and date. Dates come from Finnhub and can change.

## Stock pages
Click any ticker chip or watchlist symbol.
- The header shows the live price and percentage change. Use the **Watchlists** chips to add it to one or more lists.
- Pick a timeframe (**1D, 1W, 1M, 1Y, ALL**) and a chart type (**Candles** or **Line**). Hover the chart to see open, high, low, close and volume.
- Indicator chips switch on **MA 20**, **MA 50**, **Volume** (on by default) and **RSI 14** (shown in its own pane with 30 and 70 guide lines). Indicators are calculated from the bars shown in the selected timeframe, so a 1D chart uses 5-minute bars.
- The Key Metrics grid shows market cap, P/E, 52-week high and low, volume and dividend yield.
- The news panel beside the chart (below it on phones) lists headlines for that stock only. Clicking one opens the reader without leaving the page.
- **Ask the Analyst** is a chat box. Ask about news, earnings, valuation or analyst views. Answers use live quotes, earnings, analyst ratings and headlines, and show the numbered sources they used (F = figure, H = headline, with links). The last few questions are sent along so follow-ups make sense. Clear starts a new conversation.
- **Insider Trades & Analyst Ratings** lists recent insider transactions (purchases, sales, awards) and the months when the analyst consensus changed. The consensus changes are built from monthly trend data, so individual broker moves are not shown.
- **My Notes** stores private notes per ticker. Notes can also be written about a story (see the reader below).
- **Highlights**: in the reader, select a passage of the article text and press **Save highlight**. Highlights appear under the story and on the Watchlist page's Saved Vault tab.
- **Thesis notes on a story**: at the bottom of the reader, pick a ticker and write what the story changes in your thesis. The note appears on that stock's page and in Notes, marked "re:" with the headline.

## AI Analyst
Press **Analyze Stock with AI** on a stock page, or choose a ticker on the **AI Analyst** page. You get a four-part brief: business model and revenue drivers, strengths versus risks, recent quarterly earnings, and market sentiment with analyst consensus. Press **Save report** to keep it in your vault. Reports are cached for six hours; **Regenerate** refreshes them.

AI output and market data can be wrong or delayed. MarketGazette is for information only and is not investment advice. Every AI answer is labelled as AI-generated.

## Portfolio
Open **Portfolio** (Wallet on phones) and add each purchase as a lot: ticker, shares, cost per share and, optionally, the purchase date. Your data stays in this app's database; nothing is connected to a broker.
- **Summary**: market value, cost basis, total gain or loss, and today's change, using live quotes.
- **Positions**: each ticker combined from its lots, with average cost and gain or loss.
- **Allocation**: share of value by sector or by position.
- **Performance vs S&P 500**: your portfolio against the same money put into the S&P 500 on each purchase date. Lots without a purchase date cannot be placed in time, so they are left out of this chart.
Tickers with no live price are listed and left out of the totals until a price loads.

## Library: tags, search and export
On the **Watchlist** page, the **Saved Vault** and **Notes** tabs have a search box and tag filters. Search matches every word you type across titles, summaries, sources, tickers, notes and highlights. Add tags to a saved item or note in its tag box (comma-separated; letters, numbers and hyphens, up to 10 tags), and press Enter or click away to save.

**Export** (button on the Vault tab) produces one Markdown document with your saved articles and their highlights, AI reports, notes with their linked stories, and any other highlights. **Download Markdown** saves a `.md` file. **Print or save as PDF** uses your browser's print dialog; choose "Save as PDF" as the destination.

## Stock Screener
The **Screener** page filters a snapshot of about forty stocks: your watchlist tickers first, then popular large US stocks. Filter by sector, minimum market cap, maximum P/E (companies with negative earnings are excluded when you set a P/E limit) and minimum 3-month move. Sort by momentum, market cap, P/E or symbol. The snapshot is rebuilt each weekday after the US close; **Refresh data** rebuilds it on demand (about 45 seconds). Stocks that could not be fully loaded are listed under the table with the reason.
