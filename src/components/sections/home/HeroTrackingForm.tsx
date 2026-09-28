'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';

export default function HeroTrackingForm() {
  const [trackingInput, setTrackingInput] = useState('');
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const container = trackingInput.trim();
    if (!container) {
      router.push('/tracking');
      return;
    }

    const params = new URLSearchParams({ container });
    router.push(`/tracking?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto relative group">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[var(--accent-gold)]/20 to-blue-500/20 blur-xl opacity-70 transition-all duration-300 group-hover:opacity-100" />
      <div className="relative flex items-center rounded-2xl border border-[var(--border)] bg-white p-2 shadow-xl shadow-slate-900/5 focus-within:border-[var(--accent-gold)]">
        <div className="pl-4 text-[var(--text-secondary)]">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={trackingInput}
          onChange={(event) => setTrackingInput(event.target.value)}
          placeholder="Enter container number (e.g., UETU6059142)"
          aria-label="Container number"
          className="w-full bg-transparent px-4 py-3 text-base font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-gold)] px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
        >
          Track
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}