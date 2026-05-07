// ──────────────────────────────────────────────────────────────────────────────
// /admin/fleet/demo — fixture-driven fleet view, no auth, no DB.
//
// Shows what /admin/fleet looks like for an operator running 10 locations
// across 3 brands. Built for franchise / multi-location pitches.
//
// Lives OUTSIDE the (dashboard) route group on purpose. metadata.robots noindex.
// ──────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Phone, ShoppingCart, DollarSign, Shield, Building2, Activity,
  TestTube2, ArrowUpRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Fleet · Demo · OMRI',
  robots: { index: false, follow: false },
};

type Status = 'live' | 'onboarding' | 'offline';
const PAY_BEFORE_PREP_AVG_SAVE = 5;

// ─── FIXTURES — 10 locations, mixed brands, realistic spread ────────────────
const FIXTURES = [
  { id: 'lc1234', name: 'Little Caesars Modesto #1234',  brand: 'little_caesars', status: 'live' as Status,       calls: 47, orders: 32, mrr: 1499 },
  { id: 'lc5678', name: 'Little Caesars Turlock #5678',  brand: 'little_caesars', status: 'live' as Status,       calls: 38, orders: 27, mrr: 1499 },
  { id: 'lc9012', name: 'Little Caesars Stockton #9012', brand: 'little_caesars', status: 'live' as Status,       calls: 52, orders: 41, mrr: 1499 },
  { id: 'lc3456', name: 'Little Caesars Merced #3456',   brand: 'little_caesars', status: 'live' as Status,       calls: 29, orders: 18, mrr: 1499 },
  { id: 'dom200', name: 'Domino’s Manteca #200',           brand: 'dominos',        status: 'live' as Status,       calls: 41, orders: 28, mrr: 1499 },
  { id: 'ph415',  name: 'Pizza Hut Riverbank #415',      brand: 'pizza_hut',      status: 'live' as Status,       calls: 18, orders: 11, mrr: 799  },
  { id: 'ws812',  name: 'Wingstop Modesto #812',         brand: 'wingstop',       status: 'live' as Status,       calls: 33, orders: 22, mrr: 1499 },
  { id: 'sals',   name: 'Sal’s Brick Oven Pizzeria',       brand: 'independent',    status: 'live' as Status,       calls: 14, orders: 9,  mrr: 799  },
  { id: 'lapap',  name: 'La Papa Cuisine',               brand: 'independent',    status: 'onboarding' as Status, calls: 0,  orders: 0,  mrr: 0    },
  { id: 'mikes',  name: 'Mike’s Pizza Modesto',            brand: 'independent',    status: 'onboarding' as Status, calls: 0,  orders: 0,  mrr: 0    },
];

const fmt$ = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const STATUS_STYLES = {
  live:       { label: 'Live',         dot: 'bg-bone',       ring: 'ring-bone/30',  txt: 'text-bone'  },
  onboarding: { label: 'Onboarding',   dot: 'bg-stone',      ring: 'ring-stone/30', txt: 'text-stone' },
  offline:    { label: 'No calls 24h', dot: 'bg-stone/60',   ring: 'ring-stone/20', txt: 'text-stone' },
};

export default function FleetDemoPage() {
  const totals = FIXTURES.reduce(
    (acc, r) => ({
      calls: acc.calls + r.calls,
      orders: acc.orders + r.orders,
      mrr: acc.mrr + r.mrr,
      pbp: acc.pbp + r.orders * PAY_BEFORE_PREP_AVG_SAVE,
    }),
    { calls: 0, orders: 0, mrr: 0, pbp: 0 }
  );

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      {/* DEMO banner */}
      <div className="sticky top-0 z-50 bg-omri-amber/15 border-b border-omri-amber/30 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <TestTube2 className="h-4 w-4 text-omri-amber flex-shrink-0" />
            <p className="text-xs sm:text-sm font-semibold truncate">
              Demo fleet view &mdash; 10 fictional locations across 4 brands.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="flex items-center gap-1.5 text-xs font-semibold hover:text-omri-amber transition-colors flex-shrink-0"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Run yours
          </Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-stone mb-3">Admin &middot; Multi-location</p>
          <h1 className="font-serif italic font-normal text-5xl tracking-tight mb-2">Fleet.</h1>
          <p className="text-stone text-base">Every restaurant, every brand, today&rsquo;s numbers. Real fleet view refreshes every 60 seconds.</p>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Calls today',                 value: String(totals.calls),  icon: Phone },
            { label: 'Paid orders today',           value: String(totals.orders), icon: ShoppingCart },
            { label: 'MRR (this fleet)',            value: fmt$(totals.mrr),      icon: DollarSign },
            { label: 'Pay-before-prep saved today', value: fmt$(totals.pbp),      icon: Shield },
          ].map((t) => (
            <div key={t.label} className="bg-coal border border-hairline rounded-lg p-5">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-stone mb-2">
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </div>
              <div className="font-serif italic text-4xl tracking-tight">{t.value}</div>
            </div>
          ))}
        </div>

        {/* Per-row table */}
        <div className="bg-coal border border-hairline rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_110px_110px_110px_140px] gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-stone border-b border-hairline">
            <span>Store</span>
            <span>Brand</span>
            <span>Status</span>
            <span>Calls today</span>
            <span>Orders today</span>
            <span>MRR</span>
            <span>Pay-before-prep saved</span>
          </div>
          {FIXTURES.map((r) => {
            const s = STATUS_STYLES[r.status];
            return (
              <div
                key={r.id}
                className="grid grid-cols-[2fr_1fr_1fr_110px_110px_110px_140px] gap-4 px-5 py-4 text-sm border-b border-hairline last:border-b-0 hover:bg-graphite transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-stone flex-shrink-0" />
                    {r.name}
                  </div>
                </div>
                <div className="text-stone capitalize">{r.brand.replace(/_/g, ' ')}</div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 text-xs font-medium ${s.txt} ${s.ring}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>
                <div className="font-mono">{r.calls}</div>
                <div className="font-mono">{r.orders}</div>
                <div className="font-mono">{fmt$(r.mrr)}</div>
                <div className="font-mono">{fmt$(r.orders * PAY_BEFORE_PREP_AVG_SAVE)}</div>
              </div>
            );
          })}
        </div>

        {/* Footnote */}
        <p className="text-xs text-stone mt-4 italic">
          <Activity className="inline h-3 w-3 mr-1 align-text-top" />
          All locations and numbers fictional. Pay-before-prep saved estimated at ${PAY_BEFORE_PREP_AVG_SAVE}/paid-order.
        </p>

        {/* Footer nav */}
        <div className="mt-10 pt-8 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone">
          <div>
            Demo URLs:{' '}
            <Link href="/onboarding/demo" className="text-bone hover:text-omri-amber font-semibold">/onboarding/demo</Link>
            {' '}&middot;{' '}
            <Link href="/dashboard/demo" className="text-bone hover:text-omri-amber font-semibold">/dashboard/demo</Link>
          </div>
          <Link href="/onboarding" className="flex items-center gap-1.5 font-semibold hover:text-bone transition-colors">
            Set up your real fleet <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
