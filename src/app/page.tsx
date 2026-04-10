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

/* ────────────────────────── Phone Mockup ────────────────────────── */
function PhoneMockup() {
  const [activeScreen, setActiveScreen] = useState(0);
  const [callActive, setCallActive] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-ringo-teal/20 blur-[100px] rounded-full" />

      {/* Phone frame */}
      <div className="relative w-[300px] h-[620px] bg-[#0a0a0f] rounded-[3rem] border-[6px] border-gray-800 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-[#0a0a0f] rounded-b-2xl z-20" />

        {/* Status bar */}
        <div className="relative z-10 flex items-center justify-between px-8 pt-3 pb-2">
          <span className="text-[10px] font-semibold text-white/70">9:41</span>
          <div className="flex items-center gap-1">
            <Wifi className="h-3 w-3 text-white/70" />
            <div className="w-6 h-2.5 rounded-sm border border-white/40 p-[1px]">
              <div className="h-full w-[80%] rounded-sm bg-emerald-400" />
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div className="relative h-full bg-gradient-to-b from-[#0D0D12] to-[#111118] px-4 pt-2 overflow-hidden">
          {/* Dashboard Screen */}
          <div className={cn(
            'absolute inset-x-4 top-14 transition-all duration-700',
            activeScreen === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Dashboard</p>
                <p className="text-lg font-bold text-white">Mario&apos;s Pizza</p>
              </div>
              <div className="flex items-center gap-1 bg-emerald-400/10 rounded-full px-2 py-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] font-bold text-emerald-400">LIVE</span>
              </div>
            </div>

            {/* Mini stat cards */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                <p className="text-[8px] text-white/40 font-bold uppercase">Calls Today</p>
                <p className="text-xl font-bold text-white mt-0.5">24</p>
                <span className="text-[8px] font-bold text-emerald-400">↑ 12%</span>
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                <p className="text-[8px] text-white/40 font-bold uppercase">Revenue</p>
                <p className="text-xl font-bold text-white mt-0.5">$842</p>
                <span className="text-[8px] font-bold text-emerald-400">↑ 15%</span>
              </div>
            </div>

            {/* Mini chart */}
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 mb-3">
              <p className="text-[8px] text-white/40 font-bold uppercase mb-2">Weekly Revenue</p>
              <div className="flex items-end gap-1 h-12">
                {[40, 65, 55, 80, 70, 90, 45].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-ringo-teal/80 to-ringo-teal/30"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Recent calls */}
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
              <p className="text-[8px] text-white/40 font-bold uppercase mb-2">Recent Calls</p>
              {[
                { time: '2:14 PM', outcome: 'Order', amount: '$31.97', color: 'text-emerald-400' },
                { time: '1:32 PM', outcome: 'Inquiry', amount: '—', color: 'text-blue-400' },
                { time: '12:45 PM', outcome: 'Order', amount: '$52.47', color: 'text-emerald-400' },
              ].map((call, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-md bg-white/[0.06] flex items-center justify-center">
                      <Phone className="h-2.5 w-2.5 text-white/40" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-white">{call.time}</p>
                      <p className={cn('text-[8px] font-semibold', call.color)}>{call.outcome}</p>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-white">{call.amount}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live Call Screen */}
          <div className={cn(
            'absolute inset-x-4 top-14 transition-all duration-700',
            activeScreen === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}>
            <div className="text-center pt-8">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-ringo-teal to-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-ringo-teal/30 animate-pulse">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">LIVE CALL</p>
              <p className="text-lg font-bold text-white">Ringo is ordering...</p>
              <p className="text-xs text-white/40 mt-1">Duration: 2:34</p>
            </div>

            {/* Live transcript */}
            <div className="mt-6 space-y-2">
              <div className="flex gap-2">
                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-2.5 w-2.5 text-white/50" />
                </div>
                <div className="bg-white/[0.06] rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                  <p className="text-[10px] text-white/80">&quot;I&apos;d like a large pepperoni and garlic bread&quot;</p>
                </div>
              </div>
              <div className="flex gap-2 flex-row-reverse">
                <div className="h-5 w-5 rounded-full bg-ringo-teal/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-2.5 w-2.5 text-ringo-teal" />
                </div>
                <div className="bg-ringo-teal/10 border border-ringo-teal/20 rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                  <p className="text-[10px] text-white/80">&quot;Great! Would you like to add our family deal for just $7.99 more?&quot;</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-2.5 w-2.5 text-white/50" />
                </div>
                <div className="bg-white/[0.06] rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                  <p className="text-[10px] text-white/80">&quot;Sure, add it!&quot;</p>
                </div>
              </div>
            </div>

            {/* Upsell indicator */}
            <div className="mt-4 rounded-xl bg-ringo-amber/10 border border-ringo-amber/20 p-3 text-center">
              <Sparkles className="h-4 w-4 text-ringo-amber mx-auto mb-1" />
              <p className="text-[10px] font-bold text-ringo-amber">Upsell Captured: +$7.99</p>
            </div>
          </div>

          {/* Analytics Screen */}
          <div className={cn(
            'absolute inset-x-4 top-14 transition-all duration-700',
            activeScreen === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}>
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-1">Analytics</p>
            <p className="text-lg font-bold text-white mb-4">This Month</p>

            <div className="space-y-3">
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-white/40 uppercase">Total Revenue</p>
                  <span className="text-[8px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 rounded-full">↑ 23%</span>
                </div>
                <p className="text-2xl font-bold text-ringo-teal">$14,790</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <p className="text-[8px] text-white/40 font-bold uppercase">Answer Rate</p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">99.2%</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                  <p className="text-[8px] text-white/40 font-bold uppercase">Upsell Rate</p>
                  <p className="text-lg font-bold text-ringo-amber mt-0.5">64%</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                <p className="text-[8px] text-white/40 font-bold uppercase mb-2">Top Items</p>
                {[
                  { name: 'Pepperoni Pizza', pct: 85 },
                  { name: 'Family Combo', pct: 68 },
                  { name: 'Buffalo Wings', pct: 52 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[8px] font-bold text-white/30 w-3">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-[9px] font-medium text-white/70">{item.name}</p>
                      <div className="h-1 rounded-full bg-white/[0.06] mt-0.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-ringo-teal to-emerald-400"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                <p className="text-[8px] text-white/40 font-bold uppercase">Total Calls</p>
                <p className="text-lg font-bold text-white mt-0.5">342</p>
                <p className="text-[8px] text-white/40">this month</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen indicator dots */}
      <div className="flex justify-center gap-2 mt-6">
        {['Dashboard', 'Live Call', 'Analytics'].map((label, i) => (
          <button
            key={label}
            onClick={() => setActiveScreen(i)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-300',
              activeScreen === i
                ? 'bg-ringo-teal text-white'
                : 'bg-white/[0.05] text-white/40 hover:text-white/60'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────── Chat Demo ────────────────────────── */
function LiveChatDemo() {
  const [messages, setMessages] = useState([
    { role: 'agent', text: "Hi! Welcome to Mario's Pizza. How can I help you today?" },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const responses: Record<string, string> = {
    'menu': "Our most popular items are the Large Pepperoni ($18.99), Family Combo ($44.99), and Buffalo Wings ($13.99). Would you like to order?",
    'order': "I'd be happy to help you order! What would you like? Our Large Pepperoni is a customer favorite at $18.99.",
    'hours': "We're open Monday-Saturday 11AM-10PM, and Sunday 12PM-9PM. Would you like to place an order?",
    'delivery': "Yes, we deliver! There's a $2.99 delivery fee for orders under $25. Orders over $25 get free delivery. What can I get started for you?",
    'special': "Today's special is our Family Combo Deal — 2 large pizzas, salad, and breadsticks for just $44.99! Want me to add that to your order?",
  };

  function handleSend() {
    if (!inputValue.trim()) return;

    const userMsg = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const lowerMsg = userMsg.toLowerCase();
      let response = "Great question! I can help with orders, menu info, hours, delivery, or today's specials. What would you like to know?";

      for (const [key, val] of Object.entries(responses)) {
        if (lowerMsg.includes(key)) {
          response = val;
          break;
        }
      }

      setMessages(prev => [...prev, { role: 'agent', text: response }]);
      setIsTyping(false);
    }, 1200);
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-ringo-teal to-emerald-400 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-[#0D0D12]" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Ringo Chat Agent</p>
            <p className="text-[10px] text-emerald-400 font-semibold">Online — avg reply 1.2s</p>
          </div>
        </div>

        {/* Messages */}
        <div className="h-[280px] overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              {msg.role === 'agent' && (
                <div className="h-6 w-6 rounded-full bg-ringo-teal/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-ringo-teal" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'bg-ringo-teal text-white rounded-tr-sm'
                    : 'bg-white/[0.06] text-white/80 rounded-tl-sm'
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-ringo-teal/20 flex items-center justify-center flex-shrink-0">
                <Bot className="h-3 w-3 text-ringo-teal" />
              </div>
              <div className="bg-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-2.5">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick replies */}
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {['Menu', 'Order', 'Hours', 'Delivery', 'Special'].map((q) => (
            <button
              key={q}
              onClick={() => { setInputValue(q); }}
              className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-semibold text-white/50 hover:text-white/80 hover:border-white/15 transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06]">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Try: menu, order, hours..."
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-ringo-teal/50"
          />
          <button
            onClick={handleSend}
            className="h-10 w-10 rounded-xl bg-ringo-teal flex items-center justify-center hover:bg-ringo-teal-light transition-colors"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── FAQ Accordion ────────────────────────── */
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    {
      q: 'How quickly can I get Ringo set up?',
      a: 'Most restaurants are live within 5 minutes. Just create your account, connect your POS, and Ringo starts answering calls immediately. No complex setup or training required.',
    },
    {
      q: 'What happens if Ringo can\'t handle a call?',
      a: 'Ringo seamlessly transfers to your staff. But with 99.2% accuracy on orders and the ability to handle menu questions, hours, specials, and full ordering — transfers are rare.',
    },
    {
      q: 'Does Ringo work with my POS system?',
      a: 'Ringo integrates with 30+ POS systems including Square, Toast, Clover, SpotOn, and more. Orders are pushed directly to your kitchen — no manual entry needed.',
    },
    {
      q: 'How does the AI upselling work?',
      a: 'Ringo naturally suggests add-ons and upgrades during every order based on your menu strategy. On average, restaurants see a 22-31% increase in ticket size from AI-powered upsells.',
    },
    {
      q: 'Is there a contract or setup fee?',
      a: 'No contracts, no setup fees. Start with a 14-day free trial on any plan. Cancel anytime. We believe Ringo should prove its value before you pay a penny.',
    },
    {
      q: 'Can Ringo handle multiple calls at once?',
      a: 'Yes! Ringo can handle 50+ simultaneous calls without any degradation in quality. During your busiest rush, every single call gets answered.',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {faqs.map((faq, i) => (
        <button
          key={i}
          onClick={() => setOpen(open === i ? null : i)}
          className="w-full text-left rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-5">
            <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
            <ChevronDown className={cn('h-4 w-4 text-white/30 transition-transform flex-shrink-0', open === i && 'rotate-180')} />
          </div>
          <div className={cn('transition-all duration-300 overflow-hidden', open === i ? 'max-h-40 pb-5 px-6' : 'max-h-0')}>
            <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────── MAIN PAGE ────────────────────────── */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0D0D12] text-white overflow-hidden">
      {/* Grid background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* ───── Navigation ───── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0D0D12]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-serif text-2xl text-ringo-teal tracking-tight">Ringo</Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-white/50 hover:text-white transition-colors">Features</a>
              <a href="#demo" className="text-sm text-white/50 hover:text-white transition-colors">Demo</a>
              <a href="#pricing" className="text-sm text-white/50 hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="text-sm text-white/50 hover:text-white transition-colors">FAQ</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">
              Login
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ringo-teal hover:bg-ringo-teal-light text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-ringo-teal/20"
            >
              Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ───── Hero Section ───── */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        {/* Gradient blobs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-ringo-teal/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text */}
            <div className="max-w-xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] border border-white/[0.08] px-4 py-2 mb-8">
                <div className="flex -space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-ringo-amber text-ringo-amber" />
                  ))}
                </div>
                <span className="text-xs font-semibold text-white/60">#1 AI Voice Agent for Restaurants</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                Every call answered.
                <br />
                <span className="bg-gradient-to-r from-ringo-teal to-emerald-400 bg-clip-text text-transparent">
                  Every order captured.
                </span>
              </h1>

              <p className="text-lg text-white/50 mt-6 leading-relaxed max-w-lg">
                Ringo is the AI phone agent that takes orders, upsells, and pushes directly to your POS — 24/7, with 99.2% accuracy. Never miss a call again.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-8">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-ringo-teal hover:bg-ringo-teal-light text-base font-bold text-white transition-all duration-200 shadow-xl shadow-ringo-teal/25 hover:shadow-ringo-teal/40 hover:-translate-y-0.5"
                >
                  Try Ringo Free <Sparkles className="h-4 w-4" />
                </Link>
                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-white/[0.1] text-base font-semibold text-white/70 hover:text-white hover:border-white/20 transition-all"
                >
                  <Play className="h-4 w-4" /> See Live Demo
                </a>
              </div>

              {/* Trust metrics */}
              <div className="flex items-center gap-8 mt-12 pt-8 border-t border-white/[0.06]">
                <div>
                  <p className="text-2xl font-bold text-white"><AnimatedCounter target={50000} suffix="+" /></p>
                  <p className="text-xs text-white/40 font-semibold">calls/month</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white"><AnimatedCounter target={99} suffix="%" /></p>
                  <p className="text-xs text-white/40 font-semibold">answer rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white"><AnimatedCounter target={31} suffix="%" /></p>
                  <p className="text-xs text-white/40 font-semibold">avg upsell lift</p>
                </div>
              </div>
            </div>

            {/* Right - Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ───── Logos/Integrations Bar ───── */}
      <section className="relative py-12 border-y border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-6">
            Integrates with your POS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-40">
            {['Square', 'Toast', 'Clover', 'SpotOn', 'Aloha', 'Olo', 'OpenTable', 'SkyTab', 'Lightspeed', 'TouchBistro'].map((name) => (
              <span key={name} className="text-sm font-bold text-white/60 tracking-wider">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Products Section ───── */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full bg-ringo-teal/10 border border-ringo-teal/20 px-4 py-1.5 text-xs font-bold text-ringo-teal uppercase tracking-wider mb-6">
              <Zap className="h-3 w-3" /> Two AI Agents, One Platform
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold">
              Voice AI + Chat AI
            </h2>
            <p className="text-lg text-white/40 mt-4 max-w-2xl mx-auto">
              Cover every customer touchpoint. Ringo answers calls and chats so your team can focus on making great food.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Voice AI Card */}
            <div className="group rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 hover:border-ringo-teal/20 hover:bg-ringo-teal/[0.02] transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-ringo-teal to-emerald-500 flex items-center justify-center shadow-lg shadow-ringo-teal/20">
                  <PhoneCall className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Voice AI Agent</h3>
                  <p className="text-sm text-white/40">Answers every call like your best employee</p>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'Takes full phone orders with 99.2% accuracy',
                  'Smart upselling that increases tickets 22-31%',
                  'Handles 50+ simultaneous calls',
                  'Pushes orders directly to your POS',
                  'Natural, human-like voice conversations',
                  'Handles inquiries, hours, specials & more',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/50">
                    <Check className="h-4 w-4 text-ringo-teal flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-ringo-teal group-hover:gap-3 transition-all">
                Learn more <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Chat AI Card */}
            <div className="group rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 hover:border-ringo-amber/20 hover:bg-ringo-amber/[0.02] transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-ringo-amber to-orange-500 flex items-center justify-center shadow-lg shadow-ringo-amber/20">
                  <MessageSquare className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Chat AI Agent</h3>
                  <p className="text-sm text-white/40">Instant text &amp; web chat ordering</p>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'SMS &amp; web chat ordering in under 6 messages',
                  'Same phone number for calls and texts',
                  'Handles menu questions instantly',
                  'Sends order confirmations via text',
                  'Collects customer info for remarketing',
                  'Works 24/7 with 1.2s average response time',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/50">
                    <Check className="h-4 w-4 text-ringo-amber flex-shrink-0 mt-0.5" />
                    <span dangerouslySetInnerHTML={{ __html: f }} />
                  </li>
                ))}
              </ul>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-ringo-amber group-hover:gap-3 transition-all">
                Learn more <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Features Grid ───── */}
      <section id="features" className="relative py-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold">Why restaurants choose Ringo</h2>
            <p className="text-lg text-white/40 mt-4">Built for the realities of restaurant operations</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: '99.2% Order Accuracy',
                desc: 'No hallucinated menu items. Ringo only suggests what\'s actually on your menu, with precise pricing.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-400/10',
              },
              {
                icon: TrendingUp,
                title: '22-31% Ticket Increase',
                desc: 'Dynamic upselling engine suggests the right add-ons at the right time in every conversation.',
                color: 'text-ringo-amber',
                bg: 'bg-ringo-amber/10',
              },
              {
                icon: Clock,
                title: '24/7 Never Misses a Call',
                desc: 'Late night, lunch rush, holidays — Ringo answers every call instantly. No hold times ever.',
                color: 'text-ringo-teal',
                bg: 'bg-ringo-teal/10',
              },
              {
                icon: Zap,
                title: '5-Minute Setup',
                desc: 'Go live in minutes, not weeks. No complex integrations or training. Your AI agent is ready when you are.',
                color: 'text-violet-400',
                bg: 'bg-violet-400/10',
              },
              {
                icon: Shield,
                title: 'No Ticket Until Payment',
                desc: 'Orders only hit your POS after payment is confirmed. No more fake orders or no-shows clogging your kitchen.',
                color: 'text-rose-400',
                bg: 'bg-rose-400/10',
              },
              {
                icon: BarChart3,
                title: 'Deep Analytics',
                desc: 'Every call transcribed and analyzed. See revenue by hour, top items, upsell rates, and more in real-time.',
                color: 'text-blue-400',
                bg: 'bg-blue-400/10',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-200"
              >
                <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center mb-4', feature.bg)}>
                  <feature.icon className={cn('h-6 w-6', feature.color)} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Interactive Demo Section ───── */}
      <section id="demo" className="relative py-24 border-t border-white/[0.04]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-ringo-teal/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 border border-emerald-400/20 px-4 py-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-6">
              <MessageSquare className="h-3 w-3" /> Live Demo
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold">Try Ringo right now</h2>
            <p className="text-lg text-white/40 mt-4 max-w-xl mx-auto">
              Chat with our AI agent below. Ask about the menu, place an order, or check hours.
            </p>
          </div>
          <LiveChatDemo />
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section className="relative py-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold">Live in 3 steps</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create your account',
                desc: 'Sign up, tell us your restaurant name, and connect your POS. Takes under 5 minutes.',
                icon: Users,
              },
              {
                step: '02',
                title: 'Ringo learns your menu',
                desc: 'We automatically sync your menu, prices, and specials. Ringo knows everything your staff knows.',
                icon: Bot,
              },
              {
                step: '03',
                title: 'Start taking orders',
                desc: 'Forward your phone and Ringo answers 24/7. Orders flow directly to your POS and kitchen.',
                icon: DollarSign,
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-5">
                  <item.icon className="h-7 w-7 text-ringo-teal" />
                </div>
                <span className="text-[10px] font-bold text-ringo-teal uppercase tracking-widest">Step {item.step}</span>
                <h3 className="text-lg font-bold text-white mt-2 mb-2">{item.title}</h3>
                <p className="text-sm text-white/40 max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Testimonials ───── */}
      <section className="relative py-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold">Loved by restaurants</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "Ringo captures orders we used to miss during rush hours. We're seeing $3,200 more per month in phone orders alone.",
                name: 'Maria Chen',
                role: 'Owner, Dragon Wok',
                metric: '+$3,200/mo',
              },
              {
                quote: "The upselling is incredible. Ringo naturally suggests add-ons and our average ticket went from $28 to $36 in the first week.",
                name: 'Tony Russo',
                role: "Owner, Tony's Pizzeria",
                metric: '+28% ticket',
              },
              {
                quote: "We tried 3 other AI phone services. Ringo is the only one that actually sounds natural and doesn't confuse our customers.",
                name: 'James Park',
                role: 'GM, Seoul Kitchen',
                metric: '99% accuracy',
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-ringo-amber text-ringo-amber" />
                  ))}
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-white/40">{t.role}</p>
                  </div>
                  <span className="text-xs font-bold text-ringo-teal bg-ringo-teal/10 px-2.5 py-1 rounded-full">
                    {t.metric}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section id="pricing" className="relative py-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold">Simple, transparent pricing</h2>
            <p className="text-lg text-white/40 mt-4">Start with a 14-day free trial. No credit card required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '$299',
                period: '/mo',
                desc: 'For single-location restaurants getting started',
                cta: 'Start Free Trial',
                popular: false,
                features: [
                  'Voice AI Agent',
                  'Up to 100 calls/day',
                  'Call transcripts',
                  'Basic analytics',
                  'POS integration',
                  'Email support',
                ],
              },
              {
                name: 'Growth',
                price: '$599',
                period: '/mo',
                desc: 'For restaurants serious about maximizing revenue',
                cta: 'Start Free Trial',
                popular: true,
                features: [
                  'Voice AI + Chat AI Agent',
                  'Up to 250 calls/day',
                  'Smart upselling engine',
                  'Advanced analytics',
                  'Custom voice persona',
                  'Priority support',
                  'ROI dashboard',
                ],
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                desc: 'For multi-location operators and franchises',
                cta: 'Contact Sales',
                popular: false,
                features: [
                  'Everything in Growth',
                  'Unlimited calls',
                  'Multi-location support',
                  'Dedicated account manager',
                  'Custom integrations',
                  'White-glove onboarding',
                  'SLA guarantee',
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  'rounded-3xl border p-8 transition-all duration-200 relative',
                  plan.popular
                    ? 'border-ringo-teal/30 bg-ringo-teal/[0.05] shadow-xl shadow-ringo-teal/10 scale-[1.02]'
                    : 'border-white/[0.06] bg-white/[0.02]'
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ringo-teal px-4 py-1 text-xs font-bold text-white shadow-lg shadow-ringo-teal/30">
                    MOST POPULAR
                  </span>
                )}

                <p className="text-sm font-bold text-white/50 uppercase tracking-wider">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-3 mb-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-white/40">{plan.period}</span>
                </div>
                <p className="text-sm text-white/40 mb-6">{plan.desc}</p>

                <Link
                  href="/onboarding"
                  className={cn(
                    'block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all',
                    plan.popular
                      ? 'bg-ringo-teal hover:bg-ringo-teal-light text-white shadow-lg shadow-ringo-teal/20'
                      : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]'
                  )}
                >
                  {plan.cta}
                </Link>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/50">
                      <Check className={cn('h-3.5 w-3.5 flex-shrink-0', plan.popular ? 'text-ringo-teal' : 'text-white/30')} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section id="faq" className="relative py-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold">Frequently asked questions</h2>
          </div>
          <FAQ />
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="relative py-32">
        <div className="absolute inset-0 bg-gradient-to-t from-ringo-teal/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Stop missing calls.
            <br />
            <span className="bg-gradient-to-r from-ringo-teal to-emerald-400 bg-clip-text text-transparent">Start making money.</span>
          </h2>
          <p className="text-lg text-white/40 mb-8 max-w-lg mx-auto">
            Join hundreds of restaurants already using Ringo. 14-day free trial, no credit card, setup in 5 minutes.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-10 py-5 rounded-full bg-ringo-teal hover:bg-ringo-teal-light text-lg font-bold text-white transition-all duration-200 shadow-2xl shadow-ringo-teal/30 hover:shadow-ringo-teal/50 hover:-translate-y-1"
          >
            Get Started Free <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xl text-ringo-teal">Ringo</span>
              <span className="text-xs text-white/25">The phone rings. Ringo handles it.</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-xs text-white/30 hover:text-white/60 transition-colors">Features</a>
              <a href="#pricing" className="text-xs text-white/30 hover:text-white/60 transition-colors">Pricing</a>
              <a href="#faq" className="text-xs text-white/30 hover:text-white/60 transition-colors">FAQ</a>
              <Link href="/login" className="text-xs text-white/30 hover:text-white/60 transition-colors">Login</Link>
            </div>
            <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} Ringo AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
