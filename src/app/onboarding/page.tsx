'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PRICING_TIERS, POS_OPTIONS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { label: 'Create Account', icon: UserPlus },
  { label: 'Restaurant Info', icon: Utensils },
  { label: 'POS System', icon: Phone },
  { label: 'Choose Plan', icon: CreditCard },
  { label: 'All Set', icon: PartyPopper },
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

    const { error: authError } = await supabase.auth.signUp({
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

    setLoading(false);
    setStep(1);
  }

  async function handleComplete() {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Create the restaurant record
        const { error: restaurantError } = await supabase
          .from('restaurants')
          .insert({
            name: form.restaurantName,
            address: form.address,
            phone: form.phone,
            pos_type: form.posType,
            plan_tier: form.planTier,
            owner_user_id: user.id,
          });

        if (restaurantError) {
          console.error('Restaurant creation error:', restaurantError);
        }

        // Update profile with name
        await supabase
          .from('profiles')
          .update({ full_name: form.fullName })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Onboarding error:', err);
    }

    setLoading(false);
    setStep(4);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-ringo-teal mb-2">Ringo</h1>
          <p className="text-ringo-muted">Set up your AI phone agent in under 2 minutes</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={cn(
                  'flex items-center justify-center h-9 w-9 rounded-full text-xs font-medium transition-all duration-300',
                  i < step
                    ? 'bg-ringo-teal text-white shadow-lg shadow-ringo-teal/20'
                    : i === step
                    ? 'bg-ringo-teal/20 text-ringo-teal border-2 border-ringo-teal'
                    : 'bg-ringo-border/50 text-ringo-muted'
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'w-6 sm:w-10 h-0.5 rounded-full transition-colors duration-300',
                    i < step ? 'bg-ringo-teal' : 'bg-ringo-border/50'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="animate-fade-in">
          {/* Step 0: Create Account */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Create your account</h2>
                <p className="text-sm text-ringo-muted mt-1">
                  This will be your login for the Ringo dashboard
                </p>
              </div>
              <Input
                id="fullName"
                label="Your Full Name"
                placeholder="John Smith"
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                required
              />
              <Input
                id="email"
                label="Email Address"
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
                <div className="rounded-lg bg-red-400/10 border border-red-400/20 px-4 py-2.5 text-sm text-red-400">
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

              <p className="text-center text-xs text-ringo-muted">
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-ringo-teal hover:text-ringo-teal-light transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* Step 1: Restaurant Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Restaurant details</h2>
                <p className="text-sm text-ringo-muted mt-1">
                  Tell us about your restaurant so Ringo can answer calls perfectly
                </p>
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
                label="Restaurant Phone Number"
                placeholder="(512) 555-1234"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                required
              />

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">
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

          {/* Step 2: POS System */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Your POS system</h2>
                <p className="text-sm text-ringo-muted mt-1">
                  Ringo pushes orders directly to your POS — no manual entry
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {POS_OPTIONS.map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => updateField('posType', pos.value)}
                    className={cn(
                      'rounded-xl border p-5 text-left transition-all duration-200',
                      form.posType === pos.value
                        ? 'border-ringo-teal bg-ringo-teal/5 shadow-lg shadow-ringo-teal/10'
                        : 'border-ringo-border hover:border-ringo-muted hover:bg-ringo-card'
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{pos.label}</p>
                    {pos.value !== 'none' && (
                      <p className="text-xs text-ringo-muted mt-1">Auto-sync orders</p>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Plan Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Choose your plan</h2>
                <p className="text-sm text-ringo-muted mt-1">
                  All plans include a 14-day free trial. Cancel anytime.
                </p>
              </div>
              <div className="space-y-3">
                {PRICING_TIERS.map((tier, i) => (
                  <button
                    key={tier.tier}
                    onClick={() => updateField('planTier', tier.tier)}
                    className={cn(
                      'w-full rounded-xl border p-5 text-left transition-all duration-200 relative',
                      form.planTier === tier.tier
                        ? 'border-ringo-teal bg-ringo-teal/5 shadow-lg shadow-ringo-teal/10'
                        : 'border-ringo-border hover:border-ringo-muted'
                    )}
                  >
                    {i === 1 && (
                      <span className="absolute -top-2.5 right-4 rounded-full bg-ringo-amber px-2.5 py-0.5 text-xs font-bold text-black">
                        MOST POPULAR
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-semibold text-foreground">{tier.name}</p>
                        <p className="text-xs text-ringo-muted mt-0.5">{tier.callsPerDay}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-foreground">
                          {formatCurrency(tier.price)}
                        </p>
                        <p className="text-xs text-ringo-muted">/month</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {error && (
                <div className="rounded-lg bg-red-400/10 border border-red-400/20 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleComplete} loading={loading} className="flex-1">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-center text-xs text-ringo-muted">
                14-day free trial &middot; No credit card required
              </p>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="text-center py-8 space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-ringo-teal to-ringo-teal-light flex items-center justify-center shadow-xl shadow-ringo-teal/30">
                <PartyPopper className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  You&apos;re all set, {form.fullName.split(' ')[0]}!
                </h2>
                <p className="text-sm text-ringo-muted mt-2 max-w-sm mx-auto">
                  Ringo is setting up your AI phone agent for <strong className="text-foreground">{form.restaurantName}</strong>.
                  You&apos;ll be ready to take calls within minutes.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-ringo-card border border-ringo-border p-3">
                  <Zap className="h-5 w-5 text-ringo-teal mx-auto mb-1" />
                  <p className="text-xs text-ringo-muted">Instant setup</p>
                </div>
                <div className="rounded-lg bg-ringo-card border border-ringo-border p-3">
                  <Clock className="h-5 w-5 text-ringo-amber mx-auto mb-1" />
                  <p className="text-xs text-ringo-muted">24/7 answering</p>
                </div>
                <div className="rounded-lg bg-ringo-card border border-ringo-border p-3">
                  <TrendingUp className="h-5 w-5 text-ringo-purple-light mx-auto mb-1" />
                  <p className="text-xs text-ringo-muted">Smart upsells</p>
                </div>
              </div>

              <Button size="lg" onClick={() => router.push('/dashboard')} className="w-full">
                Go to Your Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>

        {/* Trust bar */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-ringo-muted">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>256-bit encryption</span>
            </div>
            <div className="flex items-center gap-1">
              <Headphones className="h-3 w-3" />
              <span>24/7 support</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
