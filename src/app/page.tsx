'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Phone,
  TrendingUp,
  CreditCard,
  ArrowRight,
  Check,
  Zap,
  Clock,
  ShieldCheck,
  BarChart3,
  Headphones,
  Store,
  Star,
  PhoneCall,
  DollarSign,
  Users,
  Bot,
  Mic,
  ChevronDown,
  Play,
  MessageSquare,
} from 'lucide-react';
import { PRICING_TIERS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Animated counter component
function AnimatedCounter({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [visible, target]);

  return (
    <span
      ref={(el) => {
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) setVisible(true);
        });
        observer.observe(el);
      }}
    >
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

const features = [
  {
    icon: PhoneCall,
    title: 'Never Miss a Call',
    description: 'Ringo picks up every call in under 1 second, 24/7/365. No hold music. No voicemail. No lost revenue.',
    stat: '99.9%',
    statLabel: 'answer rate',
  },
  {
    icon: TrendingUp,
    title: 'AI-Powered Upselling',
    description: 'Our smart engine suggests add-ons, combos, and upgrades on every order — increasing your average ticket by up to 31%.',
    stat: '+31%',
    statLabel: 'ticket increase',
  },
  {
    icon: CreditCard,
    title: 'Collect Payment on Call',
    description: 'Ringo takes payment before your kitchen starts cooking. Zero no-shows. Zero chargebacks. Maximum efficiency.',
    stat: '0%',
    statLabel: 'no-show rate',
  },
  {
    icon: Bot,
    title: 'Sounds Human, Works Harder',
    description: 'Natural-sounding voice AI trained on millions of restaurant calls. Customers can\'t tell the difference — but your revenue will.',
    stat: '4.9/5',
    statLabel: 'caller rating',
  },
  {
    icon: Zap,
    title: 'Instant POS Sync',
    description: 'Orders flow directly into your POS — Square, Toast, Clover, Aloha, and more. No double entry. No mistakes.',
    stat: '<2s',
    statLabel: 'sync time',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'See every call, order, upsell, and revenue number in your live dashboard. Know exactly what Ringo earns you.',
    stat: '24/7',
    statLabel: 'live data',
  },
];

const integrations = [
  'Square', 'Toast', 'Clover', 'Aloha', 'SpotOn', 'NCR', 'Olo',
  'Revel', 'Lightspeed', 'TouchBistro', 'Heartland', 'OpenTable',
];

const testimonials = [
  {
    quote: "Ringo paid for itself in the first week. We were missing 40% of our dinner rush calls — now we miss zero.",
    name: 'Maria Gonzalez',
    role: "Owner, Maria's Tacos",
    revenue: '+$4,200/mo',
  },
  {
    quote: "The upsell engine is insane. Our average order went from $22 to $29 without changing a thing on our menu.",
    name: 'James Chen',
    role: 'Manager, Golden Dragon',
    revenue: '+$6,800/mo',
  },
  {
    quote: "We replaced our after-hours answering service and saved $2,000/month. Plus Ringo actually takes orders — they never did.",
    name: 'Tony Russo',
    role: "Owner, Tony's Pizzeria",
    revenue: '+$3,500/mo',
  },
];

const faqs = [
  {
    q: 'How long does setup take?',
    a: 'Under 10 minutes. Connect your POS, upload your menu, and Ringo starts answering calls immediately.',
  },
  {
    q: 'Can Ringo handle multiple calls at once?',
    a: 'Yes — unlimited simultaneous calls. Even during your busiest Friday night rush, every call gets answered instantly.',
  },
  {
    q: 'What if a customer has a complex request?',
    a: 'Ringo handles 95% of calls autonomously. For edge cases, it seamlessly transfers to your staff with full context.',
  },
  {
    q: 'Do callers know they\'re talking to AI?',
    a: 'Most can\'t tell. Ringo uses natural voice AI trained specifically on restaurant conversations. It handles interruptions, pauses, and accents naturally.',
  },
  {
    q: 'Is there a contract?',
    a: 'No long-term contracts. Month-to-month billing. Cancel anytime. Every plan includes a 14-day free trial.',
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="font-serif text-2xl text-ringo-teal">Ringo</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-ringo-muted hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-ringo-muted hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm text-ringo-muted hover:text-foreground transition-colors">Reviews</a>
            <a href="#faq" className="text-sm text-ringo-muted hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-ringo-muted hover:text-foreground transition-colors hidden sm:block">
              Log In
            </Link>
            <Link
              href="/onboarding"
              className="rounded-full bg-ringo-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-ringo-teal-light transition-all hover:shadow-lg hover:shadow-ringo-teal/25"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-ringo-teal/8 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-ringo-purple/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ringo-teal/20 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-ringo-teal/20 bg-ringo-teal/5 px-4 py-1.5 mb-8">
            <span className="h-2 w-2 rounded-full bg-ringo-teal animate-pulse" />
            <span className="text-xs font-medium text-ringo-teal">Now answering 50,000+ calls/month</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] mb-6 tracking-tight">
            The phone rings.
            <br />
            <span className="bg-gradient-to-r from-ringo-teal to-ringo-teal-light bg-clip-text text-transparent">
              Ringo handles it.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-ringo-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            AI voice ordering that answers every call, upsells automatically,
            and pushes orders straight to your POS. Your restaurant makes more money
            while you do less work.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/onboarding"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-ringo-teal px-8 py-4 text-base font-semibold text-white hover:bg-ringo-teal-light transition-all hover:shadow-xl hover:shadow-ringo-teal/30 hover:-translate-y-0.5"
            >
              Start Your Free Trial
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ringo-border px-8 py-4 text-base font-medium text-foreground hover:bg-ringo-card transition-all"
            >
              <Play className="h-4 w-4 text-ringo-teal" />
              See How It Works
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-ringo-muted">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-ringo-teal" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-ringo-teal" />
              <span>Setup in 10 minutes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Headphones className="h-4 w-4 text-ringo-teal" />
              <span>24/7 live support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-16 px-6 border-y border-white/5 bg-ringo-darker/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl md:text-5xl font-bold text-ringo-teal">
                <AnimatedCounter target={99} suffix="%" />
              </p>
              <p className="text-sm text-ringo-muted mt-2">Call answer rate</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-ringo-amber">
                +<AnimatedCounter target={31} suffix="%" />
              </p>
              <p className="text-sm text-ringo-muted mt-2">Avg. upsell increase</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-ringo-purple-light">
                $<AnimatedCounter target={5200} />
              </p>
              <p className="text-sm text-ringo-muted mt-2">Avg. monthly revenue recovered</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-foreground">
                <AnimatedCounter target={500} suffix="+" />
              </p>
              <p className="text-sm text-ringo-muted mt-2">Restaurants powered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-ringo-teal uppercase tracking-wider">Features</span>
            <h2 className="font-serif text-4xl md:text-5xl mt-3 mb-4">
              Everything your phone line needs
            </h2>
            <p className="text-ringo-muted max-w-xl mx-auto">
              Ringo replaces your phone staff, answering service, and missed-call problem — all in one AI agent.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-ringo-border bg-ringo-card/50 p-8 hover:border-ringo-teal/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ringo-teal/5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-ringo-teal/10 flex items-center justify-center group-hover:bg-ringo-teal/20 transition-colors">
                      <Icon className="h-6 w-6 text-ringo-teal" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{feature.stat}</p>
                      <p className="text-xs text-ringo-muted">{feature.statLabel}</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-ringo-muted leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-ringo-darker/50 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-ringo-teal uppercase tracking-wider">How It Works</span>
            <h2 className="font-serif text-4xl md:text-5xl mt-3">Three steps. Ten minutes.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Connect Your POS', desc: 'Link Square, Toast, Clover, or any of our 30+ supported POS systems in one click.', icon: Store },
              { step: '02', title: 'Upload Your Menu', desc: 'Ringo learns your full menu, specials, hours, and policies. We handle the training.', icon: Mic },
              { step: '03', title: 'Start Taking Calls', desc: 'Forward your phone line to Ringo and start capturing revenue immediately.', icon: PhoneCall },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="text-6xl font-bold text-ringo-teal/10 mb-4">{item.step}</div>
                <div className="w-14 h-14 rounded-2xl bg-ringo-teal/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-ringo-teal" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-ringo-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-sm font-semibold text-ringo-teal uppercase tracking-wider">Integrations</span>
          <h2 className="font-serif text-3xl md:text-4xl mt-3 mb-4">Works with your POS</h2>
          <p className="text-ringo-muted mb-10">Direct integrations with 30+ restaurant POS and ordering systems</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {integrations.map((name) => (
              <div
                key={name}
                className="rounded-xl border border-ringo-border bg-ringo-card/50 px-6 py-3 text-sm font-medium text-ringo-muted hover:border-ringo-teal/30 hover:text-foreground transition-colors"
              >
                {name}
              </div>
            ))}
            <div className="rounded-xl border border-ringo-teal/30 bg-ringo-teal/5 px-6 py-3 text-sm font-medium text-ringo-teal">
              +18 more
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 bg-ringo-darker/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-ringo-teal uppercase tracking-wider">Testimonials</span>
            <h2 className="font-serif text-4xl md:text-5xl mt-3">Loved by restaurant owners</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl border border-ringo-border bg-ringo-card p-8 flex flex-col">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-ringo-amber text-ringo-amber" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-6 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-ringo-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-ringo-muted">{t.role}</p>
                  </div>
                  <span className="text-sm font-bold text-ringo-teal">{t.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-ringo-teal uppercase tracking-wider">Pricing</span>
            <h2 className="font-serif text-4xl md:text-5xl mt-3 mb-4">
              Simple pricing. Serious ROI.
            </h2>
            <p className="text-ringo-muted max-w-lg mx-auto">
              Every plan includes a 14-day free trial. No credit card required. Cancel anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier, i) => (
              <div
                key={tier.tier}
                className={cn(
                  'rounded-2xl border p-8 relative',
                  i === 1
                    ? 'border-ringo-teal bg-gradient-to-b from-ringo-teal/10 to-ringo-card shadow-2xl shadow-ringo-teal/10 scale-[1.02]'
                    : 'border-ringo-border bg-ringo-card'
                )}
              >
                {i === 1 && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-ringo-teal to-ringo-teal-light px-4 py-1 text-xs font-bold text-white shadow-lg">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                <p className="text-sm text-ringo-muted mt-1">{tier.callsPerDay}</p>
                <p className="text-5xl font-bold text-foreground mt-6">
                  {formatCurrency(tier.price)}
                  <span className="text-lg text-ringo-muted font-normal">/mo</span>
                </p>
                <ul className="mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-ringo-muted">
                      <Check className="h-4 w-4 text-ringo-teal flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/onboarding"
                  className={cn(
                    'mt-8 block w-full rounded-full py-3.5 text-center text-sm font-semibold transition-all',
                    i === 1
                      ? 'bg-ringo-teal text-white hover:bg-ringo-teal-light hover:shadow-lg hover:shadow-ringo-teal/25'
                      : 'border border-ringo-border text-foreground hover:bg-ringo-card hover:border-ringo-muted'
                  )}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-ringo-darker/50 border-y border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-ringo-teal uppercase tracking-wider">FAQ</span>
            <h2 className="font-serif text-4xl md:text-5xl mt-3">Common questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full rounded-xl border border-ringo-border bg-ringo-card p-5 text-left transition-colors hover:border-ringo-muted"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground pr-4">{faq.q}</p>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-ringo-muted flex-shrink-0 transition-transform duration-200',
                      openFaq === i && 'rotate-180'
                    )}
                  />
                </div>
                {openFaq === i && (
                  <p className="text-sm text-ringo-muted mt-3 leading-relaxed">{faq.a}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl border border-ringo-teal/20 bg-gradient-to-br from-ringo-teal/10 via-ringo-card to-ringo-purple/5 p-12 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-ringo-teal/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-ringo-purple/5 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="font-serif text-4xl md:text-5xl mb-4">
                Stop missing calls.
                <br />
                <span className="text-ringo-teal">Start making money.</span>
              </h2>
              <p className="text-ringo-muted mb-8 max-w-lg mx-auto">
                Join 500+ restaurants already using Ringo to capture more orders,
                upsell automatically, and grow revenue on autopilot.
              </p>
              <Link
                href="/onboarding"
                className="group inline-flex items-center gap-2 rounded-full bg-ringo-teal px-10 py-4 text-lg font-semibold text-white hover:bg-ringo-teal-light transition-all hover:shadow-xl hover:shadow-ringo-teal/30 hover:-translate-y-0.5"
              >
                Start Your Free Trial
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="text-xs text-ringo-muted mt-4">14-day free trial &middot; No credit card &middot; Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xl text-ringo-teal">Ringo</span>
              <span className="text-xs text-ringo-muted">&copy; {new Date().getFullYear()} Ringo. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-ringo-muted">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
              <Link href="/login" className="hover:text-foreground transition-colors">Dashboard</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
