'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { AskAnswer, AskSource } from '@/lib/ask';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  citations?: AskSource[];
  missing?: string[];
}

const HISTORY_TURNS = 6;

/** Chat about one stock. Answers come from live data and cite the figures and headlines they used. */
export default function AskAnalyst({ symbol }: { symbol: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [symbol]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || pending) return;
    // Only the most recent turns are sent, so the prompt stays small and cheap.
    const history = messages.slice(-HISTORY_TURNS).map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setPending(true);
    setError(null);
    try {
      const res = await api<AskAnswer & { missing: string[] }>('/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ symbol, question, history }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.answer, citations: res.citations, missing: res.missing }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The analyst could not answer');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="card ask">
      <div className="section-head">
        <h2>Ask the Analyst: {symbol}</h2>
        {messages.length > 0 && (
          <button type="button" className="link-btn" onClick={() => setMessages([])} disabled={pending}>
            Clear
          </button>
        )}
      </div>

      {messages.length === 0 && !pending && (
        <p className="muted small">Ask about the latest news, earnings, valuation or analyst views. Answers use live data and list the sources they used.</p>
      )}

      <div className="ask-log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`ask-msg ask-${m.role}`}>
            <p>{m.text}</p>
            {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
              <ul className="ask-sources">
                {m.citations.map((c) => (
                  <li key={c.id}>
                    <span className="badge">{c.id}</span>{' '}
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noopener noreferrer">
                        {c.label}
                      </a>
                    ) : (
                      <span>{c.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {m.role === 'assistant' && m.missing && m.missing.length > 0 && (
              <p className="muted small">Not available right now: {m.missing.join(', ')}.</p>
            )}
          </div>
        ))}
        {pending && <p className="muted small">Thinking from the latest data...</p>}
      </div>

      {error && <p className="error small" role="alert">{error}</p>}

      <form className="ask-form" onSubmit={send}>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${symbol}`}
          maxLength={500}
          aria-label={`Ask a question about ${symbol}`}
          disabled={pending}
        />
        <button type="submit" className="btn" disabled={pending || !input.trim()}>
          Ask
        </button>
      </form>
      <p className="muted small">AI-generated from live data. Not financial advice.</p>
    </section>
  );
}
