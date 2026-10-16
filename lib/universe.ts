// Fixed reference lists. Sector ETFs drive the heat map; the popular-stock universe feeds
// movers now and the screener later. Data sources only cover what is listed here, so keep it honest.

export const SECTOR_ETFS: { symbol: string; label: string }[] = [
  { symbol: 'XLK', label: 'Technology' },
  { symbol: 'XLC', label: 'Communication' },
  { symbol: 'XLY', label: 'Consumer Discretionary' },
  { symbol: 'XLP', label: 'Consumer Staples' },
  { symbol: 'XLV', label: 'Health Care' },
  { symbol: 'XLF', label: 'Financials' },
  { symbol: 'XLE', label: 'Energy' },
  { symbol: 'XLI', label: 'Industrials' },
  { symbol: 'XLB', label: 'Materials' },
  { symbol: 'XLU', label: 'Utilities' },
  { symbol: 'XLRE', label: 'Real Estate' },
];

export interface UniverseStock {
  symbol: string;
  sector: string;
}

/** Large, liquid US stocks. Not a complete index; used for movers and the screener. */
export const POPULAR_STOCKS: UniverseStock[] = [
  { symbol: 'AAPL', sector: 'Technology' },
  { symbol: 'MSFT', sector: 'Technology' },
  { symbol: 'NVDA', sector: 'Technology' },
  { symbol: 'AVGO', sector: 'Technology' },
  { symbol: 'ORCL', sector: 'Technology' },
  { symbol: 'AMD', sector: 'Technology' },
  { symbol: 'CRM', sector: 'Technology' },
  { symbol: 'META', sector: 'Communication' },
  { symbol: 'GOOGL', sector: 'Communication' },
  { symbol: 'NFLX', sector: 'Communication' },
  { symbol: 'DIS', sector: 'Communication' },
  { symbol: 'AMZN', sector: 'Consumer Discretionary' },
  { symbol: 'TSLA', sector: 'Consumer Discretionary' },
  { symbol: 'HD', sector: 'Consumer Discretionary' },
  { symbol: 'MCD', sector: 'Consumer Discretionary' },
  { symbol: 'NKE', sector: 'Consumer Discretionary' },
  { symbol: 'WMT', sector: 'Consumer Staples' },
  { symbol: 'COST', sector: 'Consumer Staples' },
  { symbol: 'PG', sector: 'Consumer Staples' },
  { symbol: 'KO', sector: 'Consumer Staples' },
  { symbol: 'PEP', sector: 'Consumer Staples' },
  { symbol: 'UNH', sector: 'Health Care' },
  { symbol: 'LLY', sector: 'Health Care' },
  { symbol: 'JNJ', sector: 'Health Care' },
  { symbol: 'MRK', sector: 'Health Care' },
  { symbol: 'ABBV', sector: 'Health Care' },
  { symbol: 'JPM', sector: 'Financials' },
  { symbol: 'BAC', sector: 'Financials' },
  { symbol: 'V', sector: 'Financials' },
  { symbol: 'MA', sector: 'Financials' },
  { symbol: 'GS', sector: 'Financials' },
  { symbol: 'XOM', sector: 'Energy' },
  { symbol: 'CVX', sector: 'Energy' },
  { symbol: 'CAT', sector: 'Industrials' },
  { symbol: 'GE', sector: 'Industrials' },
  { symbol: 'UPS', sector: 'Industrials' },
  { symbol: 'LIN', sector: 'Materials' },
  { symbol: 'NEE', sector: 'Utilities' },
  { symbol: 'PLD', sector: 'Real Estate' },
];
