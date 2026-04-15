'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Phone,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Target,
  Clock,
  ShoppingCart,
  Percent,
  Zap,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getUserRestaurant, getAnalytics } from '@/lib/queries';
import { useRestaurantStore } from '@/stores/restaurant-store';

type TimeRange = '7d' | '30d' | '90d';

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-[2px] h-16">
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all duration-300"
          style={{
            height: `${(val / max) * 100}%`,
            backgroundColor: color,
            opacity: 0.4 + (i / data.length) * 0.6,
            minHeight: val > 0 ? '2px' : '0px',
          }}
        />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const currentRestaurant = useRestaurantStore((s) => s.currentRestaurant);
  const setCurrentRestaurant = useRestaurantStore((s) => s.setCurrentRestaurant);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      let restaurant = currentRestaurant;
      if (!restaurant) {
        restaurant = await getUserRestaurant(supabase);
        if (restaurant) setCurrentRestaurant(restaurant);
      }
      if (!restaurant) {
        setLoading(false);
        return;
      }

      const analytics = await getAnalytics(supabase, restaurant.id, range);
      setData(analytics);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, currentRestaurant?.id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-ringo-muted mt-1">Loading...</p>
          </div>
        </div>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <div className="h-8 w-8 mx-auto border-2 border-ringo-teal/30 border-t-ringo-teal rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-ringo-muted/30 mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-2">No analytics yet</h2>
          <p className="text-sm text-ringo-muted">Analytics will appear once calls start coming in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-ringo-muted mt-1">Deep dive into your AI agent&apos;s performance</p>
        </div>
        <div className="flex items-center rounded-xl border border-ringo-border bg-ringo-card p-1 flex-wrap sm:flex-nowrap">
          {timeRanges.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setRange(tr.value)}
              className={cn(
                'px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex-1 sm:flex-none',
                range === tr.value
                  ? 'bg-ringo-teal text-bone shadow-sm'
                  : 'text-ringo-muted hover:text-foreground'
              )}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Calls', value: data.totalCalls.toLocaleString(), trend: data.callsTrend, icon: Phone },
          { label: 'Orders Placed', value: data.ordersPlaced.toLocaleString(), trend: data.ordersTrend, icon: ShoppingCart },
          { label: 'Revenue', value: formatCurrency(data.revenue), trend: data.revenueTrend, icon: DollarSign },
          { label: 'Upsell Revenue', value: formatCurrency(data.upsellRevenue), trend: data.upsellTrend, icon: Sparkles },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-ringo-border bg-ringo-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted">{stat.label}</p>
                <Icon className="h-4 w-4 text-ringo-muted" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={cn(
                  'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  stat.trend >= 0 ? 'bg-bone/10 text-bone' : 'bg-bone/10 text-bone'
                )}>
                  {stat.trend >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                  {Math.abs(stat.trend)}%
                </span>
                <span className="text-[10px] text-ringo-muted">vs prev period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {data.dailyCalls.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-ringo-border bg-ringo-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Daily Calls</h3>
                <p className="text-[10px] text-ringo-muted mt-0.5">Call volume over time</p>
              </div>
            </div>
            <MiniBarChart data={data.dailyCalls} color="#F3EEE3" />
          </div>
          <div className="rounded-2xl border border-ringo-border bg-ringo-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Daily Revenue</h3>
                <p className="text-[10px] text-ringo-muted mt-0.5">Revenue captured over time</p>
              </div>
            </div>
            <MiniBarChart data={data.dailyRevenue} color="#F3EEE3" />
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5 text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-bone/10 flex items-center justify-center mb-3">
            <Target className="h-5 w-5 text-bone" />
          </div>
          <p className="text-2xl font-bold text-foreground">{data.answerRate}%</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ringo-muted mt-1">Answer Rate</p>
        </div>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5 text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-ringo-teal/10 flex items-center justify-center mb-3">
            <Clock className="h-5 w-5 text-ringo-teal" />
          </div>
          <p className="text-2xl font-bold text-foreground">{Math.floor(data.avgCallDuration / 60)}:{String(data.avgCallDuration % 60).padStart(2, '0')}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ringo-muted mt-1">Avg Call Time</p>
        </div>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5 text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-ringo-amber/10 flex items-center justify-center mb-3">
            <Percent className="h-5 w-5 text-ringo-amber" />
          </div>
          <p className="text-2xl font-bold text-foreground">{data.conversionRate}%</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ringo-muted mt-1">Conversion Rate</p>
        </div>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5 text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-ringo-purple-light/10 flex items-center justify-center mb-3">
            <DollarSign className="h-5 w-5 text-ringo-purple-light" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(data.avgOrderValue)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ringo-muted mt-1">Avg Order Value</p>
        </div>
      </div>

      {/* Top Menu Items */}
      {data.topItems.length > 0 && (
        <div className="rounded-2xl border border-ringo-border bg-ringo-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-ringo-border">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-ringo-amber/10 p-2.5">
                <BarChart3 className="h-5 w-5 text-ringo-amber" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Top Menu Items</h3>
                <p className="text-[11px] text-ringo-muted">Most ordered items via phone</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-ringo-border/30">
            {data.topItems.map((item: any, i: number) => {
              const maxCount = data.topItems[0].count;
              return (
                <div key={item.name} className="flex items-center gap-4 px-6 py-4">
                  <span className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                    i === 0 ? 'bg-ringo-amber/15 text-ringo-amber' : 'bg-ringo-border/30 text-ringo-muted'
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-ringo-border/30 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-ringo-teal to-bone"
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">{item.count}x</p>
                    <p className="text-[10px] text-ringo-muted">{formatCurrency(item.revenue)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.totalCalls === 0 && (
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <Zap className="h-12 w-12 mx-auto text-ringo-muted/20 mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">No data for this period</h3>
          <p className="text-sm text-ringo-muted">Analytics will populate as calls come in.</p>
        </div>
      )}
    </div>
  );
}
