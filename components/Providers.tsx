'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/client';
import { isThemeName, type ThemeName } from '@/lib/themes';
import type { Article, Bookmark } from '@/lib/types';

export type { ThemeName };
export const THEMES: { id: ThemeName; label: string; blurb: string }[] = [
  { id: 'light', label: 'Minimalist Light', blurb: 'Paper-white, high contrast, ocean-blue accents.' },
  { id: 'dark', label: 'Sleek Dark', blurb: 'Deep slate with emerald gains and crimson losses.' },
  { id: 'black', label: 'Off-Black', blurb: 'True black with soft grey panels and muted gains and losses.' },
  { id: 'terminal', label: 'Bloomberg Terminal', blurb: 'Black, amber headers, dense data tables.' },
];

interface ThemeCtx {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}
interface StoreCtx {
  watchlist: string[];
  bookmarks: Bookmark[];
  ready: boolean;
  addSymbol: (symbol: string) => Promise<void>;
  removeSymbol: (symbol: string) => Promise<void>;
  isBookmarked: (key: string) => boolean;
  saveBookmark: (b: Omit<Bookmark, 'id' | 'savedAt'>) => Promise<void>;
  removeBookmark: (key: string) => Promise<void>;
}
interface ReaderCtx {
  article: Article | null;
  openArticle: (a: Article) => void;
  closeArticle: () => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);
const StoreContext = createContext<StoreCtx | null>(null);
const ReaderContext = createContext<ReaderCtx | null>(null);

function need<T>(ctx: T | null): T {
  if (!ctx) throw new Error('Providers are missing');
  return ctx;
}
export const useTheme = () => need(useContext(ThemeContext));
export const useStore = () => need(useContext(StoreContext));
export const useReader = () => need(useContext(ReaderContext));

export default function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [ready, setReady] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (isThemeName(current)) setThemeState(current);
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem('mg-theme', t);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api<string[]>('/api/watchlist'), api<Bookmark[]>('/api/bookmarks')]).then(([w, b]) => {
      if (!alive) return;
      if (w.status === 'fulfilled') setWatchlist(w.value);
      if (b.status === 'fulfilled') setBookmarks(b.value);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const addSymbol = useCallback(async (symbol: string) => {
    const s = symbol.toUpperCase();
    setWatchlist((prev) => (prev.includes(s) ? prev : [...prev, s]));
    try {
      await api('/api/watchlist', { method: 'POST', body: JSON.stringify({ symbol: s }) });
    } catch (e) {
      setWatchlist((prev) => prev.filter((x) => x !== s));
      throw e;
    }
  }, []);

  const removeSymbol = useCallback(async (symbol: string) => {
    const s = symbol.toUpperCase();
    setWatchlist((prev) => prev.filter((x) => x !== s));
    try {
      await api(`/api/watchlist?symbol=${encodeURIComponent(s)}`, { method: 'DELETE' });
    } catch (e) {
      setWatchlist((prev) => (prev.includes(s) ? prev : [...prev, s]));
      throw e;
    }
  }, []);

  const saveBookmark = useCallback(async (b: Omit<Bookmark, 'id' | 'savedAt'>) => {
    const saved = await api<Bookmark>('/api/bookmarks', { method: 'POST', body: JSON.stringify(b) });
    setBookmarks((prev) => [saved, ...prev.filter((x) => x.key !== saved.key)]);
  }, []);

  const removeBookmark = useCallback(async (key: string) => {
    await api(`/api/bookmarks?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    setBookmarks((prev) => prev.filter((x) => x.key !== key));
  }, []);

  const store = useMemo<StoreCtx>(
    () => ({
      watchlist,
      bookmarks,
      ready,
      addSymbol,
      removeSymbol,
      isBookmarked: (key) => bookmarks.some((b) => b.key === key),
      saveBookmark,
      removeBookmark,
    }),
    [watchlist, bookmarks, ready, addSymbol, removeSymbol, saveBookmark, removeBookmark],
  );

  const themeValue = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  const readerValue = useMemo<ReaderCtx>(
    () => ({ article, openArticle: setArticle, closeArticle: () => setArticle(null) }),
    [article],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <StoreContext.Provider value={store}>
        <ReaderContext.Provider value={readerValue}>{children}</ReaderContext.Provider>
      </StoreContext.Provider>
    </ThemeContext.Provider>
  );
}
