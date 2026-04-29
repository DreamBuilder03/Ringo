'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Place = {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  cuisineType: string;
  hours: string[] | null;
  photoUrl: string | null;
  website?: string | null;
};

type CallState = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

const PROMPTS = [
  { icon: '🛒', label: 'Place a test order' },
  { icon: '📅', label: 'Ask about hours' },
  { icon: '❓', label: 'Ask what\u2019s on the menu' },
  { icon: '🌮', label: 'Order in Spanish' },
];

export default function CallPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const leadId = sp.get('leadId');
  const placeId = sp.get('placeId');

  const [place, setPlace] = useState<Place | null>(null);
  const [language, setLanguage] = useState<'en' | 'es' | 'multi'>('en');
  const [callState, setCallState] = useState<CallState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'browser' | 'phone'>('browser');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneResult, setPhoneResult] = useState<string | null>(null);
  const clientRef = useRef<unknown>(null);

  useEffect(() => {
    if (!placeId) {
      router.replace('/demo');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/demo/places/details?placeId=${encodeURIComponent(placeId)}`);
        if (!res.ok) throw new Error('Could not load restaurant');
        const d = await res.json();
        setPlace(d);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [placeId, router]);

  async function startBrowserCall() {
    if (!place) return;
    setError(null);
    setCallState('connecting');
    try {
      const res = await fetch('/api/demo/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          language,
          restaurantName: place.name,
          cuisineType: place.cuisineType,
          address: place.address,
          phone: place.phone,
          hours: place.hours,
          website: place.website,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create session');

      if (data.demo_mode) {
        // Friendly fallback when Retell keys aren't set yet (local dev).
        setError('Demo voice not configured yet. Ask Misael to set RETELL_API_KEY + RETELL_DEMO_AGENT_ID in Vercel.');
        setCallState('error');
        return;
      }

      // Lazy-load the Retell web SDK so the server bundle doesn't import browser-only code.
      const { RetellWebClient } = await import('retell-client-js-sdk');
      const client = new RetellWebClient();
      clientRef.current = client;

      client.on('call_started', () => setCallState('live'));
      client.on('call_ended', () => setCallState('ended'));
      client.on('error', (err: unknown) => {
        console.error('Retell client error', err);
        setError('Call dropped. Try again?');
        setCallState('error');
        try { client.stopCall(); } catch {}
      });

      await client.startCall({ accessToken: data.access_token });
    } catch (e) {
      console.error(e);
      setError((e as Error).message || 'Could not start call');
      setCallState('error');
    }
  }

  function endBrowserCall() {
    try {
      const client = clientRef.current as { stopCall: () => void } | null;
      client?.stopCall();
    } catch {}
    setCallState('ended');
  }

  async function startPhoneCall() {
    if (!place) return;
    setPhoneResult(null);
    setPhoneSubmitting(true);
    try {
      const res = await fetch('/api/demo/create-phone-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          language,
          restaurantName: place.name,
          cuisineType: place.cuisineType,
          address: place.address,
          phone: place.phone,
          hours: place.hours,
          website: place.website,
          toNumber: phoneNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place call');
      setPhoneResult(`OMRI is calling ${phoneNumber} now. Answer and it's live.`);
    } catch (e) {
      setPhoneResult((e as Error).message);
    } finally {
      setPhoneSubmitting(false);
    }
  }

  if (!place) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center text-sm text-bone/50">
        {error || 'Loading…'}
      </div>
    );
  }

  return (
    <section className="relative overflow-x-hidden">
      <div className="halo" />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="fade-in mx-auto max-w-xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-bone/10 bg-bone/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-bone/60">
            <span className="live-dot" /> Ready when you are
          </div>
          <h1 className="display text-4xl leading-tight sm:text-5xl">
            Call {place.name}&apos;s<br />
            <span className="italic text-bone/70">AI phone agent</span>
          </h1>
          <p className="mt-4 text-bone/60">
            Try a live conversation with a OMRI host built for {place.cuisineType.toLowerCase()}.
          </p>
        </div>

        {/* Language + mode toggles */}
        <div className="fade-in mt-10 flex flex-wrap items-center justify-center gap-3">
          <Toggle
            label="English"
            selected={language === 'en'}
            onClick={() => setLanguage('en')}
          />
          <Toggle
            label="Español"
            selected={language === 'es'}
            onClick={() => setLanguage('es')}
          />
          <Toggle
            label="Bilingual"
            selected={language === 'multi'}
            onClick={() => setLanguage('multi')}
          />
          <span className="mx-2 text-bone/20">|</span>
          <Toggle label="Browser call" selected={mode === 'browser'} onClick={() => setMode('browser')} />
          <Toggle label="Call my phone" selected={mode === 'phone'} onClick={() => setMode('phone')} />
        </div>

        {/* Main CTA card */}
        <div className="fade-in mx-auto mt-10 max-w-xl">
          <div className="card p-10 text-center">
            {mode === 'browser' ? (
              <>
                {callState === 'idle' || callState === 'error' || callState === 'ended' ? (
                  <button onClick={startBrowserCall} className="call-btn mx-auto" aria-label="Start call">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                      <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.05-.24 11.36 11.36 0 0 0 3.58.57 1 1 0 0 1 1 1v3.41a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.41a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.58 1 1 0 0 1-.24 1.05z" />
                    </svg>
                  </button>
                ) : (
                  <button onClick={endBrowserCall} className="call-btn mx-auto bg-bone text-bone" aria-label="End call">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85a.996.996 0 0 1-1.41 0l-2.1-2.1a.99.99 0 0 1 0-1.41A13.9 13.9 0 0 1 12 7c4.84 0 9.15 2.22 11.66 6.19.37.56.32 1.3-.18 1.79l-2.11 2.11a.996.996 0 0 1-1.41 0 10.83 10.83 0 0 0-2.66-1.85.97.97 0 0 1-.56-.9v-3.1A15.53 15.53 0 0 0 12 9Z" />
                    </svg>
                  </button>
                )}
                <p className="mt-6 text-sm text-bone/60">
                  {callState === 'idle' && 'Tap to start a live call'}
                  {callState === 'connecting' && 'Connecting…'}
                  {callState === 'live' && 'Call in progress'}
                  {callState === 'ended' && 'Call ended. Want to try again?'}
                  {callState === 'error' && (error || 'Something went wrong')}
                </p>
              </>
            ) : (
              <div className="space-y-4 text-left">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-bone/50">Your mobile number</span>
                  <input
                    className="input"
                    placeholder="(209) 555-1234"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    inputMode="tel"
                  />
                </label>
                <button
                  className="btn-primary w-full"
                  onClick={startPhoneCall}
                  disabled={!phoneNumber || phoneSubmitting}
                >
                  {phoneSubmitting ? 'Dialing…' : `Call me as ${place.name}`}
                </button>
                {phoneResult && <p className="text-sm text-bone/60">{phoneResult}</p>}
                <p className="text-xs text-bone/40">
                  OMRI will call from a local number. Standard carrier rates may apply.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="fade-in mx-auto mt-10 max-w-2xl">
          <p className="mb-3 text-center text-xs uppercase tracking-[0.14em] text-bone/50">
            Try one of these
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PROMPTS.map((p) => (
              <div key={p.label} className="chip justify-start">
                <span>{p.icon}</span>
                <span className="text-[13px]">{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="fade-in mx-auto mt-16 max-w-xl text-center text-sm text-bone/50">
          <p>
            Want to make this your real phone line?{' '}
            <a href="/book" className="underline hover:text-bone">
              Book a 15-minute setup call
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

function Toggle({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button className="chip" data-selected={selected} onClick={onClick}>
      {label}
    </button>
  );
}
