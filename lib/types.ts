export interface Article {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string | null;
  publishedAt: string;
  related: string[];
  category: string;
}

export interface Quote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePct: number;
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;
}

export interface IndexQuote {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockDetail {
  symbol: string;
  name: string;
  exchange: string;
  industry: string;
  logo: string;
  website: string;
  currency: string;
  price: number;
  change: number;
  changePct: number;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  marketCap: number | null;
  pe: number | null;
  high52: number | null;
  low52: number | null;
  volume: number | null;
  dividendYield: number | null;
}

export interface Bookmark {
  id: number;
  kind: 'article' | 'report';
  key: string;
  title: string;
  source: string;
  url: string;
  image: string | null;
  summary: string;
  body: string;
  symbol: string;
  savedAt: string;
}

export interface Note {
  id: number;
  symbol: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type SentimentLabel = 'Bullish' | 'Bearish' | 'Neutral';

export interface ArticleSummary {
  takeaways: string[];
  priceImpact: { direction: SentimentLabel; explanation: string };
  sentiment: { label: SentimentLabel; score: number; rationale: string };
}

export interface AnalystReport {
  symbol: string;
  generatedAt: string;
  businessModel: { summary: string; drivers: string[] };
  strengthsRisks: { strengths: string[]; risks: string[] };
  earnings: { summary: string; highlights: string[] };
  sentiment: { label: SentimentLabel; consensus: string; summary: string };
}

export interface SentimentRadar {
  bullish: number;
  bearish: number;
  neutral: number;
  score: number;
  label: SentimentLabel;
  sample: number;
  method: 'ai' | 'lexicon';
}
