'use client';

import { fmtCompactUsd, fmtNumber } from '@/lib/format';
import type { AllocationSlice } from '@/lib/portfolio';

/** Horizontal share bars. Colours step around the hue wheel so neighbouring slices stay distinct. */
export default function AllocationChart({ slices, label }: { slices: AllocationSlice[]; label: string }) {
  if (!slices.length) return <p className="muted">Allocation appears once positions have live prices.</p>;
  return (
    <ul className="alloc" aria-label={`Allocation by ${label}`}>
      {slices.map((s, i) => (
        <li key={s.label}>
          <div className="alloc-head">
            <span>{s.label}</span>
            <span className="muted small">
              {fmtNumber(s.weight)}% · {fmtCompactUsd(s.value)}
            </span>
          </div>
          <div className="alloc-track" role="presentation">
            <div className="alloc-bar" style={{ width: `${Math.max(0.5, s.weight)}%`, background: `hsl(${(i * 47) % 360} 65% 55%)` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
