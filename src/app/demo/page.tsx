'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = { placeId: string; mainText: string; secondaryText: string };

function useSessionToken() {
  const ref = useRef<string | null>(null);
  if (!ref.current) {
    ref.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
  }
  return ref.current;
}

export default function DemoHero() {
  const router = useRouter();
  const sessionToken = useSessionToken();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoRef = useRef<{ lat: number; lng: number } | null>(null);

  // Ask for browser geolocation once on mount. If denied, we fall back to Vercel IP geo server-side.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => {
        /* denied or failed — server will fall back to IP geo */
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 }
    );
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input || input.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/demo/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: input.trim(),
            sessionToken,
            lat: geoRef.current?.lat,
            lng: geoRef.current?.lng,
          }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setOpen(true);
        setActive(0);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, sessionToken]);

  function select(s: Suggestion) {
    router.push(`/demo/confirm?placeId=${encodeURIComponent(s.placeId)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <section className="relative overflow-x-hidden">
      <div className="halo" />
      <div className="grain" />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-20 md:pt-28">
        <div className="fade-in flex flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-bone/10 bg-bone/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-bone/60">
            <span className="live-dot" /> Live demo, under a minute
          </span>
          <h1
            className="display text-5xl leading-[0.95] sm:text-6xl md:text-7xl"
          >
            Hear Ringo answer
            <br />
            <span className="italic text-bone/70">your</span> restaurant.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] text-bone/60 sm:text-base">
            Type your restaurant&apos;s name. We&apos;ll spin up a live AI host that sounds like <em className="italic">you</em> — then call you for a real test run.
          </p>
        </div>

        <div className="fade-in mt-10 w-full max-w-xl">
          <div className="relative">
            <div className="relative flex items-center">
              <svg
                className="pointer-events-none absolute left-5 h-5 w-5 text-bone/40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                className="input !pl-12 !py-4 text-base"
                placeholder="Search for your restaurant…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => input && setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={onKeyDown}
                autoFocus
                aria-label="Search for your restaurant"
              />
              {loading && (
                <svg className="absolute right-5 h-5 w-5 animate-spin text-bone/40" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
            </div>

            {open && suggestions.length > 0 && (
              <div className="suggestions absolute left-0 right-0 top-[calc(100%+8px)] z-20">
                {suggestions.map((s, i) => (
                  <div
                    key={s.placeId}
                    className="suggestion-row"
                    data-active={i === active}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(s);
                    }}
                  >
                    <div className="text-[15px] font-medium">{s.mainText}</div>
                    <div className="text-sm text-bone/50">{s.secondaryText}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-bone/40">
            Powered by Google. We only use your search to personalize the demo.
          </p>
        </div>

        <div className="fade-in mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-bone/50">
          <div className="flex items-center gap-2">
            <Check /> Bilingual: English &amp; Spanish
          </div>
          <div className="flex items-center gap-2">
            <Check /> 24/7 answering, pay-before-prep
          </div>
          <div className="flex items-center gap-2">
            <Check /> Works with Square, Toast, Clover
          </div>
        </div>
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
