// ──────────────────────────────────────────────────────────────────────────────
// /admin/fleet — Multi-location fleet view (B4 of LC Readiness Sprint).
//
// Per-row: store name, brand, status (live/onboarding/offline), calls today,
// orders today, MRR, pay-before-prep saves today (paid orders today × $5
// estimated food-cost saved per no-show prevented).
//
// Sortable, filterable by brand. Admin-only via existing pattern.
//
// This is intentionally NOT the full Mission Control view — see
// project_mission_control_spec_2026_04_15. That stays parked until pilot #3.
// ──────────────────────────────────────────────────────────────────────────────

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Search, ChevronUp, ChevronDown, Phone, ShoppingCart, DollarSign,
  Shield, Building2, Activity,
} from 'lucide-react';

const PLAN_MRR: Record<string, number> = {
  starter: 799,
  growth: 1499,
  pro: 2299,
};

const PAY_BEFORE_PREP_AVG_SAVE = 5; // $ per paid order — placeholder; revisit with real
                                    // food-cost data after pilot #3.

type FleetStatus = 'live' | 'onboarding' | 'offline';

interface FleetRow {
  id: string;
  name: string;
  brand: string;
  status: FleetStatus;
  callsToday: number;
  ordersToday: number;
  mrr: number;
  payBeforePrepSavesToday: number;
  lastCallTime: string | null;
}

type SortKey = 'name' | 'brand' | 'callsToday' | 'ordersToday' | 'mrr' | 'pbpSaves';

function statusOf(r: {
  retell_agent_id: string | null;
  plan_tier: string | null;
  callsToday: number;
}): FleetStatus {
  if (!r.retell_agent_id) return 'onboarding';
  if (!r.plan_tier) return 'onboarding';
  if (r.callsToday === 0) return 'offline';
  return 'live';
}

function statusBadge(s: FleetStatus): JSX.Element {
  const map = {
    live:        { label: 'Live',        color: 'text-bone',  dot: 'bg-bone',          ring: 'ring-bone/30' },
    onboarding:  { label: 'Onboarding',  color: 'text-stone', dot: 'bg-stone',         ring: 'ring-stone/30' },
    offline:     { label: 'No calls 24h',color: 'text-stone', dot: 'bg-stone/60',      ring: 'ring-stone/20' },
  } as const;
  const c = map[s];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 text-xs font-medium', c.color, c.ring)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  );
}

function fmt$(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function FleetPage() {
  const [rows, setRows] = useState<FleetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('callsToday');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name, retell_agent_id, plan_tier, brand')
        .order('created_at', { ascending: false });

      if (!restaurants || cancelled) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      const out: FleetRow[] = [];
      for (const r of restaurants) {
        // Calls today
        const { count: callsToday } = await supabase
          .from('calls')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', r.id)
          .gte('created_at', todayIso);

        // Paid orders today
        const { count: ordersToday } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', r.id)
          .in('status', ['paid', 'preparing', 'ready', 'completed', 'awaiting_handoff'])
          .gte('created_at', todayIso);

        // Last call (for status calc + UI)
        const { data: lastCall } = await supabase
          .from('calls')
          .select('start_time')
          .eq('restaurant_id', r.id)
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        const ct = callsToday ?? 0;
        const ot = ordersToday ?? 0;
        const mrr = (r.plan_tier && PLAN_MRR[r.plan_tier]) || 0;
        const status = statusOf({
          retell_agent_id: r.retell_agent_id,
          plan_tier: r.plan_tier,
          callsToday: ct,
        });
        out.push({
          id: r.id,
          name: r.name,
          brand: (r as { brand?: string }).brand || 'independent',
          status,
          callsToday: ct,
          ordersToday: ot,
          mrr,
          payBeforePrepSavesToday: ot * PAY_BEFORE_PREP_AVG_SAVE,
          lastCallTime: lastCall?.start_time ?? null,
        });
      }

      if (!cancelled) {
        setRows(out);
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60_000); // refresh every 60s
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const brands = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.brand));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    let r = rows.filter((row) => {
      if (brandFilter !== 'all' && row.brand !== brandFilter) return false;
      if (!ql) return true;
      return (
        row.name.toLowerCase().includes(ql) ||
        row.brand.toLowerCase().includes(ql)
      );
    });
    r = [...r].sort((a, b) => {
      const av = a[sortKey === 'pbpSaves' ? 'payBeforePrepSavesToday' : sortKey];
      const bv = b[sortKey === 'pbpSaves' ? 'payBeforePrepSavesToday' : sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av) || 0;
      const bn = Number(bv) || 0;
      return sortDir === 'asc' ? an - bn : bn - an;
    });
    return r;
  }, [rows, q, brandFilter, sortKey, sortDir]);

  const totals = useMemo(() => ({
    callsToday: filtered.reduce((s, r) => s + r.callsToday, 0),
    ordersToday: filtered.reduce((s, r) => s + r.ordersToday, 0),
    mrr: filtered.reduce((s, r) => s + r.mrr, 0),
    pbp: filtered.reduce((s, r) => s + r.payBeforePrepSavesToday, 0),
  }), [filtered]);

  function sortToggle(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('desc'); }
  }

  function SortHeader({ k, children }: { k: SortKey; children: React.ReactNode }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => sortToggle(k)}
        className={cn(
          'inline-flex items-center gap-1 text-left transition-colors',
          active ? 'text-bone' : 'text-stone hover:text-bone'
        )}
      >
        {children}
        {active && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <div className="max-w-[1400px] mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ash mb-3">Admin · Multi-location</p>
          <h1 className="font-serif italic font-normal text-5xl tracking-tight mb-2">Fleet.</h1>
          <p className="text-stone text-base">Every restaurant, every brand, today's numbers. Refreshes every 60 seconds.</p>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Calls today',   value: totals.callsToday,   icon: Phone },
            { label: 'Paid orders today', value: totals.ordersToday, icon: ShoppingCart },
            { label: 'MRR',           value: fmt$(totals.mrr),    icon: DollarSign },
            { label: 'Pay-before-prep saved today', value: fmt$(totals.pbp), icon: Shield },
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

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by store name or brand…"
              className="w-full bg-coal border border-hairline rounded-lg pl-10 pr-4 py-2.5 text-sm text-bone placeholder:text-stone focus:outline-none focus:border-bone/30"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setBrandFilter('all')}
              className={cn(
                'px-3 py-2 rounded-full text-xs border transition-colors',
                brandFilter === 'all' ? 'bg-bone text-obsidian border-bone' : 'bg-coal text-stone border-hairline hover:border-bone/30 hover:text-bone'
              )}
            >
              All brands
            </button>
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => setBrandFilter(b)}
                className={cn(
                  'px-3 py-2 rounded-full text-xs border transition-colors capitalize',
                  brandFilter === b ? 'bg-bone text-obsidian border-bone' : 'bg-coal text-stone border-hairline hover:border-bone/30 hover:text-bone'
                )}
              >
                {b.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-coal border border-hairline rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_110px_110px_110px_140px] gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-stone border-b border-hairline">
            <SortHeader k="name">Store</SortHeader>
            <SortHeader k="brand">Brand</SortHeader>
            <span>Status</span>
            <SortHeader k="callsToday">Calls today</SortHeader>
            <SortHeader k="ordersToday">Orders today</SortHeader>
            <SortHeader k="mrr">MRR</SortHeader>
            <SortHeader k="pbpSaves">Pay-before-prep saved</SortHeader>
          </div>
          {loading ? (
            <div className="px-5 py-12 text-center text-stone text-sm">Loading fleet…</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-stone text-sm">
              {rows.length === 0 ? 'No restaurants yet.' : 'No matches for current filter.'}
            </div>
          ) : (
            filtered.map((r) => (
              <Link
                key={r.id}
                href={`/admin/restaurants/${r.id}`}
                className="grid grid-cols-[2fr_1fr_1fr_110px_110px_110px_140px] gap-4 px-5 py-4 text-sm border-b border-hairline last:border-b-0 hover:bg-graphite transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-bone truncate flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-stone flex-shrink-0" />
                    {r.name}
                  </div>
                </div>
                <div className="text-stone capitalize">{r.brand.replace(/_/g, ' ')}</div>
                <div>{statusBadge(r.status)}</div>
                <div className="font-mono text-bone">{r.callsToday}</div>
                <div className="font-mono text-bone">{r.ordersToday}</div>
                <div className="font-mono text-bone">{fmt$(r.mrr)}</div>
                <div className="font-mono text-bone">{fmt$(r.payBeforePrepSavesToday)}</div>
              </Link>
            ))
          )}
        </div>

        {/* Footnote */}
        <p className="text-xs text-stone mt-4 italic">
          <Activity className="inline h-3 w-3 mr-1 align-text-top" />
          Pay-before-prep saves estimated at ${PAY_BEFORE_PREP_AVG_SAVE}/paid-order food-cost-prevented (placeholder until first 30-day pilot data lands).
        </p>
      </div>
    </div>
  );
}
