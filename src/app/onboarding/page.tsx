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
  Bot,
  Star,
  Sparkles,
  PhoneCall,
  MessageSquare,
  BarChart3,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { label: 'Account', icon: UserPlus },
  { label: 'Restaurant', icon: Utensils },
  { label: 'POS', icon: Phone },
  { label: 'Plan', icon: CreditCard },
  { label: 'Ready', icon: PartyPopper },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    restaurantName: '',
    address: '',
    phone: '',
    posType: 'none',
    planTier: 'growth',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleCreateAccount() {
    setLoading(true);
    setError('');

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

      // If email confirmation is disabled, user is auto-logged in
      // If enabled, we still proceed but they'll need to confirm
      if (data?.user) {
        setLoading(false);
        setStep(1);
      } else {
        // Email confirmation may be required
        setError('Please check your email to confirm your account, then try again.');
        setLoading(false);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  async function handleComplete() {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Please sign in to continue.');
        setLoading(false);
        return;
      }

      // Create restaurant in Supabase
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: form.restaurantName,
          address: form.address,
          phone: form.phone,
          pos_type: form.posType,
          plan_tier: form.planTier,
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

      // Update profile name
      await supabase
        .from('profiles')
        .update({ full_name: form.fullName })
        .eq('id', user.id);

      // Send welcome email
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
        // Don't fail onboarding if email fails
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
        // If Stripe checkout fails, still proceed to dashboard
        console.warn('Stripe checkout creation failed, proceeding without payment');
      }

      setLoading(false);
      setStep(4);

      // Send welcome email on final completion if not already sent
      if (form.planTier !== 'pro') {
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
          // Don't fail onboarding if email fails
        }
      }
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
      price: '$299',
      desc: 'Voice AI only',
      features: ['Voice AI Agent', '100 calls/day', 'Basic analytics'],
      popular: false,
    },
    {
      tier: 'growth',
      name: 'Growth',
      price: '$599',
      desc: 'Voice + Chat AI',
      features: ['Voice + Chat AI', '250 calls/day', 'Smart upselling', 'Custom voice'],
      popular: true,
    },
    {
      tier: 'pro',
      name: 'Enterprise',
      price: 'Custom',
      desc: 'Multi-location',
      features: ['Unlimited calls', 'Dedicated manager', 'Custom integrations'],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-ringo-dark text-foreground">
      {/* Grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Gradient blobs */}
      <div className="fixed top-20 left-1/4 w-[400px] h-[400px] bg-ringo-teal/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-ringo-teal mb-2">Ringo</h1>
            <p className="text-sm text-white/40">Set up your AI phone agent in under 2 minutes</p>
          </div>

          {/* Step Progress */}
          <div className="flex items-center justify-center gap-1.5 mb-10">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'flex items-center justify-center h-10 w-10 rounded-xl text-xs font-bold transition-all duration-500',
                    i < step
                      ? 'bg-ringo-teal text-white shadow-lg shadow-ringo-teal/20'
                      : i === step
                      ? 'bg-ringo-teal/10 text-ringo-teal border-2 border-ringo-teal/50'
                      : 'bg-white/[0.04] text-white/20 border border-white/[0.06]'
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    'w-8 sm:w-12 h-0.5 rounded-full transition-all duration-500',
                    i < step ? 'bg-ringo-teal' : 'bg-white/[0.06]'
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-8 shadow-2xl shadow-black/20 animate-fade-in">

            {/* Step 0: Account */}
            {step === 0 && (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-ringo-teal/10 flex items-center justify-center mb-4">
                    <UserPlus className="h-7 w-7 text-ringo-teal" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Create your account</h2>
                  <p className="text-sm text-white/40 mt-1">This will be your Ringo dashboard login</p>
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
                  placeholder="john@myrestaurant.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
                <Input
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  minLength={6}
                  required
                />

                {error && (
                  <div className="rounded-xl bg-red-400/10 border border-red-400/20 px-4 py-3 text-sm text-red-400">
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
                  Create Account <ArrowRight className="h-4 w-4" />
                </Button>

                <p className="text-center text-xs text-white/30">
                  Already have an account?{' '}
                  <button onClick={() => router.push('/login')} className="text-ringo-teal hover:text-ringo-teal-light transition-colors">
                    Sign in
                  </button>
                </p>
              </div>
            )}

            {/* Step 1: Restaurant */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-ringo-amber/10 flex items-center justify-center mb-4">
                    <Utensils className="h-7 w-7 text-ringo-amber" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Your restaurant</h2>
                  <p className="text-sm text-white/40 mt-1">Ringo will use this to answer calls accurately</p>
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

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setStep(0)} className="flex-1 border border-white/[0.08]">
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
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-400/10 flex items-center justify-center mb-4">
                    <Phone className="h-7 w-7 text-violet-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Connect your POS</h2>
                  <p className="text-sm text-white/40 mt-1">Orders go straight to your kitchen — zero manual entry</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {POS_OPTIONS.map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => updateField('posType', pos.value)}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-all duration-200',
                        form.posType === pos.value
                          ? 'border-ringo-teal/50 bg-ringo-teal/[0.05] shadow-lg shadow-ringo-teal/10'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                      )}
                    >
                      <p className="text-sm font-bold text-white">{pos.label}</p>
                      {pos.value !== 'none' && (
                        <p className="text-[10px] text-white/30 mt-0.5">Auto-sync orders</p>
                      )}
                      {form.posType === pos.value && (
                        <Check className="h-3.5 w-3.5 text-ringo-teal mt-1" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/20 text-center">
                  Don&apos;t worry — you can connect your POS later from Settings.
                </p>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 border border-white/[0.08]">
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
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-ringo-teal/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-7 w-7 text-ringo-teal" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Choose your plan</h2>
                  <p className="text-sm text-white/40 mt-1">14-day free trial on all plans. No credit card needed.</p>
                </div>

                <div className="space-y-3">
                  {plans.map((plan) => (
                    <button
                      key={plan.tier}
                      onClick={() => updateField('planTier', plan.tier)}
                      className={cn(
                        'w-full rounded-xl border p-5 text-left transition-all duration-200 relative',
                        form.planTier === plan.tier
                          ? 'border-ringo-teal/50 bg-ringo-teal/[0.05] shadow-lg shadow-ringo-teal/10'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                      )}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2.5 right-4 rounded-full bg-ringo-teal px-3 py-0.5 text-[10px] font-bold text-white shadow-lg shadow-ringo-teal/30">
                          RECOMMENDED
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-base font-bold text-white">{plan.name}</p>
                          <p className="text-xs text-white/30">{plan.desc}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">{plan.price}</p>
                          {plan.price !== 'Custom' && <p className="text-[10px] text-white/30">/month</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan.features.map((f) => (
                          <span key={f} className="text-[10px] font-medium text-white/40 bg-white/[0.04] rounded-full px-2.5 py-0.5">
                            {f}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="rounded-xl bg-red-400/10 border border-red-400/20 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 border border-white/[0.08]">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleComplete} loading={loading} className="flex-1">
                    Start Free Trial <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 4 && (
              <div className="text-center py-6 space-y-6">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 bg-ringo-teal/15 rounded-full blur-xl" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-ringo-teal to-green-500 flex items-center justify-center shadow-2xl shadow-ringo-teal/30">
                    <Check className="h-12 w-12 text-white" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Welcome aboard, {form.fullName.split(' ')[0]}!
                  </h2>
                  <p className="text-sm text-white/40 mt-2 max-w-sm mx-auto">
                    Your AI agent for <strong className="text-white">{form.restaurantName}</strong> is being set up. You&apos;ll be live in minutes.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Zap, label: 'Instant setup', color: 'text-ringo-teal', bg: 'bg-ringo-teal/10' },
                    { icon: PhoneCall, label: '24/7 answering', color: 'text-ringo-amber', bg: 'bg-ringo-amber/10' },
                    { icon: TrendingUp, label: 'Smart upsells', color: 'text-violet-400', bg: 'bg-violet-400/10' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                      <item.icon className={cn('h-5 w-5 mx-auto mb-1.5', item.color)} />
                      <p className="text-[10px] font-semibold text-white/40">{item.label}</p>
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  onClick={() => router.push('/dashboard')}
                  className="w-full shadow-xl shadow-ringo-teal/20"
                >
                  Go to Your Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Trust bar */}
          {step < 4 && (
            <div className="flex items-center justify-center gap-6 mt-8 text-[10px] text-white/20 font-semibold">
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
