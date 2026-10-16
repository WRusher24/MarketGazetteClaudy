'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/client';
import { isThemeName, type ThemeName } from '@/lib/themes';
import type { Article, Bookmark, WatchList } from '@/lib/types';

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
  /** Every watchlist with its symbols. */
  lists: WatchList[];
  /** Distinct symbols across all lists (what news, briefings and "is it watched" use). */
  watchlist: string[];
  bookmarks: Bookmark[];
  ready: boolean;
  refreshLists: () => Promise<void>;
  createList: (name: string) => Promise<WatchList>;
  renameList: (id: number, name: string) => Promise<void>;
  deleteList: (id: number) => Promise<void>;
  /** Adds to one list, or to the first list when none is given. */
  addSymbol: (symbol: string, listId?: number) => Promise<void>;
  /** Removes from one list, or from every list when none is given. */
  removeSymbol: (symbol: string, listId?: number) => Promise<void>;
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

/** Distinct symbols across lists, in first-seen order. */
export function unionSymbols(lists: WatchList[]): string[] {
  const seen = new Set<string>();
  for (const l of lists) for (const s of l.symbols) seen.add(s);
  return Array.from(seen);
}

export default function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');
  const [lists, setLists] = useState<WatchList[]>([]);
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

  const refreshLists = useCallback(async () => {
    setLists(await api<WatchList[]>('/api/lists'));
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api<WatchList[]>('/api/lists'), api<Bookmark[]>('/api/bookmarks')]).then(([l, b]) => {
      if (!alive) return;
      if (l.status === 'fulfilled') setLists(l.value);
      if (b.status === 'fulfilled') setBookmarks(b.value);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const createList = useCallback(
    async (name: string) => {
      const created = await api<WatchList>('/api/lists', { method: 'POST', body: JSON.stringify({ name }) });
      setLists((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  const renameList = useCallback(
    async (id: number, name: string) => {
      await api(`/api/lists/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
    },
    [],
  );

  const deleteList = useCallback(
    async (id: number) => {
      await api(`/api/lists/${id}`, { method: 'DELETE' });
      setLists((prev) => prev.filter((l) => l.id !== id));
    },
    [],
  );

  const addSymbol = useCallback(
    async (symbol: string, listId?: number) => {
      const s = symbol.toUpperCase();
      const target = listId ?? lists[0]?.id;
      setLists((prev) => prev.map((l) => (l.id === target && !l.symbols.includes(s) ? { ...l, symbols: [...l.symbols, s] } : l)));
      try {
        await api('/api/watchlist', { method: 'POST', body: JSON.stringify({ symbol: s, listId: target }) });
      } catch (e) {
        // Put the real state back so the UI never shows a symbol the server rejected.
        await refreshLists().catch(() => undefined);
        throw e;
      }
    },
    [lists, refreshLists],
  );

  const removeSymbol = useCallback(
    async (symbol: string, listId?: number) => {
      const s = symbol.toUpperCase();
      setLists((prev) =>
        prev.map((l) => (listId == null || l.id === listId ? { ...l, symbols: l.symbols.filter((x) => x !== s) } : l)),
      );
      try {
        const qs = `symbol=${encodeURIComponent(s)}${listId == null ? '' : `&listId=${listId}`}`;
        await api(`/api/watchlist?${qs}`, { method: 'DELETE' });
      } catch (e) {
        await refreshLists().catch(() => undefined);
        throw e;
      }
    },
    [refreshLists],
  );

  const saveBookmark = useCallback(async (b: Omit<Bookmark, 'id' | 'savedAt'>) => {
    const saved = await api<Bookmark>('/api/bookmarks', { method: 'POST', body: JSON.stringify(b) });
    setBookmarks((prev) => [saved, ...prev.filter((x) => x.key !== saved.key)]);
  }, []);

  const removeBookmark = useCallback(async (key: string) => {
    await api(`/api/bookmarks?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    setBookmarks((prev) => prev.filter((x) => x.key !== key));
  }, []);

  const watchlist = useMemo(() => unionSymbols(lists), [lists]);

  const store = useMemo<StoreCtx>(
    () => ({
      lists,
      watchlist,
      bookmarks,
      ready,
      refreshLists,
      createList,
      renameList,
      deleteList,
      addSymbol,
      removeSymbol,
      isBookmarked: (key) => bookmarks.some((b) => b.key === key),
      saveBookmark,
      removeBookmark,
    }),
    [lists, watchlist, bookmarks, ready, refreshLists, createList, renameList, deleteList, addSymbol, removeSymbol, saveBookmark, removeBookmark],
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
