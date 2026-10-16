'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import Icon from './Icon';

interface Result {
  symbol: string;
  name: string;
  type: string;
}

interface Props {
  placeholder?: string;
  /** Called with the chosen ticker. Defaults to navigating to the stock page. */
  onPick?: (symbol: string) => void;
}

export default function SymbolSearch({ placeholder = 'Search ticker or company', onPick }: Props) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const r = await api<Result[]>(`/api/search?q=${encodeURIComponent(q)}`);
        if (alive) setResults(r);
      } catch {
        if (alive) setResults([]);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (symbol: string) => {
    setValue('');
    setResults([]);
    setOpen(false);
    if (onPick) onPick(symbol);
    else router.push(`/stock/${encodeURIComponent(symbol)}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const typed = value.trim().toUpperCase();
    if (/^[A-Z0-9.\-^=]{1,15}$/.test(typed) && (results.length === 0 || results.some((r) => r.symbol === typed))) {
      pick(typed);
    } else if (results[0]) {
      pick(results[0].symbol);
    }
  };

  return (
    <div className="search" ref={box}>
      <form onSubmit={submit} role="search">
        <Icon name="search" size={16} />
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
      </form>
      {open && results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.symbol}>
              <button type="button" onClick={() => pick(r.symbol)}>
                <strong>{r.symbol}</strong>
                <span>{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
