"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  PhoneCall,
  ArrowRight,
  Check,
  BarChart3,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Menu,
  X,
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
   BRAND PALETTE — Pure Monochrome (v2, 2026-04-14)
   Obsidian → Bone axis only. No hue anywhere. See tailwind.config.ts.
   ═══════════════════════════════════════════════════════════════════════ */

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
            <p className="text-[#F3EEE3] text-sm font-semibold mb-0.5">With Ringo at $799/mo</p>
            <p className="text-bone/60 text-xs">ROI payback in {Math.max(1, Math.ceil(799 / ((missedRevenue / 30) || 1)))} day{Math.ceil(799 / ((missedRevenue / 30) || 1)) !== 1 ? "s" : ""}</p>
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
    { label: "How it works", href: "#how-it-works" },
    { label: "Integrations", href: "#integrations" },
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
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-[background,border,backdrop-filter,box-shadow] duration-300 ${
        scrolled
          ? "bg-[#0A0A0A]/85 backdrop-blur-xl border-b border-bone/[0.06] shadow-lg shadow-obsidian/10"
          : "bg-transparent border-b border-transparent"
      }`}>
        <div className={`max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex items-center justify-between transition-[height] duration-300 ${scrolled ? "h-14" : "h-20"}`}>
          <Link href="/" className="flex items-center gap-2 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ringo-logo.png" alt="Ringo" className="h-8 w-auto brightness-0 invert transition-transform duration-300 group-hover:scale-[1.03]" />
          </Link>

          <div className="hidden lg:flex items-center gap-1 bg-bone/[0.03] border border-bone/[0.06] rounded-full px-2 py-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-bone/60 hover:text-bone px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-tight transition-[color,background-color] duration-200 hover:bg-bone/[0.05]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/login" className="text-bone/60 hover:text-bone transition-colors text-[13px] font-medium px-4 py-2">
              Log in
            </Link>
            <Link
              href="#demo"
              className="group relative inline-flex items-center gap-1.5 bg-[#F3EEE3] text-[#0A0A0A] px-4 py-2 rounded-full text-[13px] font-semibold transition-[transform,box-shadow] duration-200 hover:shadow-[0_0_0_4px_rgba(243,238,227,0.12)] active:scale-[0.98]"
            >
              Schedule a demo
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
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
            <Link href="#demo" className="block bg-[#F3EEE3] text-[#0A0A0A] text-center py-2.5 rounded-full text-sm font-semibold mt-2">
              Schedule a demo
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

          <h1 className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-[72px] font-normal text-bone leading-[1.04] tracking-[-0.035em] mb-3 max-w-4xl mx-auto" style={{ fontFamily: "'Fraunces', serif", fontVariationSettings: "'opsz' 144, 'SOFT' 40" }}>
            The phone rings.
            <br className="hidden sm:block" />
            <span className="text-bone/50"> Ringo recovers</span>
          </h1>

          <div className="text-center mb-6 relative">
            <span
              className="block money-number text-[#F3EEE3] leading-[0.9]"
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: "italic",
                fontVariationSettings: "'opsz' 144, 'SOFT' 50",
                fontSize: "clamp(96px, 18vw, 180px)",
                letterSpacing: "-0.045em",
              }}
            >
              <AnimatedCounter target={31050} prefix="$" />
            </span>
            <p className="text-bone/40 text-xs uppercase tracking-[0.22em] mt-2 font-medium">
              recovered per location, every month
            </p>
          </div>

          <p className="text-center text-lg md:text-xl text-bone/55 max-w-2xl mx-auto leading-relaxed mb-14">
            Ringo answers every call, takes orders, upsells, and collects payment before the kitchen starts prep — 24/7. The AI employee that never calls in sick.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-5xl mx-auto">
            <div className="flex justify-center lg:justify-end order-2 lg:order-1">
              <PhoneMockup />
            </div>
            <div id="demo" className="order-1 lg:order-2 scroll-mt-24">
              <DemoCallForm />
            </div>
          </div>
        </div>

        <div className="h-24 bg-gradient-to-b from-[#0A0A0A] to-[#0A0A0A]" />
      </section>

      {/* ═══════════════ 3. PAIN STATS BAR ═══════════════ */}
      <section className="bg-[#0A0A0A] py-20 md:py-28 px-5 sm:px-6 lg:px-8 border-t border-bone/[0.06]">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <p className="eyebrow text-bone/50 mb-4">The leak</p>
              <h2 className="text-3xl md:text-4xl lg:text-[44px] font-normal text-bone leading-[1.1] tracking-[-0.025em]" style={{ fontFamily: "'Fraunces', serif", fontVariationSettings: "'opsz' 96, 'SOFT' 50" }}>
                Every missed call is money in the trash.
              </h2>
            </div>
          </RevealSection>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-bone/[0.06] border border-bone/[0.06] rounded-2xl overflow-hidden bg-gradient-to-b from-[#141414] to-[#0A0A0A]">
            {[
              { target: 30, prefix: "", suffix: "%", label: "of restaurant calls go unanswered during peak hours" },
              { target: 23, prefix: "$", suffix: "", label: "average ticket on a phone order walking away" },
              { target: 31050, prefix: "$", suffix: "", label: "average monthly revenue lost to missed calls" },
            ].map((stat) => (
              <div key={stat.label} className="p-8 md:p-12 text-center md:text-left">
                <span
                  className="block text-bone"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontStyle: "italic",
                    fontVariationSettings: "'opsz' 144, 'SOFT' 50",
                    fontSize: "clamp(64px, 9vw, 112px)",
                    letterSpacing: "-0.045em",
                    lineHeight: 0.95,
                  }}
                >
                  <AnimatedCounter target={stat.target} prefix={stat.prefix} suffix={stat.suffix} />
                </span>
                <p className="text-sm text-bone/50 leading-relaxed mt-5 max-w-[240px] mx-auto md:mx-0">{stat.label}</p>
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
      <section id="integrations" className="bg-[#0A0A0A] py-10 border-t border-[#2E2E2E]/60 scroll-mt-20">
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

      {/* ═══════════════ 6b. BENTO GRID — WHY RINGO ═══════════════ */}
      <section className="bg-[#0A0A0A] py-24 md:py-32 px-5 sm:px-6 lg:px-8 border-t border-bone/[0.06]">
        <div className="max-w-7xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <p className="eyebrow text-bone/50 mb-4">Why Ringo</p>
              <h2 className="text-3xl md:text-5xl lg:text-[56px] font-normal text-bone leading-[1.05] tracking-[-0.025em]" style={{ fontFamily: "'Fraunces', serif", fontVariationSettings: "'opsz' 96, 'SOFT' 50" }}>
                Turn every ring into <span className="italic text-bone">cash</span>.
              </h2>
              <p className="text-bone/50 mt-5 text-lg leading-relaxed">
                Six things no other voice AI ships in one box.
              </p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-6 grid-rows-none md:grid-rows-[auto_auto] gap-4 md:gap-5">
            {/* TILE 1 — Big hero tile: Pay Before Prep */}
            <RevealSection className="md:col-span-4 md:row-span-2">
              <div className="group relative h-full min-h-[320px] md:min-h-[520px] bg-[#141414] rounded-3xl border border-bone/[0.06] hover:border-bone/[0.14] p-8 md:p-12 overflow-hidden transition-[border-color] duration-300">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(243,238,227,0.06),transparent_60%)] pointer-events-none" />
                <div className="relative flex flex-col h-full">
                  <p className="eyebrow text-bone/40 mb-4">Pay Before Prep</p>
                  <h3 className="text-bone text-3xl md:text-4xl lg:text-5xl leading-[1.05] tracking-[-0.025em] mb-6 max-w-xl" style={{ fontFamily: "'Fraunces', serif", fontVariationSettings: "'opsz' 96, 'SOFT' 50" }}>
                    The kitchen never makes food that doesn&apos;t get paid for.
                  </h3>
                  <p className="text-bone/55 text-[15px] leading-relaxed max-w-md mb-10">
                    Ringo collects payment by SMS link before the ticket fires. Zero no-shows. Zero food waste. Zero chargebacks.
                  </p>

                  <div className="mt-auto grid grid-cols-3 gap-4 max-w-xl">
                    {[
                      { n: "$4,200", l: "avg food waste saved / mo" },
                      { n: "0", l: "tickets fire before pay" },
                      { n: "2.3s", l: "avg link delivery" },
                    ].map((x) => (
                      <div key={x.l} className="border-t border-bone/[0.08] pt-4">
                        <div
                          className="text-bone"
                          style={{
                            fontFamily: "'Fraunces', serif",
                            fontStyle: "italic",
                            fontVariationSettings: "'opsz' 96, 'SOFT' 50",
                            fontSize: "clamp(28px, 3.2vw, 44px)",
                            lineHeight: 1,
                            letterSpacing: "-0.03em",
                          }}
                        >
                          {x.n}
                        </div>
                        <p className="text-bone/40 text-[11px] uppercase tracking-[0.12em] mt-2 leading-snug">{x.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* TILE 2 — 24/7 answer */}
            <RevealSection className="md:col-span-2">
              <div className="group relative h-full min-h-[220px] bg-[#141414] rounded-3xl border border-bone/[0.06] hover:border-bone/[0.14] p-8 overflow-hidden transition-[border-color] duration-300">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-[#F3EEE3] animate-pulse" />
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#F3EEE3] font-semibold">Live</span>
                </div>
                <h3 className="text-bone text-2xl md:text-[28px] leading-[1.1] tracking-[-0.02em] mb-3" style={{ fontFamily: "'Fraunces', serif", fontVariationSettings: "'opsz' 72, 'SOFT' 40" }}>
                  Answers in <span className="italic">two rings</span>, every ring.
                </h3>
                <p className="text-bone/50 text-sm leading-relaxed">
                  24/7/365. Holidays. Dinner rush. 3 a.m. Never a voicemail.
                </p>
              </div>
            </RevealSection>

            {/* TILE 3 — Upsell engine — INVERTED */}
            <RevealSection className="md:col-span-2">
              <div className="group relative h-full min-h-[220px] bg-bone rounded-3xl p-8 overflow-hidden border border-bone">
                <p className="eyebrow text-obsidian/50 mb-6">Upsell engine</p>
                <div
                  className="text-obsidian mb-3"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontStyle: "italic",
                    fontVariationSettings: "'opsz' 144, 'SOFT' 40",
                    fontSize: "clamp(54px, 7vw, 88px)",
                    lineHeight: 0.9,
                    letterSpacing: "-0.04em",
                  }}
                >
                  +$3.40
                </div>
                <p className="text-obsidian/70 text-sm leading-relaxed max-w-[220px]">
                  Average lift per call. Staff forget combos. Ringo never does.
                </p>
              </div>
            </RevealSection>

            {/* TILE 4 — Readback accuracy */}
            <RevealSection className="md:col-span-3">
              <div className="group relative h-full min-h-[220px] bg-[#141414] rounded-3xl border border-bone/[0.06] hover:border-bone/[0.14] p-8 overflow-hidden transition-[border-color] duration-300">
                <p className="eyebrow text-bone/40 mb-6">Full order readback</p>
                <h3 className="text-bone text-2xl md:text-[28px] leading-[1.15] tracking-[-0.02em] mb-4" style={{ fontFamily: "'Fraunces', serif", fontVariationSettings: "'opsz' 72, 'SOFT' 40" }}>
                  <span className="italic">99.4%</span> order accuracy, before the ticket even prints.
                </h3>
                <p className="text-bone/50 text-sm leading-relaxed max-w-md">
                  Every item, mod, and allergy is read back and confirmed. Fewer remakes, fewer refunds, happier kitchens.
                </p>
              </div>
            </RevealSection>

            {/* TILE 5 — CRM */}
            <RevealSection className="md:col-span-3">
              <div className="group relative h-full min-h-[220px] bg-[#141414] rounded-3xl border border-bone/[0.06] hover:border-bone/[0.14] p-8 overflow-hidden transition-[border-color] duration-300">
                <p className="eyebrow text-bone/40 mb-6">Customer database, not just a dashboard</p>
                <h3 className="text-bone text-2xl md:text-[28px] leading-[1.15] tracking-[-0.02em] mb-4" style={{ fontFamily: "'Fraunces', serif", fontVariationSettings: "'opsz' 72, 'SOFT' 40" }}>
                  Every caller becomes a <span className="italic">contact</span>.
                </h3>
                <p className="text-bone/50 text-sm leading-relaxed max-w-md mb-6">
                  Name, number, order history, lifetime value — synced into your CRM. Now you can actually market to them.
                </p>
                <div className="flex -space-x-2">
                  {["JM", "SL", "MR", "ET", "KP"].map((initials, i) => (
                    <div key={i} className="w-9 h-9 rounded-full bg-[#1E1E1E] border border-[#141414] flex items-center justify-center text-[11px] font-semibold text-bone/70">
                      {initials}
                    </div>
                  ))}
                  <div className="w-9 h-9 rounded-full bg-bone/[0.08] border border-[#141414] flex items-center justify-center text-[11px] font-semibold text-bone">
                    +1.2k
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════════ 6c. PAY BEFORE PREP — PALETTE INVERTED ═══════════════ */}
      <section className="bg-bone py-24 md:py-36 px-5 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-center">
              <div className="md:col-span-7">
                <p className="eyebrow text-obsidian/50 mb-6">The unfair advantage</p>
                <h2
                  className="text-obsidian leading-[0.98] tracking-[-0.035em]"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontVariationSettings: "'opsz' 144, 'SOFT' 60",
                    fontSize: "clamp(40px, 7vw, 88px)",
                    fontWeight: 400,
                  }}
                >
                  Your kitchen never makes food that doesn&apos;t get{" "}
                  <span className="italic">paid for</span>. Ever.
                </h2>
                <p className="text-obsidian/70 text-lg md:text-xl leading-relaxed mt-8 max-w-xl">
                  Competitors take the order and hope. Ringo locks the ticket until the customer confirms payment by SMS — so you never cook for a no-show again.
                </p>
                <div className="mt-10 space-y-3 max-w-md">
                  {[
                    ["Without Ringo", "5% no-show rate = $220/day in food cost gone.", true],
                    ["With Ringo", "0 tickets fire before payment clears. Period.", false],
                  ].map(([label, body, strike]) => (
                    <div key={String(label)} className="flex items-start gap-4 py-4 border-t border-obsidian/10">
                      <span className="eyebrow text-obsidian/50 pt-0.5 min-w-[110px]">{label}</span>
                      <span className={`text-obsidian text-[15px] leading-relaxed ${strike ? "line-through decoration-1 decoration-obsidian/60" : "font-semibold"}`}>
                        {body}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-5">
                <div className="relative aspect-[4/5] rounded-3xl border border-obsidian/10 bg-gradient-to-b from-[#F3EEE3] to-[#E5DFD0] p-10 flex flex-col justify-between overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #0A0A0A 1px, transparent 0)", backgroundSize: "24px 24px" }} />
                  <div className="relative">
                    <p className="eyebrow text-obsidian/50 mb-2">Monthly savings</p>
                    <div
                      className="text-obsidian"
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontStyle: "italic",
                        fontVariationSettings: "'opsz' 144, 'SOFT' 60",
                        fontSize: "clamp(72px, 12vw, 128px)",
                        lineHeight: 0.9,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      $4,200
                    </div>
                    <p className="text-obsidian/60 text-sm mt-4 max-w-[220px] leading-relaxed">
                      Average food-cost eliminated at a 200 orders/day location.
                    </p>
                  </div>
                  <div className="relative border-t border-obsidian/15 pt-6 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-obsidian animate-pulse" />
                    <span className="text-[11px] uppercase tracking-[0.18em] text-obsidian/70 font-semibold">
                      Ticket locked · awaiting pay
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-stretch">
              {/* Starter — DARK */}
              <div className="bg-[#141414] rounded-3xl border border-bone/[0.06] hover:border-bone/[0.14] p-8 flex flex-col transition-[border-color] duration-300">
                <h3 className="text-bone text-xl font-semibold mb-1">Starter</h3>
                <p className="text-sm text-bone/50 mb-8">Single-location independents</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="text-bone"
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontStyle: "italic",
                      fontVariationSettings: "'opsz' 96, 'SOFT' 40",
                      fontSize: "56px",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    $799
                  </span>
                  <span className="text-bone/40 text-sm">/mo</span>
                </div>
                <p className="text-xs text-bone/40 mb-8">Pays for itself in ~35 calls</p>
                <a href="#demo" className="w-full bg-bone/[0.06] border border-bone/[0.1] hover:bg-bone/[0.1] text-bone py-3 rounded-full font-semibold transition-[background-color] duration-200 text-sm mb-8 text-center block">
                  Start with Starter
                </a>
                <ul className="space-y-3 flex-1">
                  {[
                    "Up to 100 calls / day",
                    "1 location",
                    "1 POS integration",
                    "Real-time dashboard + transcripts",
                    "Monthly ROI report",
                    "Email support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-bone/70">
                      <Check className="w-4 h-4 text-bone flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Growth — INVERTED (featured) */}
              <div className="bg-bone rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-[0_24px_80px_-20px_rgba(243,238,227,0.2)] md:-my-3">
                <div className="absolute top-5 right-5 bg-obsidian text-bone text-[10px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full">
                  Most popular
                </div>
                <h3 className="text-obsidian text-xl font-semibold mb-1">Growth</h3>
                <p className="text-sm text-obsidian/60 mb-8">Multi-location operators</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="text-obsidian"
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontStyle: "italic",
                      fontVariationSettings: "'opsz' 144, 'SOFT' 60",
                      fontSize: "72px",
                      letterSpacing: "-0.045em",
                      lineHeight: 1,
                    }}
                  >
                    $1,499
                  </span>
                  <span className="text-obsidian/50 text-sm">/mo</span>
                </div>
                <p className="text-xs text-obsidian/60 mb-8">Pays for itself in ~30 hours</p>
                <a href="#demo" className="w-full bg-obsidian hover:bg-[#1E1E1E] text-bone py-3 rounded-full font-semibold transition-[background-color] duration-200 text-sm mb-8 text-center block">
                  Schedule a demo
                </a>
                <ul className="space-y-3 flex-1">
                  {[
                    "Up to 250 calls / day",
                    "Up to 3 locations",
                    "All POS integrations",
                    "Pay-before-prep SMS flow",
                    "GHL CRM sync + marketing",
                    "Weekly performance reports",
                    "Priority support (call the founder)",
                    "Custom upsell scripts",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-obsidian/75">
                      <Check className="w-4 h-4 text-obsidian flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 border-t border-obsidian/10 pt-5">
                  <p className="text-obsidian text-sm italic leading-relaxed" style={{ fontFamily: "'Fraunces', serif", fontVariationSettings: "'opsz' 48, 'SOFT' 60" }}>
                    &ldquo;Paid for itself in 10 days. Tickets are bigger, kitchen is calmer, and the phone never goes unanswered.&rdquo;
                  </p>
                  <p className="text-obsidian/60 text-xs mt-2">— Marco R., 3-location pizza operator, CA</p>
                </div>
              </div>

              {/* Enterprise — DARK */}
              <div className="bg-[#141414] rounded-3xl border border-bone/[0.06] hover:border-bone/[0.14] p-8 flex flex-col transition-[border-color] duration-300">
                <h3 className="text-bone text-xl font-semibold mb-1">Enterprise</h3>
                <p className="text-sm text-bone/50 mb-8">Franchise networks & groups</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="text-bone"
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontStyle: "italic",
                      fontVariationSettings: "'opsz' 96, 'SOFT' 40",
                      fontSize: "56px",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    Custom
                  </span>
                </div>
                <p className="text-xs text-bone/40 mb-8">Tailored to your network</p>
                <a href="mailto:hello@useringo.ai" className="w-full bg-bone/[0.06] border border-bone/[0.1] hover:bg-bone/[0.1] text-bone py-3 rounded-full font-semibold transition-[background-color] duration-200 text-sm mb-8 text-center block">
                  Talk to us
                </a>
                <ul className="space-y-3 flex-1">
                  {[
                    "Unlimited calls",
                    "10+ locations",
                    "White-glove onboarding",
                    "Dedicated account manager",
                    "Custom POS / CRM integrations",
                    "Franchise corporate dashboard",
                    "SLA guarantee",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-bone/70">
                      <Check className="w-4 h-4 text-bone flex-shrink-0 mt-0.5" /> {f}
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
