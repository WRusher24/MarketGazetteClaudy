'use client';

import { useEffect, useRef, useState } from 'react';
import type { UTCTimestamp } from 'lightweight-charts';
import { useApi } from '@/lib/client';
import { fmtNumber, fmtVolume } from '@/lib/format';
import type { Candle } from '@/lib/types';
import { useTheme } from './Providers';

const RANGES = ['1D', '1W', '1M', '1Y', 'ALL'] as const;
type Range = (typeof RANGES)[number];
type ChartType = 'candles' | 'line';

interface ChartData {
  gmtOffset: number;
  candles: Candle[];
}

function css(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function StockChart({ symbol }: { symbol: string }) {
  const { theme } = useTheme();
  const [range, setRange] = useState<Range>('1D');
  const [type, setType] = useState<ChartType>('candles');
  const [hover, setHover] = useState<Candle | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const { data, loading, error } = useApi<ChartData>(
    `/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`,
    range === '1D' ? 60000 : 0,
  );

  useEffect(() => {
    const el = host.current;
    if (!el || !data || data.candles.length === 0) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const lw = await import('lightweight-charts');
      if (disposed || !host.current) return;
      const text = css('--muted', '#94a3b8');
      const grid = css('--border', '#334155');
      const up = css('--up', '#22c55e');
      const down = css('--down', '#ef4444');
      const accent = css('--accent', '#38bdf8');

      const chart = lw.createChart(el, {
        autoSize: true,
        layout: { background: { type: lw.ColorType.Solid, color: 'transparent' }, textColor: text },
        grid: { vertLines: { color: grid }, horzLines: { color: grid } },
        rightPriceScale: { borderColor: grid },
        timeScale: { borderColor: grid, timeVisible: range === '1D' || range === '1W' || range === '1M' },
        crosshair: { mode: lw.CrosshairMode.Normal },
        localization: { locale: 'en-US' },
      });

      const off = data.gmtOffset || 0;
      const rows = data.candles.map((c) => ({ ...c, time: (c.time + off) as UTCTimestamp }));
      const byTime = new Map(rows.map((r) => [r.time as number, r]));

      if (type === 'candles') {
        const s = chart.addCandlestickSeries({
          upColor: up,
          downColor: down,
          borderUpColor: up,
          borderDownColor: down,
          wickUpColor: up,
          wickDownColor: down,
        });
        s.setData(rows.map((r) => ({ time: r.time, open: r.open, high: r.high, low: r.low, close: r.close })));
      } else {
        const first = rows[0].close;
        const last = rows[rows.length - 1].close;
        const color = last >= first ? up : down;
        const s = chart.addAreaSeries({
          lineColor: color,
          topColor: `${color}55`,
          bottomColor: `${color}00`,
          lineWidth: 2,
        });
        s.setData(rows.map((r) => ({ time: r.time, value: r.close })));
      }

      const vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', color: accent });
      vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      vol.setData(
        rows.map((r) => ({ time: r.time, value: r.volume, color: r.close >= r.open ? `${up}66` : `${down}66` })),
      );

      chart.timeScale().fitContent();
      chart.subscribeCrosshairMove((p) => {
        const row = p.time ? byTime.get(p.time as number) : undefined;
        setHover(row ?? null);
      });
      cleanup = () => chart.remove();
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [data, type, theme, range]);

  const shown = hover ?? data?.candles[data.candles.length - 1] ?? null;

  return (
    <section className="card chart-card">
      <div className="chart-toolbar">
        <div className="seg" role="group" aria-label="Timeframe">
          {RANGES.map((r) => (
            <button key={r} type="button" className={r === range ? 'active' : ''} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Chart type">
          <button type="button" className={type === 'candles' ? 'active' : ''} onClick={() => setType('candles')}>
            Candles
          </button>
          <button type="button" className={type === 'line' ? 'active' : ''} onClick={() => setType('line')}>
            Line
          </button>
        </div>
      </div>
      {shown && (
        <div className="legend small">
          <span>O {fmtNumber(shown.open)}</span>
          <span>H {fmtNumber(shown.high)}</span>
          <span>L {fmtNumber(shown.low)}</span>
          <span>C {fmtNumber(shown.close)}</span>
          <span>Vol {fmtVolume(shown.volume)}</span>
        </div>
      )}
      <div className="chart-host" ref={host}>
        {loading && !data && <div className="chart-msg">Loading chart...</div>}
        {error && !data && <div className="chart-msg">Chart unavailable: {error}</div>}
        {data && data.candles.length === 0 && <div className="chart-msg">No price data for this range.</div>}
      </div>
    </section>
  );
}
