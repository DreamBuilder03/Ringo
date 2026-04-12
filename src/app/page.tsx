'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Phone,
  TrendingUp,
  ArrowRight,
  Check,
  Zap,
  Clock,
  ShieldCheck,
  BarChart3,
  Headphones,
  Star,
  PhoneCall,
  DollarSign,
  Users,
  Bot,
  Mic,
  ChevronDown,
  Play,
  MessageSquare,
  ArrowUpRight,
  Sparkles,
  Globe,
  Volume2,
  Shield,
  Target,
  Wifi,
  Send,
  X,
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

/* ────────────────────────── POS Partner Marquee ────────────────────────── */
function POSMarquee() {
  const partners = [
    { name: 'Square', color: '#036EFF' },
    { name: 'Toast', color: '#FF6B2D' },
    { name: 'Clover', color: '#1DB46D' },
    { name: 'SpotOn', color: '#0066CC' },
    { name: 'Oracle Aloha', color: '#F80000' },
    { name: 'Olo', color: '#0066FF' },
    { name: 'OpenTable', color: '#DA3743' },
    { name: 'SkyTab', color: '#4A90E2' },
    { name: 'Lightspeed', color: '#FF5A2D' },
    { name: 'TouchBistro', color: '#FF7C00' },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-[#FFF8F0] via-white to-[#FFF8F0] py-12 border-y border-[#E8DDD0]">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-30" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold text-[#6B5E50] mb-8 uppercase tracking-widest">
          Integrated with leading POS systems
        </p>

        <div className="flex overflow-hidden">
          <div className="flex gap-8 min-w-full animate-marquee">
            {[...partners, ...partners].map((partner, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 flex items-center justify-center"
              >
                <div
                  className="px-4 py-2.5 rounded-full border border-[#E8DDD0] bg-white/60 backdrop-blur-sm hover:bg-white hover:border-[#921920]/30 transition-all duration-300 cursor-default"
                  style={{
                    boxShadow: `0 0 20px ${partner.color}15`,
                  }}
                >
                  <span
                    className="text-sm font-semibold whitespace-nowrap"
                    style={{ color: partner.color }}
                  >
                    {partner.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}

/* ────────────────────────── Live Demo Section ────────────────────────── */
function LiveDemoSection() {
  const [isHovered, setIsHovered] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'active'>('idle');

  const startDemoCall = () => {
    setCallStatus('ringing');
    setTimeout(() => setCallStatus('active'), 2500);
  };

  const endCall = () => {
    setCallStatus('idle');
  };

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-[#FFF8F0] to-white">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-0 w-96 h-96 bg-gradient-to-br from-[#921920]/10 to-[#0C1A7D]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#0C1A7D]/10 to-[#921920]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Demo Phone */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative">
              {/* Phone frame with glass effect */}
              <div className="relative w-[320px] h-[640px] rounded-[40px] border-8 border-white/40 bg-white/30 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black/80 rounded-b-3xl z-30" />

                {/* Status bar */}
                <div className="relative z-20 flex items-center justify-between px-6 pt-2 pb-1 bg-gradient-to-b from-gray-900 to-gray-800">
                  <span className="text-xs font-semibold text-white/80">9:41</span>
                  <div className="flex gap-1">
                    <Wifi className="h-3 w-3 text-white/60" />
                    <div className="text-xs font-semibold text-white/60">●●●●●</div>
                  </div>
                </div>

                {/* Call screen */}
                <div className="relative h-full bg-gradient-to-b from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center gap-6 px-4">
                  {callStatus === 'idle' ? (
                    <>
                      <div className="text-center">
                        <p className="text-white/70 text-xs uppercase tracking-widest mb-2">Ready to try?</p>
                        <h3 className="text-white text-lg font-bold">Demo Call</h3>
                      </div>
                      <button
                        onClick={startDemoCall}
                        className="h-14 w-14 rounded-full bg-gradient-to-br from-[#921920] to-[#6B1217] flex items-center justify-center hover:shadow-lg hover:shadow-[#921920]/50 transition-all duration-300 hover:scale-105"
                      >
                        <PhoneCall className="h-6 w-6 text-white" />
                      </button>
                      <p className="text-white/50 text-xs">Tap to call demo</p>
                    </>
                  ) : callStatus === 'ringing' ? (
                    <>
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-2 border-white/30 rounded-full animate-pulse" />
                        <div className="absolute inset-2 border-2 border-white/20 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <PhoneCall className="absolute inset-0 m-auto h-6 w-6 text-white" />
                      </div>
                      <p className="text-white text-sm font-medium">Ringo AI</p>
                      <p className="text-white/60 text-xs">Incoming call...</p>
                    </>
                  ) : (
                    <>
                      <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-2 border-[#921920] rounded-full animate-pulse" />
                        <Mic className="absolute inset-0 m-auto h-5 w-5 text-white" />
                      </div>
                      <p className="text-white text-sm font-medium">Ringo AI</p>
                      <p className="text-white/60 text-xs">Call active • Listening...</p>
                      <div className="w-32 h-8 flex items-end justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-[#921920] to-[#0C1A7D] rounded-full"
                            style={{
                              height: `${20 + Math.random() * 24}px`,
                              animation: `pulse 0.5s ease-in-out infinite`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={endCall}
                        className="h-12 w-12 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-600 transition-colors mt-2"
                      >
                        <X className="h-5 w-5 text-white" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Floating glow */}
              <div
                className={cn(
                  'absolute inset-0 rounded-[40px] -z-10 transition-all duration-500',
                  callStatus === 'active'
                    ? 'shadow-2xl shadow-[#921920]/50 blur-xl'
                    : 'shadow-xl shadow-black/20 blur-lg'
                )}
              />
            </div>
          </div>

          {/* Right: Content */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#921920]/10 border border-[#921920]/20 mb-4">
                <Volume2 className="h-4 w-4 text-[#921920]" />
                <span className="text-sm font-semibold text-[#921920]">Live Demo</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A2E] leading-tight mb-4">
                Hear Ringo in Action
              </h2>
              <p className="text-lg text-[#6B5E50] leading-relaxed">
                Experience how our AI naturally handles restaurant orders, answers questions, and provides a seamless ordering experience. Try a real demo call right now.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Mic, label: 'Natural voice interaction', desc: 'AI understands accents, dialects, and complex orders' },
                { icon: Clock, label: 'Real-time processing', desc: 'Instant menu lookups and order validation' },
                { icon: Phone, label: 'Crystal clear audio', desc: 'Professional call quality with noise filtering' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#921920] to-[#0C1A7D]">
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A2E]">{item.label}</h4>
                    <p className="text-sm text-[#6B5E50]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/schedule-demo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#921920] to-[#6B1217] text-white font-semibold hover:shadow-lg hover:shadow-[#921920]/50 transition-all duration-300 hover:scale-105"
              >
                Schedule a Full Demo <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={startDemoCall}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[#921920] text-[#921920] font-semibold hover:bg-[#921920]/5 transition-all duration-300"
              >
                <Phone className="h-4 w-4" />
                Call Demo Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Self-Serve Demo Section ────────────────────────── */
function SelfServeDemo() {
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName || !email) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantName, email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit demo request');
      }

      setSubmitted(true);
      setTimeout(() => {
        setRestaurantName('');
        setEmail('');
        setSubmitted(false);
      }, 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Demo request error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-20 overflow-hidden bg-white">
      {/* Decorative grid */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(147, 25, 32, .05) 25%, rgba(147, 25, 32, .05) 26%, transparent 27%, transparent 74%, rgba(147, 25, 32, .05) 75%, rgba(147, 25, 32, .05) 76%, transparent 77%, transparent),
                             linear-gradient(90deg, transparent 24%, rgba(147, 25, 32, .05) 25%, rgba(147, 25, 32, .05) 26%, transparent 27%, transparent 74%, rgba(147, 25, 32, .05) 75%, rgba(147, 25, 32, .05) 76%, transparent 77%, transparent)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#E8DDD0] bg-gradient-to-br from-[#FFF8F0]/50 to-white/50 backdrop-blur-sm p-8 md:p-12 shadow-lg shadow-black/5">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0C1A7D]/10 border border-[#0C1A7D]/20 mb-4">
              <Bot className="h-4 w-4 text-[#0C1A7D]" />
              <span className="text-sm font-semibold text-[#0C1A7D]">Personalized Demo</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E] mb-4">
              Try Ringo with Your Restaurant
            </h2>
            <p className="text-lg text-[#6B5E50]">
              Get a personalized voice demo customized for your restaurant's menu and ordering style.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Your restaurant name"
                  className="w-full px-4 py-3 rounded-lg border border-[#E8DDD0] bg-white focus:outline-none focus:border-[#921920] focus:ring-2 focus:ring-[#921920]/10 transition-all disabled:opacity-50"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-lg border border-[#E8DDD0] bg-white focus:outline-none focus:border-[#921920] focus:ring-2 focus:ring-[#921920]/10 transition-all disabled:opacity-50"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || submitted}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-[#0C1A7D] to-[#921920] text-white font-semibold hover:shadow-lg hover:shadow-[#0C1A7D]/30 transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitted ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" />
                  Demo Scheduled!
                </span>
              ) : loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Get Your Personalized Demo
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>

            <p className="text-xs text-[#6B5E50] text-center">
              We'll send you a personalized demo call and follow up within 24 hours.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Features Section ────────────────────────── */
function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: 'Lightning-Fast Orders',
      description: 'Process orders 10x faster than traditional phone lines with instant menu lookups.',
      gradient: 'from-[#921920] to-orange-500',
    },
    {
      icon: Users,
      title: 'Human-Friendly AI',
      description: 'Natural conversations that handle accents, preferences, and complex requests.',
      gradient: 'from-[#0C1A7D] to-blue-500',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Insights',
      description: 'Track call metrics, order patterns, and customer preferences instantly.',
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and compliance for customer data protection.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Never miss an order. Ringo works around the clock for you.',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      icon: Headphones,
      title: 'Seamless Integration',
      description: 'Connects with your POS system in minutes. No complex setup.',
      gradient: 'from-cyan-500 to-blue-500',
    },
  ];

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-white to-[#FFF8F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#921920]/10 border border-[#921920]/20 mb-4">
            <Sparkles className="h-4 w-4 text-[#921920]" />
            <span className="text-sm font-semibold text-[#921920]">Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A2E] leading-tight mb-4">
            Packed with Everything You Need
          </h2>
          <p className="text-xl text-[#6B5E50] max-w-2xl mx-auto">
            Built for restaurant owners who want to scale without hiring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group relative rounded-2xl border border-[#E8DDD0] bg-white p-8 hover:border-[#921920]/30 transition-all duration-300 hover:shadow-xl hover:shadow-black/10 overflow-hidden"
            >
              {/* Gradient overlay on hover */}
              <div
                className={cn(
                  'absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-br',
                  feature.gradient
                )}
              />

              <div className={cn('h-12 w-12 rounded-lg bg-gradient-to-br flex items-center justify-center mb-4', feature.gradient)}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>

              <h3 className="text-xl font-bold text-[#1A1A2E] mb-2">{feature.title}</h3>
              <p className="text-[#6B5E50]">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Stats Section ────────────────────────── */
function StatsSection() {
  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-r from-[#921920] via-[#0C1A7D] to-[#921920]">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.3),rgba(255,255,255,0))]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {[
            { label: 'Restaurants Trust Us', value: 500, suffix: '+' },
            { label: 'Orders Processed', value: 5, suffix: 'M+' },
            { label: 'Avg Response Time', value: 2, suffix: 's' },
          ].map((stat, idx) => (
            <div key={idx}>
              <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-white/80 text-lg">{stat.label}</p>
            </div>
          ))}
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
      period: '/month',
      description: 'Perfect for new restaurants',
      features: [
        '500 AI calls/month',
        'Basic POS integration',
        'Phone support',
        'Simple analytics',
        'Email notifications',
      ],
      cta: 'Get Started',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$299',
      period: '/month',
      description: 'For growing restaurants',
      features: [
        'Unlimited AI calls',
        'All POS systems supported',
        'Priority phone support',
        'Advanced analytics',
        'Custom voice training',
        'Webhook integrations',
        'Team management',
      ],
      cta: 'Start Free Trial',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      description: 'For large restaurant groups',
      features: [
        'Everything in Pro',
        'Multi-location support',
        'Dedicated account manager',
        'Custom integrations',
        'White-label options',
        'SLA guarantees',
        'Advanced security',
      ],
      cta: 'Contact Sales',
      highlight: false,
    },
  ];

  return (
    <section className="relative py-20 overflow-hidden bg-[#FFF8F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0C1A7D]/10 border border-[#0C1A7D]/20 mb-4">
            <DollarSign className="h-4 w-4 text-[#0C1A7D]" />
            <span className="text-sm font-semibold text-[#0C1A7D]">Pricing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A2E] mb-4">
            Transparent Pricing
          </h2>
          <p className="text-xl text-[#6B5E50] max-w-2xl mx-auto">
            No hidden fees. No setup costs. Start free and scale as you grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={cn(
                'relative rounded-2xl p-8 transition-all duration-300 border',
                plan.highlight
                  ? 'border-[#921920] bg-white shadow-2xl shadow-[#921920]/20 scale-105 md:scale-100'
                  : 'border-[#E8DDD0] bg-white/50 backdrop-blur-sm hover:border-[#921920]/30'
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#921920] to-[#0C1A7D] text-white text-xs font-bold">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold text-[#1A1A2E] mb-2">{plan.name}</h3>
              <p className="text-[#6B5E50] text-sm mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-5xl font-bold text-[#1A1A2E]">{plan.price}</span>
                <span className="text-[#6B5E50] ml-2">{plan.period}</span>
              </div>

              <button
                className={cn(
                  'w-full py-3 rounded-lg font-semibold transition-all duration-300 mb-8',
                  plan.highlight
                    ? 'bg-gradient-to-r from-[#921920] to-[#0C1A7D] text-white hover:shadow-lg hover:shadow-[#921920]/50'
                    : 'border border-[#921920] text-[#921920] hover:bg-[#921920]/5'
                )}
              >
                {plan.cta}
              </button>

              <div className="space-y-3">
                {plan.features.map((feature, fidx) => (
                  <div key={fidx} className="flex gap-3">
                    <Check className="h-5 w-5 text-[#921920] flex-shrink-0 mt-0.5" />
                    <span className="text-[#1A1A2E]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-[#6B5E50] mb-4">
            All plans include 14 days free. No credit card required.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-[#921920] font-semibold hover:gap-3 transition-all"
          >
            View detailed comparison <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── FAQ Section ────────────────────────── */
function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: 'How long does setup take?',
      a: 'Setup typically takes 10-15 minutes. We guide you through connecting your POS system, configuring your menu, and training the AI voice on your restaurant details. Most restaurants are live within an hour.',
    },
    {
      q: 'Can Ringo handle complex orders?',
      a: 'Absolutely. Ringo is trained to understand modifications, special requests, dietary restrictions, and complex orders. It asks clarifying questions just like a real person would.',
    },
    {
      q: 'What POS systems do you support?',
      a: 'We integrate with Square, Toast, Clover, SpotOn, Aloha, Olo, OpenTable, SkyTab, Lightspeed, TouchBistro, and more. If you don\'t see yours, contact us for custom integration.',
    },
    {
      q: 'Is there a contract?',
      a: 'No contracts. You can cancel anytime. Most customers see ROI within the first month, so we\'re confident you\'ll want to stay.',
    },
    {
      q: 'How much can I save?',
      a: 'Most restaurants save $3,000-$8,000/month in labor costs. You\'ll redirect staff to other important tasks while Ringo handles the phones.',
    },
    {
      q: 'Is customer data secure?',
      a: 'Yes. We use bank-level encryption, comply with PCI-DSS standards, and never share customer data with third parties. Your data is yours.',
    },
  ];

  return (
    <section className="relative py-20 overflow-hidden bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#921920]/10 border border-[#921920]/20 mb-4">
            <MessageSquare className="h-4 w-4 text-[#921920]" />
            <span className="text-sm font-semibold text-[#921920]">FAQ</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A2E] mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-[#6B5E50]">
            Everything you need to know about Ringo.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[#E8DDD0] overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? -1 : idx)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#FFF8F0]/50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-[#1A1A2E] text-left">{faq.q}</h3>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-[#921920] transition-transform duration-300',
                    openIndex === idx && 'rotate-180'
                  )}
                />
              </button>
              {openIndex === idx && (
                <div className="px-6 py-4 bg-[#FFF8F0]/30 border-t border-[#E8DDD0]">
                  <p className="text-[#6B5E50] leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-[#E8DDD0] bg-gradient-to-br from-[#FFF8F0] to-white p-8 text-center">
          <h3 className="text-2xl font-bold text-[#1A1A2E] mb-2">Still have questions?</h3>
          <p className="text-[#6B5E50] mb-6">
            Our team is here to help. Reach out to us anytime.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#921920] to-[#0C1A7D] text-white font-semibold hover:shadow-lg transition-all"
          >
            Contact Us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── CTA Section ────────────────────────── */
function CTASection() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#921920]/80 via-[#0C1A7D]/80 to-[#921920]/80 backdrop-blur-sm" />

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-white/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Transform Your Restaurant Today
        </h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Join hundreds of restaurants using Ringo to handle orders, save time, and grow revenue.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/get-started"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-white text-[#921920] font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            Start Free Trial <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/schedule-demo"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-white text-white font-bold text-lg hover:bg-white/10 transition-all"
          >
            <PhoneCall className="h-5 w-5" />
            Schedule a Demo
          </Link>
        </div>

        <p className="text-white/70 text-sm mt-6">
          Free 14-day trial. No credit card required.
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────── Navigation ────────────────────────── */
function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-[#FFF8F0]/95 backdrop-blur-md border-b border-[#E8DDD0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-black text-[#921920]">Ringo</span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-[#1A1A2E] hover:text-[#921920] transition-colors font-medium">
              Features
            </Link>
            <Link href="#pricing" className="text-[#1A1A2E] hover:text-[#921920] transition-colors font-medium">
              Pricing
            </Link>
            <Link href="#faq" className="text-[#1A1A2E] hover:text-[#921920] transition-colors font-medium">
              FAQ
            </Link>
            <Link href="/contact" className="text-[#1A1A2E] hover:text-[#921920] transition-colors font-medium">
              Contact
            </Link>
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/get-started"
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#921920] to-[#6B1217] text-white font-semibold hover:shadow-lg hover:shadow-[#921920]/50 transition-all duration-300 hover:scale-105"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-[#921920]/10 transition-colors"
          >
            {isOpen ? <X className="h-6 w-6 text-[#1A1A2E]" /> : <ChevronDown className="h-6 w-6 text-[#1A1A2E]" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2">
            <Link href="#features" className="block px-4 py-2 text-[#1A1A2E] hover:bg-[#921920]/10 rounded-lg">
              Features
            </Link>
            <Link href="#pricing" className="block px-4 py-2 text-[#1A1A2E] hover:bg-[#921920]/10 rounded-lg">
              Pricing
            </Link>
            <Link href="#faq" className="block px-4 py-2 text-[#1A1A2E] hover:bg-[#921920]/10 rounded-lg">
              FAQ
            </Link>
            <Link href="/contact" className="block px-4 py-2 text-[#1A1A2E] hover:bg-[#921920]/10 rounded-lg">
              Contact
            </Link>
            <Link
              href="/get-started"
              className="block px-4 py-2 rounded-lg bg-gradient-to-r from-[#921920] to-[#6B1217] text-white font-semibold text-center"
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
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-[#FFF8F0] via-white to-[#FFF8F0]">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-[#921920]/20 to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-gradient-to-tr from-[#0C1A7D]/20 to-transparent blur-[120px] rounded-full" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(147, 25, 32, .05) 25%, rgba(147, 25, 32, .05) 26%, transparent 27%, transparent 74%, rgba(147, 25, 32, .05) 75%, rgba(147, 25, 32, .05) 76%, transparent 77%, transparent),
                             linear-gradient(90deg, transparent 24%, rgba(147, 25, 32, .05) 25%, rgba(147, 25, 32, .05) 26%, transparent 27%, transparent 74%, rgba(147, 25, 32, .05) 75%, rgba(147, 25, 32, .05) 76%, transparent 77%, transparent)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#921920]/10 border border-[#921920]/20 w-fit">
              <Sparkles className="h-4 w-4 text-[#921920]" />
              <span className="text-sm font-semibold text-[#921920]">AI Voice Ordering</span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#1A1A2E] leading-tight mb-6">
                Never Miss Another Order
              </h1>
              <p className="text-xl md:text-2xl text-[#6B5E50] leading-relaxed max-w-xl">
                AI voice phone system built for restaurants. Handle calls 24/7, reduce labor costs, and delight customers.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-[#921920] to-[#6B1217] text-white font-bold text-lg hover:shadow-xl hover:shadow-[#921920]/50 transition-all duration-300 hover:scale-105"
              >
                Start Free Trial <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-[#921920] text-[#921920] font-bold text-lg hover:bg-[#921920]/5 transition-all"
              >
                <Phone className="h-5 w-5" />
                See Demo
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-2 text-[#6B5E50]">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-[#921920] to-[#0C1A7D] border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium">
                Join 500+ restaurants using Ringo
              </span>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative h-96 lg:h-[600px] flex items-center justify-center">
            {/* Animated background shapes */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Outer glow */}
              <div className="absolute w-96 h-96 rounded-full border border-[#921920]/20 animate-pulse" />
              <div className="absolute w-80 h-80 rounded-full border border-[#0C1A7D]/20" style={{ animation: 'pulse 2s ease-in-out infinite 0.5s' }} />

              {/* Central icon showcase */}
              <div className="relative">
                <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-[#921920] to-[#0C1A7D] flex items-center justify-center shadow-2xl shadow-[#921920]/50">
                  <Phone className="h-24 w-24 text-white" />
                </div>

                {/* Floating feature badges */}
                <div className="absolute -top-8 -right-8 px-4 py-2.5 rounded-full bg-white border border-[#E8DDD0] shadow-lg shadow-black/10">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#921920]" />
                    <span className="text-sm font-bold text-[#1A1A2E]">10x Faster</span>
                  </div>
                </div>

                <div className="absolute -bottom-8 -left-8 px-4 py-2.5 rounded-full bg-white border border-[#E8DDD0] shadow-lg shadow-black/10">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#0C1A7D]" />
                    <span className="text-sm font-bold text-[#1A1A2E]">Real Analytics</span>
                  </div>
                </div>

                <div className="absolute top-1/2 -right-24 px-4 py-2.5 rounded-full bg-white border border-[#E8DDD0] shadow-lg shadow-black/10 hidden lg:block">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#921920]" />
                    <span className="text-sm font-bold text-[#1A1A2E]">24/7 Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Footer ────────────────────────── */
function Footer() {
  return (
    <footer className="relative bg-[#1A1A2E] text-white overflow-hidden border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-black text-[#921920] mb-4">Ringo</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              AI voice ordering for restaurants. Never miss another order.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
              <li><Link href="/roadmap" className="hover:text-white transition-colors">Roadmap</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              <li><Link href="/compliance" className="hover:text-white transition-colors">Compliance</Link></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/60">
            <p>&copy; 2026 Ringo. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-white transition-colors">LinkedIn</Link>
              <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────── Main Page ────────────────────────── */
export default function HomePage() {
  return (
    <div className="bg-[#FFF8F0] min-h-screen overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <POSMarquee />
      <FeaturesSection />
      <StatsSection />
      <LiveDemoSection />
      <SelfServeDemo />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
