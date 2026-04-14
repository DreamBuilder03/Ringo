'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const LOCATIONS = ['1', '2', '3', '4', '5', '6+'];
// Keep the list broad — we want prospects to see their POS no matter what they run.
// Integration status is handled separately; everything here can at least do call handoff / order SMS.
const POS = [
  'Square',
  'Toast',
  'Clover',
  'SpotOn',
  'Lightspeed',
  'TouchBistro',
  'Revel',
  'Aloha (NCR)',
  'Oracle MICROS',
  'Heartland',
  'HungerRush',
  'Upserve',
  'Lavu',
  'PAR Brink',
  'Other',
  'None / pen & paper',
];
const FEATURES = [
  '24/7 AI phone answering',
  'Takeout & pickup ordering',
  'Reservations',
  'Upsell & add-ons',
  'Bilingual (English & Spanish)',
];

type Step = 'locations' | 'pos' | 'features' | 'contact';

export default function QualifyPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const leadId = sp.get('leadId');
  const placeId = sp.get('placeId');

  const [step, setStep] = useState<Step>('locations');
  const [locations, setLocations] = useState<string>('');
  const [locationsCustom, setLocationsCustom] = useState<string>('');
  const [pos, setPos] = useState<string>('');
  const [features, setFeatures] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (f: string) =>
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const locationsValue = locations === '6+' ? locationsCustom.trim() : locations;
  const canNext =
    (step === 'locations' && !!locations && (locations !== '6+' || !!locationsCustom.trim())) ||
    (step === 'pos' && !!pos) ||
    (step === 'features' && features.length > 0) ||
    (step === 'contact' && !!fullName && !!phone && !!email);

  async function submit() {
    if (!leadId) {
      router.replace('/demo');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/demo/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          locations_count: locationsValue,
          pos_system: pos,
          features_interested: features,
          full_name: fullName,
          phone,
          email,
          status: 'qualified',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const q = new URLSearchParams({ leadId, ...(placeId ? { placeId } : {}) });
      router.push(`/demo/call?${q.toString()}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  function onPrimary() {
    if (step === 'locations') setStep('pos');
    else if (step === 'pos') setStep('features');
    else if (step === 'features') setStep('contact');
    else submit();
  }

  const stepIndex = ['locations', 'pos', 'features', 'contact'].indexOf(step);
  const progress = ((stepIndex + 1) / 4) * 100;

  return (
    <section className="relative overflow-x-hidden">
      <div className="halo" />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 h-[2px] w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full bg-white/80 transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="fade-in card p-8 md:p-10">
          {step === 'locations' && (
            <div className="space-y-8">
              <Question
                label="How many locations do you own?"
                hint="Answering helps us match you with the right rollout plan."
              />
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {LOCATIONS.map((l) => (
                  <button
                    key={l}
                    className="chip justify-center py-4 text-base"
                    data-selected={locations === l}
                    onClick={() => setLocations(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {locations === '6+' && (
                <div className="fade-in">
                  <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
                    Exactly how many?
                  </span>
                  <input
                    className="input max-w-xs"
                    inputMode="numeric"
                    placeholder="e.g. 12"
                    value={locationsCustom}
                    onChange={(e) => setLocationsCustom(e.target.value.replace(/[^0-9]/g, ''))}
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          {step === 'pos' && (
            <div className="space-y-8">
              <Question
                label="What POS system do you use?"
                hint="Don't see yours? Pick Other — we'll wire it up."
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {POS.map((p) => (
                  <button
                    key={p}
                    className="chip justify-center py-3 text-[13px]"
                    data-selected={pos === p}
                    onClick={() => setPos(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'features' && (
            <div className="space-y-8">
              <Question label="Which features most interest you?" hint="Select all that apply." />
              <div className="grid gap-3">
                {FEATURES.map((f) => (
                  <button
                    key={f}
                    className="chip justify-between py-4"
                    data-selected={features.includes(f)}
                    onClick={() => toggleFeature(f)}
                  >
                    <span>{f}</span>
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-md border"
                      style={{
                        borderColor: features.includes(f) ? 'var(--bone)' : 'rgba(245,242,236,0.18)',
                        background: features.includes(f) ? 'var(--bone)' : 'transparent',
                      }}
                    >
                      {features.includes(f) && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#0B0B0D" strokeWidth="3" className="h-3 w-3">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'contact' && (
            <div className="space-y-6">
              <Question
                label="Where should we send your demo?"
                hint="We'll text your call recording and a set-up link after."
              />
              <div className="grid gap-4">
                <Field label="Full name">
                  <input className="input" placeholder="Alex Rivera" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
                </Field>
                <Field label="Mobile number">
                  <input
                    className="input"
                    placeholder="(209) 555-1234"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                  />
                </Field>
                <Field label="Email">
                  <input
                    className="input"
                    placeholder="alex@therestaurant.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

          <div className="mt-10 flex items-center justify-between">
            <button
              className="text-sm text-white/50 transition hover:text-white disabled:opacity-30"
              disabled={stepIndex === 0 || submitting}
              onClick={() => {
                const prev = (['locations', 'pos', 'features', 'contact'] as Step[])[stepIndex - 1];
                if (prev) setStep(prev);
              }}
            >
              ← Back
            </button>
            <button className="btn-primary" onClick={onPrimary} disabled={!canNext || submitting}>
              {submitting
                ? 'Building your agent…'
                : step === 'contact'
                ? 'Build my demo agent →'
                : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Question({ label, hint }: { label: string; hint?: string }) {
  return (
    <div>
      <h2 className="display text-3xl leading-tight sm:text-4xl">{label}</h2>
      {hint ? <p className="mt-2 text-sm text-white/50">{hint}</p> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">{label}</span>
      {children}
    </label>
  );
}
