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
  Send,
  ChefHat,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   BRAND COLORS — Championship Gold System
   ═══════════════════════════════════════════════════════════════════════ */
const GOLD = "#F3EEE3";
const CHAMPAGNE = "#C8C8C8";
const BG_DARK = "#0A0A0A";
const CARD_DARK = "#0A0A0A";

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
      <div className="relative bg-[#0A0A0A] rounded-[2.5rem] p-2 shadow-2xl shadow-obsidian/40 border border-bone/[0.08]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#0A0A0A] rounded-b-2xl z-20" />
        <div className="bg-gradient-to-b from-[#0A0A0A] to-[#0A0A0A] rounded-[2rem] overflow-hidden" style={{ minHeight: "480px" }}>
          <div className="flex items-center justify-between px-6 pt-8 pb-2">
            <span className="text-[10px] text-bone/50 font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-bone/40 rounded-sm relative">
                <div className="absolute inset-[1px] right-[2px] bg-[#F3EEE3] rounded-[1px]" />
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-b border-bone/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F3EEE3] to-[#C8C8C8] flex items-center justify-center">
                <Phone className="w-4 h-4 text-[#0A0A0A]" />
              </div>
              <div>
                <p className="text-bone text-sm font-semibold">Ringo AI</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F3EEE3] animate-pulse" />
                  <span className="text-[11px] text-[#F3EEE3] font-medium">Active call — 2:34</span>
                </div>
              </div>
            </div>
          </div>
          <div className="px-3 py-4 space-y-3 overflow-hidden" style={{ maxHeight: "360px" }}>
            {messages.slice(0, messageIndex).map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "customer" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    msg.from === "customer"
                      ? "bg-[#F3EEE3] text-[#0A0A0A] rounded-br-md font-medium"
                      : "bg-bone/[0.08] text-bone/90 rounded-bl-md"
                  }`}
                  style={{ animation: "fadeSlideUp 0.4s ease-out forwards" }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {messageIndex < messages.length && (
              <div className={`flex ${messages[messageIndex].from === "customer" ? "justify-end" : "justify-start"}`}>
                <div className="bg-bone/[0.06] rounded-2xl px-4 py-3 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-bone/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-bone/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-bone/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute -inset-8 bg-[#F3EEE3]/15 rounded-full blur-3xl -z-10" />
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
      <div className="bg-bone/[0.06] backdrop-blur-xl rounded-2xl border border-bone/[0.1] p-6 shadow-2xl shadow-obsidian/20">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F3EEE3] to-[#C8C8C8] flex items-center justify-center">
            <Mic className="w-4 h-4 text-[#0A0A0A]" />
          </div>
          <div>
            <p className="text-bone text-sm font-semibold">Try Ringo Live</p>
            <p className="text-bone/50 text-[11px]">Hear AI order-taking for your restaurant</p>
          </div>
        </div>

        {step !== "connecting" && (
          <div className="flex items-center gap-2 mb-5">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= stepIndex ? "bg-[#F3EEE3]" : "bg-bone/10"}`} />
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
              className="w-full px-4 py-3 bg-bone/[0.07] border border-bone/[0.1] rounded-xl text-bone placeholder-bone/40 focus:outline-none focus:ring-2 focus:ring-[#F3EEE3]/50 focus:border-[#F3EEE3]/50 text-sm transition-all"
            />
            <button
              onClick={() => restaurantName && setStep("cuisine")}
              disabled={!restaurantName}
              className="w-full bg-[#F3EEE3] text-[#0A0A0A] py-3 rounded-xl font-semibold hover:bg-[#C8C8C8] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === "cuisine" && (
          <div className="space-y-3">
            <p className="text-bone/60 text-xs font-medium">What type of cuisine?</p>
            <div className="grid grid-cols-2 gap-2">
              {cuisineOptions.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => handleCuisineSelect(cuisine)}
                  className="px-3 py-2.5 border border-bone/[0.1] text-bone/80 rounded-xl hover:bg-[#F3EEE3] hover:text-[#0A0A0A] hover:border-[#F3EEE3] transition-all text-sm font-medium"
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
              className="w-full px-4 py-3 bg-bone/[0.07] border border-bone/[0.1] rounded-xl text-bone placeholder-bone/40 focus:outline-none focus:ring-2 focus:ring-[#F3EEE3]/50 text-sm transition-all"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-bone/[0.07] border border-bone/[0.1] rounded-xl text-bone placeholder-bone/40 focus:outline-none focus:ring-2 focus:ring-[#F3EEE3]/50 text-sm transition-all"
            />
            <button
              type="submit"
              disabled={isSubmitting || !formData.firstName || !formData.phone}
              className="w-full bg-[#F3EEE3] text-[#0A0A0A] py-3 rounded-xl font-semibold hover:bg-[#C8C8C8] disabled:opacity-30 transition-all text-sm flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4" /> Start Demo Call
            </button>
          </form>
        )}

        {step === "connecting" && (
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#F3EEE3]/20 flex items-center justify-center">
                <Phone className="w-7 h-7 text-[#F3EEE3]" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-[#F3EEE3]/40 animate-ping" />
            </div>
            <p className="text-bone/70 text-sm font-medium">Connecting to Ringo...</p>
          </div>
        )}

        <p className="text-bone/30 text-[10px] text-center mt-4">
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
        <div className="bg-[#0A0A0A] rounded-t-xl px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#F3EEE3]" />
            <div className="w-3 h-3 rounded-full bg-[#F3EEE3]" />
            <div className="w-3 h-3 rounded-full bg-[#F3EEE3]" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-bone/[0.06] rounded-md px-3 py-1 text-bone/40 text-xs font-medium">
              app.useringo.ai/dashboard
            </div>
          </div>
        </div>
        <div className="bg-[#0A0A0A] rounded-b-xl overflow-hidden border border-bone/[0.06] border-t-0">
          <div className="flex">
            <div className="hidden md:block w-52 border-r border-bone/[0.06] p-4 space-y-1">
              <div className="flex items-center gap-2 mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ringo-logo.png" alt="Ringo" className="h-7 w-auto brightness-0 invert" />
              </div>
              {[
                { icon: Activity, label: "Dashboard", active: true },
                { icon: Phone, label: "Calls", active: false },
                { icon: BarChart3, label: "Analytics", active: false },
                { icon: ShoppingCart, label: "Orders", active: false },
                { icon: Calendar, label: "Reservations", active: false },
              ].map((item) => (
                <div key={item.label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${item.active ? "bg-[#F3EEE3]/15 text-[#F3EEE3] font-semibold" : "text-bone/40 hover:text-bone/60"}`}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-bone font-bold text-base">Dashboard</h3>
                  <p className="text-bone/40 text-xs">Today, {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-[#F3EEE3]/10 border border-[#F3EEE3]/20 px-2.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F3EEE3] animate-pulse" />
                  <span className="text-[10px] text-[#F3EEE3] font-bold">LIVE</span>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Total Calls", value: "127", change: "+12%", color: "text-[#F3EEE3]" },
                  { label: "Orders", value: "84", change: "+18%", color: "text-[#F3EEE3]" },
                  { label: "Revenue", value: "$3,247", change: "+24%", color: "text-[#C8C8C8]" },
                  { label: "Answer Rate", value: "99.2%", change: "+0.3%", color: "text-[#F3EEE3]" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[#0A0A0A] rounded-xl border border-bone/[0.06] p-3.5">
                    <p className="text-bone/40 text-[11px] font-medium mb-1">{stat.label}</p>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[#F3EEE3] text-[10px] font-semibold mt-1">{stat.change} vs yesterday</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#0A0A0A] rounded-xl border border-bone/[0.06] overflow-hidden">
                <div className="px-4 py-3 border-b border-bone/[0.06]">
                  <p className="text-bone text-sm font-semibold">Recent Calls</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-bone/[0.04]">
                      <th className="text-left px-4 py-2.5 text-bone/30 font-medium">Time</th>
                      <th className="text-left px-4 py-2.5 text-bone/30 font-medium">Caller</th>
                      <th className="text-left px-4 py-2.5 text-bone/30 font-medium hidden sm:table-cell">Duration</th>
                      <th className="text-left px-4 py-2.5 text-bone/30 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { time: "2:34 PM", caller: "John M.", dur: "4m 12s", result: "Order — $28.50", type: "order" },
                      { time: "2:18 PM", caller: "Sarah L.", dur: "2m 45s", result: "Reservation", type: "res" },
                      { time: "1:56 PM", caller: "Mike R.", dur: "3m 08s", result: "Order — $42.75", type: "order" },
                      { time: "1:42 PM", caller: "Emma T.", dur: "1m 32s", result: "FAQ Answered", type: "faq" },
                    ].map((call, i) => (
                      <tr key={i} className="border-b border-bone/[0.03] hover:bg-bone/[0.02]">
                        <td className="px-4 py-2.5 text-bone/60">{call.time}</td>
                        <td className="px-4 py-2.5 text-bone/80 font-medium">{call.caller}</td>
                        <td className="px-4 py-2.5 text-bone/40 hidden sm:table-cell">{call.dur}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            call.type === "order" ? "bg-[#F3EEE3]/15 text-[#F3EEE3]" :
                            call.type === "res" ? "bg-bone/15 text-bone" :
                            "bg-[#F3EEE3]/10 text-[#C8C8C8]"
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
        <div className="absolute -inset-12 bg-gradient-to-b from-[#F3EEE3]/8 via-transparent to-transparent rounded-3xl blur-3xl -z-10 pointer-events-none" />
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
    <div className="bg-bone rounded-2xl border border-[#2E2E2E]/60 shadow-lg shadow-obsidian/[0.03] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-8">
          <h4 className="text-lg font-bold text-[#F3EEE3] mb-1">Calculate Your Lost Revenue</h4>
          <p className="text-sm text-[#6B6B6B] mb-8">See how much missed calls cost your restaurant.</p>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-[#F3EEE3]">Phone calls per day</label>
                <span className="text-sm font-bold text-[#F3EEE3]">{callsPerDay}</span>
              </div>
              <input type="range" min="10" max="100" value={callsPerDay} onChange={(e) => setCallsPerDay(+e.target.value)}
                className="w-full h-1.5 bg-[#2E2E2E] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F3EEE3] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-[#F3EEE3]">Average order value</label>
                <span className="text-sm font-bold text-[#F3EEE3]">${avgOrder}</span>
              </div>
              <input type="range" min="15" max="60" value={avgOrder} onChange={(e) => setAvgOrder(+e.target.value)}
                className="w-full h-1.5 bg-[#2E2E2E] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F3EEE3] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#0A0A0A] to-[#0A0A0A] p-8 flex flex-col justify-center">
          <p className="text-bone/50 text-xs uppercase tracking-widest font-semibold mb-2">Monthly revenue lost to missed calls</p>
          <p className="text-4xl md:text-5xl font-bold text-bone mb-1">${missedRevenue.toLocaleString()}</p>
          <p className="text-bone/40 text-sm mb-6">${yearlyLost.toLocaleString()} per year</p>
          <div className="bg-[#F3EEE3]/10 rounded-xl p-4 border border-[#F3EEE3]/20">
            <p className="text-[#F3EEE3] text-sm font-semibold mb-0.5">With Ringo at $299/mo</p>
            <p className="text-bone/60 text-xs">ROI payback in {Math.max(1, Math.ceil(299 / (missedRevenue || 1)))} day{Math.ceil(299 / (missedRevenue || 1)) !== 1 ? "s" : ""}</p>
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
    <div className="border-b border-[#2E2E2E]/60 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full py-5 px-1 flex items-center justify-between text-left group">
        <span className="text-[15px] font-semibold text-[#F3EEE3] group-hover:text-[#F3EEE3] transition-colors pr-4">{question}</span>
        <ChevronDown className={`w-4 h-4 text-[#F3EEE3] flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-5" : "max-h-0"}`}>
        <p className="text-sm text-[#6B6B6B] leading-relaxed px-1">{answer}</p>
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

      {/* ═══════════════ 1. NAVIGATION ═══════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-bone/[0.06] shadow-lg shadow-obsidian/10"
          : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ringo-logo.png" alt="Ringo" className="h-9 w-auto brightness-0 invert" />
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-bone/50 hover:text-bone transition-colors text-sm font-medium">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-bone/60 hover:text-bone transition-colors text-sm font-medium px-4 py-2">
              Log in
            </Link>
            <Link href="#pricing" className="bg-[#F3EEE3] hover:bg-[#C8C8C8] text-[#0A0A0A] px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#F3EEE3]/20">
              Get Started
            </Link>
          </div>

          <button className="md:hidden text-bone/70" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-bone/[0.06] px-5 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="block text-bone/60 hover:text-bone py-2.5 text-sm font-medium transition-colors">
                {link.label}
              </Link>
            ))}
            <hr className="border-bone/[0.08] my-2" />
            <Link href="/login" className="block text-bone/60 hover:text-bone py-2.5 text-sm font-medium">Log in</Link>
            <Link href="#pricing" className="block bg-[#F3EEE3] text-[#0A0A0A] text-center py-2.5 rounded-lg text-sm font-semibold mt-2">
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* ═══════════════ 2. HERO — DARK ═══════════════ */}
      <section className="relative bg-[#0A0A0A] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F3EEE3]/[0.05] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#F3EEE3]/[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-28 pb-20 md:pt-36 md:pb-28">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 bg-bone/[0.06] backdrop-blur-sm border border-bone/[0.08] rounded-full px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F3EEE3]" />
              <span className="text-bone/70 text-xs font-medium">The #1 AI phone agent for restaurants</span>
            </div>
          </div>

          <h1 className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-bone leading-[1.08] tracking-tight mb-6 max-w-4xl mx-auto" style={{ fontFamily: "'Fraunces', serif" }}>
            Never miss a phone order{" "}
            <span className="bg-gradient-to-r from-[#F3EEE3] via-[#C8C8C8] to-[#F3EEE3] bg-clip-text text-transparent">again</span>
          </h1>

          <p className="text-center text-lg md:text-xl text-bone/50 max-w-2xl mx-auto leading-relaxed mb-14">
            Ringo answers every call, takes orders, upsells intelligently, and sends payment links — 24/7. Your AI employee that never calls in sick.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-5xl mx-auto">
            <div className="flex justify-center lg:justify-end order-2 lg:order-1">
              <PhoneMockup />
            </div>
            <div className="order-1 lg:order-2">
              <DemoCallForm />
            </div>
          </div>
        </div>

        <div className="h-24 bg-gradient-to-b from-[#0A0A0A] to-[#0A0A0A]" />
      </section>

      {/* ═══════════════ 3. PAIN STATS BAR ═══════════════ */}
      <section className="bg-[#0A0A0A] py-14 px-5 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { value: "30%", label: "of restaurant calls go unanswered during peak hours" },
              { value: "$37K", label: "average annual revenue lost to missed phone orders" },
              { value: "62%", label: "of callers won\u2019t call back if no one picks up" },
            ].map((stat) => (
              <div key={stat.value} className="text-center">
                <p className="text-4xl md:text-5xl font-bold text-[#F3EEE3] mb-2">{stat.value}</p>
                <p className="text-sm text-[#6B6B6B] leading-relaxed">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 4. HOW IT WORKS — 4 STEPS ═══════════════ */}
      <section id="how-it-works" className="bg-[#0A0A0A] py-24 md:py-32 px-5 sm:px-6 lg:px-8 border-t border-[#2E2E2E]/60">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16">
              <p className="text-[#F3EEE3] text-xs font-bold uppercase tracking-widest mb-3">How It Works</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#F3EEE3] leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                From phone call to kitchen ticket in seconds
              </h2>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Customer Calls", desc: "Ringo answers in 2 rings, 24/7. No hold music, no voicemail.", icon: Phone },
              { step: "2", title: "AI Takes the Order", desc: "Ringo takes the full order with mods, answers menu questions, and upsells intelligently.", icon: MessageSquare },
              { step: "3", title: "Payment Link Sent", desc: "Customer gets an SMS payment link. One tap to pay. No card info over the phone.", icon: Send },
              { step: "4", title: "Kitchen Ticket Fires", desc: "Order confirmed, ticket prints. Pickup time set. Done.", icon: ChefHat },
            ].map((item, i) => (
              <RevealSection key={item.step} delay={i * 100}>
                <div className="relative bg-bone rounded-2xl border border-[#2E2E2E]/60 p-6 shadow-sm hover:shadow-md transition-shadow group text-center">
                  <div className="w-12 h-12 rounded-full bg-[#F3EEE3] flex items-center justify-center mx-auto mb-4 group-hover:bg-[#C8C8C8] transition-colors">
                    <span className="text-[#0A0A0A] text-lg font-bold">{item.step}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#F3EEE3] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#6B6B6B] leading-relaxed">{item.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 5. POS INTEGRATIONS MARQUEE ═══════════════ */}
      <section className="bg-[#0A0A0A] py-10 border-t border-[#2E2E2E]/60">
        <p className="text-center text-[#6B6B6B] text-xs font-semibold uppercase tracking-widest mb-6">
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

      {/* ═══════════════ 6. FEATURES ═══════════════ */}
      <section id="features" className="bg-[#0A0A0A] py-24 md:py-32 px-5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <RevealSection>
            <div className="text-center mb-20">
              <p className="text-[#F3EEE3] text-xs font-bold uppercase tracking-widest mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#F3EEE3] leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                Everything your restaurant phone line needs
              </h2>
            </div>
          </RevealSection>

          <div className="space-y-24">
            {/* Feature 1: Order Taking */}
            <RevealSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-[#F3EEE3]/10 rounded-lg px-3 py-1.5 mb-5">
                    <ShoppingCart className="w-4 h-4 text-[#F3EEE3]" />
                    <span className="text-xs font-semibold text-[#F3EEE3]">Order Taking</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#F3EEE3] mb-4 leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
                    Takes phone orders and sends them straight to your POS
                  </h3>
                  <p className="text-[#6B6B6B] leading-relaxed mb-6">
                    Customers call, Ringo takes their order with all customizations, and sends it directly to your kitchen. No typing, no mistakes, no missed orders.
                  </p>
                  <div className="space-y-3">
                    {["Real-time POS integration", "Handles modifiers and special requests", "Pickup and delivery support"].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#F3EEE3]/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#F3EEE3]" />
                        </div>
                        <span className="text-sm text-[#6B6B6B]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-bone rounded-2xl border border-[#2E2E2E]/60 shadow-lg shadow-obsidian/[0.03] p-6">
                  <div className="bg-[#0A0A0A] rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-bone/40 pb-3 border-b border-bone/[0.06]">
                      <span>Order #4827</span>
                      <span className="text-[#F3EEE3] font-semibold">In Progress</span>
                    </div>
                    {[
                      { item: "Large Pepperoni Pizza", mod: "Extra cheese, thin crust", price: "$18.99" },
                      { item: "Crazy Bread (8pc)", mod: "With marinara", price: "$4.49" },
                      { item: "2L Coca-Cola", mod: "Upsell added", price: "$2.99" },
                    ].map((line) => (
                      <div key={line.item} className="flex justify-between items-start py-2">
                        <div>
                          <p className="text-bone text-sm font-medium">{line.item}</p>
                          <p className="text-bone/30 text-xs">{line.mod}</p>
                        </div>
                        <span className="text-bone/70 text-sm font-medium">{line.price}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 border-t border-bone/[0.06]">
                      <span className="text-bone font-bold text-sm">Total</span>
                      <span className="text-bone font-bold text-sm">$26.47</span>
                    </div>
                    <div className="bg-[#F3EEE3]/10 border border-[#F3EEE3]/20 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#F3EEE3]" />
                      <span className="text-[#F3EEE3] text-xs font-semibold">Payment link sent to customer</span>
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* Feature 2: Payment */}
            <RevealSection>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="lg:order-2">
                  <div className="inline-flex items-center gap-2 bg-[#F3EEE3]/10 rounded-lg px-3 py-1.5 mb-5">
                    <CreditCard className="w-4 h-4 text-[#F3EEE3]" />
                    <span className="text-xs font-semibold text-[#F3EEE3]">Payments</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#F3EEE3] mb-4 leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
                    Collects payment before the food hits the grill
                  </h3>
                  <p className="text-[#6B6B6B] leading-relaxed mb-6">
                    Pay Before Prep means zero no-shows and instant cash flow. Ringo sends a secure payment link via text — customers pay in one tap.
                  </p>
                  <div className="space-y-3">
                    {["PCI-DSS Level 1 compliant", "One-tap payment via text link", "Eliminates no-shows and chargebacks"].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#F3EEE3]/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#F3EEE3]" />
                        </div>
                        <span className="text-sm text-[#6B6B6B]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:order-1 bg-bone rounded-2xl border border-[#2E2E2E]/60 shadow-lg shadow-obsidian/[0.03] p-6 flex items-center justify-center">
                  <div className="w-full max-w-xs space-y-4">
                    <div className="bg-gradient-to-br from-[#0A0A0A] to-[#0A0A0A] rounded-xl p-5 text-bone">
                      <p className="text-bone/40 text-[10px] uppercase tracking-wider mb-4">Secure Payment</p>
                      <p className="text-xl font-bold tracking-wider mb-5">4142 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 1234</p>
                      <div className="flex justify-between text-xs text-bone/50">
                        <span>John Smith</span>
                        <span>12/26</span>
                      </div>
                    </div>
                    <div className="bg-[#F3EEE3]/10 border border-[#F3EEE3]/30 rounded-xl px-4 py-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#F3EEE3]/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#F3EEE3]" />
                      </div>
                      <div>
                        <p className="text-[#F3EEE3] text-sm font-semibold">Payment received</p>
                        <p className="text-[#6B6B6B] text-xs">$26.47 — Order #4827</p>
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
                  <div className="inline-flex items-center gap-2 bg-[#F3EEE3]/10 rounded-lg px-3 py-1.5 mb-5">
                    <MessageSquare className="w-4 h-4 text-[#F3EEE3]" />
                    <span className="text-xs font-semibold text-[#F3EEE3]">Menu Intelligence</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#F3EEE3] mb-4 leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
                    Knows your menu inside-out and upsells intelligently
                  </h3>
                  <p className="text-[#6B6B6B] leading-relaxed mb-6">
                    Upload your menu once. Ringo learns every item, price, modifier, allergy, and special — then uses that knowledge to answer questions and increase ticket sizes.
                  </p>
                  <div className="space-y-3">
                    {["Allergy-aware recommendations", "Smart upselling and cross-selling", "Auto-syncs menu changes"].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#F3EEE3]/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#F3EEE3]" />
                        </div>
                        <span className="text-sm text-[#6B6B6B]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-bone rounded-2xl border border-[#2E2E2E]/60 shadow-lg shadow-obsidian/[0.03] p-6">
                  <div className="space-y-4">
                    {[
                      { from: "customer", text: "Do you have anything gluten-free?" },
                      { from: "ringo", text: "Yes! Our Grilled Chicken Caesar, Salmon Bowl, and all our stir-fry dishes are gluten-free. The Salmon Bowl is our most popular choice." },
                      { from: "customer", text: "I\u2019ll do the Salmon Bowl." },
                      { from: "ringo", text: "Great choice! Would you like to add our house-made miso soup for $3? It pairs perfectly and it\u2019s also gluten-free." },
                    ].map((msg, i) => (
                      <div key={i} className="flex gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          msg.from === "customer" ? "bg-[#2E2E2E]" : "bg-gradient-to-br from-[#F3EEE3] to-[#C8C8C8]"
                        }`}>
                          {msg.from === "customer" ? (
                            <Users className="w-3.5 h-3.5 text-[#6B6B6B]" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-[#0A0A0A]" />
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#6B6B6B]/60">
                            {msg.from === "customer" ? "Customer" : "Ringo AI"}
                          </p>
                          <p className="text-sm text-[#F3EEE3] leading-relaxed">{msg.text}</p>
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

      {/* ═══════════════ 7. DASHBOARD PREVIEW ═══════════════ */}
      <section className="bg-[#0A0A0A] py-24 md:py-32 px-5 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="text-center mb-14">
              <p className="text-[#F3EEE3] text-xs font-bold uppercase tracking-widest mb-3">Dashboard</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#F3EEE3] leading-tight mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
                Your AI phone command center
              </h2>
              <p className="text-lg text-[#6B6B6B] max-w-xl mx-auto">
                Live calls, transcripts, orders, and performance — all in one beautiful real-time dashboard.
              </p>
            </div>
          </RevealSection>
          <DashboardPreview />
        </div>
      </section>

      {/* ═══════════════ 8. REVENUE CALCULATOR ═══════════════ */}
      <section className="bg-bone py-24 md:py-32 px-5 sm:px-6 lg:px-8 border-y border-[#2E2E2E]/60">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center mb-14">
              <p className="text-[#F3EEE3] text-xs font-bold uppercase tracking-widest mb-3">Revenue Impact</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#F3EEE3] leading-tight mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
                Every missed call is money left on the table
              </h2>
            </div>
          </RevealSection>
          <RevealSection delay={100}>
            <ROICalculator />
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ 9. PRICING — 3 TIERS ═══════════════ */}
      <section id="pricing" className="bg-[#0A0A0A] py-24 md:py-32 px-5 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="text-center mb-14">
              <p className="text-[#F3EEE3] text-xs font-bold uppercase tracking-widest mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#F3EEE3] leading-tight mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-[#6B6B6B]">No contracts. Cancel anytime.</p>
            </div>
          </RevealSection>

          <RevealSection delay={100}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter */}
              <div className="bg-bone rounded-2xl border border-[#2E2E2E]/60 p-8 flex flex-col">
                <h3 className="text-xl font-bold text-[#F3EEE3] mb-1">Starter</h3>
                <p className="text-sm text-[#6B6B6B] mb-6">Perfect for single-location restaurants</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-[#F3EEE3]">$299</span>
                  <span className="text-[#6B6B6B] text-sm">/month</span>
                </div>
                <p className="text-xs text-[#6B6B6B] mb-8">Billed monthly</p>
                <button className="w-full bg-[#F3EEE3] text-[#0A0A0A] py-3 rounded-xl font-semibold hover:bg-[#C8C8C8] transition-all text-sm mb-8">
                  Get Started
                </button>
                <ul className="space-y-3 flex-1">
                  {[
                    "Up to 100 calls/day",
                    "1 location",
                    "POS integration (Square, Toast, or Clover)",
                    "Real-time dashboard",
                    "Call transcripts",
                    "Monthly ROI report",
                    "Email support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#6B6B6B]">
                      <Check className="w-4 h-4 text-[#F3EEE3] flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Growth — MOST POPULAR */}
              <div className="bg-[#0A0A0A] rounded-2xl p-8 flex flex-col relative overflow-hidden shadow-xl shadow-obsidian/10 ring-2 ring-[#F3EEE3]">
                <div className="absolute top-0 right-0 bg-[#F3EEE3] text-[#0A0A0A] text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-xl">
                  Most Popular
                </div>
                <h3 className="text-xl font-bold text-bone mb-1">Growth</h3>
                <p className="text-sm text-bone/50 mb-6">For multi-location operators</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-[#F3EEE3]">$599</span>
                  <span className="text-bone/50 text-sm">/month</span>
                </div>
                <p className="text-xs text-bone/40 mb-8">Billed monthly</p>
                <button className="w-full bg-[#F3EEE3] text-[#0A0A0A] py-3 rounded-xl font-semibold hover:bg-[#C8C8C8] transition-all text-sm mb-8">
                  Get Started
                </button>
                <ul className="space-y-3 flex-1">
                  {[
                    "Up to 250 calls/day",
                    "Up to 3 locations",
                    "All POS integrations",
                    "Everything in Starter",
                    "Pay-before-prep SMS payment flow",
                    "GHL CRM sync",
                    "Weekly performance reports",
                    "Priority support (phone + email)",
                    "Custom upsell scripts",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-bone/70">
                      <Check className="w-4 h-4 text-[#F3EEE3] flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Enterprise */}
              <div className="bg-bone rounded-2xl border border-[#2E2E2E]/60 p-8 flex flex-col">
                <h3 className="text-xl font-bold text-[#F3EEE3] mb-1">Enterprise</h3>
                <p className="text-sm text-[#6B6B6B] mb-6">For franchise networks and large groups</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-[#F3EEE3]">Custom</span>
                </div>
                <p className="text-xs text-[#6B6B6B] mb-8">Tailored to your needs</p>
                <a href="mailto:hello@useringo.ai" className="w-full bg-[#F3EEE3] text-[#0A0A0A] py-3 rounded-xl font-semibold hover:bg-[#C8C8C8] transition-all text-sm mb-8 text-center block">
                  Talk to Us
                </a>
                <ul className="space-y-3 flex-1">
                  {[
                    "Unlimited calls",
                    "Unlimited locations",
                    "White-glove onboarding",
                    "Dedicated account manager",
                    "Custom integrations",
                    "Franchise network dashboard",
                    "SLA guarantee",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#6B6B6B]">
                      <Check className="w-4 h-4 text-[#F3EEE3] flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ 10. FOOTER ═══════════════ */}
      <footer className="bg-[#0A0A0A] border-t border-bone/[0.06] py-14 px-5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ringo-logo.png" alt="Ringo" className="h-8 w-auto brightness-0 invert" />
              </div>
              <p className="text-bone/40 text-sm leading-relaxed mb-3">
                AI voice ordering for restaurants. Built in Modesto, CA.
              </p>
            </div>

            <div>
              <h4 className="text-bone text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5">
                {["Features", "Integrations", "Pricing", "Demo"].map((item) => (
                  <li key={item}>
                    <a href={`#${item.toLowerCase()}`} className="text-bone/40 hover:text-bone/70 text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-bone text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5">
                {["About", "Blog", "Careers", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-bone/40 hover:text-bone/70 text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-bone text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/terms" className="text-bone/40 hover:text-bone/70 text-sm transition-colors">Terms of Service</Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-bone/40 hover:text-bone/70 text-sm transition-colors">Privacy Policy</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-bone/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-bone/30 text-xs">&copy; 2026 Ringo AI, Inc. All rights reserved.</p>
            <p className="text-bone/30 text-xs">hello@useringo.ai</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
