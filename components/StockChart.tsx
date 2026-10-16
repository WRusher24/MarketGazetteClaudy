'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { IChartApi, UTCTimestamp } from 'lightweight-charts';
import { useApi } from '@/lib/client';
import { fmtNumber, fmtVolume } from '@/lib/format';
import { rsi, sma } from '@/lib/indicators';
import type { Candle } from '@/lib/types';
import { useTheme } from './Providers';

const RANGES = ['1D', '1W', '1M', '1Y', 'ALL'] as const;
type Range = (typeof RANGES)[number];
type ChartType = 'candles' | 'line';

interface ChartData {
  gmtOffset: number;
  candles: Candle[];
}

interface Overlays {
  ma20: boolean;
  ma50: boolean;
  volume: boolean;
  rsi: boolean;
}

const OVERLAY_LABELS: { key: keyof Overlays; label: string }[] = [
  { key: 'ma20', label: 'MA 20' },
  { key: 'ma50', label: 'MA 50' },
  { key: 'volume', label: 'Volume' },
  { key: 'rsi', label: 'RSI 14' },
];

function css(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Moving averages and RSI computed over the bars shown, so each timeframe uses its own bars. */
export function computeIndicators(candles: Candle[]) {
  const closes = candles.map((c) => c.close);
  return { ma20: sma(closes, 20), ma50: sma(closes, 50), rsi: rsi(closes, 14) };
}

export default function StockChart({ symbol }: { symbol: string }) {
  const { theme } = useTheme();
  const [range, setRange] = useState<Range>('1D');
  const [type, setType] = useState<ChartType>('candles');
  const [overlays, setOverlays] = useState<Overlays>({ ma20: false, ma50: false, volume: true, rsi: false });
  const [hover, setHover] = useState<Candle | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const rsiHost = useRef<HTMLDivElement>(null);
  const { data, loading, error } = useApi<ChartData>(
    `/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`,
    range === '1D' ? 60000 : 0,
  );

  const indicators = useMemo(() => (data ? computeIndicators(data.candles) : null), [data]);
  const lastOf = (arr: (number | null)[]) => {
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i] !== null) return arr[i] as number;
    return null;
  };

  useEffect(() => {
    const el = host.current;
    if (!el || !data || data.candles.length === 0) return;
    let disposed = false;
    const charts: IChartApi[] = [];

    (async () => {
      const lw = await import('lightweight-charts');
      if (disposed || !host.current) return;
      const text = css('--muted', '#94a3b8');
      const grid = css('--border', '#334155');
      const up = css('--up', '#22c55e');
      const down = css('--down', '#ef4444');
      const accent = css('--accent', '#38bdf8');

      const base = { layout: { background: { type: lw.ColorType.Solid, color: 'transparent' }, textColor: text }, grid: { vertLines: { color: grid }, horzLines: { color: grid } }, rightPriceScale: { borderColor: grid }, timeScale: { borderColor: grid, timeVisible: range === '1D' || range === '1W' || range === '1M' }, crosshair: { mode: lw.CrosshairMode.Normal }, localization: { locale: 'en-US' } };
      const chart = lw.createChart(el, { ...base, autoSize: true });
      charts.push(chart);

      const off = data.gmtOffset || 0;
      const rows = data.candles.map((c) => ({ ...c, time: (c.time + off) as UTCTimestamp }));
      const byTime = new Map(rows.map((r) => [r.time as number, r]));

      if (type === 'candles') {
        const s = chart.addCandlestickSeries({ upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down });
        s.setData(rows.map((r) => ({ time: r.time, open: r.open, high: r.high, low: r.low, close: r.close })));
      } else {
        const first = rows[0].close;
        const last = rows[rows.length - 1].close;
        const color = last >= first ? up : down;
        const s = chart.addAreaSeries({ lineColor: color, topColor: `${color}55`, bottomColor: `${color}00`, lineWidth: 2 });
        s.setData(rows.map((r) => ({ time: r.time, value: r.close })));
      }

      if (indicators) {
        const line = (values: (number | null)[], color: string) => {
          const series = chart.addLineSeries({ color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
          series.setData(rows.flatMap((r, i) => (values[i] === null ? [] : [{ time: r.time, value: values[i] as number }])));
        };
        if (overlays.ma20) line(indicators.ma20, '#f59e0b');
        if (overlays.ma50) line(indicators.ma50, '#a78bfa');
      }

      if (overlays.volume) {
        const vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', color: accent });
        vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        vol.setData(rows.map((r) => ({ time: r.time, value: r.volume, color: r.close >= r.open ? `${up}66` : `${down}66` })));
      }

      if (overlays.rsi && indicators && rsiHost.current) {
        const rsiChart = lw.createChart(rsiHost.current, { ...base, autoSize: true, timeScale: { ...base.timeScale, visible: true } });
        charts.push(rsiChart);
        const series = rsiChart.addLineSeries({ color: accent, lineWidth: 2, priceLineVisible: false });
        series.setData(rows.flatMap((r, i) => (indicators.rsi[i] === null ? [] : [{ time: r.time, value: indicators.rsi[i] as number }])));
        series.createPriceLine({ price: 70, color: down, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '' });
        series.createPriceLine({ price: 30, color: up, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '' });
        rsiChart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
        // Keep the RSI pane on the same horizontal scale as the price chart.
        chart.timeScale().subscribeVisibleLogicalRangeChange((r) => r && rsiChart.timeScale().setVisibleLogicalRange(r));
        rsiChart.timeScale().subscribeVisibleLogicalRangeChange((r) => r && chart.timeScale().setVisibleLogicalRange(r));
      }

      chart.timeScale().fitContent();
      chart.subscribeCrosshairMove((p) => {
        const row = p.time ? byTime.get(p.time as number) : undefined;
        setHover(row ?? null);
      });
    })();

    return () => {
      disposed = true;
      charts.forEach((c) => c.remove());
    };
  }, [data, type, theme, range, overlays, indicators]);

  const shown = hover ?? data?.candles[data.candles.length - 1] ?? null;
  const toggle = (key: keyof Overlays) => setOverlays((o) => ({ ...o, [key]: !o[key] }));

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
      <div className="chips indicator-toggles" role="group" aria-label="Indicators">
        {OVERLAY_LABELS.map((o) => (
          <button key={o.key} type="button" className={`chip ${overlays[o.key] ? 'active' : ''}`} aria-pressed={overlays[o.key]} onClick={() => toggle(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
      {shown && (
        <div className="legend small">
          <span>O {fmtNumber(shown.open)}</span>
          <span>H {fmtNumber(shown.high)}</span>
          <span>L {fmtNumber(shown.low)}</span>
          <span>C {fmtNumber(shown.close)}</span>
          <span>Vol {fmtVolume(shown.volume)}</span>
          {overlays.ma20 && indicators && <span style={{ color: '#f59e0b' }}>MA20 {fmtNumber(lastOf(indicators.ma20))}</span>}
          {overlays.ma50 && indicators && <span style={{ color: '#a78bfa' }}>MA50 {fmtNumber(lastOf(indicators.ma50))}</span>}
          {overlays.rsi && indicators && <span>RSI {fmtNumber(lastOf(indicators.rsi))}</span>}
        </div>
      )}
      <div className="chart-host" ref={host}>
        {loading && !data && <div className="chart-msg">Loading chart...</div>}
        {error && !data && <div className="chart-msg">Chart unavailable: {error}</div>}
        {data && data.candles.length === 0 && <div className="chart-msg">No price data for this range.</div>}
      </div>
      {overlays.rsi && data && data.candles.length > 0 && <div className="chart-host rsi-host" ref={rsiHost} aria-label="RSI 14 pane" />}
      {data && data.candles.length > 0 && (
        <p className="muted small">Indicators are calculated from the bars shown for this timeframe (MA 20 and MA 50 need at least that many bars). Not financial advice.</p>
      )}
    </section>
  );
}
