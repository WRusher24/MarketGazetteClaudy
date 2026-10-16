'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import Icon, { type IconName } from './Icon';
import ReaderDrawer from './ReaderDrawer';
import SymbolSearch from './SymbolSearch';
import Ticker from './Ticker';
import { THEMES, useTheme } from './Providers';

const NAV: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', short: 'Home', icon: 'dashboard' },
  { href: '/feed', label: 'Gazette Feed', short: 'Gazette', icon: 'feed' },
  { href: '/newsroom', label: 'Newsroom', short: 'News', icon: 'newsroom' },
  { href: '/watchlist', label: 'Watchlist', short: 'Watch', icon: 'watchlist' },
  { href: '/analyst', label: 'AI Analyst', short: 'AI', icon: 'ai' },
  { href: '/settings', label: 'Settings', short: 'Settings', icon: 'settings' },
];

const THEME_ICON: Record<string, IconName> = { light: 'sun', dark: 'moon', terminal: 'terminal' };

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-switch" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={theme === t.id ? 'active' : ''}
          onClick={() => setTheme(t.id)}
          title={t.label}
          aria-label={t.label}
          aria-pressed={theme === t.id}
        >
          <Icon name={THEME_ICON[t.id]} size={16} />
        </button>
      ))}
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('mg-sidebar') === 'collapsed');
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem('mg-sidebar', c ? 'open' : 'collapsed');
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  };

  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className={`app ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <span className="brand-mark">MG</span>
          <span className="brand-name">MarketGazette</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={active(n.href) ? 'active' : ''} title={n.label}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <button type="button" className="collapse-btn" onClick={toggle} aria-label="Toggle sidebar">
          <span style={{ display: 'inline-flex', transform: collapsed ? 'rotate(180deg)' : 'none' }}>
            <Icon name="chevron" />
          </span>
          <span>Collapse</span>
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <Link href="/" className="brand brand-mobile">
            <span className="brand-mark">MG</span>
            <span className="brand-name">MarketGazette</span>
          </Link>
          <SymbolSearch />
          <ThemeSwitcher />
        </header>
        <Ticker />
        <main className="content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={active(n.href) ? 'active' : ''}>
            <Icon name={n.icon} size={20} />
            <span>{n.short}</span>
          </Link>
        ))}
      </nav>

      <ReaderDrawer />
    </div>
  );
}
