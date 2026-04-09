import Link from 'next/link';
import { Phone, TrendingUp, CreditCard, ArrowRight, Check } from 'lucide-react';
import { PRICING_TIERS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

const features = [
  {
    icon: Phone,
    title: 'Zero Missed Calls',
    description:
      'Ringo answers every call instantly, 24/7. No hold times, no voicemails, no lost revenue.',
  },
  {
    icon: TrendingUp,
    title: 'Automatic Upsells',
    description:
      'Smart AI suggests add-ons and upgrades on every order, boosting your average ticket size.',
  },
  {
    icon: CreditCard,
    title: 'Pay Before Prep',
    description:
      'Orders are confirmed and paid before your kitchen starts cooking. No more no-shows.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-ringo-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="font-serif text-xl text-ringo-teal">Ringo</span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-ringo-muted hover:text-foreground transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/onboarding"
              className="rounded-lg bg-ringo-teal px-4 py-2 text-sm font-medium text-white hover:bg-ringo-teal-light transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-ringo-teal/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="font-serif text-5xl md:text-7xl leading-tight mb-6">
            The phone rings.{' '}
            <span className="text-ringo-teal">Ringo</span> handles it.
          </h1>
          <p className="text-lg md:text-xl text-ringo-muted max-w-2xl mx-auto mb-8">
            AI-powered voice ordering for restaurants. Never miss a call, upsell
            automatically, and integrate with your POS — all without lifting a finger.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-ringo-teal px-8 py-3.5 text-base font-medium text-white hover:bg-ringo-teal-light transition-colors"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-ringo-border px-8 py-3.5 text-base font-medium text-foreground hover:bg-ringo-card transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-12">
            Why restaurants choose <span className="text-ringo-teal">Ringo</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-ringo-border bg-ringo-card p-8 text-center"
                >
                  <div className="mx-auto w-12 h-12 rounded-lg bg-ringo-teal/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-ringo-teal" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-ringo-muted leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6 border-y border-ringo-border/50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-3xl font-semibold text-ringo-teal">98%</p>
              <p className="text-sm text-ringo-muted mt-1">Call answer rate</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-ringo-amber">+23%</p>
              <p className="text-sm text-ringo-muted mt-1">Average upsell increase</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-ringo-purple-light">$4,200</p>
              <p className="text-sm text-ringo-muted mt-1">Avg. monthly revenue recovered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-ringo-muted text-center mb-12 max-w-lg mx-auto">
            Choose the plan that fits your call volume. Scale up anytime.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING_TIERS.map((tier, i) => (
              <div
                key={tier.tier}
                className={`rounded-xl border p-8 ${
                  i === 1
                    ? 'border-ringo-teal bg-gradient-to-b from-ringo-teal/5 to-ringo-card relative'
                    : 'border-ringo-border bg-ringo-card'
                }`}
              >
                {i === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ringo-teal px-3 py-0.5 text-xs font-medium text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-semibold text-foreground">{tier.name}</h3>
                <p className="text-sm text-ringo-muted mt-1">{tier.callsPerDay}</p>
                <p className="text-4xl font-semibold text-foreground mt-4">
                  {formatCurrency(tier.price)}
                  <span className="text-base text-ringo-muted font-normal">/mo</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-ringo-muted">
                      <Check className="h-4 w-4 text-ringo-teal flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/onboarding"
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-medium transition-colors ${
                    i === 1
                      ? 'bg-ringo-teal text-white hover:bg-ringo-teal-light'
                      : 'border border-ringo-border text-foreground hover:bg-ringo-card'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center rounded-2xl border border-ringo-teal/30 bg-gradient-to-br from-ringo-teal/10 to-ringo-card p-12">
          <h2 className="font-serif text-3xl md:text-4xl mb-4">
            Ready to never miss a call again?
          </h2>
          <p className="text-ringo-muted mb-8 max-w-lg mx-auto">
            Join restaurants already using Ringo to capture more orders and grow revenue.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-ringo-teal px-8 py-3.5 text-base font-medium text-white hover:bg-ringo-teal-light transition-colors"
          >
            Get Started Today <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ringo-border/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif text-lg text-ringo-teal">Ringo</span>
          <p className="text-xs text-ringo-muted">
            &copy; {new Date().getFullYear()} Ringo. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
