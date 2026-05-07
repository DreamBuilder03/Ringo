// ──────────────────────────────────────────────────────────────────────────────
// /dashboard/demo — fixture-driven dashboard preview, no auth, no DB.
//
// Shows what a healthy LC franchise daily dashboard looks like. Use this:
//   - Walk a prospect through "here's what you'd see Monday morning"
//   - Pitch deck screenshots without burning a real auth user
//   - Smoke-test dashboard visual changes without seeded data
//
// Lives OUTSIDE the (dashboard) route group on purpose so the auth-gate
// layout doesn't redirect demo visitors to /login. metadata.robots noindex.
// ──────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Phone, ShoppingCart, DollarSign, Sparkles, TrendingUp, Activity,
  Target, ArrowUpRight, TestTube2, Shield, BarChart3,
  Headphones, Clock,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard · Demo · OMRI',
  robots: { index: false, follow: false },
};

// ─── FIXTURES — a healthy mid-volume LC franchisee on a Tuesday at 5pm PT ────
const DEMO = {
  restaurantName: "Little Caesars Modesto #1234",
  brand: 'Little Caesars',
  todayDate: 'Tuesday, May 6',
  callsToday: 47,
  ordersToday: 32,
  revenueToday: 892.40,
  upsellRevenueToday: 128.50,
  answerRate: 100,
  monthlyOrderRevenue: 24650,
  monthlyUpsellRevenue: 3210,
  monthlyCallsHandled: 1420,
  payBeforePrepSavedToday: 160,         // 32 paid orders × $5 avg waste-prevented
  payBeforePrepSavedMonth: 4280,
  recentCalls: [
    { id: '1', from: '+1 (209) 555-0142', name: 'Maria G.',  outcome: 'order_placed', total: 24.99, time: '4:52 PM', returning: true,  upsell: 4.99 },
    { id: '2', from: '+1 (209) 555-0117', name: 'James L.',  outcome: 'order_placed', total: 18.99, time: '4:48 PM', returning: false, upsell: 0 },
    { id: '3', from: '+1 (209) 555-0188', name: 'Carlos R.', outcome: 'order_placed', total: 41.50, time: '4:41 PM', returning: true,  upsell: 8.99 },
    { id: '4', from: '+1 (510) 555-0023', name: '—',          outcome: 'inquiry',      total: 0,      time: '4:36 PM', returning: false, upsell: 0 },
    { id: '5', from: '+1 (209) 555-0144', name: 'Aisha K.',  outcome: 'order_placed', total: 32.99, time: '4:30 PM', returning: true,  upsell: 4.99 },
    { id: '6', from: '+1 (209) 555-0166', name: 'Marco T.',  outcome: 'order_placed', total: 27.50, time: '4:24 PM', returning: false, upsell: 3.49 },
    { id: '7', from: '+1 (415) 555-0078', name: '—',          outcome: 'inquiry',      total: 0,      time: '4:18 PM', returning: false, upsell: 0 },
    { id: '8', from: '+1 (209) 555-0199', name: 'Priya S.',  outcome: 'order_placed', total: 15.99, time: '4:11 PM', returning: false, upsell: 0 },
  ],
};

const fmt$ = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function StatTile({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub: string; icon: React.ElementType; accent?: 'primary' | 'default';
}) {
  return (
    <div className={
      accent === 'primary'
        ? 'rounded-2xl p-1 bg-[rgba(243,238,227,0.12)] border border-[#F3EEE3]/20'
        : ''
    }>
      <div className="rounded-2xl bg-coal border border-smoke p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.16em] text-stone font-semibold">{label}</span>
          <Icon className="h-4 w-4 text-stone" />
        </div>
        <div className="text-3xl font-bold text-bone tracking-tight">{value}</div>
        <div className="text-xs text-stone mt-1">{sub}</div>
      </div>
    </div>
  );
}

export default function DashboardDemoPage() {
  return (
    <div className="min-h-screen bg-obsidian text-bone">
      {/* DEMO banner — sticky */}
      <div className="sticky top-0 z-50 bg-omri-amber/15 border-b border-omri-amber/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <TestTube2 className="h-4 w-4 text-omri-amber flex-shrink-0" />
            <p className="text-xs sm:text-sm font-semibold truncate">
              Demo dashboard &mdash; fictional data. <span className="text-bone/60 hidden sm:inline">A real OMRI dashboard would show your live numbers.</span>
            </p>
          </div>
          <Link
            href="/onboarding"
            className="flex items-center gap-1.5 text-xs font-semibold text-bone hover:text-omri-amber transition-colors flex-shrink-0"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Get yours
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Live status banner */}
        <div className="rounded-xl bg-[#F3EEE3]/10 border border-[#F3EEE3]/20 px-4 py-2.5 flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-[#F3EEE3] animate-pulse" />
          <span className="text-sm font-semibold">OMRI is live and handling your calls</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <div className="flex items-center gap-1.5 rounded-full bg-[#F3EEE3]/10 border border-[#F3EEE3]/20 px-2.5 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[#F3EEE3] animate-pulse" />
                <span className="text-[10px] font-bold text-[#F3EEE3]">LIVE</span>
              </div>
            </div>
            <p className="text-sm text-stone">{DEMO.restaurantName} &middot; {DEMO.todayDate}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-xl bg-coal/80 border border-smoke px-3 py-2">
              <Target className="h-3.5 w-3.5 text-[#F3EEE3]" />
              <span className="text-xs font-semibold">{DEMO.answerRate}%</span>
              <span className="text-[10px] text-stone">answer rate</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-coal/80 border border-smoke px-3 py-2">
              <Activity className="h-3.5 w-3.5 text-chalk" />
              <span className="text-xs font-semibold">{DEMO.ordersToday}/{DEMO.callsToday}</span>
              <span className="text-[10px] text-stone">converted</span>
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="sm:col-span-2 lg:col-span-2">
            <StatTile label="Revenue today" value={fmt$(DEMO.revenueToday)} sub="32 paid orders" icon={DollarSign} accent="primary" />
          </div>
          <StatTile label="Total calls" value={String(DEMO.callsToday)} sub="today, all answered" icon={Phone} />
          <StatTile label="Orders taken" value={String(DEMO.ordersToday)} sub={`${Math.round((DEMO.ordersToday / DEMO.callsToday) * 100)}% conversion`} icon={ShoppingCart} />
          <StatTile label="Upsell revenue" value={fmt$(DEMO.upsellRevenueToday)} sub="AI-generated" icon={Sparkles} />
          <StatTile label="Pay-before-prep saved" value={fmt$(DEMO.payBeforePrepSavedToday)} sub="food cost prevented today" icon={Shield} accent="primary" />
        </div>

        {/* ROI summary */}
        <div className="rounded-2xl bg-coal border border-smoke p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-bone" />
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-bone">ROI this month</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-stone mb-1">Order revenue</div>
              <div className="text-2xl font-bold text-bone">{fmt$(DEMO.monthlyOrderRevenue)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-stone mb-1">Upsell revenue</div>
              <div className="text-2xl font-bold text-bone">{fmt$(DEMO.monthlyUpsellRevenue)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-stone mb-1">Calls handled</div>
              <div className="text-2xl font-bold text-bone">{DEMO.monthlyCallsHandled.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-stone mb-1">Pay-before-prep saved</div>
              <div className="text-2xl font-bold text-bone">{fmt$(DEMO.payBeforePrepSavedMonth)}</div>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-smoke text-xs text-stone">
            <span className="text-bone font-semibold">Net impact this month:</span> {fmt$(DEMO.monthlyOrderRevenue + DEMO.monthlyUpsellRevenue + DEMO.payBeforePrepSavedMonth)} captured + saved &mdash; against $1,499 plan cost. <span className="text-omri-amber font-semibold">{Math.round((DEMO.monthlyOrderRevenue + DEMO.monthlyUpsellRevenue + DEMO.payBeforePrepSavedMonth) / 1499)}× ROI.</span>
          </div>
        </div>

        {/* Recent calls */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight">Recent calls</h2>
              <span className="text-xs font-semibold text-stone bg-coal/80 border border-smoke rounded-full px-2.5 py-0.5">
                {DEMO.recentCalls.length} of {DEMO.callsToday} today
              </span>
            </div>
            <a href="#" className="text-xs font-semibold text-bone hover:text-chalk flex items-center gap-1 group">
              View all <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>

          <div className="rounded-2xl bg-coal border border-smoke overflow-hidden">
            <div className="grid grid-cols-[100px_1fr_120px_100px_80px_70px] gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-stone border-b border-smoke font-semibold">
              <div>Time</div>
              <div>Caller</div>
              <div>Phone</div>
              <div>Outcome</div>
              <div className="text-right">Total</div>
              <div className="text-right">Upsell</div>
            </div>
            {DEMO.recentCalls.map((c) => (
              <div key={c.id} className="grid grid-cols-[100px_1fr_120px_100px_80px_70px] gap-4 px-5 py-3.5 text-sm border-b border-smoke last:border-b-0 hover:bg-graphite/40 transition-colors">
                <div className="text-stone font-mono text-xs">{c.time}</div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-bone truncate">{c.name}</span>
                  {c.returning && (
                    <span className="text-[9px] uppercase tracking-wider text-omri-amber bg-omri-amber/10 px-1.5 py-0.5 rounded">Returning</span>
                  )}
                </div>
                <div className="text-stone font-mono text-xs truncate">{c.from}</div>
                <div>
                  {c.outcome === 'order_placed' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-bone">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F3EEE3]" />
                      Order
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-stone">
                      <span className="h-1.5 w-1.5 rounded-full bg-stone" />
                      Inquiry
                    </span>
                  )}
                </div>
                <div className="text-right font-mono text-bone">
                  {c.total > 0 ? fmt$(c.total) : <span className="text-stone">—</span>}
                </div>
                <div className="text-right font-mono">
                  {c.upsell > 0 ? <span className="text-omri-amber">{fmt$(c.upsell)}</span> : <span className="text-stone">—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan / usage card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
          <div className="rounded-2xl bg-coal border border-smoke p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-bone" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-stone font-semibold">Plan</span>
            </div>
            <div className="text-xl font-bold mb-1">Growth</div>
            <div className="text-xs text-stone mb-4">$1,499/mo &middot; up to 250 calls/day</div>
            <div className="h-1.5 rounded-full bg-smoke/40 overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-bone to-chalk" style={{ width: `${(DEMO.callsToday / 250) * 100}%` }} />
            </div>
            <div className="text-[10px] text-stone">{DEMO.callsToday}/250 calls today &middot; {Math.round((DEMO.callsToday / 250) * 100)}% of daily cap</div>
          </div>

          <div className="rounded-2xl bg-coal border border-smoke p-5">
            <div className="flex items-center gap-2 mb-3">
              <Headphones className="h-4 w-4 text-bone" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-stone font-semibold">AI agent status</span>
            </div>
            <div className="text-xl font-bold mb-1">Hailey · Multilingual</div>
            <div className="text-xs text-stone mb-4">Latest version V23 &middot; bilingual (EN/ES)</div>
            <div className="text-[11px] text-stone leading-relaxed">Pay-before-prep gate active. SMS payment links sending. POS push to Caesar Vision Cloud via tablet handoff.</div>
          </div>

          <div className="rounded-2xl bg-coal border border-smoke p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-bone" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-stone font-semibold">Peak window</span>
            </div>
            <div className="text-xl font-bold mb-1">5:00 &mdash; 7:30 PM</div>
            <div className="text-xs text-stone mb-4">Tonight's predicted peak based on last 30 days</div>
            <div className="text-[11px] text-stone leading-relaxed">Expect ~38 calls in this window. OMRI will handle every one without staff touch.</div>
          </div>
        </div>

        {/* Reset / nav footer */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-hairline">
          <div className="text-xs text-stone">
            All numbers above are fictional. Visit{' '}
            <Link href="/onboarding" className="text-bone hover:text-omri-amber transition-colors font-semibold">/onboarding</Link>
            {' '}to set up a real one (or{' '}
            <Link href="/onboarding/demo" className="text-bone hover:text-omri-amber transition-colors font-semibold">/onboarding/demo</Link>
            {' '}for a no-data walkthrough).
          </div>
          <Link
            href="/admin/fleet/demo"
            className="flex items-center gap-1.5 text-xs font-semibold text-stone hover:text-bone transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            See the fleet demo &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
