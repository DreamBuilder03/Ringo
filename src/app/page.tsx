"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  Mic,
  CreditCard,
  ShieldCheck,
  Clock,
  TrendingUp,
  Headphones,
  Users,
  MessageSquare,
  Utensils,
  Search,
  BarChart3,
  Zap,
  Play,
  MessageCircle,
  Zap as Lightning,
} from "lucide-react";
import { integrationList, coreStack } from "@/components/marketing/IntegrationLogos";

/* ═══════════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════════ */

function GrainOverlay({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }}
    />
  );
}

/* Ribbon sweep — hairline Bone echo of the logo's underline. Decorative only. */
function RibbonSweep({
  className = "",
  stroke = "currentColor",
  strokeWidth = 1,
  opacity = 0.35,
}: { className?: string; stroke?: string; strokeWidth?: number; opacity?: number }) {
  return (
    <svg
      viewBox="0 0 320 40"
      fill="none"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M2 26 C 40 8, 90 8, 140 22 S 240 38, 318 14"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
      <path
        d="M2 30 C 50 18, 110 18, 170 30 S 270 42, 318 22"
        stroke={stroke}
        strokeWidth={strokeWidth * 0.6}
        strokeLinecap="round"
        opacity={opacity * 0.55}
      />
    </svg>
  );
}

function useGlobalReveal() {
  useEffect(() => {
    const check = () => {
      document.querySelectorAll(".sr-hidden").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight - 20) {
          el.classList.remove("sr-hidden");
          el.classList.add("sr-visible");
        }
      });
    };
    check();
    const t1 = setTimeout(check, 100);
    const t2 = setTimeout(check, 500);
    window.addEventListener("scroll", check, { passive: true });
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("scroll", check); };
  }, []);
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={`sr-hidden ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

function Counter({ target, prefix = "", suffix = "", immediate = false, decimals = 0 }: { target: number; prefix?: string; suffix?: string; immediate?: boolean; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let running = false;
    const start = () => {
      if (running) return;
      running = true;
      let cur = 0;
      const dur = 2200;
      const steps = 70;
      const inc = target / steps;
      const timer = setInterval(() => {
        cur += inc;
        if (cur >= target) { setCount(target); clearInterval(timer); }
        else setCount(decimals > 0 ? parseFloat(cur.toFixed(decimals)) : Math.floor(cur));
      }, dur / steps);
    };
    if (immediate) { const t = setTimeout(start, 800); return () => clearTimeout(t); }
    const check = () => {
      if (running) return;
      if (el.getBoundingClientRect().top < window.innerHeight - 20) { start(); window.removeEventListener("scroll", check); }
    };
    check();
    const t = setTimeout(check, 300);
    window.addEventListener("scroll", check, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("scroll", check); };
  }, [target, immediate, decimals]);
  return <span ref={ref}>{prefix}{decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════
   HERO SEARCH — Google Places
   ═══════════════════════════════════════════════════════════════════════ */
type Suggestion = { placeId: string; mainText: string; secondaryText: string };

function HeroSearch() {
  const router = useRouter();
  const tokenRef = useRef<string>(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {}, { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 }
    );
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input || input.trim().length < 2) { setSuggestions([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/demo/places/autocomplete", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: input.trim(), sessionToken: tokenRef.current, lat: geoRef.current?.lat, lng: geoRef.current?.lng }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setOpen(true); setActive(0);
      } finally { setLoading(false); }
    }, 220);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input]);

  function select(s: Suggestion) { router.push(`/demo/confirm?placeId=${encodeURIComponent(s.placeId)}`); }
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); select(suggestions[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="relative w-full">
      <div className="relative group">
        <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-bone/20 via-bone/5 to-bone/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 blur-sm" />
        <div className="relative flex items-center bg-coal/80 backdrop-blur-xl border border-bone/[0.12] rounded-2xl overflow-hidden focus-within:border-bone/[0.3] transition-all duration-500 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)]">
          <Search className="absolute left-5 w-5 h-5 text-bone/30 pointer-events-none" />
          <input
            className="w-full bg-transparent text-bone placeholder:text-bone/25 pl-14 pr-5 py-5 text-lg outline-none font-sans"
            placeholder="Search for your restaurant..."
            value={input} onChange={(e) => setInput(e.target.value)}
            onFocus={() => input && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            aria-label="Search for your restaurant"
          />
          {loading ? (
            <svg className="absolute right-5 h-5 w-5 animate-spin text-bone/40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <div className="absolute right-5 bg-bone text-obsidian text-xs font-bold px-3 py-1.5 rounded-lg">
              Try it
            </div>
          )}
        </div>
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-graphite/95 backdrop-blur-xl border border-bone/[0.12] rounded-xl overflow-hidden shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)]">
          {suggestions.map((s, i) => (
            <div key={s.placeId} className={`px-5 py-3.5 cursor-pointer transition-colors duration-150 border-b border-bone/[0.04] last:border-0 ${i === active ? "bg-bone/[0.08]" : "hover:bg-bone/[0.04]"}`}
              onMouseDown={(e) => { e.preventDefault(); select(s); }} onMouseEnter={() => setActive(i)}>
              <div className="text-bone text-[15px] font-medium">{s.mainText}</div>
              <div className="text-bone/35 text-sm">{s.secondaryText}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   HERO PHONE — Larger, richer conversation mockup
   ═══════════════════════════════════════════════════════════════════════ */
function HeroPhone() {
  const [msgIdx, setMsgIdx] = useState(0);
  const msgs = useRef([
    { from: "r", text: "Thanks for calling Tony's Pizza! How can I help you today?" },
    { from: "c", text: "Hi, can I get a large pepperoni with extra cheese?" },
    { from: "r", text: "Absolutely! Want to add garlic knots for just $3.99? They're our most popular add-on." },
    { from: "c", text: "Yeah sure, and a 2-liter Coke." },
    { from: "r", text: "Great! Your total is $26.47. I'm sending a payment link to your phone now." },
    { from: "s", text: "💳 Payment link sent via SMS" },
    { from: "r", text: "Payment received! Your order will be ready for pickup in 25 minutes. Thank you!" },
  ]).current;

  useEffect(() => {
    if (msgIdx >= msgs.length) {
      const t = setTimeout(() => setMsgIdx(0), 5000);
      return () => clearTimeout(t);
    }
    const delay = msgIdx === 0 ? 2000 : msgs[msgIdx - 1]?.from === "r" ? 2400 : 1600;
    const t = setTimeout(() => setMsgIdx((i) => i + 1), delay);
    return () => clearTimeout(t);
  }, [msgIdx, msgs]);

  return (
    <div className="relative" style={{ width: 300 }}>
      {/* Outer glow rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full border border-bone/[0.04] animate-[pulseScale_6s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full border border-bone/[0.02] animate-[pulseScale_8s_ease-in-out_infinite] pointer-events-none" style={{ animationDelay: "-2s" }} />
      <div className="absolute -inset-20 rounded-full bg-bone/[0.04] blur-[100px] -z-10" />

      <div className="relative rounded-[2.8rem] bg-obsidian p-2 border border-bone/[0.12] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(243,238,227,0.05)]">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-obsidian rounded-b-2xl z-20 flex items-center justify-center">
          <div className="w-12 h-3 bg-coal rounded-full" />
        </div>

        <div className="rounded-[2.4rem] overflow-hidden bg-gradient-to-b from-coal via-coal to-obsidian" style={{ minHeight: 520 }}>
          {/* Status bar */}
          <div className="flex items-center justify-between px-7 pt-10 pb-2">
            <span className="text-[11px] text-bone/50 font-semibold tabular-nums">9:41</span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1,2,3,4].map(i => <div key={i} className="w-[3px] rounded-full bg-bone/50" style={{ height: 4 + i * 2 }} />)}
              </div>
              <div className="w-6 h-3 border border-bone/40 rounded-[3px] relative ml-1">
                <div className="absolute inset-[1.5px] right-[3px] bg-bone/70 rounded-[1.5px]" />
              </div>
            </div>
          </div>

          {/* Call header */}
          <div className="px-5 py-3 border-b border-bone/[0.06] mx-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bone/90 to-bone/60 flex items-center justify-center shadow-[0_2px_8px_rgba(243,238,227,0.15)]">
                <Phone className="w-4.5 h-4.5 text-obsidian" />
              </div>
              <div className="flex-1">
                <p className="text-bone text-sm font-bold tracking-tight">Ringo AI</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-bone animate-pulse-bone inline-block" />
                  <span className="text-[11px] text-bone/40 tabular-nums">Live call — Tony&apos;s Pizza</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-bone/[0.06] flex items-center justify-center">
                  <Mic className="w-3.5 h-3.5 text-bone/40" />
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="px-4 py-4 space-y-2.5 overflow-hidden" style={{ maxHeight: 380 }}>
            {msgs.slice(0, msgIdx).map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "c" ? "justify-end" : "justify-start"} anim-msg`} style={{ animationDelay: `${i * 60}ms` }}>
                {msg.from === "s" ? (
                  <div className="w-full flex justify-center">
                    <div className="bg-bone/[0.06] border border-bone/[0.08] rounded-xl px-4 py-2 text-[11px] text-bone/50 text-center">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className={`max-w-[82%] px-3.5 py-2 text-[12.5px] leading-relaxed ${
                    msg.from === "c"
                      ? "bg-bone text-obsidian rounded-2xl rounded-br-sm font-medium shadow-[0_2px_8px_rgba(243,238,227,0.1)]"
                      : "bg-bone/[0.07] text-bone/90 rounded-2xl rounded-bl-sm"
                  }`}>
                    {msg.text}
                  </div>
                )}
              </div>
            ))}
            {msgIdx < msgs.length && msgs[msgIdx].from !== "s" && (
              <div className={`flex ${msgs[msgIdx].from === "c" ? "justify-end" : "justify-start"}`}>
                <div className="bg-bone/[0.06] rounded-2xl px-4 py-2.5 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-bone/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-bone/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-bone/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   IPAD LIVE CALL — Large landscape iPad showing a live 47-second Ringo call
   Sarah M. → Tony's Pizza, 7 bubbles, $38.47 total, +$4.99 upsell captured
   ═══════════════════════════════════════════════════════════════════════ */
function IPadLiveCallSection() {
  const DURATION = 47;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Scripted conversation — timestamps in seconds drive bubble highlight
  const bubbles = [
    { from: "r", text: "Thanks for calling Tony's Pizza! How can I help you today?", at: 0 },
    { from: "c", text: "Hi, can I get a large pepperoni with extra cheese?", at: 7 },
    { from: "r", text: "Absolutely. Want to add breadsticks for $4.99? They're our most popular upsell.", at: 14, upsell: true },
    { from: "c", text: "Yeah, add those. And a 2-liter Coke.", at: 21 },
    { from: "r", text: "Perfect. Your total is $38.47. Sending the payment link now.", at: 27 },
    { from: "system", text: "Payment link sent", at: 38 },
    { from: "r", text: "Payment received! Your order will be ready in 25 minutes. Thanks Sarah.", at: 42 },
  ];

  // Simulated playback — rAF-driven; works whether or not the audio file exists
  useEffect(() => {
    if (!playing) return;
    const startStamp = Date.now() - currentTime * 1000;
    let raf = 0;
    const tick = () => {
      const elapsed = (Date.now() - startStamp) / 1000;
      if (elapsed >= DURATION) {
        setPlaying(false);
        setCurrentTime(0);
        return;
      }
      setCurrentTime(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const toggle = () => {
    const audio = audioRef.current;
    if (playing) {
      audio?.pause();
      if (audio) audio.currentTime = 0;
      setPlaying(false);
      setCurrentTime(0);
    } else {
      setCurrentTime(0);
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => { /* no audio file yet — simulated playback still runs */ });
      }
      setPlaying(true);
    }
  };

  // Figure out the latest bubble that should be "lit"
  const activeBubble = bubbles.reduce((acc, b, i) => (currentTime >= b.at ? i : acc), -1);

  // Circular progress ring geometry
  const RING_R = 22;
  const RING_C = 2 * Math.PI * RING_R;
  const ringOffset = RING_C * (1 - Math.min(currentTime, DURATION) / DURATION);

  // 0:00 elapsed display
  const mm = Math.floor(Math.min(currentTime, DURATION) / 60);
  const ss = Math.floor(Math.min(currentTime, DURATION) % 60).toString().padStart(2, "0");

  return (
    <section className="relative bg-obsidian py-24 md:py-32 overflow-hidden">
      <GrainOverlay opacity={0.025} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(243,238,227,0.035),transparent)] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        {/* Section heading */}
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
            <p className="eyebrow text-bone/45 mb-4">Watch a real call, start to finish</p>
            <h2 className="font-display text-bone text-4xl md:text-5xl lg:text-[64px] tracking-tight leading-[1.04]">
              <span className="italic">47 seconds.</span>{" "}
              <span className="text-bone/65">One order.</span>{" "}
              <span className="italic">$38.47 captured.</span>
            </h2>
            <p className="text-stone text-base md:text-lg mt-5 leading-relaxed">
              No staff touched the phone. The upsell landed. Payment cleared before the kitchen fired a ticket.
            </p>
          </div>
        </Reveal>

        {/* iPad Pro — landscape */}
        <Reveal delay={150}>
          <div className="relative mx-auto" style={{ maxWidth: 900 }}>
            {/* Subtle bone halo behind iPad */}
            <div className="absolute -inset-10 bg-bone/[0.025] blur-[80px] rounded-[80px] pointer-events-none" />

            {/* iPad bezel */}
            <div
              className="relative bg-obsidian rounded-[38px] p-3 border border-bone/[0.14]"
              style={{
                aspectRatio: "4 / 3",
                boxShadow: "0 48px 120px -24px rgba(0,0,0,0.9), 0 0 0 1px rgba(10,10,10,0.6), inset 0 1px 0 rgba(243,238,227,0.05)",
              }}
            >
              {/* Front camera */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-bone/25 z-10" />

              {/* Screen */}
              <div className="relative w-full h-full rounded-[28px] bg-coal overflow-hidden flex flex-col">
                {/* iOS status bar */}
                <div className="flex items-center justify-between px-6 pt-3 pb-2 shrink-0">
                  <span className="text-[11px] text-bone/65 font-semibold tabular-nums">9:41</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-end gap-[2px]">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-[2.5px] rounded-full bg-bone/60" style={{ height: 3 + i * 1.5 }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-bone/50 font-medium">100%</span>
                  </div>
                </div>

                {/* Caller header */}
                <div className="flex items-center justify-between px-6 py-3 border-y border-bone/[0.05] shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-bone/[0.08] border border-bone/[0.12] flex items-center justify-center">
                        <span className="text-bone/85 font-display text-sm">SM</span>
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-bone animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-bone text-[15px] font-medium">Sarah M.</span>
                        <span className="text-[9px] text-bone/70 font-bold uppercase tracking-[0.14em] border border-bone/[0.22] rounded px-1.5 py-[1px]">
                          Live
                        </span>
                      </div>
                      <span className="text-bone/40 text-[11px]">Tony&apos;s Pizza · Inbound order</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display italic text-bone text-2xl tabular-nums leading-none">
                      {mm}:{ss}
                    </div>
                    <div className="text-bone/35 text-[10px] uppercase tracking-[0.12em] mt-1">elapsed</div>
                  </div>
                </div>

                {/* Conversation */}
                <div className="relative flex-1 overflow-hidden px-5 md:px-8 py-5">
                  <div className="space-y-2 max-w-[560px] mx-auto">
                    {bubbles.map((b, i) => {
                      const isActive = playing && activeBubble === i;
                      const isPast = activeBubble >= i;
                      const dimClass = playing && !isActive ? "opacity-45" : "opacity-100";

                      if (b.from === "system") {
                        return (
                          <div key={i} className={`flex justify-center transition-opacity duration-300 ${isPast ? dimClass : "opacity-30"}`}>
                            <div
                              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] border ${
                                isActive
                                  ? "bg-bone/[0.12] border-bone/[0.3]"
                                  : "bg-bone/[0.05] border-bone/[0.1]"
                              }`}
                            >
                              <CreditCard className="w-3 h-3 text-bone/70" />
                              <span className="text-bone/70 font-medium">Payment link sent ·</span>
                              <span className="font-display italic text-bone">$38.47</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={i} className={`transition-opacity duration-300 ${isPast ? dimClass : "opacity-30"}`}>
                          {b.upsell && (
                            <div
                              className={`flex justify-start mb-1 transition-opacity duration-500 ${
                                isPast ? "opacity-100" : "opacity-0"
                              }`}
                            >
                              <div className="inline-flex items-center gap-1.5 bg-bone text-obsidian rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]">
                                <TrendingUp className="w-2.5 h-2.5" />
                                Upsell captured ·
                                <span className="font-display italic normal-case tracking-normal">+$4.99</span>
                              </div>
                            </div>
                          )}
                          <div className={`flex ${b.from === "r" ? "justify-start" : "justify-end"}`}>
                            <div
                              className={`max-w-[78%] px-4 py-2.5 text-[13px] leading-relaxed rounded-2xl transition-all duration-300 ${
                                b.from === "r"
                                  ? `bg-bone/[0.06] text-bone/85 rounded-bl-sm ${
                                      isActive ? "bg-bone/[0.12] ring-1 ring-bone/25" : ""
                                    }`
                                  : `bg-bone text-obsidian rounded-br-sm font-medium ${
                                      isActive ? "shadow-[0_0_24px_rgba(243,238,227,0.18)]" : ""
                                    }`
                              }`}
                            >
                              {b.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer strip */}
                <div className="flex items-center justify-between px-6 py-2.5 border-t border-bone/[0.05] bg-obsidian/50 shrink-0">
                  <div className="flex items-center gap-1.5 text-bone/45 text-[10px]">
                    <Mic className="w-3 h-3" />
                    <span>Recording · encrypted</span>
                  </div>
                  <div className="text-bone/40 text-[10px] font-medium tracking-wider uppercase">
                    Ringo
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/*
          TODO: Misael — record the 47-second reference call and drop it at
          /public/assets/audio/ringo-demo-call.mp3
        */}
        <audio ref={audioRef} src="/assets/audio/ringo-demo-call.mp3" preload="none" />

        {/* Play button + YouTube ghost link */}
        <Reveal delay={250}>
          <div className="flex flex-col items-center gap-5 mt-14">
            <button
              onClick={toggle}
              aria-label={playing ? "Stop demo call" : "Play demo call"}
              className="group relative inline-flex items-center gap-3 bg-obsidian hover:bg-coal border-[1.5px] border-bone text-bone rounded-full pl-7 pr-6 py-3.5 font-medium text-[15px] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
              style={{ transitionProperty: "background-color,border-color,color,transform" }}
            >
              <span className="relative inline-flex items-center justify-center w-7 h-7">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                  <circle cx="24" cy="24" r={RING_R} fill="none" stroke="rgba(243,238,227,0.14)" strokeWidth="1.25" />
                  <circle
                    cx="24"
                    cy="24"
                    r={RING_R}
                    fill="none"
                    stroke="rgba(243,238,227,0.95)"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffset}
                    style={{ transition: playing ? "stroke-dashoffset 120ms linear" : "stroke-dashoffset 300ms ease-out" }}
                  />
                </svg>
                <span className="text-bone text-[11px] leading-none">
                  {playing ? (
                    <span className="inline-block w-[9px] h-[9px] bg-bone" />
                  ) : (
                    <span className="inline-block" style={{ transform: "translateX(1px)" }}>▶</span>
                  )}
                </span>
              </span>
              <span>{playing ? "Stop" : "Hear this call"}</span>
              <span className="font-display italic text-bone/55 text-sm ml-1">· 47 seconds</span>
            </button>

            {/* TODO: Misael — drop real YouTube URL for the full demo walkthrough */}
            <a
              href="#"
              className="group inline-flex items-center gap-1.5 text-bone/45 hover:text-bone text-sm duration-300"
              style={{ transitionProperty: "color,transform" }}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Watch the full demo on YouTube</span>
              <ArrowRight className="w-3.5 h-3.5 duration-300 group-hover:translate-x-0.5" style={{ transitionProperty: "transform" }} />
            </a>
          </div>
        </Reveal>

        {/* Testimonial — Tony M. */}
        <Reveal delay={350}>
          <div className="max-w-2xl mx-auto mt-20 text-center">
            <blockquote className="font-display italic text-stone text-[22px] md:text-[26px] leading-[1.4] tracking-tight">
              &ldquo;First week, Ringo captured three upsells on my slowest Tuesday. My pizza oven never stops anymore — and I haven&apos;t missed a call since.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className="w-10 h-10 rounded-full bg-bone/[0.08] border border-bone/[0.12] flex items-center justify-center">
                <span className="text-bone/75 font-display text-sm">TM</span>
              </div>
              <div className="text-left">
                <div className="text-bone text-sm font-medium">Tony M.</div>
                <div className="text-bone/40 text-[11px]">Owner · Tony&apos;s Pizza, Modesto</div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LIVE DASHBOARD — Tabs, animated data, richer layout
   ═══════════════════════════════════════════════════════════════════════ */
function LiveDashboard() {
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const dataSets = [
    { calls: 145, orders: 97, revenue: 4010, rate: 99.3 },
    { calls: 148, orders: 100, revenue: 4185, rate: 99.4 },
    { calls: 142, orders: 95, revenue: 3890, rate: 99.2 },
    { calls: 151, orders: 103, revenue: 4320, rate: 99.5 },
  ];
  const d = dataSets[tick];

  useEffect(() => {
    const i = setInterval(() => setTick((t) => (t + 1) % dataSets.length), 3500);
    return () => clearInterval(i);
  }, [dataSets.length]);

  const tabs = ["Overview", "Calls", "Orders", "Analytics"];
  const recentCalls = [
    { time: "2:34 PM", name: "John M.", phone: "(209) 555-0142", dur: "4:12", type: "Order", amount: "$28.50", upsell: "+$3.99" },
    { time: "2:18 PM", name: "Sarah L.", phone: "(209) 555-0198", dur: "2:45", type: "Order", amount: "$42.75", upsell: "+$5.99" },
    { time: "1:56 PM", name: "Mike R.", phone: "(209) 555-0256", dur: "3:08", type: "Order", amount: "$19.90", upsell: "-" },
    { time: "1:42 PM", name: "Emma T.", phone: "(209) 555-0311", dur: "1:32", type: "Text Order", amount: "$35.20", upsell: "+$2.99" },
    { time: "1:28 PM", name: "Alex K.", phone: "(209) 555-0187", dur: "2:55", type: "Order", amount: "$27.00", upsell: "+$3.99" },
  ];

  return (
    <div className="relative rounded-2xl border border-bone/[0.1] bg-coal overflow-hidden shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(243,238,227,0.04)]">
      {/* Browser bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bone/[0.06] bg-graphite/80">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-bone/[0.12]" />
          <div className="w-3 h-3 rounded-full bg-bone/[0.09]" />
          <div className="w-3 h-3 rounded-full bg-bone/[0.12]" />
        </div>
        <div className="flex-1 mx-6">
          <div className="bg-obsidian/80 rounded-lg px-4 py-1.5 text-bone/25 text-xs flex items-center gap-2 max-w-sm mx-auto">
            <svg viewBox="0 0 16 16" className="w-3 h-3 text-bone/20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="12" height="12" rx="3" /><path d="M6 2v12" /></svg>
            app.useringo.ai/dashboard
          </div>
        </div>
      </div>

      <div className="flex min-h-[420px] md:min-h-[480px]">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col w-52 shrink-0 border-r border-bone/[0.04] bg-obsidian/40 p-4">
          <div className="flex items-center gap-2 mb-6 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ringo-logo.png" alt="Ringo" className="h-5 w-auto brightness-0 invert" />
          </div>
          {[
            { name: "Dashboard", icon: <BarChart3 className="w-4 h-4" />, active: true },
            { name: "Calls", icon: <Phone className="w-4 h-4" />, active: false, badge: "12" },
            { name: "Orders", icon: <Utensils className="w-4 h-4" />, active: false },
            { name: "Text Orders", icon: <MessageCircle className="w-4 h-4" />, active: false, badge: "NEW" },
            { name: "Analytics", icon: <TrendingUp className="w-4 h-4" />, active: false },
            { name: "Customers", icon: <Users className="w-4 h-4" />, active: false },
          ].map((item) => (
            <div key={item.name} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] mb-0.5 transition-colors ${
              item.active ? "bg-bone/[0.08] text-bone font-medium" : "text-bone/25 hover:text-bone/40 hover:bg-bone/[0.03]"
            }`}>
              <div className="flex items-center gap-2.5">{item.icon}{item.name}</div>
              {item.badge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  item.badge === "NEW" ? "bg-bone/[0.12] text-bone/60" : "bg-bone/[0.08] text-bone/40"
                }`}>{item.badge}</span>
              )}
            </div>
          ))}

          <div className="mt-auto pt-4 border-t border-bone/[0.04]">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-bone/[0.08] flex items-center justify-center text-bone/30 text-[10px] font-bold">TR</div>
              <div>
                <p className="text-bone/50 text-[11px] font-medium">Tony&apos;s Restaurant</p>
                <p className="text-bone/20 text-[10px]">Modesto, CA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 p-4 md:p-6 space-y-5 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-bone font-semibold text-base">Dashboard</h3>
              <p className="text-bone/20 text-[11px]">Today, April 16 — Real-time</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1 bg-obsidian/60 rounded-lg p-0.5">
                {tabs.map((t, i) => (
                  <button key={t} onClick={() => setActiveTab(i)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                      i === activeTab ? "bg-bone/[0.1] text-bone" : "text-bone/25 hover:text-bone/40"
                    }`}>{t}</button>
                ))}
              </div>
              <span className="inline-flex items-center gap-1.5 bg-bone/[0.06] px-3 py-1.5 rounded-full text-[10px] text-bone/50 font-medium">
                <span className="w-2 h-2 rounded-full bg-bone animate-pulse-bone" />
                LIVE
              </span>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Calls", value: d.calls, change: "+12%", icon: <Phone className="w-3.5 h-3.5" /> },
              { label: "Orders", value: d.orders, change: "+18%", icon: <Utensils className="w-3.5 h-3.5" /> },
              { label: "Revenue", value: d.revenue, prefix: "$", change: "+24%", icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { label: "Answer Rate", value: d.rate, suffix: "%", change: "+0.3%", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            ].map((s) => (
              <div key={s.label} className="bg-obsidian/60 rounded-xl p-3.5 border border-bone/[0.04] hover:border-bone/[0.08] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-bone/20 text-[10px] uppercase tracking-wider">{s.label}</p>
                  <span className="text-bone/10">{s.icon}</span>
                </div>
                <p className="text-bone font-bold text-xl tabular-nums transition-all duration-700">
                  {s.prefix}{typeof s.value === "number" && !s.suffix ? s.value.toLocaleString() : s.value}{s.suffix}
                </p>
                <p className="text-bone/25 text-[10px] tabular-nums mt-0.5">{s.change} vs yesterday</p>
              </div>
            ))}
          </div>

          {/* Chart + Activity split */}
          <div className="grid lg:grid-cols-5 gap-3">
            {/* Bar chart */}
            <div className="lg:col-span-3 bg-obsidian/60 rounded-xl border border-bone/[0.04] p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-bone/30 text-[11px] font-medium">Revenue — Last 7 Days</p>
                <div className="flex gap-1">
                  {["Week", "Month", "Year"].map((p, i) => (
                    <span key={p} className={`text-[9px] px-2 py-0.5 rounded ${i === 0 ? "bg-bone/[0.08] text-bone/50" : "text-bone/15"}`}>{p}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-[6px] h-24">
                {[
                  { h: 58, v: "$2,840" }, { h: 72, v: "$3,520" }, { h: 48, v: "$2,340" },
                  { h: 85, v: "$4,150" }, { h: 66, v: "$3,220" }, { h: 92, v: "$4,490" }, { h: 78, v: "$3,810" },
                ].map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[8px] text-bone/0 group-hover:text-bone/40 transition-colors tabular-nums">{bar.v}</span>
                    <div className="w-full rounded-t-sm bg-bone/[0.08] group-hover:bg-bone/[0.16] transition-all duration-300 relative"
                      style={{ height: `${bar.h}%` }}>
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bone/[0.05] to-transparent rounded-t-sm" />
                    </div>
                    <span className="text-[8px] text-bone/15">{["M","T","W","T","F","S","S"][i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div className="lg:col-span-2 bg-obsidian/60 rounded-xl border border-bone/[0.04] p-4">
              <p className="text-bone/30 text-[11px] font-medium mb-3">Live Activity</p>
              <div className="space-y-3">
                {[
                  { icon: <Phone className="w-3 h-3" />, text: "New call from (209) 555-0142", time: "Just now", highlight: true },
                  { icon: <CreditCard className="w-3 h-3" />, text: "Payment received — $28.50", time: "1m ago" },
                  { icon: <MessageCircle className="w-3 h-3" />, text: "Text order from (209) 555-0311", time: "3m ago" },
                  { icon: <TrendingUp className="w-3 h-3" />, text: "Upsell accepted — +$3.99", time: "5m ago" },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      a.highlight ? "bg-bone/[0.12] text-bone/60" : "bg-bone/[0.05] text-bone/25"
                    }`}>{a.icon}</div>
                    <div className="min-w-0">
                      <p className="text-bone/50 text-[11px] leading-snug truncate">{a.text}</p>
                      <p className="text-bone/15 text-[9px]">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calls table */}
          <div className="bg-obsidian/60 rounded-xl border border-bone/[0.04] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-bone/[0.04] flex items-center justify-between">
              <p className="text-bone/30 text-[11px] font-medium">Recent Calls</p>
              <p className="text-bone/15 text-[10px] hover:text-bone/30 cursor-pointer transition-colors">View all →</p>
            </div>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-7 gap-2 px-4 py-2 text-[9px] text-bone/15 uppercase tracking-wider border-b border-bone/[0.03]">
              <span>Time</span><span>Caller</span><span>Phone</span><span>Duration</span><span>Type</span><span className="text-right">Amount</span><span className="text-right">Upsell</span>
            </div>
            <div className="divide-y divide-bone/[0.03]">
              {recentCalls.map((c, i) => (
                <div key={i} className="grid grid-cols-4 sm:grid-cols-7 gap-2 px-4 py-2.5 text-[11px] hover:bg-bone/[0.02] transition-colors">
                  <span className="text-bone/20 tabular-nums">{c.time}</span>
                  <span className="text-bone font-medium truncate">{c.name}</span>
                  <span className="hidden sm:block text-bone/20 tabular-nums">{c.phone}</span>
                  <span className="hidden sm:block text-bone/20 tabular-nums">{c.dur}</span>
                  <span className={`hidden sm:flex items-center gap-1 ${c.type === "Text Order" ? "text-bone/50" : "text-bone/30"}`}>
                    {c.type === "Text Order" && <MessageCircle className="w-3 h-3" />}
                    {c.type}
                  </span>
                  <span className="text-bone font-semibold tabular-nums text-right">{c.amount}</span>
                  <span className="text-bone/30 tabular-nums text-right">{c.upsell}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FAQ ITEM
   ═══════════════════════════════════════════════════════════════════════ */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-bone/[0.06]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-6 text-left group">
        <span className="text-bone font-medium text-base pr-4 group-hover:text-bone/80 transition-colors">{q}</span>
        <ChevronDown className={`w-5 h-5 text-bone/30 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? 300 : 0, opacity: open ? 1 : 0 }}>
        <p className="text-stone text-[15px] leading-relaxed pb-6">{a}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ROI CALCULATOR
   ═══════════════════════════════════════════════════════════════════════ */
function ROICalculator() {
  const [calls, setCalls] = useState(80);
  const [avg, setAvg] = useState(25);
  const missedPct = 0.3;
  const monthlyLost = Math.round(calls * missedPct * avg * 30);
  const yearly = monthlyLost * 12;

  return (
    <div className="relative overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0 rounded-2xl border border-bone/[0.08] overflow-hidden">
        {/* Left — Controls */}
        <div className="bg-coal p-8 md:p-10">
          <p className="text-bone/40 text-[11px] font-medium uppercase tracking-[0.12em] mb-6">Revenue Calculator</p>
          <h3 className="font-display text-bone text-2xl md:text-3xl tracking-tight mb-2">
            How much are missed calls costing you?
          </h3>
          <p className="text-stone text-sm mb-8">Drag the sliders.</p>

          <div className="space-y-8">
            <div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-bone/50">Phone calls per day</span>
                <span className="text-bone font-bold tabular-nums text-lg">{calls}</span>
              </div>
              <input type="range" min={10} max={300} value={calls} onChange={(e) => setCalls(+e.target.value)}
                className="w-full accent-bone h-1.5 bg-smoke rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-bone [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(243,238,227,0.15)]" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-bone/50">Average order value</span>
                <span className="text-bone font-bold tabular-nums text-lg">${avg}</span>
              </div>
              <input type="range" min={10} max={60} value={avg} onChange={(e) => setAvg(+e.target.value)}
                className="w-full accent-bone h-1.5 bg-smoke rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-bone [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(243,238,227,0.15)]" />
            </div>
          </div>
        </div>

        {/* Right — Results */}
        <div className="bg-bone text-obsidian p-8 md:p-10 flex flex-col items-center justify-center text-center">
          <p className="text-obsidian/40 text-[11px] font-medium uppercase tracking-[0.12em] mb-4">Monthly revenue you&apos;re losing</p>
          <p className="money-number text-obsidian text-[4.5rem] md:text-[7.5rem] leading-[0.9]">
            ${monthlyLost.toLocaleString()}
          </p>
          <p className="text-obsidian/50 text-sm mt-2">
            That&apos;s <span className="font-bold text-obsidian">${yearly.toLocaleString()}</span> per year
          </p>
          <div className="w-16 h-[1px] bg-obsidian/10 my-6" />
          <p className="text-obsidian/40 text-xs">With Ringo at <span className="font-bold text-obsidian">$799/mo</span></p>
          <p className="font-display italic text-obsidian text-2xl mt-1">
            ROI payback in {Math.max(1, Math.ceil((799 / (monthlyLost || 1)) * 30))} days
          </p>
          <Link href="/demo" className="mt-6 inline-flex items-center gap-2 bg-obsidian text-bone px-6 py-3 rounded-full text-sm font-bold hover:shadow-lg transition-all">
            Get started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EMBEDDED VOICE DEMO — Interactive restaurant search + live call
   ═══════════════════════════════════════════════════════════════════════ */
type DemoPlace = { placeId: string; name: string; address: string; phone: string; cuisineType: string; hours: string[] | null; photoUrl: string | null; website?: string | null };
type DemoCallState = "idle" | "connecting" | "live" | "ended" | "error";
type DemoSuggestion = { placeId: string; mainText: string; secondaryText: string };

function EmbeddedVoiceDemo() {
  const [step, setStep] = useState<"search" | "ready" | "call">("search");
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<DemoSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<DemoPlace | null>(null);
  const [callState, setCallState] = useState<DemoCallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<unknown>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  const geoRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {}, { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 }
    );
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input || input.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/demo/places/autocomplete", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: input.trim(), sessionToken: tokenRef.current, lat: geoRef.current?.lat, lng: geoRef.current?.lng }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setOpen(true); setActive(0);
      } catch {}
    }, 220);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input]);

  async function selectPlace(s: DemoSuggestion) {
    setOpen(false); setInput(s.mainText);
    try {
      const res = await fetch(`/api/demo/places/details?placeId=${encodeURIComponent(s.placeId)}`);
      if (!res.ok) throw new Error("Could not load restaurant");
      const d = await res.json();
      setPlace(d); setStep("ready");
    } catch (e) { setError((e as Error).message); }
  }

  async function startCall() {
    if (!place) return;
    setError(null); setCallState("connecting");
    try {
      const res = await fetch("/api/demo/create-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "en", restaurantName: place.name, cuisineType: place.cuisineType, address: place.address, phone: place.phone, hours: place.hours, website: place.website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");
      if (data.demo_mode) { setError("Demo voice not configured. Contact us to enable live calls."); setCallState("error"); return; }

      const { RetellWebClient } = await import("retell-client-js-sdk");
      const client = new RetellWebClient();
      clientRef.current = client;
      client.on("call_started", () => { setCallState("live"); setStep("call"); });
      client.on("call_ended", () => setCallState("ended"));
      client.on("error", () => { setError("Call dropped. Try again?"); setCallState("error"); try { client.stopCall(); } catch {} });
      await client.startCall({ accessToken: data.access_token });
    } catch (e) { setError((e as Error).message || "Could not start call"); setCallState("error"); }
  }

  function endCall() {
    try { const client = clientRef.current as { stopCall: () => void } | null; client?.stopCall(); } catch {}
    setCallState("ended");
  }

  function reset() { setStep("search"); setPlace(null); setInput(""); setCallState("idle"); setError(null); }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); selectPlace(suggestions[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Glass card container */}
      <div className="relative rounded-3xl border border-bone/[0.08] bg-coal/60 backdrop-blur-xl p-8 md:p-10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)]">
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-bone/[0.08] via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">

          {/* Step 1: Search */}
          {step === "search" && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <div className="inline-flex items-center gap-2 text-bone/40 text-sm mb-1">
                  <Search className="w-4 h-4" /> Step 1 of 2
                </div>
                <p className="text-bone text-lg font-medium">Find your restaurant</p>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bone/30 pointer-events-none" />
                <input
                  className="w-full bg-obsidian/60 border border-bone/[0.1] rounded-xl text-bone placeholder:text-bone/25 pl-12 pr-5 py-4 text-base outline-none focus:border-bone/[0.25] transition-colors"
                  placeholder="Search for any restaurant..."
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onFocus={() => input && setOpen(true)}
                  onBlur={() => setTimeout(() => setOpen(false), 150)}
                  onKeyDown={onKeyDown}
                />
                {open && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-bone/[0.1] bg-graphite/95 backdrop-blur-xl overflow-hidden shadow-xl z-30">
                    {suggestions.map((s, i) => (
                      <button key={s.placeId}
                        className={`w-full text-left px-4 py-3 transition-colors ${i === active ? "bg-bone/[0.08]" : "hover:bg-bone/[0.04]"}`}
                        onMouseDown={(e) => { e.preventDefault(); selectPlace(s); }}
                        onMouseEnter={() => setActive(i)}
                      >
                        <span className="block text-bone text-sm font-medium">{s.mainText}</span>
                        <span className="block text-bone/40 text-xs mt-0.5">{s.secondaryText}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {error && <p className="text-bone/60 text-sm text-center">{error}</p>}
            </div>
          )}

          {/* Step 2: Ready to call */}
          {step === "ready" && place && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-bone/40 text-sm mb-3">
                  <Phone className="w-4 h-4" /> Step 2 of 2
                </div>
                <p className="text-bone text-xl font-bold">{place.name}</p>
                <p className="text-bone/40 text-sm mt-1">{place.address}</p>
                {place.cuisineType && <p className="text-bone/30 text-xs mt-1 uppercase tracking-wider">{place.cuisineType}</p>}
              </div>

              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={startCall}
                  disabled={callState === "connecting"}
                  className="group relative w-20 h-20 rounded-full bg-bone text-obsidian flex items-center justify-center shadow-[0_0_0_0_rgba(243,238,227,0.3)] hover:shadow-[0_0_0_12px_rgba(243,238,227,0.1)] transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {callState === "connecting" ? (
                    <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <Phone className="w-8 h-8" />
                  )}
                  {/* Pulsing ring animation */}
                  <span className="absolute inset-0 rounded-full border-2 border-bone/40 animate-ping" style={{ animationDuration: "2s" }} />
                </button>
                <p className="text-bone/50 text-sm">
                  {callState === "connecting" ? "Connecting..." : "Tap to start a live call"}
                </p>
              </div>

              <button onClick={reset} className="block mx-auto text-bone/30 hover:text-bone/60 text-xs transition-colors">
                ← Search for a different restaurant
              </button>
            </div>
          )}

          {/* Step 3: Live call / ended */}
          {step === "call" && place && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-bone text-xl font-bold">{place.name}</p>
                <div className="inline-flex items-center gap-2 mt-2">
                  {callState === "live" && <span className="w-2.5 h-2.5 rounded-full bg-bone animate-pulse" />}
                  <span className="text-bone/60 text-sm">
                    {callState === "live" && "Call in progress — say something!"}
                    {callState === "ended" && "Call ended"}
                    {callState === "error" && (error || "Something went wrong")}
                  </span>
                </div>
              </div>

              {/* Waveform visualization */}
              {callState === "live" && (
                <div className="flex items-center justify-center gap-1 h-16">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="w-1 bg-bone/40 rounded-full" style={{
                      height: `${16 + Math.random() * 40}px`,
                      animation: `waveform ${0.3 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.05}s`,
                    }} />
                  ))}
                </div>
              )}

              <div className="flex justify-center gap-4">
                {callState === "live" ? (
                  <button onClick={endCall} className="group w-16 h-16 rounded-full bg-bone text-obsidian flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_32px_rgba(243,238,227,0.2)]">
                    <Phone className="w-6 h-6 rotate-[135deg]" />
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <button onClick={reset} className="bg-bone text-obsidian px-6 py-3 rounded-full text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all">
                      Try another restaurant
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prompt chips below */}
      {step === "ready" && callState === "idle" && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {["Place a test order", "Ask about hours", "Ask what's on the menu", "Order in Spanish"].map((p) => (
            <div key={p} className="bg-coal/40 border border-bone/[0.06] rounded-full px-4 py-2 text-bone/30 text-xs hover:text-bone/50 hover:border-bone/[0.12] transition-colors cursor-default">
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useGlobalReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const navLinks = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Demo", href: "#demo" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <div className="min-h-screen bg-obsidian">
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes growWidth { from { width: 0; } to { width: 40%; } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes pulseScale { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.08); opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes glowPulse { 0%,100% { opacity: 0.03; } 50% { opacity: 0.08; } }
        @keyframes borderGlow { 0%,100% { border-color: rgba(243,238,227,0.06); } 50% { border-color: rgba(243,238,227,0.14); } }
        @keyframes waveform { 0% { height: 8px; } 100% { height: 48px; } }

        .anim-nav { animation: slideDown 0.5s ease-out both; }
        .anim-h1 { animation: fadeInUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .anim-h2 { animation: fadeInUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
        .anim-h3 { animation: fadeInUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        .anim-h4 { animation: fadeInUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.55s both; }
        .anim-h5 { animation: fadeInUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.7s both; }
        .anim-phone { animation: slideRight 1s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        .anim-ribbon { animation: growWidth 1.2s cubic-bezier(0.22,1,0.36,1) 1.4s both; }
        .anim-msg { animation: fadeInUp 0.35s ease-out both; }
        .marquee-track { animation: marquee 45s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        .shimmer-btn { background: linear-gradient(90deg, transparent 0%, rgba(243,238,227,0.1) 50%, transparent 100%); background-size: 200% 100%; animation: shimmer 3s linear infinite; }
        .glow-pulse { animation: glowPulse 5s ease-in-out infinite; }
        .border-glow { animation: borderGlow 4s ease-in-out infinite; }
      `}</style>

      {/* ═══ NAV ═══ */}
      <nav className={`anim-nav fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-obsidian/90 backdrop-blur-2xl border-b border-bone/[0.06]" : "bg-bone/80 backdrop-blur-2xl border-b border-obsidian/[0.06]"
      }`}>
        <div className={`max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-500 ${scrolled ? "h-14" : "h-20"}`}>
          <Link href="/" className="flex items-center group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ringo-logo.png" alt="Ringo" className={`h-8 w-auto transition-all duration-300 group-hover:scale-105 ${scrolled ? "brightness-0 invert" : "brightness-0"}`} />
          </Link>
          <div className={`hidden lg:flex items-center gap-0.5 rounded-full px-1.5 py-1.5 border transition-colors ${
            scrolled ? "bg-bone/[0.03] border-bone/[0.06]" : "bg-obsidian/[0.04] border-obsidian/[0.08]"
          }`}>
            {navLinks.map((l) => (
              <Link key={l.label} href={l.href} className={`px-4 py-1.5 rounded-full text-[13px] font-medium tracking-tight transition-colors duration-200 ${
                scrolled ? "text-bone/50 hover:text-bone hover:bg-bone/[0.06]" : "text-obsidian/50 hover:text-obsidian hover:bg-obsidian/[0.06]"
              }`}>{l.label}</Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className={`transition-colors text-[13px] font-medium px-4 py-2 ${
              scrolled ? "text-bone/50 hover:text-bone" : "text-obsidian/50 hover:text-obsidian"
            }`}>Log in</Link>
            <a href="#demo" className={`group relative inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
              scrolled ? "bg-bone text-obsidian hover:shadow-[0_0_0_4px_rgba(243,238,227,0.15)]" : "bg-obsidian text-bone hover:shadow-[0_0_0_4px_rgba(10,10,10,0.15)]"
            }`}>
              Try live demo <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
          <button className={`md:hidden ${scrolled ? "text-bone/60" : "text-obsidian/60"}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className={`md:hidden backdrop-blur-2xl border-t ${scrolled ? "bg-obsidian/95 border-bone/[0.06]" : "bg-bone/95 border-obsidian/[0.06]"}`}>
            <div className="px-5 py-4 space-y-1">
              {navLinks.map((l) => (
                <Link key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)} className={`block py-2.5 text-sm font-medium ${scrolled ? "text-bone/60 hover:text-bone" : "text-obsidian/60 hover:text-obsidian"}`}>{l.label}</Link>
              ))}
              <hr className={`my-2 ${scrolled ? "border-bone/[0.06]" : "border-obsidian/[0.06]"}`} />
              <Link href="/login" className={`block py-2.5 text-sm font-medium ${scrolled ? "text-bone/60 hover:text-bone" : "text-obsidian/60 hover:text-obsidian"}`}>Log in</Link>
              <a href="#demo" className={`block text-center py-2.5 rounded-full text-sm font-bold mt-2 ${scrolled ? "bg-bone text-obsidian" : "bg-obsidian text-bone"}`}>Try live demo</a>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ HERO — BONE BACKGROUND (Inverted) ═══ */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-32 lg:pt-28">
        {/* BONE background with grain */}
        <div className="absolute inset-0 bg-bone z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_50%_at_50%_0%,rgba(10,10,10,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_80%_20%,rgba(10,10,10,0.04),transparent)]" />
        <GrainOverlay opacity={0.05} />

        {/* Decorative floating shapes */}
        <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full border border-obsidian/[0.04] animate-[pulseScale_12s_ease-in-out_infinite] pointer-events-none" />
        <div className="absolute bottom-10 right-[5%] w-48 h-48 rounded-full border border-obsidian/[0.03] animate-[pulseScale_10s_ease-in-out_infinite_2s] pointer-events-none" />
        <svg className="absolute top-32 right-[15%] w-32 h-32 text-obsidian/[0.04] pointer-events-none" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 6" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </svg>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-[1fr,380px] gap-12 lg:gap-16 items-center">
            {/* Left — Text on bone */}
            <div className="order-2 lg:order-1 max-w-2xl">
              <div className="anim-h1 inline-flex items-center gap-2.5 bg-obsidian/[0.06] border border-obsidian/[0.12] rounded-full px-4 py-2 mb-8">
                <span className="w-2 h-2 rounded-full bg-obsidian animate-pulse" />
                <span className="text-[11px] text-obsidian/60 font-medium uppercase tracking-[0.1em]">AI phone + text agent</span>
              </div>

              <h1 className="anim-h2">
                <span className="block hero-display text-obsidian text-[2.75rem] sm:text-[3.5rem] lg:text-[4.5rem]">
                  Every missed call is
                </span>
                <span className="relative inline-block mt-2">
                  <span className="money-number text-obsidian text-[5rem] sm:text-[7rem] lg:text-[9rem] block">
                    <Counter prefix="$" target={31050} immediate />
                  </span>
                  <span className="text-obsidian/30 font-sans text-base sm:text-lg font-normal align-top">/month leaked</span>
                  {/* Ribbon sweep — decorative echo of the Ringo logo underline */}
                  <RibbonSweep className="absolute -bottom-3 left-0 w-[80%] h-8 text-obsidian" opacity={0.22} strokeWidth={1.2} />
                </span>
              </h1>

              <p className="anim-h3 text-obsidian/70 text-base sm:text-lg mt-8 max-w-xl leading-relaxed font-medium">
                Ringo answers every call and text, takes orders, upsells, and collects payment before your kitchen starts prep — 24/7, in English and Spanish.
              </p>

              <div className="anim-h4 mt-10 max-w-xl">
                {/* Inverted search box on bone */}
                <div className="relative group">
                  <div className="relative flex items-center bg-white/60 backdrop-blur-xl border border-obsidian/[0.1] rounded-2xl overflow-hidden focus-within:border-obsidian/[0.3] transition-all duration-500 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)]">
                    <Search className="absolute left-5 w-5 h-5 text-obsidian/30 pointer-events-none" />
                    <input
                      className="w-full bg-transparent text-obsidian placeholder:text-obsidian/25 pl-14 pr-5 py-5 text-lg outline-none font-sans"
                      placeholder="Search for your restaurant..."
                      disabled
                    />
                    <div className="absolute right-5 bg-obsidian text-bone text-xs font-bold px-3 py-1.5 rounded-lg">
                      Try it
                    </div>
                  </div>
                </div>
              </div>

              <div className="anim-h5 flex flex-wrap items-center gap-x-5 gap-y-2 mt-8 text-obsidian/40 text-[11px] font-medium">
                <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> Voice orders</span>
                <span className="flex items-center gap-1.5"><MessageCircle className="w-3 h-3" /> Text orders</span>
                <span className="flex items-center gap-1.5"><Mic className="w-3 h-3" /> EN + ES</span>
              </div>
            </div>

            {/* Right — Phone mockup on bone */}
            <div className="order-1 lg:order-2 anim-phone flex justify-center lg:justify-end">
              <div className="relative" style={{ width: 280 }}>
                {/* Subtle glow ring */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-obsidian/[0.08] animate-[pulseScale_6s_ease-in-out_infinite] pointer-events-none" />

                <div className="relative rounded-[2.8rem] bg-obsidian p-2 border border-obsidian/[0.15] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.1)]">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-obsidian rounded-b-2xl z-20 flex items-center justify-center">
                    <div className="w-12 h-3 bg-coal rounded-full" />
                  </div>

                  <div className="rounded-[2.4rem] overflow-hidden bg-coal" style={{ minHeight: 460 }}>
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-6 pt-9 pb-2">
                      <span className="text-[10px] text-bone/40 font-semibold">9:41</span>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4].map(i => <div key={i} className="w-[2.5px] rounded-full bg-bone/40" style={{ height: 3 + i * 1.5 }} />)}
                      </div>
                    </div>

                    {/* Messages — simpler version */}
                    <div className="px-3.5 py-3 space-y-2 overflow-hidden" style={{ maxHeight: 380 }}>
                      <div className="flex justify-start">
                        <div className="max-w-[80%] px-3.5 py-2 text-[12px] leading-relaxed bg-bone/[0.08] text-bone/80 rounded-2xl rounded-bl-sm">
                          Hi, how can I help?
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="max-w-[80%] px-3.5 py-2 text-[12px] leading-relaxed bg-bone text-obsidian rounded-2xl rounded-br-sm font-medium shadow-[0_2px_8px_rgba(243,238,227,0.1)]">
                          Large pepperoni
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="max-w-[80%] px-3.5 py-2 text-[12px] leading-relaxed bg-bone/[0.08] text-bone/80 rounded-2xl rounded-bl-sm">
                          +$3.99 garlic knots?
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="max-w-[80%] px-3.5 py-2 text-[12px] leading-relaxed bg-bone text-obsidian rounded-2xl rounded-br-sm font-medium shadow-[0_2px_8px_rgba(243,238,227,0.1)]">
                          Yes
                        </div>
                      </div>
                      <div className="flex justify-center w-full">
                        <div className="bg-bone/[0.06] border border-bone/[0.1] rounded-xl px-3 py-1.5 text-[10px] text-bone/50 text-center font-medium">
                          💳 Payment link sent
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient transition from bone hero to dark */}
      <div className="relative h-32 bg-gradient-to-b from-bone via-bone/50 to-obsidian" />

      {/* ═══ SECTION 2 — IPAD LIVE CALL ═══ */}
      <IPadLiveCallSection />

      {/* ═══ SOCIAL PROOF STRIP ═══ */}
      <section className="relative border-y border-bone/[0.04] py-10 md:py-12 bg-obsidian">
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: "10K+", label: "Calls handled monthly" },
              { value: "99.2%", label: "Answer rate" },
              { value: "$31K", label: "Avg. recovered / location" },
              { value: "<5 min", label: "Support response time" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display italic text-bone text-3xl md:text-4xl tracking-tight">{s.value}</p>
                <p className="text-bone/25 text-[11px] mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="relative py-24 md:py-32">
        <GrainOverlay opacity={0.02} />
        {/* Decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-bone/[0.02] blur-[150px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-bone/40 text-[11px] font-medium uppercase tracking-[0.12em] mb-3">How Ringo works</p>
              <h2 className="font-display text-bone text-4xl md:text-5xl tracking-tight">
                From ring to receipt in 90 seconds
              </h2>
              <p className="text-stone text-base mt-3">Phone or text — same flawless flow.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px mt-16 bg-bone/[0.04] rounded-2xl overflow-hidden">
            {[
              { step: "01", icon: <Phone className="w-6 h-6" />, title: "AI Answers", desc: "Picks up in 2 rings. Or responds to a text in seconds. No hold, no voicemail.", color: "from-bone/[0.03]" },
              { step: "02", icon: <MessageSquare className="w-6 h-6" />, title: "Takes the Order", desc: "Full menu mastery. Mods, allergies, combos. Smart upsells on every interaction.", color: "from-bone/[0.02]" },
              { step: "03", icon: <CreditCard className="w-6 h-6" />, title: "Collects Payment", desc: "One-tap SMS payment link. Customer pays before kitchen starts. Zero waste.", color: "from-bone/[0.04]", highlight: true },
              { step: "04", icon: <Utensils className="w-6 h-6" />, title: "Kitchen Fires", desc: "Payment confirmed. Ticket prints. Food is made only when it's paid for.", color: "from-bone/[0.02]" },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className={`relative bg-coal p-8 md:p-10 h-full group transition-all duration-500 ${
                  s.highlight ? "bg-gradient-to-b from-bone/[0.06] to-coal" : ""
                }`}>
                  {/* Step number — large watermark */}
                  <span className="absolute top-4 right-6 font-display text-[80px] leading-none text-bone/[0.03] font-bold select-none">{s.step}</span>

                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
                    s.highlight ? "bg-bone text-obsidian" : "bg-bone/[0.06] text-bone/50 group-hover:bg-bone/[0.1] group-hover:text-bone/70"
                  }`}>
                    {s.icon}
                  </div>

                  <h3 className="text-bone font-semibold text-lg mb-3">{s.title}</h3>
                  <p className="text-stone text-sm leading-relaxed">{s.desc}</p>

                  {s.highlight && (
                    <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-obsidian bg-bone rounded-full px-3 py-1 font-bold">
                      <ShieldCheck className="w-3 h-3" /> Pay-before-prep
                    </div>
                  )}

                  {/* Connector arrow on desktop */}
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 z-10">
                      <ArrowRight className="w-5 h-5 text-bone/10" />
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ INTEGRATIONS — Aesop-style calm stack row + supporting marquee ═══ */}
      <section id="integrations" className="relative py-24 md:py-32 overflow-hidden bg-obsidian">
        <GrainOverlay opacity={0.02} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_50%,rgba(243,238,227,0.02),transparent)] pointer-events-none" />

        {/* CORE STACK — calm, static, Aesop rhythm */}
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center">
              <p className="eyebrow text-bone/45 mb-8">Works with your existing stack</p>
              {/* Hairline divider above */}
              <div className="h-px w-full bg-bone/[0.08]" />
              <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8 md:gap-x-20 py-10 md:py-12 text-bone/55">
                {coreStack.map(({ name, Logo }) => (
                  <Logo key={name} className="h-6 w-auto opacity-80 hover:opacity-100 transition-opacity duration-300" />
                ))}
              </div>
              {/* Hairline divider below */}
              <div className="h-px w-full bg-bone/[0.08]" />
            </div>
          </Reveal>
        </div>

        {/* SECTION HEADLINE */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 mt-20 mb-12">
          <Reveal>
            <div className="text-center">
              <h2 className="font-display text-bone text-4xl md:text-5xl tracking-tight">
                Plus every tool your phones already touch
              </h2>
              <p className="text-stone text-base mt-4 max-w-lg mx-auto">POS, delivery, CRM, payments, voice — all connected. No extra setup.</p>
            </div>
          </Reveal>
        </div>

        {/* Marquee Row 1 */}
        <div className="relative overflow-hidden mb-4">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-obsidian to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-obsidian to-transparent z-10" />
          <div className="marquee-track flex items-center gap-8 whitespace-nowrap" style={{ width: "fit-content" }}>
            {[...Array(4)].map((_, setIdx) =>
              integrationList.map((int, i) => (
                <div key={`a${setIdx}-${i}`} className="flex items-center bg-coal/60 border border-bone/[0.06] rounded-xl px-6 py-4 hover:border-bone/[0.14] hover:bg-coal duration-300 group" style={{ transitionProperty: "border-color,background-color,opacity" }}>
                  <div className="text-bone/30 group-hover:text-bone/65" style={{ transitionProperty: "color,opacity", transitionDuration: "300ms" }}>
                    <int.Logo className="h-6 w-auto" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Marquee Row 2 — reverse */}
        <div className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-obsidian to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-obsidian to-transparent z-10" />
          <div className="marquee-track flex items-center gap-8 whitespace-nowrap" style={{ width: "fit-content", animationDirection: "reverse", animationDuration: "55s" }}>
            {[...Array(4)].map((_, setIdx) =>
              [...integrationList].reverse().map((int, i) => (
                <div key={`b${setIdx}-${i}`} className="flex items-center bg-coal/60 border border-bone/[0.06] rounded-xl px-6 py-4 hover:border-bone/[0.14] hover:bg-coal duration-300 group" style={{ transitionProperty: "border-color,background-color,opacity" }}>
                  <div className="text-bone/30 group-hover:text-bone/65" style={{ transitionProperty: "color,opacity", transitionDuration: "300ms" }}>
                    <int.Logo className="h-6 w-auto" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES — Editorial layout, not just cards ═══ */}
      <section id="features" className="relative py-24 md:py-32">
        <GrainOverlay opacity={0.02} />
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-bone/40 text-[11px] font-medium uppercase tracking-[0.12em] mb-3">Why Ringo</p>
            <h2 className="font-display text-bone text-4xl md:text-5xl tracking-tight max-w-xl">
              Everything your phone staff can&apos;t do. On every call.
            </h2>
          </Reveal>

          {/* Feature 1 — Hero feature: Pay Before Prep (big) */}
          <Reveal delay={100}>
            <div className="mt-16 grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-bone/[0.08] border-glow">
              <div className="bg-bone text-obsidian p-10 md:p-14 flex flex-col justify-center">
                <div className="w-14 h-14 rounded-2xl bg-obsidian text-bone flex items-center justify-center mb-6">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="font-display text-obsidian text-3xl md:text-4xl tracking-tight mb-4">
                  Pay Before Prep
                </h3>
                <p className="text-obsidian/60 text-base leading-relaxed mb-6">
                  No other platform gates the kitchen on payment. Ringo sends an SMS payment link after every order.
                  The ticket only fires after payment clears. Zero wasted food. Zero no-shows.
                </p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="money-number text-obsidian text-[4.5rem] md:text-[6rem] leading-[0.9]">$4,200</span>
                  <span className="text-obsidian/50 text-sm">saved per month</span>
                </div>
              </div>
              <div className="bg-coal p-10 md:p-14 flex flex-col justify-center border-l border-bone/[0.06]">
                {/* Visual: order flow diagram */}
                <div className="space-y-4">
                  {[
                    { icon: <Phone className="w-4 h-4" />, label: "Customer calls", status: "done" },
                    { icon: <MessageSquare className="w-4 h-4" />, label: "Order confirmed + readback", status: "done" },
                    { icon: <CreditCard className="w-4 h-4" />, label: "SMS payment link sent", status: "done" },
                    { icon: <ShieldCheck className="w-4 h-4" />, label: "Payment received", status: "active" },
                    { icon: <Utensils className="w-4 h-4" />, label: "Kitchen ticket fires", status: "pending" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        step.status === "done" ? "bg-bone/[0.1] text-bone/60" :
                        step.status === "active" ? "bg-bone text-obsidian animate-pulse-bone" :
                        "bg-bone/[0.04] text-bone/20"
                      }`}>{step.icon}</div>
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${
                          step.status === "done" ? "text-bone/50" :
                          step.status === "active" ? "text-bone font-bold" :
                          "text-bone/20"
                        }`}>{step.label}</span>
                      </div>
                      {step.status === "done" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-bone/30"><path d="M20 6 9 17l-5-5" /></svg>
                      )}
                      {step.status === "active" && (
                        <span className="text-[10px] text-bone font-bold bg-bone/[0.15] px-2 py-0.5 rounded-full">NOW</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Features 2-6 grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {[
              { icon: <Clock className="w-5 h-5" />, title: "24/7/365 Coverage", desc: "Answers in two rings. Holidays. Dinner rush. 3 a.m. Never a voicemail.", stat: "99.2%", statLabel: "answer rate" },
              { icon: <TrendingUp className="w-5 h-5" />, title: "Upsell Engine", desc: "+$3.40 average lift per call. Suggests combos, add-ons, drinks. Every single time.", stat: "+$3.40", statLabel: "per call lift" },
              { icon: <MessageCircle className="w-5 h-5" />, title: "Text Ordering", desc: "Customers can text their order. Same AI, same upsells, same pay-before-prep flow. Coming soon.", stat: "NEW", statLabel: "channel" },
              { icon: <ShieldCheck className="w-5 h-5" />, title: "Full Order Readback", desc: "99.4% accuracy. Every item confirmed back before the ticket prints. Fewer remakes.", stat: "99.4%", statLabel: "accuracy" },
              { icon: <Users className="w-5 h-5" />, title: "Customer Database", desc: "Every caller becomes a CRM contact with name, number, order history, and lifetime value.", stat: "+1.2K", statLabel: "contacts / mo" },
              { icon: <Headphones className="w-5 h-5" />, title: "Managed Service", desc: "Something broke? Call us directly. Not a support ticket. Not a chatbot. A real person.", stat: "<5 min", statLabel: "response" },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="bg-coal rounded-2xl border border-bone/[0.06] p-7 h-full hover:border-bone/[0.14] transition-all duration-300 group">
                  <div className="w-11 h-11 rounded-xl bg-bone/[0.06] flex items-center justify-center text-bone/50 mb-5 group-hover:bg-bone/[0.1] group-hover:text-bone/70 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="text-bone font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-stone text-sm leading-relaxed mb-5">{f.desc}</p>
                  <div className="border-t border-bone/[0.06] pt-4 flex items-baseline gap-2">
                    <span className="font-display italic text-bone text-2xl">{f.stat}</span>
                    <span className="text-bone/30 text-xs">{f.statLabel}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LIVE VOICE DEMO — Interactive Embedded Demo ═══ */}
      <section id="demo" className="relative py-28 md:py-40 overflow-hidden">
        {/* Gradient mesh background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-bone/[0.04] blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-bone/[0.03] blur-[140px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-bone/[0.02] blur-[180px]" />
        </div>
        <GrainOverlay opacity={0.02} />

        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 bg-bone/[0.04] border border-bone/[0.08] rounded-full px-4 py-2 mb-6">
                <Mic className="w-4 h-4 text-bone/50" />
                <span className="text-[11px] text-bone/60 font-medium uppercase tracking-[0.1em]">Live interactive demo</span>
              </div>
              <h2 className="font-display text-bone text-5xl md:text-6xl tracking-tight leading-[1.05] mb-4">
                Hear Ringo <em className="italic text-bone/60">handle your calls.</em>
              </h2>
              <p className="text-stone text-lg max-w-xl mx-auto">
                Search for any restaurant. We build a live AI voice agent for it in seconds. Talk to it right here.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <EmbeddedVoiceDemo />
          </Reveal>

          <Reveal delay={200}>
            <p className="text-center text-bone/20 text-sm mt-8">No signup. No credit card. 60 seconds to hear the magic.</p>
          </Reveal>
        </div>
      </section>

      {/* ═══ DASHBOARD WALKTHROUGH — Laptop-framed with callouts ═══ */}
      <section className="relative py-24 md:py-32">
        <GrainOverlay opacity={0.02} />
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-14">
              <p className="eyebrow text-bone/45 mb-3">Your command center</p>
              <h2 className="font-display text-bone text-4xl md:text-5xl tracking-tight">
                Real-time dashboard. Real money.
              </h2>
              <p className="text-stone text-base mt-3 max-w-lg mx-auto">
                Every call, text, order, and dollar — live. Numbers update as Ringo handles your phones.
              </p>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="relative">
              {/* Outer bone glow for depth */}
              <div className="absolute -inset-16 rounded-[3rem] bg-bone/[0.015] blur-[100px] pointer-events-none" />

              {/* LAPTOP MOCKUP — outer bezel with Coal shell, hairline Bone border, bone-tinted shadow */}
              <div className="relative mx-auto max-w-[1180px]">
                {/* Bezel (top rounded panel) */}
                <div
                  className="relative rounded-t-[22px] border border-bone/[0.14] bg-coal p-3 md:p-4"
                  style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.6), 0 40px 120px rgba(243,238,227,0.04), 0 0 0 1px rgba(243,238,227,0.03)" }}
                >
                  {/* Screen notch / camera dot */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-obsidian/90 rounded-full flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-bone/20" />
                  </div>
                  <div className="rounded-[14px] overflow-hidden border border-bone/[0.06]">
                    <LiveDashboard />
                  </div>
                </div>
                {/* Laptop base — thin hinge + keyboard strip */}
                <div className="relative mx-auto" style={{ width: "106%", marginLeft: "-3%" }}>
                  <div className="h-2 bg-graphite border-x border-bone/[0.08]" />
                  <div className="h-3 bg-coal border-x border-b border-bone/[0.1] rounded-b-[14px] flex items-center justify-center">
                    <div className="w-20 h-0.5 rounded-full bg-bone/[0.06]" />
                  </div>
                </div>

                {/* CALLOUTS — desktop only, absolute positioned with thin connector lines */}
                <div className="hidden lg:block pointer-events-none">
                  {/* Callout 1 — Revenue counter (top-center stat card) */}
                  <div className="absolute top-[140px] -right-2 translate-x-full max-w-[200px] pointer-events-auto">
                    <svg className="absolute top-6 -left-20 w-20 h-px text-bone/30" viewBox="0 0 80 1" preserveAspectRatio="none">
                      <line x1="0" y1="0.5" x2="80" y2="0.5" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-bone animate-pulse-bone" />
                      <p className="eyebrow text-bone/55">Revenue counter</p>
                    </div>
                    <p className="font-sans text-[14px] text-stone leading-[1.45]">Live revenue ticks up with every paid order. Never a guess.</p>
                  </div>

                  {/* Callout 2 — Live call activity (right side, mid) */}
                  <div className="absolute top-[340px] -right-2 translate-x-full max-w-[200px] pointer-events-auto">
                    <svg className="absolute top-6 -left-20 w-20 h-px text-bone/30" viewBox="0 0 80 1" preserveAspectRatio="none">
                      <line x1="0" y1="0.5" x2="80" y2="0.5" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-bone animate-pulse-bone" />
                      <p className="eyebrow text-bone/55">Live call feed</p>
                    </div>
                    <p className="font-sans text-[14px] text-stone leading-[1.45]">Every call, text, payment, upsell — streaming as it happens.</p>
                  </div>

                  {/* Callout 3 — Active orders / Recent Calls table (left side, lower) */}
                  <div className="absolute bottom-[130px] -left-2 -translate-x-full max-w-[200px] text-right pointer-events-auto">
                    <svg className="absolute top-6 -right-20 w-20 h-px text-bone/30" viewBox="0 0 80 1" preserveAspectRatio="none">
                      <line x1="0" y1="0.5" x2="80" y2="0.5" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    <div className="flex items-center justify-end gap-1.5 mb-1">
                      <p className="eyebrow text-bone/55">Active orders</p>
                      <span className="w-1.5 h-1.5 rounded-full bg-bone animate-pulse-bone" />
                    </div>
                    <p className="font-sans text-[14px] text-stone leading-[1.45]">Tickets, tickets, upsell lifts, and ROI per caller — all at a glance.</p>
                  </div>
                </div>
              </div>

              {/* Mobile callouts — stacked below for small screens */}
              <div className="lg:hidden mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                {[
                  { title: "Revenue counter", body: "Live revenue ticks up with every paid order. Never a guess." },
                  { title: "Live call feed", body: "Every call, text, payment, upsell — streaming as it happens." },
                  { title: "Active orders", body: "Tickets, upsell lifts, and ROI per caller — all at a glance." },
                ].map((c) => (
                  <div key={c.title} className="border-t border-bone/[0.08] pt-4">
                    <p className="eyebrow text-bone/55 mb-1.5">{c.title}</p>
                    <p className="font-sans text-[14px] text-stone leading-[1.45]">{c.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ MANAGED SERVICE — Playfair Display ═══ */}
      <section className="relative py-24 md:py-32">
        <GrainOverlay opacity={0.02} />
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-bone/40 text-[11px] font-medium uppercase tracking-[0.12em] mb-3">Not just software</p>
            <h2 className="font-display text-bone text-4xl md:text-5xl tracking-tight max-w-2xl">
              A managed service, not a support ticket.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-0 mt-12 rounded-2xl overflow-hidden border border-bone/[0.06]">
            <Reveal delay={100}>
              <div className="relative bg-coal p-10 md:p-14 h-full">
                <p className="text-bone/25 text-xs font-semibold uppercase tracking-[0.12em] mb-8">Other Companies</p>
                <p className="font-playfair italic text-bone/40 text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.15] tracking-tight">
                  Here&apos;s our software.
                </p>
                <p className="font-playfair italic text-bone/20 text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.15] tracking-tight mt-1">
                  Good luck.
                </p>
                <div className="mt-12 pt-8 border-t border-bone/[0.06]">
                  <p className="font-playfair italic text-bone/20 text-5xl md:text-6xl tracking-tight">~48 hours</p>
                  <p className="text-bone/15 text-xs uppercase tracking-[0.12em] mt-2">Avg. support response</p>
                </div>
                <div className="hidden md:flex absolute top-1/2 -right-5 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-smoke border border-bone/[0.1] items-center justify-center">
                  <span className="text-bone/60 text-[11px] font-bold uppercase">vs</span>
                </div>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="bg-bone p-10 md:p-14 h-full">
                <p className="text-obsidian/40 text-xs font-semibold uppercase tracking-[0.12em] mb-8">Ringo</p>
                <p className="font-playfair font-bold text-obsidian text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.15] tracking-tight">
                  Something broke?
                </p>
                <p className="font-playfair italic text-obsidian/70 text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.15] tracking-tight mt-1">
                  Call me. I&apos;ll fix it.
                </p>
                <div className="mt-12 pt-8 border-t border-obsidian/[0.08]">
                  <p className="font-playfair italic font-bold text-obsidian text-5xl md:text-6xl tracking-tight">Minutes</p>
                  <p className="text-obsidian/30 text-xs uppercase tracking-[0.12em] mt-2">Direct line to your team</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ ROI CALCULATOR ═══ */}
      <section className="relative py-24 md:py-32">
        <GrainOverlay opacity={0.02} />
        <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <ROICalculator />
          </Reveal>
        </div>
      </section>

      {/* ═══ COMPETITIVE EDGE ═══ */}
      <section className="relative py-24 md:py-32">
        <GrainOverlay opacity={0.02} />
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-bone/40 text-[11px] font-medium uppercase tracking-[0.12em] mb-4">Why restaurants choose Ringo</p>
            <h2 className="font-display text-bone text-4xl md:text-5xl tracking-tight max-w-2xl mb-16">
              The features your staff can&apos;t do. Every time.
            </h2>
          </Reveal>

          {/* Feature pairs — alternating layouts */}
          <div className="space-y-12">
            {/* Feature 1 */}
            <Reveal>
              <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-bone/[0.06]">
                <div className="bg-coal p-10 md:p-14 flex flex-col justify-center">
                  <div className="w-12 h-12 rounded-xl bg-bone/[0.08] flex items-center justify-center text-bone/60 mb-6">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-bone text-3xl tracking-tight mb-4">Pay Before Prep</h3>
                  <p className="text-stone text-base leading-relaxed">
                    Ringo sends an SMS payment link after order confirmation. Kitchen ticket only fires after payment clears. Zero wasted food. Zero no-shows. This one feature saves $4,000–6,000 per month.
                  </p>
                </div>
                <div className="bg-obsidian/30 border-l border-bone/[0.06] p-10 md:p-14 flex items-center justify-center">
                  <div className="text-center">
                    <p className="money-number text-bone text-[4.5rem] md:text-[7rem] leading-[0.9]">$5,200</p>
                    <p className="text-bone/50 text-sm mt-4">Average monthly waste prevented</p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Feature 2 */}
            <Reveal>
              <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-bone/[0.06]">
                <div className="bg-obsidian/30 border-r border-bone/[0.06] p-10 md:p-14 flex items-center justify-center order-2 md:order-1">
                  <div className="text-center">
                    <p className="money-number text-bone text-[4.5rem] md:text-[7rem] leading-[0.9]">+$3.40</p>
                    <p className="text-bone/50 text-sm mt-4">Per-call upsell lift</p>
                  </div>
                </div>
                <div className="bg-coal p-10 md:p-14 flex flex-col justify-center order-1 md:order-2">
                  <div className="w-12 h-12 rounded-xl bg-bone/[0.08] flex items-center justify-center text-bone/60 mb-6">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-bone text-3xl tracking-tight mb-4">Upsell Engine</h3>
                  <p className="text-stone text-base leading-relaxed">
                    Suggests combos, add-ons, and upgrades on every single call. No staff forget. No missed revenue. +$3.40 average. On 100 calls per day, that's $10,200/mo in pure extra revenue.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Feature 3 */}
            <Reveal>
              <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-bone/[0.06]">
                <div className="bg-coal p-10 md:p-14 flex flex-col justify-center">
                  <div className="w-12 h-12 rounded-xl bg-bone/[0.08] flex items-center justify-center text-bone/60 mb-6">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-bone text-3xl tracking-tight mb-4">Managed Service</h3>
                  <p className="text-stone text-base leading-relaxed">
                    Something breaks at 7pm Friday? You call us directly. Not a support ticket. Not a chatbot. A real person who understands your business. That accountability is worth a premium.
                  </p>
                </div>
                <div className="bg-obsidian/30 border-l border-bone/[0.06] p-10 md:p-14 flex items-center justify-center">
                  <div className="text-center">
                    <p className="money-number text-bone text-[4.5rem] md:text-[7rem] leading-[0.9]">&lt;5 min</p>
                    <p className="text-bone/50 text-sm mt-4">Direct response time</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
        <GrainOverlay opacity={0.02} />
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-bone/40 text-[11px] font-medium uppercase tracking-[0.12em] mb-3">Pricing</p>
              <h2 className="font-display text-bone text-4xl md:text-5xl tracking-tight">Simple pricing. Insane ROI.</h2>
              <p className="text-stone text-base mt-3">No contracts. No setup fees. Cancel anytime.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Reveal delay={0}>
              <div className="bg-coal rounded-2xl border border-bone/[0.06] p-8 h-full hover:border-bone/[0.14] transition-colors">
                <p className="text-bone/50 text-xs font-semibold uppercase tracking-[0.1em] mb-1">Starter</p>
                <p className="text-stone text-sm mb-5">Single-location independents</p>
                <p className="font-display text-bone text-6xl md:text-[4.5rem] tracking-tightest mb-1 leading-none">$799<span className="text-bone/25 text-lg font-sans tracking-normal">/mo</span></p>
                <p className="text-bone/25 text-xs mb-6">Pays for itself in ~35 calls</p>
                <Link href="/demo" className="block text-center bg-bone/[0.08] text-bone py-3.5 rounded-xl text-sm font-semibold hover:bg-bone/[0.14] transition-colors">Start with Starter</Link>
                <ul className="mt-6 space-y-3">
                  {["Up to 100 calls / day", "1 location", "1 POS integration", "Real-time dashboard", "Monthly ROI report", "Email support"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-stone text-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-bone/30 shrink-0 mt-0.5"><path d="M20 6 9 17l-5-5" /></svg>{f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="relative bg-bone text-obsidian rounded-2xl p-8 h-full shadow-[0_40px_100px_-20px_rgba(243,238,227,0.1)]">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-obsidian text-bone text-[11px] font-bold uppercase tracking-[0.1em] px-4 py-1.5 rounded-full">Most popular</span>
                <p className="text-obsidian/50 text-xs font-semibold uppercase tracking-[0.1em] mb-1">Growth</p>
                <p className="text-obsidian/60 text-sm mb-5">Multi-location operators</p>
                <p className="font-display text-obsidian text-6xl md:text-[4.5rem] tracking-tightest mb-2 leading-none">$1,499<span className="text-obsidian/30 text-lg font-sans tracking-normal">/mo</span></p>
                <p className="text-obsidian/35 text-xs mb-6">Pays for itself in ~30 hours</p>
                <Link href="/demo" className="block text-center bg-obsidian text-bone py-3.5 rounded-xl text-sm font-bold hover:bg-obsidian/90 transition-colors">Schedule a demo</Link>
                <ul className="mt-6 space-y-3">
                  {["Up to 250 calls / day", "Up to 3 locations", "All POS integrations", "Pay-before-prep SMS", "Text ordering (coming soon)", "GHL CRM sync", "Weekly reports", "Priority support (call the founder)"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-obsidian text-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-obsidian/40 shrink-0 mt-0.5"><path d="M20 6 9 17l-5-5" /></svg>{f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-5 border-t border-obsidian/10">
                  <p className="text-obsidian/50 text-xs italic">&ldquo;Paid for itself in 10 days. Kitchen is calmer, phone never goes unanswered.&rdquo;</p>
                  <p className="text-obsidian/30 text-xs mt-2">— Marco R., 3-location pizza operator, CA</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="bg-coal rounded-2xl border border-bone/[0.06] p-8 h-full hover:border-bone/[0.14] transition-colors">
                <p className="text-bone/50 text-xs font-semibold uppercase tracking-[0.1em] mb-1">Enterprise</p>
                <p className="text-stone text-sm mb-5">Franchise networks</p>
                <p className="font-display text-bone text-6xl md:text-[4.5rem] tracking-tightest mb-1 leading-none">Custom</p>
                <p className="text-bone/25 text-xs mb-6">Tailored to your network</p>
                <Link href="/demo" className="block text-center bg-bone/[0.08] text-bone py-3.5 rounded-xl text-sm font-semibold hover:bg-bone/[0.14] transition-colors">Talk to us</Link>
                <ul className="mt-6 space-y-3">
                  {["Unlimited calls", "10+ locations", "White-glove onboarding", "Dedicated account manager", "Custom integrations", "Franchise dashboard", "SLA guarantee"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-stone text-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-bone/30 shrink-0 mt-0.5"><path d="M20 6 9 17l-5-5" /></svg>{f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="relative py-24 md:py-32">
        <GrainOverlay opacity={0.02} />
        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-bone/40 text-[11px] font-medium uppercase tracking-[0.12em] mb-3">FAQ</p>
            <h2 className="font-display text-bone text-4xl md:text-5xl tracking-tight mb-10">Common questions</h2>
          </Reveal>
          {[
            { q: "How long does it take to get set up?", a: "48 hours or less. We handle everything — POS connection, menu import, agent configuration. You just forward your phone number to Ringo and you're live." },
            { q: "Will customers know they're talking to AI?", a: "Ringo sounds natural and conversational. Most callers don't realize it's AI. But we're transparent — if asked, Ringo identifies itself as an AI assistant." },
            { q: "What POS systems do you integrate with?", a: "Square, Toast, Clover, SpotOn, Aloha, and more. We're adding new integrations every month. If you don't see yours, ask us — we can likely build it." },
            { q: "How does text ordering work?", a: "Customers can text their order to your Ringo number. The same AI handles the conversation — takes the order, upsells, sends a payment link, and fires the kitchen ticket. Same pay-before-prep flow, just over text." },
            { q: "What happens if Ringo can't handle a call?", a: "Ringo gracefully transfers to your staff with full context of what was discussed. You're always in control." },
            { q: "How is Ringo different from other AI phone services?", a: "Two things: Pay Before Prep — your kitchen never makes food for an order that doesn't get paid for. And we're a managed service — when something breaks at 7pm Friday, you call us directly." },
          ].map((item, i) => (
            <Reveal key={i} delay={i * 50}>
              <FAQItem q={item.q} a={item.a} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ FINAL CTA — Dramatic close ═══ */}
      <section className="relative py-32 md:py-48 border-t border-bone/[0.04] overflow-hidden">
        {/* Gradient mesh */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-bone/[0.05] blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 rounded-full bg-bone/[0.04] blur-[140px]" />
        </div>
        <GrainOverlay opacity={0.03} />

        <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="relative inline-block font-display italic text-bone text-6xl md:text-8xl tracking-tight leading-[1.05] mb-8">
              Stop leaving money<br />on the phone.
              <RibbonSweep className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[60%] h-10 text-bone" opacity={0.4} strokeWidth={1.1} />
            </h2>
            <p className="text-stone text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto mb-12">
              Ringo is live in 48 hours. No setup fees. No contracts. Cancel anytime.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/demo" className="group relative inline-flex items-center gap-2 bg-bone text-obsidian px-10 py-5 rounded-full text-lg font-bold transition-all duration-300 hover:shadow-[0_0_0_8px_rgba(243,238,227,0.2),0_24px_72px_-12px_rgba(243,238,227,0.25)] hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                <span className="absolute inset-0 shimmer-btn rounded-full" />
                <span className="relative z-10 flex items-center gap-2">See the demo <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" /></span>
              </Link>
              <a href="mailto:hello@useringo.ai" className="group text-bone/60 hover:text-bone text-base font-medium transition-colors flex items-center gap-2">
                Or email us <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

            <p className="text-bone/20 text-sm mt-10">Built in Modesto, CA. Made for restaurant owners.</p>
          </Reveal>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-bone/[0.04] py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ringo-logo.png" alt="Ringo" className="h-6 w-auto brightness-0 invert mb-3" />
              <p className="text-bone/15 text-xs">AI voice + text ordering for restaurants.</p>
              <p className="text-bone/15 text-xs">Built in Modesto, CA.</p>
            </div>
            <div className="flex flex-wrap gap-x-12 gap-y-4">
              <div>
                <p className="text-bone/25 text-xs font-semibold uppercase tracking-[0.1em] mb-2.5">Product</p>
                <div className="space-y-2">
                  {[
                    { label: "How it works", href: "#how-it-works" },
                    { label: "Features", href: "#features" },
                    { label: "Integrations", href: "#integrations" },
                    { label: "Pricing", href: "#pricing" },
                    { label: "Live Demo", href: "#demo" },
                  ].map((l) => (
                    <Link key={l.label} href={l.href} className="block text-bone/30 text-sm hover:text-bone transition-colors">{l.label}</Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-bone/25 text-xs font-semibold uppercase tracking-[0.1em] mb-2.5">Legal</p>
                <div className="space-y-2">
                  <Link href="/terms" className="block text-bone/30 text-sm hover:text-bone transition-colors">Terms of Service</Link>
                  <Link href="/privacy" className="block text-bone/30 text-sm hover:text-bone transition-colors">Privacy Policy</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-bone/[0.04] flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-bone/10 text-xs">&copy; 2026 Ringo AI, Inc. All rights reserved.</p>
            <p className="text-bone/10 text-xs">hello@useringo.ai</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
