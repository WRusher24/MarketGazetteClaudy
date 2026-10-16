'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/lib/client';
import { localIsoDay, reminderItems, hourLabel, type EarningsItem } from '@/lib/calendar';
import Icon from './Icon';

const KEY = 'mg-earnings-dismissed';

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(keys: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(keys).slice(-200)));
  } catch {
    /* storage unavailable: the banner simply reappears */
  }
}

/** Day-before reminder: shows watchlist companies reporting tomorrow. Dismissals are remembered per company and date. */
export default function EarningsBanner() {
  const { data, error } = useApi<{ items: EarningsItem[] }>('/api/earnings', 1800000);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const tomorrow = data ? reminderItems(data.items, localIsoDay(new Date())) : [];
  const visible = tomorrow.filter((i) => !dismissed.has(`${i.symbol}:${i.date}`));
  if (!visible.length && error && !data) {
    return (
      <p className="muted small" role="status">
        Earnings reminders are unavailable right now: {error}
      </p>
    );
  }
  if (!visible.length) return null;

  const dismiss = (item: EarningsItem) => {
    const next = new Set(dismissed).add(`${item.symbol}:${item.date}`);
    setDismissed(next);
    writeDismissed(next);
  };

  return (
    <div className="earnings-banner" role="status">
      <Icon name="note" size={18} />
      <div className="earnings-banner-body">
        {visible.map((i) => (
          <div key={`${i.symbol}-${i.date}`}>
            <strong>Earnings tomorrow: {i.symbol}</strong>
            <span className="muted small"> · {hourLabel(i.hour)}</span>
            <button type="button" className="link-btn small" onClick={() => dismiss(i)}>
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
