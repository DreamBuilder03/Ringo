'use client';

/**
 * /admin/health — Build 3 monitoring dashboard.
 *
 * One page Misael can glance at to answer "is everything okay right now?"
 * before morning coffee and before bed. Auth via the (dashboard) layout
 * (must be logged in). Pulls all data in one round-trip from
 * /api/admin/health/summary.
 *
 * Sections:
 *   1. Fleet strip — one card per active restaurant
 *   2. Active alerts — last 50 alerts_log rows
 *   3. Today's numbers — fleet-wide
 *   4. Recent 20 calls — table with per-call links
 *
 * Auto-refresh: every 60s (simple polling, no websockets).
 * Mobile-usable. Document title shows red-card count so it's visible in a
 * background tab.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Phone,
  ShoppingBag,
  DollarSign,
  Clock,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FleetCard {
  id: string;
  name: string;
  last_call_time: string | null;
  calls_today: number;
  orders_today: number;
  revenue_today: number;
  agent_version: string | null;
  health_status: 'green' | 'yellow' | 'red';
}

interface AlertRow {
  id: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
  failure_type: string;
  short_reason: string;
  retell_call_id: string | null;
  sent_via: string;
  created_at: string;
}

interface RecentCall {
  id: string;
  retell_call_id: string;
  restaurant_id: string;
  restaurant_name: string;
  start_time: string;
  duration_seconds: number | null;
  call_outcome: string;
  order_total: number;
}

interface SummaryResponse {
  fleet: FleetCard[];
  alerts: AlertRow[];
  totals: {
    calls_today: number;
    orders_today: number;
    gmv_today: number;
    avg_call_duration_sec: number;
    tool_failure_rate: number;
  };
  recent_calls: RecentCall[];
  generated_at: string;
}

const POLL_INTERVAL_MS = 60_000;

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtRelative(iso: string | null): string {
  if (!iso) return 'never';
  const ageMs = Date.now() - new Date(iso).getTime();
  const ageMin = Math.floor(ageMs / 60_000);
  if (ageMin < 1) return 'just now';
  if (ageMin < 60) return `${ageMin}m ago`;
  const ageHr = Math.floor(ageMin / 60);
  if (ageHr < 24) return `${ageHr}h ago`;
  const ageDay = Math.floor(ageHr / 24);
  return `${ageDay}d ago`;
}

function fmtDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const healthColor: Record<FleetCard['health_status'], string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

const healthLabel: Record<FleetCard['health_status'], string> = {
  green: 'Healthy',
  yellow: 'Slow',
  red: 'Silent',
};

const failureTypeLabel: Record<string, string> = {
  retell_call_error: 'Call error',
  premature_hangup: 'Premature hangup',
  tool_call_failure: 'Tool failed',
  payment_link_failure: 'Payment link',
  silent_line: 'Silent line',
  silent_line_summary: 'Silent (summary)',
  tool_failure_summary: 'Systemic',
};

export default function HealthPage() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const resp = await fetch('/api/admin/health/summary', { cache: 'no-store' });
      if (!resp.ok) {
        setError(`HTTP ${resp.status}`);
        return;
      }
      const json = (await resp.json()) as SummaryResponse;
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Update document title with red-card count so it's visible in a background tab
  useEffect(() => {
    const redCount = (data?.fleet || []).filter((f) => f.health_status === 'red').length;
    const newAlertCount = (data?.alerts || []).filter((a) => {
      const ageMin = (Date.now() - new Date(a.created_at).getTime()) / 60_000;
      return ageMin < 60 && (a.failure_type === 'tool_call_failure' || a.failure_type === 'payment_link_failure' || a.failure_type === 'retell_call_error');
    }).length;
    const total = redCount + newAlertCount;
    document.title = total > 0 ? `Ringo Ops (${total} 🔴)` : 'Ringo Ops';
    return () => {
      document.title = 'Ringo';
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Ops</h1>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <RefreshCw className="h-6 w-6 mx-auto animate-spin text-ringo-muted" />
          <p className="text-sm text-ringo-muted mt-3">Loading fleet…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Ops</h1>
        <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-6">
          <p className="text-sm font-bold text-red-400">Failed to load</p>
          <p className="text-xs text-ringo-muted mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-3 rounded-lg bg-bone/10 hover:bg-bone/20 px-3 py-1.5 text-xs font-bold text-bone transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const redCount = data.fleet.filter((f) => f.health_status === 'red').length;
  const yellowCount = data.fleet.filter((f) => f.health_status === 'yellow').length;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Ops</h1>
            {redCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {redCount} silent
              </span>
            )}
            {yellowCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                {yellowCount} slow
              </span>
            )}
          </div>
          <p className="text-sm text-ringo-muted">
            {lastRefresh && (
              <>
                Refreshed {fmtRelative(lastRefresh.toISOString())} · auto-refreshes every 60s
              </>
            )}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-ringo-border bg-ringo-card hover:border-bone/30 px-3 py-2 text-xs font-bold text-bone transition-colors"
          aria-label="Refresh now"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Today's numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Calls today"
          value={String(data.totals.calls_today)}
          icon={Phone}
        />
        <StatCard
          label="Orders today"
          value={String(data.totals.orders_today)}
          icon={ShoppingBag}
        />
        <StatCard
          label="GMV today"
          value={fmtCurrency(data.totals.gmv_today)}
          icon={DollarSign}
        />
        <StatCard
          label="Avg call"
          value={fmtDuration(data.totals.avg_call_duration_sec)}
          icon={Clock}
        />
        <StatCard
          label="Tool failure"
          value={`${(data.totals.tool_failure_rate * 100).toFixed(1)}%`}
          icon={AlertTriangle}
          accent={data.totals.tool_failure_rate > 0.05 ? 'red' : data.totals.tool_failure_rate > 0.01 ? 'yellow' : 'default'}
        />
      </div>

      {/* Fleet */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-ringo-muted mb-3">
          Fleet ({data.fleet.length})
        </h2>
        {data.fleet.length === 0 ? (
          <div className="rounded-2xl border border-ringo-border bg-ringo-card p-6 text-center text-sm text-ringo-muted">
            No active restaurants. Add a Retell agent ID to a restaurant to see it here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.fleet.map((r) => (
              <Link
                key={r.id}
                href={`/admin/restaurants/${r.id}`}
                className="group rounded-2xl border border-ringo-border bg-ringo-card p-4 hover:border-bone/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full flex-shrink-0',
                        healthColor[r.health_status],
                        r.health_status === 'green' && 'animate-pulse'
                      )}
                    />
                    <p className="text-sm font-bold text-foreground truncate">{r.name}</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-ringo-muted">
                    {healthLabel[r.health_status]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Cell label="Calls" value={String(r.calls_today)} />
                  <Cell label="Orders" value={String(r.orders_today)} />
                  <Cell label="GMV" value={fmtCurrency(r.revenue_today)} />
                </div>
                <p className="text-[10px] text-ringo-muted mt-3 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Last call {fmtRelative(r.last_call_time)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Active alerts */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-ringo-muted mb-3">
          Recent alerts ({data.alerts.length})
        </h2>
        {data.alerts.length === 0 ? (
          <div className="rounded-2xl border border-ringo-border bg-ringo-card p-6 text-center text-sm text-ringo-muted">
            No alerts. Quiet on the wire.
          </div>
        ) : (
          <div className="rounded-2xl border border-ringo-border bg-ringo-card overflow-hidden">
            <ul className="divide-y divide-ringo-border">
              {data.alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-bone/[0.02]">
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4 mt-0.5 flex-shrink-0',
                      a.failure_type === 'tool_call_failure' || a.failure_type === 'payment_link_failure'
                        ? 'text-red-400'
                        : 'text-amber-400'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground">
                        {failureTypeLabel[a.failure_type] || a.failure_type}
                      </span>
                      {a.restaurant_name && (
                        <span className="text-xs text-ringo-muted">@ {a.restaurant_name}</span>
                      )}
                      <span className="text-[10px] text-ringo-muted/60">{fmtRelative(a.created_at)}</span>
                    </div>
                    <p className="text-xs text-ringo-muted mt-0.5 line-clamp-2">{a.short_reason}</p>
                  </div>
                  {a.retell_call_id && (
                    <a
                      href={`https://dashboard.retellai.com/call-history?history=${a.retell_call_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-bone hover:text-bone/70"
                    >
                      Retell <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Recent calls */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-ringo-muted mb-3">
          Last 20 calls
        </h2>
        {data.recent_calls.length === 0 ? (
          <div className="rounded-2xl border border-ringo-border bg-ringo-card p-6 text-center text-sm text-ringo-muted">
            No calls yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-ringo-border bg-ringo-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-ringo-border bg-bone/[0.02]">
                    <th className="text-left font-semibold text-ringo-muted px-3 py-2">Restaurant</th>
                    <th className="text-left font-semibold text-ringo-muted px-3 py-2">Started</th>
                    <th className="text-right font-semibold text-ringo-muted px-3 py-2">Duration</th>
                    <th className="text-left font-semibold text-ringo-muted px-3 py-2">Outcome</th>
                    <th className="text-right font-semibold text-ringo-muted px-3 py-2">Order $</th>
                    <th className="text-right font-semibold text-ringo-muted px-3 py-2">Retell</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ringo-border">
                  {data.recent_calls.map((c) => (
                    <tr key={c.id} className="hover:bg-bone/[0.02]">
                      <td className="px-3 py-2 font-bold text-foreground truncate max-w-[160px]">
                        {c.restaurant_name}
                      </td>
                      <td className="px-3 py-2 text-ringo-muted">{fmtRelative(c.start_time)}</td>
                      <td className="px-3 py-2 text-right text-ringo-muted">
                        {fmtDuration(c.duration_seconds)}
                      </td>
                      <td className="px-3 py-2">
                        <OutcomeBadge outcome={c.call_outcome} />
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        {c.order_total > 0 ? fmtCurrency(c.order_total) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {c.retell_call_id ? (
                          <a
                            href={`https://dashboard.retellai.com/call-history?history=${c.retell_call_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-bone hover:text-bone/70 font-semibold"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-ringo-muted/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'default',
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  accent?: 'default' | 'red' | 'yellow';
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-ringo-card p-4',
        accent === 'red' && 'border-red-500/40 bg-red-500/5',
        accent === 'yellow' && 'border-amber-500/40 bg-amber-500/5',
        accent === 'default' && 'border-ringo-border'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted">{label}</p>
        <Icon className="h-3.5 w-3.5 text-ringo-muted" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-ringo-muted">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    order_placed: { label: 'Order', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    inquiry: { label: 'Inquiry', cls: 'bg-bone/10 text-bone border-bone/20' },
    upsell_only: { label: 'Upsell', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    missed: { label: 'Missed', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  };
  const c = config[outcome] || { label: outcome, cls: 'bg-bone/10 text-bone border-bone/20' };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border', c.cls)}>
      {c.label}
    </span>
  );
}
