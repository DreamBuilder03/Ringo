'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type PlaceDetails = {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  cuisineType: string;
  rating: number | null;
  userRatingCount: number | null;
  hours: string[] | null;
  openNow: boolean | null;
  photoUrl: string | null;
  businessStatus: string | null;
};

export default function ConfirmPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const placeId = sp.get('placeId');
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placeId) {
      router.replace('/demo');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/demo/places/details?placeId=${encodeURIComponent(placeId)}`);
        if (!res.ok) throw new Error('Failed to load place');
        const data = await res.json();
        setPlace(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [placeId, router]);

  async function confirm() {
    if (!place) return;
    setSubmitting(true);
    try {
      // Create (or re-use) a lead row with Places data
      const res = await fetch('/api/demo/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: place.placeId,
          restaurant_name: place.name,
          restaurant_address: place.address,
          restaurant_phone: place.phone,
          restaurant_website: place.website,
          cuisine_type: place.cuisineType,
          hours: place.hours,
          rating: place.rating,
          photo_url: place.photoUrl,
          status: 'confirmed',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      const q = new URLSearchParams({ leadId: data.leadId, placeId: place.placeId });
      router.push(`/demo/qualify?${q.toString()}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
        <div className="text-sm text-white/50">Looking up your restaurant…</div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="display text-3xl">We couldn&apos;t load that place.</h1>
        <p className="mt-3 text-white/60">{error || 'Try searching again.'}</p>
        <Link href="/demo" className="btn-ghost mt-8 inline-block">
          Back to search
        </Link>
      </div>
    );
  }

  const today = new Date().getDay();
  const weekdayOrder = [6, 0, 1, 2, 3, 4, 5]; // Google returns Mon-Sun starting at Monday
  const todayLine = place.hours?.[weekdayOrder[today]] || null;

  return (
    <section className="relative overflow-hidden">
      <div className="halo" />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <button
          onClick={() => router.push('/demo')}
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Different restaurant
        </button>

        <div className="fade-in grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div className="card overflow-hidden">
            {place.photoUrl ? (
              <div className="relative aspect-[16/10]">
                <img src={place.photoUrl} alt={place.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur">
                    <span className="live-dot" />
                    {place.openNow ? 'Open now' : place.businessStatus || 'Closed'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center bg-white/[0.03] text-white/30">
                No photo available
              </div>
            )}
            <div className="p-6">
              <h2 className="display text-3xl leading-tight">{place.name}</h2>
              <p className="mt-1 text-sm text-white/60">{place.address}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="chip">{place.cuisineType}</span>
                {place.rating ? (
                  <span className="chip">
                    <Star /> {place.rating.toFixed(1)}
                    {place.userRatingCount ? (
                      <span className="text-white/40">({place.userRatingCount})</span>
                    ) : null}
                  </span>
                ) : null}
                {todayLine ? <span className="chip">{todayLine}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <h1 className="display text-4xl leading-[1.05] sm:text-5xl">Is this your spot?</h1>
              <p className="mt-4 text-white/60">
                We&apos;ll build a one-time AI host for <span className="text-white">{place.name}</span> using its
                real hours and cuisine. Takes about 15 seconds.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-white/70">
                <li className="flex items-center gap-2"><Check /> Greets callers with your name</li>
                <li className="flex items-center gap-2"><Check /> Speaks English &amp; Spanish</li>
                <li className="flex items-center gap-2"><Check /> Walks through a real pay-before-prep order</li>
              </ul>
            </div>
            <div className="mt-10 flex flex-col gap-3">
              <button className="btn-primary" onClick={confirm} disabled={submitting}>
                {submitting ? 'Setting up…' : 'Yes, this is my restaurant'}
              </button>
              <button className="btn-ghost" onClick={() => router.push('/demo')} disabled={submitting}>
                Not my restaurant
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2Z" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
