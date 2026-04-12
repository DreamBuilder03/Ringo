'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Phone,
  PhoneCall,
  ArrowRight,
  Check,
  Zap,
  Clock,
  BarChart3,
  Star,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Volume2,
  Shield,
  Target,
  Menu,
  X,
  TrendingUp,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ────────────────────────── Animated Counter ────────────────────────── */
function AnimatedCounter({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

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

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ────────────────────────── Phone Conversation Animation ────────────────────────── */
function PhoneConversation() {
  const [messages, setMessages] = useState<{ id: string; text: string; isCustomer: boolean; visible: boolean }[]>([]);
  const [showTyping, setShowTyping] = useState<string | null>(null);
  const [loop, setLoop] = useState(0);

  const conversationFlow = [
    { text: "Hi, I'd like to place an order for pickup", isCustomer: true },
    { text: "Of course! What can I get started for you?", isCustomer: false },
    { text: "Can I get a large pepperoni pizza", isCustomer: true },
    { text: "Great choice! Would you like to add Crazy Bread for just $4.49?", isCustomer: false },
    { text: "Yeah, add that too", isCustomer: true },
    { text: "Perfect! Your total is $12.48. I'll text you a payment link now.", isCustomer: false },
  ];

  useEffect(() => {
    setMessages([]);
    setShowTyping(null);
    let currentIndex = 0;

    const playConversation = () => {
      if (currentIndex < conversationFlow.length) {
        const msg = conversationFlow[currentIndex];
        const msgId = `${loop}-${currentIndex}`;

        // Show typing indicator
        setShowTyping(msgId);

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { id: msgId, text: msg.text, isCustomer: msg.isCustomer, visible: true },
          ]);
          setShowTyping(null);
          currentIndex++;
          setTimeout(playConversation, 1500);
        }, 1500);
      } else {
        // Fade out and restart after 3 seconds
        setTimeout(() => {
          setLoop((l) => l + 1);
        }, 3000);
      }
    };

    playConversation();
  }, [loop]);

  return (
    <div className="w-full h-96 rounded-2xl bg-gradient-to-b from-gray-900 to-black p-6 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex animate-fade-in',
              msg.isCustomer ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-xs px-4 py-2 rounded-lg text-sm',
                msg.isCustomer
                  ? 'bg-[#921920] text-white rounded-br-none'
                  : 'bg-white/10 text-white/90 rounded-bl-none'
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {showTyping && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-white/90 px-4 py-2 rounded-lg rounded-bl-none">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── Navigation ────────────────────────── */
function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#FFF8F0]/95 backdrop-blur-sm border-b border-[#E8DDD0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Phone className="h-6 w-6 text-[#921920]" />
            <span className="text-xl font-bold text-[#921920]">Ringo</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-[#1A1A2E] hover:text-[#921920] transition-colors font-medium">
              Features
            </Link>
            <Link href="#how-it-works" className="text-[#1A1A2E] hover:text-[#921920] transition-colors font-medium">
              How It Works
            </Link>
            <Link href="#pricing" className="text-[#1A1A2E] hover:text-[#921920] transition-colors font-medium">
              Pricing
            </Link>
            <Link href="#faq" className="text-[#1A1A2E] hover:text-[#921920] transition-colors font-medium">
              FAQ
            </Link>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Link
              href="/get-started"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#921920] to-[#B22028] text-white font-semibold hover:shadow-lg hover:shadow-[#921920]/50 transition-all duration-300"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-[#E8DDD0]/20 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-[#1A1A2E]" />
            ) : (
              <Menu className="h-6 w-6 text-[#1A1A2E]" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 space-y-4 pb-4 border-t border-[#E8DDD0] pt-4">
            <Link href="#features" className="block text-[#1A1A2E] hover:text-[#921920] font-medium">
              Features
            </Link>
            <Link href="#how-it-works" className="block text-[#1A1A2E] hover:text-[#921920] font-medium">
              How It Works
            </Link>
            <Link href="#pricing" className="block text-[#1A1A2E] hover:text-[#921920] font-medium">
              Pricing
            </Link>
            <Link href="#faq" className="block text-[#1A1A2E] hover:text-[#921920] font-medium">
              FAQ
            </Link>
            <Link
              href="/get-started"
              className="block w-full text-center px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#921920] to-[#B22028] text-white font-semibold hover:shadow-lg transition-all duration-300"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

/* ────────────────────────── Hero Section ────────────────────────── */
function HeroSection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-[#FFF8F0]">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-[#921920]/15 to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#0C1A7D]/15 to-transparent blur-[120px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#921920]/10 border border-[#921920]/20 w-fit">
              <Star className="h-4 w-4 text-[#921920]" />
              <span className="text-sm font-semibold text-[#921920]">
                ★★★★★ #1 AI Voice Ordering for Restaurants
              </span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-5xl md:text-6xl font-serif font-bold text-[#1A1A2E] leading-tight mb-4">
                Your AI Employee That Never Calls In Sick
              </h1>
              <p className="text-xl text-[#6B5E50] leading-relaxed">
                Ringo answers every call, takes orders, upsells intelligently, and sends payment links — so your staff can focus on what matters.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-[#921920] to-[#B22028] text-white font-bold hover:shadow-lg hover:shadow-[#921920]/50 transition-all duration-300 hover:scale-105"
              >
                Start Free Trial <ArrowRight className="h-5 w-5" />
              </Link>
              <button
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-[#921920] text-[#921920] font-bold hover:bg-[#921920]/5 transition-all duration-300"
              >
                <Volume2 className="h-5 w-5" /> Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-4">
              <div>
                <p className="text-sm text-[#6B5E50] mb-1">Answer Rate</p>
                <p className="text-3xl font-bold text-[#921920]">98%</p>
              </div>
              <div>
                <p className="text-sm text-[#6B5E50] mb-1">Avg. Savings</p>
                <p className="text-3xl font-bold text-[#0C1A7D]">$2,847/mo</p>
              </div>
              <div>
                <p className="text-sm text-[#6B5E50] mb-1">Availability</p>
                <p className="text-3xl font-bold text-[#921920]">24/7</p>
              </div>
            </div>
          </div>

          {/* Right: Animated Phone Conversation */}
          <div className="relative">
            {/* Phone Frame */}
            <div className="relative w-full max-w-sm mx-auto">
              <div className="relative rounded-3xl border-8 border-gray-900 bg-gray-900 shadow-2xl overflow-hidden">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-30" />

                {/* Status Bar */}
                <div className="relative z-20 flex items-center justify-between px-6 pt-1 pb-1 bg-gray-900">
                  <span className="text-xs font-semibold text-white/70">9:41</span>
                  <div className="text-xs font-semibold text-white/70">●●●●●</div>
                </div>

                {/* Conversation */}
                <PhoneConversation />
              </div>

              {/* Glow */}
              <div className="absolute inset-0 rounded-3xl -z-10 shadow-2xl shadow-[#921920]/40 blur-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Social Proof ────────────────────────── */
function SocialProof() {
  const partners = [
    'Square',
    'Toast',
    'Clover',
    'SpotOn',
    'Oracle Aloha',
    'Olo',
    'OpenTable',
    'SkyTab',
    'Lightspeed',
    'TouchBistro',
  ];

  return (
    <section className="relative py-12 bg-white border-y border-[#E8DDD0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold text-[#6B5E50] mb-8 uppercase tracking-widest">
          Trusted by 500+ restaurants across North America
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {partners.map((partner, idx) => (
            <div
              key={idx}
              className="px-4 py-2 rounded-full border border-[#E8DDD0] bg-white/60 backdrop-blur-sm hover:bg-white transition-all duration-300"
            >
              <span className="text-sm font-semibold text-[#1A1A2E]">{partner}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Lost Revenue Section ────────────────────────── */
function LostRevenueSection() {
  const [callsPerDay, setCallsPerDay] = useState(35);
  const [avgOrderValue, setAvgOrderValue] = useState(28);

  // Calculate monthly loss (assuming 70% conversion if answered, 0% if missed)
  const monthlyLoss = Math.round((callsPerDay * 0.3 * 30 * avgOrderValue));

  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-white to-[#FFF8F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-5xl md:text-6xl font-serif font-bold text-[#1A1A2E] leading-tight mb-4">
                Every Missed Call = Lost Revenue
              </h2>
              <p className="text-xl text-[#6B5E50]">
                The average restaurant misses <span className="font-bold text-[#921920]">30% of calls</span> during rush hours.
              </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4">
              <div className="p-6 rounded-xl bg-white border border-[#E8DDD0] shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-[#6B5E50] mb-2">Missed Orders per Week</p>
                <p className="text-4xl font-bold text-[#921920]">
                  $<AnimatedCounter target={Math.round((callsPerDay * 0.3 * 7 * avgOrderValue) / 100) * 100} suffix="" />
                </p>
              </div>
              <div className="p-6 rounded-xl bg-white border border-[#E8DDD0] shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm text-[#6B5E50] mb-2">Customer Retention Rate</p>
                <p className="text-4xl font-bold text-[#0C1A7D]">62%</p>
                <p className="text-sm text-[#6B5E50] mt-1">of callers won't try again</p>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-br from-[#921920]/10 to-[#0C1A7D]/10 border border-[#921920]/20 shadow-sm">
                <p className="text-sm text-[#6B5E50] mb-2">Revenue Boost with Ringo</p>
                <p className="text-4xl font-bold text-[#921920]">+23%</p>
                <p className="text-sm text-[#6B5E50] mt-1">average increase reported</p>
              </div>
            </div>
          </div>

          {/* Right: Revenue Calculator */}
          <div className="p-8 rounded-2xl bg-white border border-[#E8DDD0] shadow-lg">
            <h3 className="text-2xl font-bold text-[#1A1A2E] mb-8">Revenue Calculator</h3>

            {/* Calls per Day Slider */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-[#1A1A2E]">
                  Calls per day
                </label>
                <span className="text-2xl font-bold text-[#921920]">{callsPerDay}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={callsPerDay}
                onChange={(e) => setCallsPerDay(Number(e.target.value))}
                className="w-full h-2 bg-[#E8DDD0] rounded-lg appearance-none cursor-pointer accent-[#921920]"
              />
              <div className="flex justify-between text-xs text-[#6B5E50] mt-2">
                <span>10</span>
                <span>100</span>
              </div>
            </div>

            {/* Average Order Value Slider */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-[#1A1A2E]">
                  Average order value
                </label>
                <span className="text-2xl font-bold text-[#0C1A7D]">${avgOrderValue}</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                value={avgOrderValue}
                onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                className="w-full h-2 bg-[#E8DDD0] rounded-lg appearance-none cursor-pointer accent-[#0C1A7D]"
              />
              <div className="flex justify-between text-xs text-[#6B5E50] mt-2">
                <span>$15</span>
                <span>$50</span>
              </div>
            </div>

            {/* Result */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-[#921920]/10 to-[#0C1A7D]/10 border border-[#921920]/20 mb-8">
              <p className="text-sm text-[#6B5E50] mb-2">You're losing approximately</p>
              <p className="text-5xl font-bold text-[#921920] mb-2">
                ${monthlyLoss.toLocaleString()}
              </p>
              <p className="text-sm text-[#6B5E50]">per month in missed orders</p>
            </div>

            <Link
              href="/get-started"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-gradient-to-r from-[#921920] to-[#B22028] text-white font-bold hover:shadow-lg hover:shadow-[#921920]/50 transition-all duration-300"
            >
              Stop Losing Money <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Features Section ────────────────────────── */
function FeaturesSection() {
  const features = [
    {
      icon: PhoneCall,
      title: 'Order Taking',
      description: 'Takes phone orders with perfect accuracy every single time',
    },
    {
      icon: TrendingUp,
      title: 'Smart Upselling',
      description: 'Boosts average order value by 15-23% with intelligent suggestions',
    },
    {
      icon: Zap,
      title: 'Pay Before Prep',
      description: 'Sends SMS payment links before kitchen fires — unique to Ringo',
    },
    {
      icon: BarChart3,
      title: 'POS Integration',
      description: 'Pushes orders directly to Square, Toast, Clover, and 20+ more',
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Never miss a call, even at 2 AM on your busiest nights',
    },
    {
      icon: Shield,
      title: 'Real-Time Dashboard',
      description: 'Track calls, revenue, and AI performance live with full transcripts',
    },
  ];

  return (
    <section id="features" className="relative py-20 md:py-32 overflow-hidden bg-[#FFF8F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1A1A2E] mb-4">
            The AI Phone Platform Built for Restaurants
          </h2>
          <p className="text-xl text-[#6B5E50] max-w-2xl mx-auto">
            Everything you need to handle calls, take orders, and grow revenue — on autopilot.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="p-8 rounded-xl bg-white border border-[#E8DDD0] hover:border-[#921920]/30 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#921920] to-[#0C1A7D]">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#1A1A2E] mb-2">{feature.title}</h3>
              <p className="text-[#6B5E50] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── How It Works Section ────────────────────────── */
function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: 'Connect Your Number',
      description: 'Forward your restaurant phone to Ringo in 2 minutes',
      icon: Phone,
    },
    {
      number: 2,
      title: 'AI Handles Calls',
      description: 'Ringo answers, takes orders, upsells, and collects payment',
      icon: Zap,
    },
    {
      number: 3,
      title: 'You Get Paid',
      description: 'Orders flow to your POS. Money flows to your bank.',
      icon: TrendingUp,
    },
  ];

  return (
    <section id="how-it-works" className="relative py-20 md:py-32 overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1A1A2E] mb-4">
            How It Works
          </h2>
          <p className="text-xl text-[#6B5E50] max-w-2xl mx-auto">
            Three simple steps to transform your restaurant's phone operations.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection Lines (Desktop) */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#921920]/30 to-transparent pointer-events-none" />

          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              {/* Number Circle */}
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#921920] to-[#0C1A7D] flex items-center justify-center shadow-lg relative z-10">
                  <span className="text-3xl font-bold text-white">{step.number}</span>
                </div>
              </div>

              {/* Content */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-lg bg-[#921920]/10 flex items-center justify-center">
                    <step.icon className="h-6 w-6 text-[#921920]" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-[#1A1A2E] mb-2">{step.title}</h3>
                <p className="text-[#6B5E50]">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Integrations Section ────────────────────────── */
function IntegrationsSection() {
  const integrations = [
    'Square',
    'Toast',
    'Clover',
    'SpotOn',
    'Oracle Aloha',
    'Olo',
    'OpenTable',
    'SkyTab',
    'Lightspeed',
    'TouchBistro',
  ];

  return (
    <section className="relative py-20 overflow-hidden bg-[#FFF8F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1A2E] mb-2">
            Integrates With Your Restaurant Stack
          </h2>
          <p className="text-[#6B5E50]">Works seamlessly with your existing POS system</p>
        </div>

        {/* Integration Logos */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {integrations.map((integration, idx) => (
            <div
              key={idx}
              className="px-4 py-2 rounded-full border border-[#E8DDD0] bg-white hover:border-[#921920]/30 hover:shadow-md transition-all"
            >
              <span className="text-sm font-semibold text-[#1A1A2E]">{integration}</span>
            </div>
          ))}
        </div>

        {/* Link */}
        <div className="text-center">
          <button className="inline-flex items-center gap-2 text-[#921920] font-semibold hover:gap-3 transition-all">
            Don't see yours? We integrate with any POS <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Dashboard Preview Section ────────────────────────── */
function DashboardSection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1A1A2E] mb-4">
            Your AI Command Center
          </h2>
          <p className="text-xl text-[#6B5E50] max-w-2xl mx-auto">
            See live calls, transcripts, orders, and outcomes in one place.
          </p>
        </div>

        {/* Dashboard Mockup */}
        <div className="rounded-2xl border border-[#E8DDD0] bg-gradient-to-br from-[#FFF8F0]/30 to-white/30 backdrop-blur-sm overflow-hidden shadow-2xl">
          <div className="p-8 md:p-12 min-h-96 bg-gradient-to-br from-[#1A1A2E] to-[#0C1A7D]/40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Stat Cards */}
              {[
                { label: 'Calls Today', value: '87', icon: PhoneCall, color: '#921920' },
                { label: 'Revenue', value: '$4,230', icon: TrendingUp, color: '#0C1A7D' },
                { label: 'Avg. Order', value: '$38.45', icon: DollarSign, color: '#921920' },
              ].map((stat, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                      <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                    </div>
                    <span className="text-sm font-medium text-white/70">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Recent Calls */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-white font-semibold mb-4">Recent Calls</h3>
              <div className="space-y-3">
                {[
                  { time: '2:34 PM', caller: 'John D.', order: '2x Pizza, Sides', value: '$45.99', status: 'Completed' },
                  { time: '2:12 PM', caller: 'Sarah M.', order: 'Salad + Drink', value: '$18.50', status: 'Completed' },
                  { time: '1:45 PM', caller: 'Mike P.', order: '3x Burger Combo', value: '$62.45', status: 'Completed' },
                ].map((call, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm text-white/70 pb-3 border-b border-white/10 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-white">{call.caller}</p>
                      <p className="text-xs">{call.order}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">{call.value}</p>
                      <p className="text-xs text-green-400">{call.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Pricing Section ────────────────────────── */
function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: '$99',
      description: 'Perfect for smaller restaurants',
      features: [
        'Up to 100 calls/month',
        'Basic order taking',
        'Email support',
        '1 integration',
      ],
    },
    {
      name: 'Pro',
      price: '$299',
      description: 'Most popular for growing restaurants',
      features: [
        'Unlimited calls',
        'Smart upselling',
        'Payment link integration',
        'Unlimited POS integration',
        'Priority support',
        'Analytics dashboard',
      ],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large restaurant groups',
      features: [
        'Everything in Pro',
        'Custom integrations',
        'Dedicated support',
        'Multi-location management',
        'SLA guarantee',
      ],
    },
  ];

  return (
    <section id="pricing" className="relative py-20 md:py-32 overflow-hidden bg-[#FFF8F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1A1A2E] mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-[#6B5E50] max-w-2xl mx-auto">
            No setup fees. No long-term contracts. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-2xl p-8 border transition-all duration-300',
                plan.highlighted
                  ? 'border-[#921920] bg-white shadow-2xl shadow-[#921920]/20 scale-105'
                  : 'border-[#E8DDD0] bg-white hover:shadow-lg'
              )}
            >
              {plan.highlighted && (
                <div className="mb-4 inline-block px-3 py-1 rounded-full bg-[#921920]/10 border border-[#921920]/20">
                  <span className="text-xs font-semibold text-[#921920]">Most Popular</span>
                </div>
              )}

              <h3 className="text-2xl font-bold text-[#1A1A2E] mb-2">{plan.name}</h3>
              <p className="text-[#6B5E50] mb-6 text-sm">{plan.description}</p>

              <div className="mb-8">
                <span className="text-5xl font-bold text-[#1A1A2E]">{plan.price}</span>
                {plan.price !== 'Custom' && <span className="text-[#6B5E50] ml-2">/month</span>}
              </div>

              <button
                className={cn(
                  'w-full py-3 rounded-lg font-bold transition-all duration-300 mb-8',
                  plan.highlighted
                    ? 'bg-gradient-to-r from-[#921920] to-[#B22028] text-white hover:shadow-lg hover:shadow-[#921920]/50'
                    : 'border border-[#921920] text-[#921920] hover:bg-[#921920]/5'
                )}
              >
                Get Started
              </button>

              <div className="space-y-4">
                {plan.features.map((feature, fidx) => (
                  <div key={fidx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-[#921920] flex-shrink-0 mt-0.5" />
                    <span className="text-[#6B5E50]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── FAQ Section ────────────────────────── */
function FAQSection() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How long does setup take?',
      answer: "Setup takes just 2 minutes. Forward your restaurant phone number to Ringo and you're live. No installation required.",
    },
    {
      question: 'Which POS systems do you integrate with?',
      answer: "We integrate with Square, Toast, Clover, SpotOn, Oracle Aloha, and 20+ more. If your POS isn't listed, we can build a custom integration.",
    },
    {
      question: 'Is there a long-term contract?',
      answer: "No contracts. You can cancel anytime. We're confident you'll love Ringo, but we want you to stay because you choose to.",
    },
    {
      question: 'How does Ringo handle complex orders?',
      answer: 'Our AI is trained to understand complex orders, special requests, and dietary restrictions. It asks clarifying questions and never rushes customers.',
    },
    {
      question: 'What about data security and privacy?',
      answer: 'We use enterprise-grade encryption, regular security audits, and GDPR/CCPA compliance. Your restaurant data is always secure and never shared.',
    },
    {
      question: 'Can I test it before committing?',
      answer: 'Absolutely. Start with our free trial — no credit card required. Get 14 days of full access to see how Ringo transforms your business.',
    },
  ];

  return (
    <section id="faq" className="relative py-20 md:py-32 overflow-hidden bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1A1A2E] mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-[#6B5E50]">
            Everything you need to know about Ringo
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-[#E8DDD0] rounded-lg overflow-hidden hover:border-[#921920]/30 transition-colors"
            >
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#FFF8F0] transition-colors"
              >
                <span className="font-semibold text-[#1A1A2E] text-left">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-[#921920] transition-transform duration-300',
                    expandedIdx === idx ? 'rotate-180' : ''
                  )}
                />
              </button>

              {expandedIdx === idx && (
                <div className="px-6 py-4 bg-[#FFF8F0] border-t border-[#E8DDD0]">
                  <p className="text-[#6B5E50] leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Bottom CTA Section ────────────────────────── */
function BottomCTASection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-r from-[#921920] to-[#0C1A7D]">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 right-0 w-96 h-96 bg-white/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6">
          Transform Your Restaurant Today
        </h2>
        <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
          Join 500+ restaurants that are already saving thousands per month with Ringo.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            href="/get-started"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-white text-[#921920] font-bold hover:shadow-lg hover:shadow-black/30 transition-all duration-300 hover:scale-105"
          >
            Start Free Trial <ArrowRight className="h-5 w-5" />
          </Link>
          <button className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-white text-white font-bold hover:bg-white/10 transition-all duration-300">
            <Volume2 className="h-5 w-5" /> Schedule Demo
          </button>
        </div>

        <p className="text-white/70 text-sm mt-8">
          14-day free trial. No credit card required. Cancel anytime.
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────── Footer ────────────────────────── */
function Footer() {
  return (
    <footer className="bg-[#1A1A2E] text-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-6 w-6 text-[#921920]" />
              <span className="text-xl font-bold text-white">Ringo</span>
            </div>
            <p className="text-sm">
              AI voice ordering for restaurants. Never miss a call again.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <div className="space-y-2 text-sm">
              <Link href="#features" className="hover:text-[#921920] transition-colors">Features</Link>
              <Link href="#pricing" className="block hover:text-[#921920] transition-colors">Pricing</Link>
              <Link href="#how-it-works" className="block hover:text-[#921920] transition-colors">How It Works</Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="hover:text-[#921920] transition-colors">About</a>
              <a href="#" className="block hover:text-[#921920] transition-colors">Blog</a>
              <a href="#" className="block hover:text-[#921920] transition-colors">Contact</a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="hover:text-[#921920] transition-colors">Privacy</a>
              <a href="#" className="block hover:text-[#921920] transition-colors">Terms</a>
              <a href="#" className="block hover:text-[#921920] transition-colors">Security</a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          <p className="text-center text-sm text-white/60">
            © 2026 Ringo AI. All rights reserved. Built with love for restaurants.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────── Main Page Export ────────────────────────── */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      <Navigation />
      <HeroSection />
      <SocialProof />
      <LostRevenueSection />
      <FeaturesSection />
      <HowItWorksSection />
      <IntegrationsSection />
      <DashboardSection />
      <PricingSection />
      <FAQSection />
      <BottomCTASection />
      <Footer />
    </main>
  );
}
