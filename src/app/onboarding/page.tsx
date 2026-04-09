'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PRICING_TIERS, POS_OPTIONS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { Check, ArrowRight, ArrowLeft, Phone, Utensils, CreditCard, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { label: 'Restaurant Info', icon: Utensils },
  { label: 'POS System', icon: Phone },
  { label: 'Choose Plan', icon: CreditCard },
  { label: 'Confirmation', icon: PartyPopper },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    posType: 'none',
    planTier: 'growth',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleComplete() {
    setLoading(true);
    // TODO: Create restaurant, redirect to Stripe checkout
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setStep(3);
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-ringo-teal mb-2">Welcome to Ringo</h1>
          <p className="text-sm text-ringo-muted">Let&apos;s get your AI phone agent set up</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center h-8 w-8 rounded-full text-xs font-medium transition-colors',
                    i < step
                      ? 'bg-ringo-teal text-white'
                      : i === step
                      ? 'bg-ringo-teal/20 text-ringo-teal border border-ringo-teal'
                      : 'bg-ringo-border text-ringo-muted'
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-8 h-0.5 rounded',
                      i < step ? 'bg-ringo-teal' : 'bg-ringo-border'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card className="animate-fade-in">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Restaurant Information</h2>
              <Input
                id="name"
                label="Restaurant Name"
                placeholder="Mario's Pizza"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
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
                label="Phone Number"
                placeholder="(512) 555-1234"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                required
              />
              <Button
                className="w-full"
                size="lg"
                onClick={() => setStep(1)}
                disabled={!form.name || !form.address || !form.phone}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Choose Your POS System</h2>
              <p className="text-sm text-ringo-muted">
                Connect your POS so Ringo can push orders directly
              </p>
              <div className="grid grid-cols-2 gap-3">
                {POS_OPTIONS.map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => updateField('posType', pos.value)}
                    className={cn(
                      'rounded-lg border p-4 text-left transition-colors',
                      form.posType === pos.value
                        ? 'border-ringo-teal bg-ringo-teal/5'
                        : 'border-ringo-border hover:border-ringo-muted'
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">{pos.label}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Select Your Plan</h2>
              <div className="space-y-3">
                {PRICING_TIERS.map((tier) => (
                  <button
                    key={tier.tier}
                    onClick={() => updateField('planTier', tier.tier)}
                    className={cn(
                      'w-full rounded-lg border p-4 text-left transition-colors',
                      form.planTier === tier.tier
                        ? 'border-ringo-teal bg-ringo-teal/5'
                        : 'border-ringo-border hover:border-ringo-muted'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{tier.name}</p>
                        <p className="text-xs text-ringo-muted">{tier.callsPerDay}</p>
                      </div>
                      <p className="text-lg font-semibold text-foreground">
                        {formatCurrency(tier.price)}<span className="text-xs text-ringo-muted">/mo</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleComplete} loading={loading} className="flex-1">
                  Start Subscription <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-ringo-teal/10 flex items-center justify-center">
                <PartyPopper className="h-8 w-8 text-ringo-teal" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Welcome aboard!
              </h2>
              <p className="text-sm text-ringo-muted max-w-sm mx-auto">
                Ringo is setting up your AI agent. You&apos;ll be ready to take calls within minutes.
              </p>
              <Button size="lg" onClick={() => router.push('/dashboard')}>
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
