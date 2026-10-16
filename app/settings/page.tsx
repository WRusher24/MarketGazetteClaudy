'use client';

import { THEMES, useTheme } from '@/components/Providers';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>
      <section className="card">
        <div className="section-head">
          <h2>Theme</h2>
        </div>
        <div className="theme-cards">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`theme-card theme-${t.id} ${theme === t.id ? 'active' : ''}`}
              onClick={() => setTheme(t.id)}
              aria-pressed={theme === t.id}
            >
              <strong>{t.label}</strong>
              <span>{t.blurb}</span>
            </button>
          ))}
        </div>
        <p className="muted small">Your choice is remembered on this device.</p>
      </section>
      <section className="card">
        <div className="section-head">
          <h2>Data sources</h2>
        </div>
        <ul className="plain">
          <li>News: Yahoo Finance RSS and Finnhub company news</li>
          <li>Quotes and fundamentals: Finnhub (Yahoo Finance as fallback)</li>
          <li>Charts: Yahoo Finance market data</li>
          <li>AI: Google Gemini</li>
          <li>Storage: Neon PostgreSQL (watchlist, vault, notes)</li>
        </ul>
        <p className="muted small">Market data may be delayed. Nothing here is investment advice.</p>
      </section>
    </div>
  );
}
