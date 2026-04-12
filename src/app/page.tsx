"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  PhoneCall,
  ArrowRight,
  Check,
  Zap,
  BarChart3,
  Star,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Menu,
  X,
  TrendingUp,
  DollarSign,
  Activity,
  Mic,
  ShoppingCart,
  Users,
  Calendar,
  CreditCard,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   SCROLL ANIMATION HOOK
   ═══════════════════════════════════════════════════════════════════════ */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ═══════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════════════════════ */
function AnimatedCounter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useScrollReveal();

  useEffect(() => {
    if (!visible) return;
    const duration = 1800;
    const steps = 50;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [visible, target]);

  return <span ref={ref as React.RefObject<HTMLSpanElement>}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════
   PHONE MOCKUP WITH LIVE CONVERSATION
   ═══════════════════════════════════════════════════════════════════════ */
function PhoneMockup() {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    { from: "customer", text: "Hi, I'd like to place an order for pickup." },
    { from: "ringo", text: "Of course! I'd be happy to help. What can I get started for you?" },
    { from: "customer", text: "A large pepperoni pizza and garlic knots." },
    { from: "ringo", text: "Great choices! Would you like to add a 2-liter drink for just $2.99?" },
    { from: "customer", text: "Sure, a Coke please." },
    { from: "ringo", text: "Perfect! Your total is $24.47. I'll send a payment link to your phone now." },
  ];

  useEffect(() => {
    if (messageIndex >= messages.length) return;
    const delay = messageIndex === 0 ? 1200 : messages[messageIndex - 1].from === "ringo" ? 2200 : 1800;
    const timer = setTimeout(() => setMessageIndex((i) => i + 1), delay);
    return () => clearTimeout(timer);
  }, [messageIndex, messages.length]);

  return (
    <div className="relative mx-auto" style={{ width: "280px" }}>
      {/* Phone frame */}
      <div className="relative bg-[#0A0A12] rounded-[2.5rem] p-2 shadow-2xl shadow-black/40 border border-white/[0.08]">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#0A0A12] rounded-b-2xl z-20" />
        {/* Screen */}
        <div className="bg-gradient-to-b from-[#12121E] to-[#0D0D18] rounded-[2rem] overflow-hidden" style={{ minHeight: "480px" }}>
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-8 pb-2">
            <span className="text-[10px] text-white/50 font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-white/40 rounded-sm relative">
                <div className="absolute inset-[1px] right-[2px] bg-green-400 rounded-[1px]" />
              </div>
            </div>
          </div>
          {/* Call header */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#921920] to-[#B22028] flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Ringo AI</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-emerald-400 font-medium">Active call — 2:34</span>
                </div>
              </div>
            </div>
          </div>
          {/* Messages */}
          <div className="px-3 py-4 space-y-3 overflow-hidden" style={{ maxHeight: "360px" }}>
            {messages.slice(0, messageIndex).map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "customer" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    msg.from === "customer"
                      ? "bg-[#921920] text-white rounded-br-md"
                      : "bg-white/[0.08] text-white/90 rounded-bl-md"
                  }`}
                  style={{
                    animation: "fadeSlideUp 0.4s ease-out forwards",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {messageIndex < messages.length && (
              <div className={`flex ${messages[messageIndex].from === "customer" ? "justify-end" : "justify-start"}`}>
                <div className="bg-white/[0.06] rounded-2xl px-4 py-3 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Glow effect */}
      <div className="absolute -inset-8 bg-[#921920]/20 rounded-full blur-3xl -z-10" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DEMO CALL FORM
   ═══════════════════════════════════════════════════════════════════════ */
function DemoCallForm() {
  const [step, setStep] = useState<"restaurant" | "cuisine" | "contact" | "connecting">("restaurant");
  const [restaurantName, setRestaurantName] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [formData, setFormData] = useState({ firstName: "", phone: "", restaurant: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cuisineOptions = ["Mexican", "Pizza", "Burgers", "Sushi", "Italian", "Indian", "Chinese", "BBQ"];

  const handleCuisineSelect = (cuisine: string) => {
    setSelectedCuisine(cuisine);
    setFormData({ ...formData, restaurant: restaurantName });
    setStep("contact");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.phone) return;
    setIsSubmitting(true);
    setStep("connecting");
    try {
      const response = await fetch("/api/demo-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: formData.restaurant || restaurantName,
          cuisineType: selectedCuisine,
          customerName: formData.firstName,
        }),
      });
      if (response.ok) {
        setTimeout(() => {
          alert("Demo call initiated! You should receive a call shortly.");
          setStep("restaurant");
          setRestaurantName("");
          setSelectedCuisine("");
          setFormData({ firstName: "", phone: "", restaurant: "" });
          setIsSubmitting(false);
        }, 3000);
      }
    } catch {
      alert("Failed to initiate demo call. Please try again.");
      setIsSubmitting(false);
      setStep("restaurant");
    }
  };

  const stepLabels = ["Restaurant", "Cuisine", "Contact"];
  const stepIndex = step === "restaurant" ? 0 : step === "cuisine" ? 1 : step === "contact" ? 2 : 2;

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white/[0.06] backdrop-blur-xl rounded-2xl border border-white/[0.1] p-6 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#921920] to-[#B22028] flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Try Ringo Live</p>
            <p className="text-white/50 text-[11px]">Hear AI order-taking for your restaurant</p>
          </div>
        </div>

        {/* Progress dots */}
        {step !== "connecting" && (
          <div className="flex items-center gap-2 mb-5">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= stepIndex ? "bg-[#921920]" : "bg-white/10"}`} />
              </div>
            ))}
          </div>
        )}

        {step === "restaurant" && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your restaurant name"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.07] border border-white/[0.1] rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#921920]/50 focus:border-[#921920]/50 text-sm transition-all"
            />
            <button
              onClick={() => restaurantName && setStep("cuisine")}
              disabled={!restaurantName}
              className="w-full bg-[#921920] text-white py-3 rounded-xl font-semibold hover:bg-[#B22028] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === "cuisine" && (
          <div className="space-y-3">
            <p className="text-white/60 text-xs font-medium">What type of cuisine?</p>
            <div className="grid grid-cols-2 gap-2">
              {cuisineOptions.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => handleCuisineSelect(cuisine)}
                  className="px-3 py-2.5 border border-white/[0.1] text-white/80 rounded-xl hover:bg-[#921920] hover:text-white hover:border-[#921920] transition-all text-sm font-medium"
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "contact" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="First name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-3 bg-white/[0.07] border border-white/[0.1] rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#921920]/50 text-sm transition-all"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-white/[0.07] border border-white/[0.1] rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#921920]/50 text-sm transition-all"
            />
            <button
              type="submit"
              disabled={isSubmitting || !formData.firstName || !formData.phone}
              className="w-full bg-[#921920] text-white py-3 rounded-xl font-semibold hover:bg-[#B22028] disabled:opacity-30 transition-all text-sm flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4" /> Start Demo Call
            </button>
          </form>
        )}

        {step === "connecting" && (
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#921920]/20 flex items-center justify-center">
                <Phone className="w-7 h-7 text-[#921920]" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-[#921920]/40 animate-ping" />
            </div>
            <p className="text-white/70 text-sm font-medium">Connecting to Ringo...</p>
          </div>
        )}

        <p className="text-white/30 text-[10px] text-center mt-4">
          Join 500+ restaurants already using Ringo
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD PREVIEW (PREMIUM)
   ═══════════════════════════════════════════════════════════════════════ */
function DashboardPreview() {
  const { ref, visible } = useScrollReveal();

  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      <div className="relative">
        {/* Browser chrome */}
        <div className="bg-[#1A1A2E] rounded-t-xl px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white/[0.06] rounded-md px-3 py-1 text-white/40 text-xs font-medium">
              app.useringo.ai/dashboard
            </div>
          </div>
        </div>
        {/* Dashboard content */}
        <div className="bg-[#0F1420] rounded-b-xl overflow-hidden border border-white/[0.06] border-t-0">
          <div className="flex">
            {/* Sidebar */}
            <div className="hidden md:block w-52 border-r border-white/[0.06] p-4 space-y-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#921920] to-[#B22028] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">R</span>
                </div>
                <span className="text-white text-sm font-bold">Ringo</span>
              </div>
              {[
                { icon: Activity, label: "Dashboard", active: true },
                { icon: Phone, label: "Calls", active: false },
                { icon: BarChart3, label: "Analytics", active: false },
                { icon: ShoppingCart, label: "Orders", active: false },
                { icon: Calendar, label: "Reservations", active: false },
              ].map((item) => (
                <div key={item.label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${item.active ? "bg-[#921920]/15 text-white font-semibold" : "text-white/40 hover:text-white/60"}`}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            {/* Main content */}
            <div className="flex-1 p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-white font-bold text-base">Dashboard</h3>
                  <p className="text-white/40 text-xs">Today, {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-bold">LIVE</span>
                </div>
              </div>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Total Calls", value: "127", change: "+12%", color: "text-[#921920]" },
                  { label: "Orders", value: "84", change: "+18%", color: "text-emerald-400" },
                  { label: "Revenue", value: "$3,247", change: "+24%", color: "text-blue-400" },
                  { label: "Answer Rate", value: "99.2%", change: "+0.3%", color: "text-amber-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5">
                    <p className="text-white/40 text-[11px] font-medium mb-1">{stat.label}</p>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-emerald-400 text-[10px] font-semibold mt-1">{stat.change} vs yesterday</p>
                  </div>
                ))}
              </div>
              {/* Recent calls table */}
              <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-white text-sm font-semibold">Recent Calls</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="text-left px-4 py-2.5 text-white/30 font-medium">Time</th>
                      <th className="text-left px-4 py-2.5 text-white/30 font-medium">Caller</th>
                      <th className="text-left px-4 py-2.5 text-white/30 font-medium hidden sm:table-cell">Duration</th>
                      <th className="text-left px-4 py-2.5 text-white/30 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { time: "2:34 PM", caller: "John M.", dur: "4m 12s", result: "Order — $28.50", type: "order" },
                      { time: "2:18 PM", caller: "Sarah L.", dur: "2m 45s", result: "Reservation", type: "res" },
                      { time: "1:56 PM", caller: "Mike R.", dur: "3m 08s", result: "Order — $42.75", type: "order" },
                      { time: "1:42 PM", caller: "Emma T.", dur: "1m 32s", result: "FAQ Answered", type: "faq" },
                    ].map((call, i) => (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-white/60">{call.time}</td>
                        <td className="px-4 py-2.5 text-white/80 font-medium">{call.caller}</td>
                        <td className="px-4 py-2.5 text-white/40 hidden sm:table-cell">{call.dur}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            call.type === "order" ? "bg-emerald-500/15 text-emerald-400" :
                            call.type === "res" ? "bg-blue-500/15 text-blue-400" :
                            "bg-amber-500/15 text-amber-400"
                          }`}>
                            <Check className="w-2.5 h-2.5" /> {call.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative glow */}
        <div className="absolute -inset-12 bg-gradient-to-b from-[#921920]/10 via-transparent to-transparent rounded-3xl blur-3xl -z-10 pointer-events-none" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ROI CALCULATOR
   ═══════════════════════════════════════════════════════════════════════ */
function ROICalculator() {
  const [callsPerDay, setCallsPerDay] = useState(30);
  const [avgOrder, setAvgOrder] = useState(30);
  const missedRevenue = Math.round(callsPerDay * 0.3 * avgOrder * 30);
  const yearlyLost = missedRevenue * 12;

  return (
    <div className="bg-white rounded-2xl border border-[#E8DDD0]/60 shadow-lg shadow-black/[0.03] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-8">
          <h4 className="text-lg font-bold text-[#1A1A2E] mb-1">Calculate Your Lost Revenue</h4>
          <p className="text-sm text-[#6B5E50] mb-8">See how much missed calls cost your restaurant.</p>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-[#1A1A2E]">Phone calls per day</label>
                <span className="text-sm font-bold text-[#921920]">{callsPerDay}</span>
              </div>
              <input type="range" min="10" max="100" value={callsPerDay} onChange={(e) => setCallsPerDay(+e.target.value)}
                className="w-full h-1.5 bg-[#E8DDD0] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#921920] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-[#1A1A2E]">Average order value</label>
                <span className="text-sm font-bold text-[#921920]">${avgOrder}</span>
              </div>
              <input type="range" min="15" max="60" value={avgOrder} onChange={(e) => setAvgOrder(+e.target.value)}
                className="w-full h-1.5 bg-[#E8DDD0] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#921920] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#0F1420] to-[#1A1A2E] p-8 flex flex-col justify-center">
          <p className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-2">Monthly revenue lost to missed calls</p>
          <p className="text-4xl md:text-5xl font-bold text-white mb-1">${missedRevenue.toLocaleString()}</p>
          <p className="text-white/40 text-sm mb-6">${yearlyLost.toLocaleString()} per year</p>
          <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.08]">
            <p className="text-emerald-400 text-sm font-semibold mb-0.5">With Ringo at $249/mo</p>
            <p className="text-white/60 text-xs">ROI payback in {Math.max(1, Math.ceil(249 / (missedRevenue || 1)))} day{Math.ceil(249 / (missedRevenue || 1)) !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════════════════════════ */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E8DDD0]/60 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full py-5 px-1 flex items-center justify-between text-left group">
        <span className="text-[15px] font-semibold text-[#1A1A2E] group-hover:text-[#921920] transition-colors pr-4">{question}</span>
        <ChevronDown className={`w-4 h-4 text-[#921920] flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-5" : "max-h-0"}`}>
        <p className="text-sm text-[#6B5E50] leading-relaxed px-1">{answer}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION WRAPPER WITH SCROLL ANIMATION
   ═══════════════════════════════════════════════════════════════════════ */
function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  const integrations = [
    { name: "Square", src: "/integrations/square.svg" },
    { name: "Toast", src: "/integrations/toast.svg" },
    { name: "Clover", src: "/integrations/clover.svg" },
    { name: "SpotOn", src: "/integrations/spoton.svg" },
    { name: "Aloha", src: "/integrations/aloha.svg" },
    { name: "OpenTable", src: "/integrations/opentable.svg" },
    { name: "DoorDash", src: "/integrations/doordash.svg" },
    { name: "Uber Eats", src: "/integrations/ubereats.svg" },
  ];

  const faqItems = [
    { question: "How long does setup take?", answer: "Setup takes just 2 minutes. Forward your restaurant phone number to Ringo, upload your menu, and you are live. No technical knowledge required." },
    { question: "Which POS systems do you support?", answer: "We integrate directly with Square, Toast, Clover, SpotOn, Aloha, and 20+ other major POS systems. Orders flow straight to your kitchen." },
    { question: "Are there contracts or commitments?", answer: "No contracts, ever. Month-to-month billing. Cancel anytime with no penalties or hidden fees." },
    { question: "Can Ringo handle complex orders and modifications?", answer: "Yes. Ringo learns your exact menu including modifiers, allergies, pricing tiers, and daily specials. It handles even the most complex orders accurately." },
    { question: "How is my data protected?", answer: "We use enterprise-grade encryption for all data. PCI-DSS Level 1 compliant for payments. Full GDPR and CCPA compliance. Your customer data is never shared or sold." },
    { question: "Can I try it before committing?", answer: "Absolutely. Try the live demo above, or start with our 14-day free trial. No credit card required." },
  ];

  return (
    <div className="min-h-screen">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee 30s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ═══════════════ NAVIGATION ═══════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0A12]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/10"
          : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#921920] to-[#B22028] flex items-center justify-center shadow-lg shadow-[#921920]/20">
              <span className="text-white text-sm font-black">R</span>
            </div>
            <span className="text-white text-lg font-bold tracking-tight">Ringo</span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-white/50 hover:text-white transition-colors text-sm font-medium">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-white/60 hover:text-white transition-colors text-sm font-medium px-4 py-2">
              Log in
            </Link>
            <Link href="#pricing" className="bg-[#921920] hover:bg-[#B22028] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#921920]/20">
              Get Started Free
            </Link>
          </div>

          <button className="md:hidden text-white/70" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0A0A12]/95 backdrop-blur-xl border-t border-white/[0.06] px-5 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="block text-white/60 hover:text-white py-2.5 text-sm font-medium transition-colors">
                {link.label}
              </Link>
            ))}
            <hr className="border-white/[0.08] my-2" />
            <Link href="/login" className="block text-white/60 hover:text-white py-2.5 text-sm font-medium">Log in</Link>
            <Link href="#pricing" className="block bg-[#921920] text-white text-center py-2.5 rounded-lg text-sm font-semibold mt-2">
              Get Started Free
            </Link>
          </div>
        )}
      </nav>

      {/* ═══════════════ HERO — DARK ═══════════════ */}
      <section className="relative bg-[#0A0A12] overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#921920]/[0.07] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#921920]/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-28 pb-20 md:pt-36 md:pb-28">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-full px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#921920]" />
              <span className="text-white/70 text-xs font-medium">The #1 AI phone agent for restaurants</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6 max-w-4xl mx-auto" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Never miss a phone order{" "}
            <span className="bg-gradient-to-r from-[#921920] via-[#C42D37] to-[#921920] bg-clip-text text-transparent">again</span>
          </h1>

          <p className="text-center text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-14">
            Ringo answers every call, takes orders, upsells intelligently, and sends payment links — 24/7. Your AI employee that never calls in sick.
          </p>

          {/* Hero content: Phone + Demo Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-5xl mx-auto">
            <div className="flex justify-center lg:justify-end order-2 lg:order-1">
              <PhoneMockup />
            </div>
            <div className="order-1 lg:order-2">
              <DemoCallForm />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-20">
            {[
              { value: "98%", label: "Answer rate" },
              { value: "$2,847", label: "Avg. monthly savings" },
              { value: "24/7", label: "Availability" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-white/40 text-xs font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fade to light */}
        <div className="h-24 bg-gradient-to-b from-[#0A0A12] to-[#FFF8F0]" />
      </section>

      {/* ═══════════════ INTEGRATIONS MARQUEE ═══════════════ */}
      <section className="bg-[#FFF8F0] py-10">
        <p className="text-center text-[#6B5E50] text-xs font-semibold uppercase tracking-widest mb-6">
          Integrates with your POS
        </p>
        <div className="relative overflow-hidden">
          <div className="flex items-center gap-16 marquee-track" style={{ width: "max-content" }}>
            {[...integrations, ...integrations].map((item, i) => (
              <div key={`${item.name}-${i}`} className="flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity">
                <Image src={item.src} alt={item.name} width={100} height={40} className="h-8 w-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="bg-[#FFF8F0] py-24 md:py-32 px-5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <RevealSection>
            <div className="text-center mb-20">
              <p className="text-[#921920] text-xs font-bold uppercase tracking-widest mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A2E] leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Everything your restaurant phone line needs
              </h2>
            </div>
          </RevealSection>

          {/* Feature cards — alternating layout */}
          <div className="space-y-24">
            {/* Feature 1: Order Taking */}
            <RevealSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-[#921920]/8 rounded-lg px-3 py-1.5 mb-5">
                    <ShoppingCart className="w-4 h-4 text-[#921920]" />
                    <span className="text-xs font-semibold text-[#921920]">Order Taking</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-4 leading-snug" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Takes phone orders and sends them straight to your POS
                  </h3>
                  <p className="text-[#6B5E50] leading-relaxed mb-6">
                    Customers call, Ringo takes their order with all customizations, and sends it directly to your kitchen. No typing, no mistakes, no missed orders.
                  </p>
                  <div className="space-y-3">
                    {["Real-time POS integration", "Handles modifiers and special requests", "Pickup and delivery support"].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#921920]/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#921920]" />
                        </div>
                        <span className="text-sm text-[#6B5E50]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-[#E8DDD0]/60 shadow-lg shadow-black/[0.03] p-6">
                  <div className="bg-[#0F1420] rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-white/40 pb-3 border-b border-white/[0.06]">
                      <span>Order #4827</span>
                      <span className="text-emerald-400 font-semibold">In Progress</span>
                    </div>
                    {[
                      { item: "Large Pepperoni Pizza", mod: "Extra cheese, thin crust", price: "$18.99" },
                      { item: "Crazy Bread (8pc)", mod: "With marinara", price: "$4.49" },
                      { item: "2L Coca-Cola", mod: "Upsell added", price: "$2.99" },
                    ].map((line) => (
                      <div key={line.item} className="flex justify-between items-start py-2">
                        <div>
                          <p className="text-white text-sm font-medium">{line.item}</p>
                          <p className="text-white/30 text-xs">{line.mod}</p>
                        </div>
                        <span className="text-white/70 text-sm font-medium">{line.price}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 border-t border-white/[0.06]">
                      <span className="text-white font-bold text-sm">Total</span>
                      <span className="text-white font-bold text-sm">$26.47</span>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-xs font-semibold">Payment link sent to customer</span>
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* Feature 2: Payment */}
            <RevealSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="lg:order-2">
                  <div className="inline-flex items-center gap-2 bg-[#921920]/8 rounded-lg px-3 py-1.5 mb-5">
                    <CreditCard className="w-4 h-4 text-[#921920]" />
                    <span className="text-xs font-semibold text-[#921920]">Payments</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-4 leading-snug" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Collects payment before the food hits the grill
                  </h3>
                  <p className="text-[#6B5E50] leading-relaxed mb-6">
                    Pay Before Prep means zero no-shows and instant cash flow. Ringo sends a secure payment link via text — customers pay in one tap.
                  </p>
                  <div className="space-y-3">
                    {["PCI-DSS Level 1 compliant", "One-tap payment via text link", "Eliminates no-shows and chargebacks"].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#921920]/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#921920]" />
                        </div>
                        <span className="text-sm text-[#6B5E50]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:order-1 bg-white rounded-2xl border border-[#E8DDD0]/60 shadow-lg shadow-black/[0.03] p-6 flex items-center justify-center">
                  <div className="w-full max-w-xs space-y-4">
                    <div className="bg-gradient-to-br from-[#1A1A2E] to-[#0F1420] rounded-xl p-5 text-white">
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-4">Secure Payment</p>
                      <p className="text-xl font-bold tracking-wider mb-5">4142 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 1234</p>
                      <div className="flex justify-between text-xs text-white/50">
                        <span>John Smith</span>
                        <span>12/26</span>
                      </div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-emerald-800 text-sm font-semibold">Payment received</p>
                        <p className="text-emerald-600 text-xs">$26.47 — Order #4827</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* Feature 3: Menu Intelligence */}
            <RevealSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-[#921920]/8 rounded-lg px-3 py-1.5 mb-5">
                    <MessageSquare className="w-4 h-4 text-[#921920]" />
                    <span className="text-xs font-semibold text-[#921920]">Menu Intelligence</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-4 leading-snug" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Knows your menu inside-out and upsells intelligently
                  </h3>
                  <p className="text-[#6B5E50] leading-relaxed mb-6">
                    Upload your menu once. Ringo learns every item, price, modifier, allergy, and special — then uses that knowledge to answer questions and increase ticket sizes.
                  </p>
                  <div className="space-y-3">
                    {["Allergy-aware recommendations", "Smart upselling and cross-selling", "Auto-syncs menu changes"].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#921920]/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#921920]" />
                        </div>
                        <span className="text-sm text-[#6B5E50]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-[#E8DDD0]/60 shadow-lg shadow-black/[0.03] p-6">
                  <div className="space-y-4">
                    {[
                      { from: "customer", text: "Do you have anything gluten-free?" },
                      { from: "ringo", text: "Yes! Our Grilled Chicken Caesar, Salmon Bowl, and all our stir-fry dishes are gluten-free. The Salmon Bowl is our most popular choice." },
                      { from: "customer", text: "I'll do the Salmon Bowl." },
                      { from: "ringo", text: "Great choice! Would you like to add our house-made miso soup for $3? It pairs perfectly and it's also gluten-free." },
                    ].map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.from === "customer" ? "" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          msg.from === "customer" ? "bg-[#E8DDD0]" : "bg-gradient-to-br from-[#921920] to-[#B22028]"
                        }`}>
                          {msg.from === "customer" ? (
                            <Users className="w-3.5 h-3.5 text-[#6B5E50]" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#6B5E50]/60">
                            {msg.from === "customer" ? "Customer" : "Ringo AI"}
                          </p>
                          <p className="text-sm text-[#1A1A2E] leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════════ DASHBOARD PREVIEW ═══════════════ */}
      <section className="bg-[#FFF8F0] py-24 md:py-32 px-5 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="text-center mb-14">
              <p className="text-[#921920] text-xs font-bold uppercase tracking-widest mb-3">Dashboard</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A2E] leading-tight mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Your AI phone command center
              </h2>
              <p className="text-lg text-[#6B5E50] max-w-xl mx-auto">
                Live calls, transcripts, orders, and performance — all in one beautiful real-time dashboard.
              </p>
            </div>
          </RevealSection>
          <DashboardPreview />
        </div>
      </section>

      {/* ═══════════════ REVENUE IMPACT + ROI ═══════════════ */}
      <section className="bg-white py-24 md:py-32 px-5 sm:px-6 lg:px-8 border-y border-[#E8DDD0]/60">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center mb-6">
              <p className="text-[#921920] text-xs font-bold uppercase tracking-widest mb-3">Revenue Impact</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A2E] leading-tight mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Every missed call is money left on the table
              </h2>
            </div>
          </RevealSection>

          <RevealSection delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
              {[
                { icon: Phone, stat: "30%", desc: "of calls missed during peak hours" },
                { icon: DollarSign, stat: "$25–50", desc: "average value of every phone order" },
                { icon: TrendingUp, stat: "62%", desc: "of callers won't call back if unanswered" },
              ].map((item) => (
                <div key={item.stat} className="bg-[#FFF8F0] rounded-xl border border-[#E8DDD0]/60 p-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-[#921920]/8 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-5 h-5 text-[#921920]" />
                  </div>
                  <p className="text-2xl font-bold text-[#1A1A2E] mb-1">{item.stat}</p>
                  <p className="text-sm text-[#6B5E50]">{item.desc}</p>
                </div>
              ))}
            </div>
          </RevealSection>

          <RevealSection delay={200}>
            <ROICalculator />
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="bg-[#FFF8F0] py-24 md:py-32 px-5 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16">
              <p className="text-[#921920] text-xs font-bold uppercase tracking-widest mb-3">Setup</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A2E] leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Live in under 2 minutes
              </h2>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Forward Your Number", desc: "Point your restaurant phone to Ringo. Takes 30 seconds in your phone settings.", icon: Phone },
              { step: "02", title: "Upload Your Menu", desc: "Drop in a PDF, photo, or link. Our AI parses items, prices, mods, and allergies automatically.", icon: Zap },
              { step: "03", title: "Go Live", desc: "Ringo starts answering calls 24/7. Orders go straight to your POS. You earn from day one.", icon: Sparkles },
            ].map((item, i) => (
              <RevealSection key={item.step} delay={i * 100}>
                <div className="relative bg-white rounded-2xl border border-[#E8DDD0]/60 p-7 shadow-sm hover:shadow-md transition-shadow group">
                  <span className="text-6xl font-black text-[#E8DDD0]/60 absolute top-4 right-6 group-hover:text-[#921920]/10 transition-colors">{item.step}</span>
                  <div className="w-11 h-11 rounded-xl bg-[#921920]/8 flex items-center justify-center mb-5">
                    <item.icon className="w-5 h-5 text-[#921920]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#6B5E50] leading-relaxed">{item.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="bg-white py-24 md:py-32 px-5 sm:px-6 lg:px-8 border-y border-[#E8DDD0]/60">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <div className="text-center mb-14">
              <p className="text-[#921920] text-xs font-bold uppercase tracking-widest mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A2E] leading-tight mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-[#6B5E50]">No contracts. Cancel anytime.</p>
            </div>
          </RevealSection>

          <RevealSection delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Starter */}
              <div className="bg-[#FFF8F0] rounded-2xl border border-[#E8DDD0]/60 p-8 flex flex-col">
                <h3 className="text-xl font-bold text-[#1A1A2E] mb-1">Starter</h3>
                <p className="text-sm text-[#6B5E50] mb-6">Perfect for getting started</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-[#1A1A2E]">$0</span>
                  <span className="text-[#6B5E50] text-sm">/month</span>
                </div>
                <p className="text-xs text-[#6B5E50] mb-8">14-day free trial, no card required</p>
                <button className="w-full border-2 border-[#1A1A2E] text-[#1A1A2E] py-3 rounded-xl font-semibold hover:bg-[#1A1A2E] hover:text-white transition-all text-sm mb-8">
                  Start Free Trial
                </button>
                <ul className="space-y-3 flex-1">
                  {["100 calls/month", "1 location", "Basic analytics dashboard", "Email support"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#6B5E50]">
                      <Check className="w-4 h-4 text-[#921920] flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro */}
              <div className="bg-[#0F1420] rounded-2xl p-8 flex flex-col relative overflow-hidden shadow-xl shadow-black/10">
                <div className="absolute top-0 right-0 bg-[#921920] text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-xl">
                  Most Popular
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
                <p className="text-sm text-white/50 mb-6">For growing restaurants</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">$249</span>
                  <span className="text-white/50 text-sm">/month</span>
                </div>
                <p className="text-xs text-white/40 mb-8">Billed monthly. Cancel anytime.</p>
                <button className="w-full bg-[#921920] text-white py-3 rounded-xl font-semibold hover:bg-[#B22028] transition-all text-sm mb-8">
                  Start Free Trial
                </button>
                <ul className="space-y-3 flex-1">
                  {["Unlimited calls", "Up to 5 locations", "Advanced analytics + AI insights", "Priority phone support", "Custom POS integrations"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                      <Check className="w-4 h-4 text-[#921920] flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </RevealSection>

          <p className="text-center text-sm text-[#6B5E50] mt-8">
            Need a custom plan for 5+ locations?{" "}
            <a href="mailto:hello@useringo.ai" className="text-[#921920] font-semibold hover:underline">Talk to us</a>
          </p>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIAL ═══════════════ */}
      <section className="bg-[#FFF8F0] py-24 md:py-32 px-5 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <blockquote className="text-2xl md:text-3xl font-bold text-[#1A1A2E] leading-snug mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
              &ldquo;This paid for itself in 10 days. Phones are calm, tickets are bigger, and my team refuses to go back.&rdquo;
            </blockquote>
            <p className="text-[#6B5E50] font-medium">Restaurant Owner, Modesto CA</p>
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section id="faq" className="bg-white py-24 md:py-32 px-5 sm:px-6 lg:px-8 border-t border-[#E8DDD0]/60">
        <div className="max-w-2xl mx-auto">
          <RevealSection>
            <div className="text-center mb-12">
              <p className="text-[#921920] text-xs font-bold uppercase tracking-widest mb-3">FAQ</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Common questions
              </h2>
            </div>
          </RevealSection>
          <RevealSection delay={100}>
            <div>
              {faqItems.map((item, i) => (
                <FAQItem key={i} question={item.question} answer={item.answer} />
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ BOTTOM CTA ═══════════════ */}
      <section className="relative bg-[#0A0A12] py-24 md:py-32 px-5 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#921920]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#921920]/[0.06] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Ready to never miss another order?
          </h2>
          <p className="text-lg text-white/50 mb-10 max-w-md mx-auto">
            Join 500+ restaurants using Ringo to capture every call, increase revenue, and free up their team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="#pricing" className="bg-[#921920] hover:bg-[#B22028] text-white px-8 py-3.5 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-[#921920]/20 text-sm inline-flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#" className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white px-8 py-3.5 rounded-xl font-semibold transition-all text-sm inline-flex items-center justify-center gap-2">
              Schedule a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="bg-[#0A0A12] border-t border-white/[0.06] py-14 px-5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#921920] to-[#B22028] flex items-center justify-center">
                  <span className="text-white text-xs font-black">R</span>
                </div>
                <span className="text-white font-bold">Ringo</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed mb-3">
                AI voice ordering for restaurants. Built in Modesto, CA.
              </p>
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5">
                {["Features", "Integrations", "Pricing", "Demo"].map((item) => (
                  <li key={item}>
                    <a href={`#${item.toLowerCase()}`} className="text-white/40 hover:text-white/70 text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5">
                {["About", "Blog", "Careers", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-white/40 hover:text-white/70 text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {["Terms of Service", "Privacy Policy"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-white/40 hover:text-white/70 text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs">&copy; 2026 Ringo AI, Inc. All rights reserved.</p>
            <p className="text-white/30 text-xs">hello@useringo.ai</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
