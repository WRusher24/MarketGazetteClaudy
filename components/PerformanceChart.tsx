'use client';

import { useEffect, useRef } from 'react';
import type { PerfPoint } from '@/lib/performance';
import { useTheme } from './Providers';

function css(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Portfolio value and the same money in the S&P 500, both over the purchase period. */
export default function PerformanceChart({ points }: { points: PerfPoint[] }) {
  const { theme } = useTheme();
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || points.length === 0) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;
    (async () => {
      const lw = await import('lightweight-charts');
      if (disposed || !host.current) return;
      const grid = css('--border', '#334155');
      const chart = lw.createChart(el, {
        autoSize: true,
        layout: { background: { type: lw.ColorType.Solid, color: 'transparent' }, textColor: css('--muted', '#94a3b8') },
        grid: { vertLines: { color: grid }, horzLines: { color: grid } },
        rightPriceScale: { borderColor: grid },
        timeScale: { borderColor: grid },
        localization: { locale: 'en-US' },
      });
      const portfolio = chart.addLineSeries({ color: css('--accent', '#38bdf8'), lineWidth: 2, title: 'Portfolio' });
      portfolio.setData(points.map((p) => ({ time: p.date, value: p.portfolio })));
      const bench = chart.addLineSeries({ color: css('--muted', '#94a3b8'), lineWidth: 2, lineStyle: 2, title: 'S&P 500 (same money)' });
      bench.setData(points.map((p) => ({ time: p.date, value: p.benchmark })));
      chart.timeScale().fitContent();
      cleanup = () => chart.remove();
    })();
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [points, theme]);

  return <div className="chart-host" ref={host} aria-label="Portfolio performance chart" />;
}
