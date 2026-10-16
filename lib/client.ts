'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const msg = (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  updatedAt: number | null;
}

/** Fetches JSON from `url` (null disables it) and optionally re-polls every `refreshMs`. */
export function useApi<T>(url: string | null, refreshMs = 0): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(url));
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const urlRef = useRef(url);

  useEffect(() => {
    urlRef.current = url;
    setData(null);
    setError(null);
    setLoading(Boolean(url));
  }, [url]);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    const run = async () => {
      try {
        const result = await api<T>(url);
        if (!alive || urlRef.current !== url) return;
        setData(result);
        setError(null);
        setUpdatedAt(Date.now());
      } catch (e) {
        if (alive && urlRef.current === url) setError(e instanceof Error ? e.message : 'Request failed');
      } finally {
        if (alive && urlRef.current === url) setLoading(false);
      }
    };
    run();
    const timer = refreshMs > 0 ? setInterval(run, refreshMs) : null;
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [url, refreshMs, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, updatedAt };
}
