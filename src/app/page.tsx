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
  Activity,
  Globe,
  Lock,
  Zap as Lightning,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────── Animated Counter ────────────────────────── */
function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
}: {
  target: number;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.3 }
    );
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

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ────────────────────────── Audio Waveform Animation ────────────────────────── */
function AudioWaveform() {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-[#921920] rounded-full"
          style={{
            height: `${20 + i * 8}px`,
            animation: `wave 0.6s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ────────────────────────── Demo Call Form ────────────────────────── */
function DemoCallForm() {
  const [step, setStep] = useState<"restaurant" | "cuisine" | "contact" | "connecting">(
    "restaurant"
  );
  const [restaurantName, setRestaurantName] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    phone: "",
    restaurant: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cuisineOptions = [
    "Mexican",
    "Pizza",
    "Burgers",
    "Sushi",
    "Italian",
    "Indian",
    "Chinese",
    "BBQ",
  ];

  const handleCuisineSelect = (cuisine: string) => {
    setSelectedCuisine(cuisine);
    setFormData({ ...formData, restaurant: restaurantName });
    setStep("contact");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.phone || !formData.restaurant) {
      alert("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setStep("connecting");

    try {
      const response = await fetch("/api/demo-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          phone: formData.phone,
          restaurant: formData.restaurant,
          cuisine: selectedCuisine,
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
    } catch (error) {
      console.error("Demo call error:", error);
      alert("Failed to initiate demo call. Please try again.");
      setIsSubmitting(false);
      setStep("restaurant");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DDD0]/50 p-8 max-w-md mx-auto">
      <h3 className="text-2xl font-serif font-bold text-[#1A1A2E] mb-6">
        Try Ringo&apos;s Voice AI
      </h3>

      {step === "restaurant" && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your restaurant name"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            className="w-full px-4 py-3 border border-[#E8DDD0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#921920]"
          />
          <button
            onClick={() => setStep("cuisine")}
            disabled={!restaurantName}
            className="w-full bg-[#921920] text-white py-3 rounded-full font-semibold hover:bg-[#7A1018] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {step === "cuisine" && (
        <div className="space-y-4">
          <p className="text-sm text-[#6B5E50] font-medium">
            What cuisine type is your restaurant?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {cuisineOptions.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => handleCuisineSelect(cuisine)}
                className="px-4 py-2 border-2 border-[#921920] text-[#921920] rounded-lg hover:bg-[#921920] hover:text-white transition-colors font-medium text-sm"
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "contact" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="First Name"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-4 py-3 border border-[#E8DDD0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#921920]"
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 border border-[#E8DDD0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#921920]"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#921920] text-white py-3 rounded-full font-semibold hover:bg-[#7A1018] disabled:opacity-50 transition-colors"
          >
            Start Demo Call
          </button>
        </form>
      )}

      {step === "connecting" && (
        <div className="space-y-6 flex flex-col items-center">
          <AudioWaveform />
          <p className="text-center text-[#6B5E50] font-medium">
            Connecting you to Ringo...
          </p>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-[#E8DDD0] text-center">
        <p className="text-sm text-[#6B5E50] font-medium">
          13,300+ demo calls in the last 30 days
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────── Dashboard Mockup ────────────────────────── */
function DashboardMockup() {
  const calls = [
    {
      time: "2:34 PM",
      caller: "John M.",
      duration: "4m 12s",
      result: "Order - $28.50",
    },
    {
      time: "2:18 PM",
      caller: "Sarah L.",
      duration: "2m 45s",
      result: "Reservation - 6pm",
    },
    {
      time: "1:56 PM",
      caller: "Mike R.",
      duration: "3m 08s",
      result: "Order - $35.20",
    },
    {
      time: "1:42 PM",
      caller: "Emma T.",
      duration: "1m 32s",
      result: "Question - Answered",
    },
    {
      time: "1:28 PM",
      caller: "David K.",
      duration: "5m 01s",
      result: "Order - $42.75",
    },
  ];

  return (
    <div className="bg-[#0F1929] rounded-2xl overflow-hidden shadow-2xl border border-[#2A3F5F]/30 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 border-b border-[#2A3F5F]/30">
        <div className="bg-[#1A2847] p-6 border-r border-[#2A3F5F]/30">
          <p className="text-[#8A9CB6] text-sm uppercase tracking-wide">
            Calls Today
          </p>
          <p className="text-4xl font-bold text-white mt-2">47</p>
        </div>
        <div className="bg-[#1A2847] p-6 border-r border-[#2A3F5F]/30">
          <p className="text-[#8A9CB6] text-sm uppercase tracking-wide">Orders</p>
          <p className="text-4xl font-bold text-white mt-2">23</p>
        </div>
        <div className="bg-[#1A2847] p-6 border-r border-[#2A3F5F]/30">
          <p className="text-[#8A9CB6] text-sm uppercase tracking-wide">
            Revenue
          </p>
          <p className="text-4xl font-bold text-white mt-2">$892</p>
        </div>
        <div className="bg-[#1A2847] p-6">
          <p className="text-[#8A9CB6] text-sm uppercase tracking-wide">
            Answer Rate
          </p>
          <p className="text-4xl font-bold text-[#10B981] mt-2">98%</p>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-[#E8DDD0] font-semibold text-lg mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#921920]" />
          Recent Calls
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A3F5F]/30">
                <th className="text-left py-3 px-4 text-[#8A9CB6] font-medium">
                  Time
                </th>
                <th className="text-left py-3 px-4 text-[#8A9CB6] font-medium">
                  Caller
                </th>
                <th className="text-left py-3 px-4 text-[#8A9CB6] font-medium">
                  Duration
                </th>
                <th className="text-left py-3 px-4 text-[#8A9CB6] font-medium">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call, i) => (
                <tr key={i} className="border-b border-[#2A3F5F]/20 hover:bg-[#1A2847]/50">
                  <td className="py-3 px-4 text-[#E8DDD0]">{call.time}</td>
                  <td className="py-3 px-4 text-[#E8DDD0]">{call.caller}</td>
                  <td className="py-3 px-4 text-[#8A9CB6]">{call.duration}</td>
                  <td className="py-3 px-4">
                    {call.result.startsWith("Order") && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#10B981]/20 text-[#10B981] rounded text-xs font-medium">
                        <Check className="w-3 h-3" /> {call.result}
                      </span>
                    )}
                    {call.result.startsWith("Reservation") && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#3B82F6]/20 text-[#3B82F6] rounded text-xs font-medium">
                        <Check className="w-3 h-3" /> {call.result}
                      </span>
                    )}
                    {call.result.startsWith("Question") && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F59E0B]/20 text-[#F59E0B] rounded text-xs font-medium">
                        <Check className="w-3 h-3" /> {call.result}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── ROI Calculator ────────────────────────── */
function ROICalculator() {
  const [callsPerDay, setCallsPerDay] = useState(30);
  const [avgOrderValue, setAvgOrderValue] = useState(30);

  const monthlyRevenueLost = callsPerDay * 30 * avgOrderValue;
  const yearlyRevenueLost = monthlyRevenueLost * 12;
  const roiMonths = Math.ceil(249 / (monthlyRevenueLost / 30 || 0.01));

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 p-8 max-w-2xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-lg font-semibold text-[#1A1A2E] mb-6">
            Interactive ROI Calculator
          </h4>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#6B5E50] mb-3">
                Calls Per Day
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={callsPerDay}
                onChange={(e) => setCallsPerDay(Number(e.target.value))}
                className="w-full h-2 bg-[#E8DDD0] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-sm text-[#6B5E50]">
                <span>10</span>
                <span className="font-bold text-[#921920]">{callsPerDay}</span>
                <span>100</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B5E50] mb-3">
                Average Order Value
              </label>
              <input
                type="range"
                min="15"
                max="50"
                value={avgOrderValue}
                onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                className="w-full h-2 bg-[#E8DDD0] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-sm text-[#6B5E50]">
                <span>$15</span>
                <span className="font-bold text-[#921920]">${avgOrderValue}</span>
                <span>$50</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#921920]/10 to-[#0C1A7D]/10 rounded-xl p-8 flex flex-col justify-center">
          <p className="text-[#6B5E50] text-sm uppercase tracking-wide mb-4">
            Revenue Left on the Table Monthly
          </p>
          <p className="text-5xl font-bold text-[#921920] mb-6">
            ${monthlyRevenueLost.toLocaleString()}
          </p>
          <p className="text-[#6B5E50] text-sm mb-4">
            That&apos;s <span className="font-bold">${yearlyRevenueLost.toLocaleString()}</span> per year
          </p>
          <p className="text-[#6B5E50] text-sm">
            Ringo pays for itself in{" "}
            <span className="font-bold text-[#921920]">
              {roiMonths < 1 ? "<1 month" : `${roiMonths} month${roiMonths !== 1 ? "s" : ""}`}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── FAQ Item ────────────────────────── */
function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[#E8DDD0]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left hover:bg-[#FFF8F0]/80 px-4 transition-colors"
      >
        <span className="text-lg font-semibold text-[#1A1A2E]">{question}</span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-[#921920] transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-6 text-[#6B5E50] leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Main Page Component ────────────────────────── */
export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Integrations", href: "#integrations" },
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
    {
      question: "How long does setup take?",
      answer:
        "Setup takes just 2 minutes. Simply forward your restaurant's phone number to Ringo, and we handle the rest. No technical knowledge required.",
    },
    {
      question: "Which POS systems are supported?",
      answer:
        "We integrate directly with Square, Toast, Clover, SpotOn, Aloha, and 20+ other major POS systems. If yours isn't listed, contact us—we can often add support quickly.",
    },
    {
      question: "Are there long-term contracts?",
      answer:
        "Absolutely not. We believe in month-to-month flexibility. Cancel anytime, no penalties or hidden fees.",
    },
    {
      question: "Can Ringo handle complex orders?",
      answer:
        "Yes. Ringo is trained on your exact menu including modifiers, allergies, pricing tiers, and specials. It handles even the most complex orders with ease.",
    },
    {
      question: "How is customer data handled?",
      answer:
        "We use enterprise-grade encryption for all data. Your customer information is never shared or sold. Full GDPR and CCPA compliance.",
    },
    {
      question: "Can I test before committing?",
      answer:
        "Of course. Start with our 14-day free trial on the Starter plan. No credit card required. Upgrade anytime.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F0] text-[#1A1A2E]">
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .marquee {
          animation: marquee 20s linear infinite;
        }
        .marquee:hover {
          animation-play-state: paused;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* ────────────────────────── Navigation ────────────────────────── */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-[#FFF8F0]/95 backdrop-blur-md border-b border-[#E8DDD0]"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/ringo-logo.svg"
              alt="Ringo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-xl font-bold text-[#921920] hidden sm:inline">
              Ringo
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[#6B5E50] hover:text-[#921920] transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-[#6B5E50] hover:text-[#921920] transition-colors font-medium"
            >
              Login
            </Link>
            <button className="bg-[#921920] text-white px-6 py-2.5 rounded-full hover:bg-[#7A1018] transition-colors font-semibold">
              Try Ringo Free
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FFF8F0]/95 backdrop-blur-md border-t border-[#E8DDD0] p-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block text-[#6B5E50] hover:text-[#921920] transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-[#E8DDD0]" />
            <Link
              href="/login"
              className="block text-[#6B5E50] hover:text-[#921920] transition-colors font-medium"
            >
              Login
            </Link>
            <button className="w-full bg-[#921920] text-white px-6 py-2.5 rounded-full hover:bg-[#7A1018] transition-colors font-semibold">
              Try Ringo Free
            </button>
          </div>
        )}
      </nav>

      {/* ────────────────────────── Hero Section ────────────────────────── */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#921920]/10 text-[#921920] rounded-full px-4 py-1.5 mb-6 font-medium text-sm">
              <Star className="w-4 h-4 fill-current" />
              #1 AI Voice Ordering for Restaurants
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-tight mb-6">
              24/7 AI Phone Ordering for Restaurants
            </h1>

            <p className="text-xl md:text-2xl text-[#6B5E50] max-w-3xl mx-auto leading-relaxed">
              Ringo answers every call, takes orders, upsells intelligently, and
              sends payment links — so your staff can focus on what matters.
            </p>
          </div>

          {/* Interactive Demo Section */}
          <div className="my-16">
            <DemoCallForm />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-[#921920] mb-2">
                <AnimatedCounter target={98} suffix="%" />
              </p>
              <p className="text-[#6B5E50]">Answer Rate</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-[#921920] mb-2">
                $<AnimatedCounter target={2847} />
              </p>
              <p className="text-[#6B5E50]">Avg. Monthly Savings</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-[#921920] mb-2">
                24/7
              </p>
              <p className="text-[#6B5E50]">Availability</p>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────── Integration Logos ────────────────────────── */}
      <section className="py-12 md:py-16 bg-white border-y border-[#E8DDD0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[#6B5E50] text-sm font-medium mb-8">
            Trusted by restaurants using
          </p>

          <div className="relative overflow-hidden">
            <div className="flex items-center gap-12 md:gap-16 marquee">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="flex-shrink-0 h-12 w-auto grayscale opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Image
                    src={integration.src}
                    alt={integration.name}
                    width={100}
                    height={48}
                    className="h-full w-auto object-contain"
                  />
                </div>
              ))}
              {/* Repeat for seamless loop */}
              {integrations.map((integration) => (
                <div
                  key={`${integration.name}-2`}
                  className="flex-shrink-0 h-12 w-auto grayscale opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Image
                    src={integration.src}
                    alt={integration.name}
                    width={100}
                    height={48}
                    className="h-full w-auto object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────── Features Section ────────────────────────── */}
      <section id="features" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              The AI phone platform for all of your restaurant&apos;s needs
            </h2>
            <p className="text-xl text-[#6B5E50] max-w-2xl mx-auto">
              From order taking to reservations, Ringo handles it all.
            </p>
          </div>

          {/* Feature 1: Order Taking */}
          <div className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-serif font-bold mb-4">
                Takes phone orders for pickup and delivery, sends them straight
                to your POS
              </h3>
              <p className="text-lg text-[#6B5E50] leading-relaxed mb-6">
                Customers call, Ringo answers, takes their order with all
                customizations, and sends it directly to your kitchen. No typing,
                no mistakes, no missed orders.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">
                    Real-time order integration with your POS
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Handles modifiers and special instructions</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Works with delivery and pickup</span>
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 p-6 flex items-center justify-center h-96">
              <div className="bg-black text-white rounded-2xl p-4 w-48">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-400">Order #4827</p>
                </div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span>Large Pizza</span>
                    <span>$18.99</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Pepperoni, Extra Cheese</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Crazy Bread</span>
                    <span>$4.49</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-gray-700 pt-2 mt-2">
                    <span>Total</span>
                    <span>$23.48</span>
                  </div>
                </div>
                <div className="bg-green-900 text-green-300 px-3 py-2 rounded text-xs text-center">
                  ✓ Ready for payment
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Payment Processing */}
          <div className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 p-6 flex items-center justify-center h-96 md:order-2">
              <div className="space-y-4 w-full max-w-xs">
                <div className="bg-gradient-to-br from-[#921920] to-[#7A1018] rounded-lg p-6 text-white">
                  <div className="text-sm text-gray-200 mb-4">Payment Secure</div>
                  <div className="text-2xl font-bold mb-6">4142 •••• •••• 1234</div>
                  <div className="flex justify-between text-sm">
                    <span>John Smith</span>
                    <span>12/26</span>
                  </div>
                </div>
                <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm text-center font-medium">
                  ✓ Payment Received: $23.48
                </div>
              </div>
            </div>
            <div className="md:order-1">
              <h3 className="text-3xl font-serif font-bold mb-4">
                Securely takes credit card payments over the phone
              </h3>
              <p className="text-lg text-[#6B5E50] leading-relaxed mb-6">
                <span className="font-semibold text-[#921920]">Pay Before Prep:</span> Ringo
                collects payment before orders reach your kitchen. Get paid
                instantly, reduce no-shows, improve cash flow.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">PCI-DSS Level 1 compliant</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Instant payment confirmation</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Reduces no-shows and chargebacks</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3: Menu Knowledge */}
          <div className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-serif font-bold mb-4">
                Knows your menu inside-out and answers questions accurately
              </h3>
              <p className="text-lg text-[#6B5E50] leading-relaxed mb-6">
                Upload your menu once. Ringo learns every item, price, modifier,
                allergy, and special. Answer customer questions instantly without
                putting them on hold.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Automatically updated menu sync</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Allergy awareness and accuracy</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Upsells and cross-sells intelligently</span>
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 p-6">
              <div className="space-y-3 text-sm">
                <div className="border-b border-[#E8DDD0] pb-3">
                  <p className="text-[#921920] font-semibold mb-1">Customer:</p>
                  <p className="text-[#6B5E50]">
                    Do you have anything vegetarian?
                  </p>
                </div>
                <div className="border-b border-[#E8DDD0] pb-3">
                  <p className="text-[#0C1A7D] font-semibold mb-1">Ringo:</p>
                  <p className="text-[#6B5E50]">
                    Absolutely! We have the Margherita Pizza, Caprese Salad,
                    Pasta Primavera, and Veggie Fajitas. All made fresh daily.
                  </p>
                </div>
                <div className="border-b border-[#E8DDD0] pb-3">
                  <p className="text-[#921920] font-semibold mb-1">Customer:</p>
                  <p className="text-[#6B5E50]">
                    Which one has no dairy?
                  </p>
                </div>
                <div>
                  <p className="text-[#0C1A7D] font-semibold mb-1">Ringo:</p>
                  <p className="text-[#6B5E50]">
                    The Veggie Fajitas are dairy-free. Can I add those to your
                    order?
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4: Integrations */}
          <div id="integrations" className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 p-8 md:order-2">
              <div className="grid grid-cols-2 gap-4">
                {integrations.slice(0, 4).map((integration) => (
                  <div
                    key={integration.name}
                    className="border border-[#E8DDD0] rounded-lg p-4 flex items-center justify-center h-24"
                  >
                    <Image
                      src={integration.src}
                      alt={integration.name}
                      width={80}
                      height={40}
                      className="object-contain w-20 h-10 grayscale"
                    />
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-[#6B5E50] mt-4">
                + 20 more integrations
              </p>
            </div>
            <div className="md:order-1">
              <h3 className="text-3xl font-serif font-bold mb-4">
                Syncs with Square, Toast, Clover, SpotOn and 20+ POS systems
              </h3>
              <p className="text-lg text-[#6B5E50] leading-relaxed mb-6">
                Direct integrations, no middleman. Your orders flow seamlessly
                from Ringo into your POS, kitchen display system, and inventory.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Direct POS integration (no API delays)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Real-time inventory sync</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">KDS/printer integration</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 5: Reservations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-serif font-bold mb-4">
                Books reservations 24/7 by phone
              </h3>
              <p className="text-lg text-[#6B5E50] leading-relaxed mb-6">
                Never miss a reservation inquiry. Ringo checks your availability,
                confirms party size and preferences, and books directly into your
                system. All while your staff focuses on current guests.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">
                    Real-time availability checking
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">
                    Captures special requests (birthdays, allergies, etc.)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Automatic confirmation texts</span>
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 p-6 flex items-center justify-center h-96">
              <div className="w-full max-w-xs space-y-3">
                <div className="bg-[#FFF8F0] border border-[#E8DDD0] rounded-lg p-4">
                  <p className="text-sm font-semibold text-[#1A1A2E] mb-2">
                    Reservation Booked
                  </p>
                  <p className="text-sm text-[#6B5E50] mb-3">
                    Friday, March 15 at 7:00 PM
                  </p>
                  <div className="space-y-1 text-sm text-[#6B5E50]">
                    <p>Party of 4</p>
                    <p>Name: Sarah M.</p>
                    <p>Note: Birthday celebration</p>
                  </div>
                </div>
                <div className="bg-[#921920]/10 border border-[#921920]/30 text-[#921920] px-4 py-2 rounded-lg text-sm text-center font-medium">
                  ✓ Confirmation sent to guest
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────── Dashboard Preview ────────────────────────── */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-white border-y border-[#E8DDD0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Your AI phone command center
            </h2>
            <p className="text-xl text-[#6B5E50] max-w-2xl mx-auto">
              See live calls, read transcripts, track orders, and monitor performance
              in one beautiful dashboard.
            </p>
          </div>

          <DashboardMockup />
        </div>
      </section>

      {/* ────────────────────────── Revenue Impact ────────────────────────── */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Every missed call = lost revenue
            </h2>
          </div>

          {/* Impact Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 p-8 text-center">
              <AlertCircle className="w-12 h-12 text-[#921920] mx-auto mb-4" />
              <p className="text-lg font-semibold text-[#1A1A2E] mb-2">
                30% of calls missed
              </p>
              <p className="text-[#6B5E50]">
                Restaurants miss up to 30% of calls during peak hours
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 p-8 text-center">
              <DollarSign className="w-12 h-12 text-[#921920] mx-auto mb-4" />
              <p className="text-lg font-semibold text-[#1A1A2E] mb-2">
                $25–$50 per call
              </p>
              <p className="text-[#6B5E50]">
                Every call is a potential ticket at your restaurant
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 p-8 text-center">
              <TrendingUp className="w-12 h-12 text-[#921920] mx-auto mb-4" />
              <p className="text-lg font-semibold text-[#1A1A2E] mb-2">
                Degraded experience
              </p>
              <p className="text-[#6B5E50]">
                Staff pulled off floor to answer phones hurts guest experience
              </p>
            </div>
          </div>

          {/* ROI Calculator */}
          <ROICalculator />

          <div className="text-center mt-12">
            <button className="bg-[#921920] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#7A1018] transition-colors inline-flex items-center gap-2">
              Start Saving Now
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────────────── How It Works ────────────────────────── */}
      <section
        id="how-it-works"
        className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-white border-y border-[#E8DDD0]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              How it works
            </h2>
            <p className="text-xl text-[#6B5E50] max-w-2xl mx-auto">
              From zero to 24/7 ordering in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection Lines (hidden on mobile) */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-[#E8DDD0] via-[#921920] to-[#E8DDD0]" />

            {/* Step 1 */}
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-[#921920] text-white rounded-full flex items-center justify-center font-bold text-2xl">
                  1
                </div>
              </div>
              <h3 className="text-2xl font-serif font-bold text-center text-[#1A1A2E] mb-4">
                Connect Your POS
              </h3>
              <p className="text-center text-[#6B5E50] leading-relaxed">
                2-minute setup. Forward your phone number to Ringo. We handle the
                rest—no technical knowledge required.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-[#921920] text-white rounded-full flex items-center justify-center font-bold text-2xl">
                  2
                </div>
              </div>
              <h3 className="text-2xl font-serif font-bold text-center text-[#1A1A2E] mb-4">
                Import Your Menu
              </h3>
              <p className="text-center text-[#6B5E50] leading-relaxed">
                Upload your menu. AI learns your items, prices, modifiers, specials,
                and allergies instantly.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-[#921920] text-white rounded-full flex items-center justify-center font-bold text-2xl">
                  3
                </div>
              </div>
              <h3 className="text-2xl font-serif font-bold text-center text-[#1A1A2E] mb-4">
                Go Live
              </h3>
              <p className="text-center text-[#6B5E50] leading-relaxed">
                Ringo starts answering calls 24/7. Orders flow directly to your
                kitchen. You earn from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────── Pricing ────────────────────────── */}
      <section id="pricing" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-[#6B5E50] max-w-2xl mx-auto">
              No contracts. Cancel anytime. Scale as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 p-8 flex flex-col">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-[#1A1A2E] mb-2">Starter</h3>
                <p className="text-[#6B5E50] text-sm mb-4">
                  Perfect for getting started
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-[#921920]">$0</span>
                  <span className="text-[#6B5E50]">/mo</span>
                </div>
                <p className="text-sm text-[#6B5E50]">14-day free trial</p>
              </div>

              <button className="w-full border-2 border-[#921920] text-[#921920] py-3 rounded-full font-semibold hover:bg-[#921920] hover:text-white transition-colors mb-8">
                Start Free Trial
              </button>

              <ul className="space-y-4 flex-1">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">100 calls/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">1 location</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Basic analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Email support</span>
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-[#921920]/10 to-[#0C1A7D]/10 rounded-2xl shadow-lg border-2 border-[#921920] p-8 flex flex-col relative">
              <div className="absolute -top-4 left-8 bg-[#921920] text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-[#1A1A2E] mb-2">Pro</h3>
                <p className="text-[#6B5E50] text-sm mb-4">
                  For growing restaurants
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-[#921920]">$249</span>
                  <span className="text-[#6B5E50]">/mo</span>
                </div>
                <p className="text-sm text-[#6B5E50]">Billed monthly</p>
              </div>

              <button className="w-full bg-[#921920] text-white py-3 rounded-full font-semibold hover:bg-[#7A1018] transition-colors mb-8">
                Start Free Trial
              </button>

              <ul className="space-y-4 flex-1">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Unlimited calls</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Up to 5 locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Advanced analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#921920] flex-shrink-0 mt-0.5" />
                  <span className="text-[#6B5E50]">Custom integrations</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="text-center text-[#6B5E50] mt-8">
            No contracts. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ────────────────────────── Testimonial ────────────────────────── */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-white border-y border-[#E8DDD0]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-6xl text-[#921920] mb-6 leading-tight">
            "
          </p>
          <blockquote className="text-2xl md:text-3xl font-serif italic text-[#1A1A2E] leading-relaxed mb-8">
            This paid for itself in 10 days. Phones are calm, tickets are bigger,
            and my team refuses to go back.
          </blockquote>
          <p className="text-lg text-[#6B5E50] font-medium">
            — Restaurant Owner, Modesto CA
          </p>
        </div>
      </section>

      {/* ────────────────────────── FAQ ────────────────────────── */}
      <section id="faq" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Questions?
            </h2>
            <p className="text-xl text-[#6B5E50]">
              We"ve got answers.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-[#E8DDD0]/50 overflow-hidden">
            {faqItems.map((item, i) => (
              <FAQItem key={i} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────── Bottom CTA ────────────────────────── */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#921920] to-[#7A1018]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-8">
            Ready to never miss another order?
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 mb-8 max-w-md mx-auto">
            <input
              type="tel"
              placeholder="Your phone number"
              className="flex-1 px-6 py-4 rounded-full focus:outline-none focus:ring-2 focus:ring-white bg-white/90 text-[#1A1A2E] placeholder-[#6B5E50]"
            />
            <button className="bg-white text-[#921920] px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap">
              Call Me
            </button>
          </div>

          <p className="text-white/80 text-sm">
            Or{" "}
            <a href="#" className="underline hover:text-white transition-colors">
              schedule a demo
            </a>
          </p>
        </div>
      </section>

      {/* ────────────────────────── Footer ────────────────────────── */}
      <footer className="bg-[#1A1A2E] text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/ringo-logo-white.svg"
                  alt="Ringo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <span className="text-xl font-bold">Ringo</span>
              </div>
              <p className="text-white/70 text-sm mb-4">
                Meet your restaurant&apos;s new AI employee
              </p>
              <p className="text-white/70 text-sm font-medium">
                Built in Modesto, CA
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#integrations" className="hover:text-white transition-colors">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Demo
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-8">
            <p className="text-center text-sm text-white/70">
              © 2026 Ringo AI, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
