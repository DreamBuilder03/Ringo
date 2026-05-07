// ──────────────────────────────────────────────────────────────────────────────
// OnboardingFlow — shared component for /onboarding (real) and /onboarding/demo.
//
// `demoMode` short-circuits all the real-world side effects:
//   - handleCreateAccount: skips supabase.auth.signUp; advances after 800ms
//   - handleComplete: skips restaurant insert / LC menu seed / welcome email /
//     Stripe checkout; advances to success step after 800ms
//
// Everything else (UI, state, validation, brand picker, bilingual toggle) is
// IDENTICAL between the two routes. One source of truth — change the real flow,
// the demo updates automatically.
//
// Demo mode also:
//   - Renders a yellow banner at the top so it's obvious you're not on prod
//   - Replaces the "Go to Your Dashboard" button on Step 4 with "Restart Demo"
//   - Skips the "Already have an account? Sign in" link (don't push demo
//     testers to the real login)
// ──────────────────────────────────────────────────────────────────────────────

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { POS_OPTIONS, PRICING_TIERS } from '@/lib/constants';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Phone,
  Utensils,
  CreditCard,
  PartyPopper,
  UserPlus,
  Shield,
  Zap,
  Clock,
  TrendingUp,
  Headphones,
  Sparkles,
  PhoneCall,
  RotateCcw,
  TestTube2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { label: 'Account', icon: UserPlus },
  { label: 'Restaurant', icon: Utensils },
  { label: 'POS', icon: Phone },
  { label: 'Plan', icon: CreditCard },
  { label: 'Ready', icon: PartyPopper },
];

const INITIAL_FORM = {
  email: '',
  password: '',
  fullName: '',
  restaurantName: '',
  address: '',
  phone: '',
  posType: 'none',
  planTier: 'growth',
  brand: 'independent',
  bilingual: false,
};

export interface OnboardingFlowProps {
  /** When true, all backend writes (Supabase auth, restaurant insert, Stripe,
   *  welcome email) are skipped. The flow advances visually and the success
   *  step shows a "Restart Demo" button instead of the dashboard link. */
  demoMode?: boolean;
}

export function OnboardingFlow({ demoMode = false }: OnboardingFlowProps) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'brand' && value !== prev.brand && value !== 'independent') {
        if (prev.posType === 'none') next.posType = 'none';
      }
      return next;
    });
    setError('');
  }

  function restartDemo() {
    setForm(INITIAL_FORM);
    setStep(0);
    setError('');
    setLoading(false);
  }

  async function handleCreateAccount() {
    setLoading(true);
    setError('');

    // ─── DEMO MODE — skip real auth ────────────────────────────────────────
    if (demoMode) {
      await new Promise((r) => setTimeout(r, 800));
      setLoading(false);
      setStep(1);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName },
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        setLoading(false);
        setStep(1);
      } else {
        setError('Please check your email to confirm your account, then try again.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  async function handleComplete() {
    setLoading(true);
    setError('');

    // ─── DEMO MODE — skip restaurant insert / LC seed / Stripe / email ───
    if (demoMode) {
      await new Promise((r) => setTimeout(r, 800));
      setLoading(false);
      setStep(4);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Please sign in to continue.');
        setLoading(false);
        return;
      }

      const isFranchiseBrand = form.brand !== 'independent';

      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: form.restaurantName,
          address: form.address,
          phone: form.phone,
          pos_type: form.posType,
          pos_mode: isFranchiseBrand ? 'handoff_tablet' : 'direct_api',
          plan_tier: form.planTier,
          brand: form.brand,
          preferred_language: form.bilingual ? 'bilingual' : 'en',
          owner_user_id: user.id,
        })
        .select()
        .single();

      if (restaurantError) {
        console.error('Restaurant creation error:', restaurantError);
        setError('Failed to create restaurant. Please try again.');
        setLoading(false);
        return;
      }

      // B2 of LC sprint: pre-seed the LC master menu when brand is little_caesars.
      if (form.brand === 'little_caesars') {
        try {
          const { data: copied, error: cloneError } = await supabase
            .rpc('clone_lc_master_menu_to', { p_restaurant_id: restaurant.id });
          if (cloneError) {
            console.warn('LC menu seed failed (non-fatal):', cloneError.message);
          } else {
            console.log(`LC master menu seeded: ${copied} items copied to ${restaurant.id}`);
          }
        } catch (cloneErr) {
          console.warn('LC menu seed threw (non-fatal):', cloneErr);
        }
      }

      await supabase
        .from('profiles')
        .update({ full_name: form.fullName })
        .eq('id', user.id);

      try {
        await fetch('/api/emails/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            restaurantName: form.restaurantName,
            ownerName: form.fullName,
            ownerEmail: form.email,
          }),
        });
      } catch (emailErr) {
        console.warn('Welcome email send failed:', emailErr);
      }

      // If Enterprise, skip Stripe (contact sales flow)
      if (form.planTier === 'pro') {
        setLoading(false);
        setStep(4);
        return;
      }

      // For paid plans, redirect to Stripe Checkout
      const selectedPlan = PRICING_TIERS.find((p) => p.tier === form.planTier);
      if (selectedPlan?.stripePriceId) {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            priceId: selectedPlan.stripePriceId,
            planTier: form.planTier,
          }),
        });

        if (res.ok) {
          const { url } = await res.json();
          if (url) {
            window.location.href = url;
            return;
          }
        }
        console.warn('Stripe checkout creation failed, proceeding without payment');
      }

      setLoading(false);
      setStep(4);
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  const plans = [
    {
      tier: 'starter',
      name: 'Starter',
      price: '$799',
      desc: 'Voice AI ordering',
      features: ['Voice AI Agent', 'SMS payment links', 'Dashboard & analytics', 'Bilingual (EN/ES)'],
      popular: false,
    },
    {
      tier: 'growth',
      name: 'Growth',
      price: '$1,499',
      desc: 'Full automation',
      features: ['Everything in Starter', 'POS integration', 'Smart upselling', 'Priority support', 'Custom voice'],
      popular: true,
    },
    {
      tier: 'pro',
      name: 'Enterprise',
      price: 'Custom',
      desc: 'Multi-location',
      features: ['Everything in Growth', 'Unlimited calls', 'Dedicated manager', 'Custom integrations'],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-omri-dark text-foreground">
      {/* DEMO MODE banner — sticky top, very obvious */}
      {demoMode && (
        <div className="sticky top-0 z-50 bg-omri-amber/15 border-b border-omri-amber/30 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <TestTube2 className="h-4 w-4 text-omri-amber flex-shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-bone truncate">
                Demo mode &mdash; nothing is saved. Repeat as many times as you want.
              </p>
            </div>
            <button
              onClick={restartDemo}
              className="flex items-center gap-1.5 text-xs font-semibold text-bone hover:text-omri-amber transition-colors flex-shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </button>
          </div>
        </div>
      )}

      {/* Grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Gradient blobs */}
      <div className="fixed top-20 left-1/4 w-[400px] h-[400px] bg-omri-teal/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-[300px] h-[300px] bg-bone/5 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-omri-teal mb-2">OMRI</h1>
            <p className="text-sm text-bone/40">
              {demoMode
                ? 'Walk through the flow as a prospect would. No data saved.'
                : 'Set up your AI phone agent in under 2 minutes'}
            </p>
          </div>

          {/* Step Progress */}
          <div className="flex items-center justify-center gap-1.5 mb-10">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'flex items-center justify-center h-10 w-10 rounded-xl text-xs font-bold transition-all duration-500',
                    i < step
                      ? 'bg-omri-teal text-bone shadow-lg shadow-omri-teal/20'
                      : i === step
                      ? 'bg-omri-teal/10 text-omri-teal border-2 border-omri-teal/50'
                      : 'bg-bone/[0.04] text-bone/20 border border-bone/[0.06]'
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    'w-8 sm:w-12 h-0.5 rounded-full transition-all duration-500',
                    i < step ? 'bg-omri-teal' : 'bg-bone/[0.06]'
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content Card */}
          <div className="rounded-2xl border border-bone/[0.08] bg-bone/[0.02] backdrop-blur-sm p-8 shadow-2xl shadow-obsidian/20 animate-fade-in">

            {/* Step 0: Account */}
            {step === 0 && (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-omri-teal/10 flex items-center justify-center mb-4">
                    <UserPlus className="h-7 w-7 text-omri-teal" />
                  </div>
                  <h2 className="text-xl font-bold text-bone">Create your account</h2>
                  <p className="text-sm text-bone/40 mt-1">
                    {demoMode
                      ? 'Email and password go nowhere &mdash; type anything.'
                      : 'This will be your OMRI dashboard login'}
                  </p>
                </div>
                <Input
                  id="fullName"
                  label="Full Name"
                  placeholder="John Smith"
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  required
                />
                <Input
                  id="email"
                  label="Work Email"
                  type="email"
                  placeholder={demoMode ? 'demo@example.com' : 'john@myrestaurant.com'}
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
                <Input
                  id="password"
                  label="Password"
                  type="password"
                  placeholder={demoMode ? 'anything (not stored)' : 'Min 6 characters'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  minLength={6}
                  required
                />

                {error && (
                  <div className="rounded-xl bg-bone/10 border border-bone/20 px-4 py-3 text-sm text-bone">
                    {error}
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCreateAccount}
                  loading={loading}
                  disabled={!form.fullName || !form.email || form.password.length < 6}
                >
                  {demoMode ? 'Continue (demo)' : 'Create Account'} <ArrowRight className="h-4 w-4" />
                </Button>

                {!demoMode && (
                  <p className="text-center text-xs text-bone/30">
                    Already have an account?{' '}
                    <button onClick={() => router.push('/login')} className="text-omri-teal hover:text-omri-teal-light transition-colors">
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* Step 1: Restaurant */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-omri-amber/10 flex items-center justify-center mb-4">
                    <Utensils className="h-7 w-7 text-omri-amber" />
                  </div>
                  <h2 className="text-xl font-bold text-bone">Your restaurant</h2>
                  <p className="text-sm text-bone/40 mt-1">OMRI will use this to answer calls accurately</p>
                </div>
                <Input
                  id="restaurantName"
                  label="Restaurant Name"
                  placeholder="Mario's Pizza"
                  value={form.restaurantName}
                  onChange={(e) => updateField('restaurantName', e.target.value)}
                  required
                />
                <Input
                  id="address"
                  label="Address"
                  placeholder="123 Main St, Austin, TX 78701"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  required
                />
                <Input
                  id="phone"
                  label="Restaurant Phone"
                  placeholder="(512) 555-1234"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  required
                />

                {/* Brand picker — pre-seeds the menu when a franchise is picked */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-bone/60 mb-2">
                    Brand
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: 'independent',   label: 'Independent',     desc: 'Custom menu' },
                      { v: 'little_caesars',label: 'Little Caesars',  desc: 'Menu pre-loaded' },
                      { v: 'dominos',       label: 'Domino’s',   desc: 'Menu pre-loaded soon' },
                      { v: 'pizza_hut',     label: 'Pizza Hut',       desc: 'Menu pre-loaded soon' },
                      { v: 'papa_johns',    label: 'Papa John’s',desc: 'Menu pre-loaded soon' },
                      { v: 'wingstop',      label: 'Wingstop',        desc: 'Menu pre-loaded soon' },
                    ].map((b) => (
                      <button
                        key={b.v}
                        type="button"
                        onClick={() => updateField('brand', b.v)}
                        className={cn(
                          'rounded-xl border p-3 text-left transition-all duration-200',
                          form.brand === b.v
                            ? 'border-omri-teal/50 bg-omri-teal/[0.05] shadow-lg shadow-omri-teal/10'
                            : 'border-bone/[0.06] bg-bone/[0.02] hover:border-bone/[0.12] hover:bg-bone/[0.04]'
                        )}
                      >
                        <p className="text-sm font-bold text-bone">{b.label}</p>
                        <p className="text-[10px] text-bone/30 mt-0.5">{b.desc}</p>
                        {form.brand === b.v && (
                          <Check className="h-3.5 w-3.5 text-omri-teal mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                  {form.brand === 'little_caesars' && (
                    <p className="text-[10px] text-omri-teal mt-2">
                      &#10003; Hot-N-Ready, Stuffed Crust, Crazy Bread, Wings, drinks &amp; combos pre-seeded automatically.
                    </p>
                  )}
                  {form.brand !== 'independent' && form.brand !== 'little_caesars' && (
                    <p className="text-[10px] text-bone/40 mt-2">
                      You&rsquo;ll start with a blank menu &mdash; paste yours into Settings later. Master menu coming soon.
                    </p>
                  )}
                </div>

                {/* Bilingual toggle */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => updateField('bilingual', !form.bilingual)}
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-all duration-200 flex items-start gap-3',
                      form.bilingual
                        ? 'border-omri-teal/50 bg-omri-teal/[0.05] shadow-lg shadow-omri-teal/10'
                        : 'border-bone/[0.06] bg-bone/[0.02] hover:border-bone/[0.12]'
                    )}
                  >
                    <div className={cn(
                      'flex-shrink-0 mt-0.5 h-5 w-9 rounded-full border transition-colors flex items-center',
                      form.bilingual ? 'bg-omri-teal border-omri-teal' : 'bg-bone/10 border-bone/20'
                    )}>
                      <div className={cn(
                        'h-4 w-4 rounded-full bg-bone transition-transform',
                        form.bilingual ? 'translate-x-4' : 'translate-x-0.5'
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-bone">Bilingual (English + Spanish)</p>
                      <p className="text-[11px] text-bone/40 mt-0.5">
                        Agent auto-detects caller language and switches mid-call. Recommended for areas with Spanish-speaking customers.
                      </p>
                    </div>
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setStep(0)} className="flex-1 border border-bone/[0.08]">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    className="flex-1"
                    disabled={!form.restaurantName || !form.address || !form.phone}
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: POS */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-bone/10 flex items-center justify-center mb-4">
                    <Phone className="h-7 w-7 text-bone" />
                  </div>
                  <h2 className="text-xl font-bold text-bone">Connect your POS</h2>
                  <p className="text-sm text-bone/40 mt-1">Orders go straight to your kitchen &mdash; zero manual entry</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {POS_OPTIONS.map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => updateField('posType', pos.value)}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-all duration-200',
                        form.posType === pos.value
                          ? 'border-omri-teal/50 bg-omri-teal/[0.05] shadow-lg shadow-omri-teal/10'
                          : 'border-bone/[0.06] bg-bone/[0.02] hover:border-bone/[0.12] hover:bg-bone/[0.04]'
                      )}
                    >
                      <p className="text-sm font-bold text-bone">{pos.label}</p>
                      {pos.value !== 'none' && (
                        <p className="text-[10px] text-bone/30 mt-0.5">Auto-sync orders</p>
                      )}
                      {form.posType === pos.value && (
                        <Check className="h-3.5 w-3.5 text-omri-teal mt-1" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-bone/20 text-center">
                  Don&rsquo;t worry &mdash; you can connect your POS later from Settings.
                </p>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 border border-bone/[0.08]">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1">
                    {form.posType === 'none' ? 'Skip' : 'Continue'} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Plan */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-omri-teal/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-7 w-7 text-omri-teal" />
                  </div>
                  <h2 className="text-xl font-bold text-bone">Choose your plan</h2>
                  <p className="text-sm text-bone/40 mt-1">14-day free trial on all plans. No credit card needed.</p>
                </div>

                <div className="space-y-3">
                  {plans.map((plan) => (
                    <button
                      key={plan.tier}
                      onClick={() => updateField('planTier', plan.tier)}
                      className={cn(
                        'w-full rounded-xl border p-5 text-left transition-all duration-200 relative',
                        form.planTier === plan.tier
                          ? 'border-omri-teal/50 bg-omri-teal/[0.05] shadow-lg shadow-omri-teal/10'
                          : 'border-bone/[0.06] bg-bone/[0.02] hover:border-bone/[0.12]'
                      )}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2.5 right-4 rounded-full bg-omri-teal px-3 py-0.5 text-[10px] font-bold text-bone shadow-lg shadow-omri-teal/30">
                          RECOMMENDED
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-base font-bold text-bone">{plan.name}</p>
                          <p className="text-xs text-bone/30">{plan.desc}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-bone">{plan.price}</p>
                          {plan.price !== 'Custom' && <p className="text-[10px] text-bone/30">/month</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan.features.map((f) => (
                          <span key={f} className="text-[10px] font-medium text-bone/40 bg-bone/[0.04] rounded-full px-2.5 py-0.5">
                            {f}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="rounded-xl bg-bone/10 border border-bone/20 px-4 py-3 text-sm text-bone">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 border border-bone/[0.08]">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleComplete} loading={loading} className="flex-1">
                    {demoMode ? 'Finish demo' : 'Start Free Trial'} <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 4 && (
              <div className="text-center py-6 space-y-6">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 bg-omri-teal/15 rounded-full blur-xl" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-omri-teal to-bone flex items-center justify-center shadow-2xl shadow-omri-teal/30">
                    <Check className="h-12 w-12 text-bone" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-bone">
                    {demoMode
                      ? `Demo complete${form.fullName ? ', ' + form.fullName.split(' ')[0] : ''}!`
                      : `Welcome aboard, ${form.fullName.split(' ')[0]}!`}
                  </h2>
                  <p className="text-sm text-bone/40 mt-2 max-w-sm mx-auto">
                    {demoMode ? (
                      <>You walked the full flow for <strong className="text-bone">{form.restaurantName || 'a restaurant'}</strong>. Brand: <strong className="text-bone">{form.brand.replace(/_/g, ' ')}</strong>. Bilingual: <strong className="text-bone">{form.bilingual ? 'on' : 'off'}</strong>. Plan: <strong className="text-bone">{form.planTier}</strong>. Reset to test another path.</>
                    ) : (
                      <>Your AI agent for <strong className="text-bone">{form.restaurantName}</strong> is being set up. You&rsquo;ll be live in minutes.</>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Zap, label: 'Instant setup', color: 'text-omri-teal' },
                    { icon: PhoneCall, label: '24/7 answering', color: 'text-omri-amber' },
                    { icon: TrendingUp, label: 'Smart upsells', color: 'text-bone' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-bone/[0.03] border border-bone/[0.06] p-3">
                      <item.icon className={cn('h-5 w-5 mx-auto mb-1.5', item.color)} />
                      <p className="text-[10px] font-semibold text-bone/40">{item.label}</p>
                    </div>
                  ))}
                </div>

                {demoMode ? (
                  <div className="space-y-2">
                    <Button
                      size="lg"
                      onClick={restartDemo}
                      className="w-full shadow-xl shadow-omri-teal/20"
                    >
                      <RotateCcw className="h-4 w-4" /> Restart demo
                    </Button>
                    <button
                      onClick={() => router.push('/onboarding')}
                      className="w-full text-xs text-bone/40 hover:text-bone transition-colors py-2"
                    >
                      Go to the real onboarding &rarr;
                    </button>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => router.push('/dashboard')}
                    className="w-full shadow-xl shadow-omri-teal/20"
                  >
                    Go to Your Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Trust bar */}
          {step < 4 && (
            <div className="flex items-center justify-center gap-6 mt-8 text-[10px] text-bone/20 font-semibold">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                <span>256-bit encryption</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Headphones className="h-3 w-3" />
                <span>24/7 support</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>5 min setup</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
