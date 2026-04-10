'use client';

import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Phone,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles,
  Target,
  Clock,
  ShoppingCart,
  Percent,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

type TimeRange = '7d' | '30d' | '90d';

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

// Mock analytics data
const analytics = {
  '7d': {
    totalCalls: 156,
    callsTrend: 12,
    ordersPlaced: 98,
    ordersTrend: 8,
    revenue: 4280,
    revenueTrend: 15,
    upsellRevenue: 840,
    upsellTrend: 22,
    answerRate: 96,
    avgCallDuration: 142,
    conversionRate: 63,
    avgOrderValue: 43.67,
    topItems: [
      { name: 'Large Pepperoni Pizza', count: 42, revenue: 755.58 },
      { name: 'Family Combo Deal', count: 28, revenue: 1259.72 },
      { name: 'Buffalo Wings (Double)', count: 35, revenue: 489.65 },
      { name: 'Caesar Salad', count: 22, revenue: 197.78 },
      { name: 'Garlic Bread (Upsell)', count: 56, revenue: 223.44 },
    ],
    dailyCalls: [18, 22, 20, 25, 24, 28, 19],
    dailyRevenue: [520, 680, 590, 720, 650, 810, 310],
  },
  '30d': {
    totalCalls: 672,
    callsTrend: 18,
    ordersPlaced: 423,
    ordersTrend: 14,
    revenue: 18450,
    revenueTrend: 21,
    upsellRevenue: 3640,
    upsellTrend: 28,
    answerRate: 97,
    avgCallDuration: 138,
    avgOrderValue: 43.62,
    conversionRate: 63,
    topItems: [
      { name: 'Large Pepperoni Pizza', count: 186, revenue: 3330.14 },
      { name: 'Family Combo Deal', count: 124, revenue: 5579.76 },
      { name: 'Buffalo Wings (Double)', count: 152, revenue: 2126.98 },
      { name: 'Caesar Salad', count: 98, revenue: 881.02 },
      { name: 'Garlic Bread (Upsell)', count: 245, revenue: 977.55 },
    ],
    dailyCalls: [18, 22, 20, 25, 24, 28, 19, 21, 23, 26, 22, 27, 20, 24, 25, 28, 30, 22, 19, 21, 24, 26, 23, 27, 22, 20, 25, 28, 24, 22],
    dailyRevenue: [520, 680, 590, 720, 650, 810, 310, 600, 720, 780, 640, 800, 580, 700, 750, 850, 920, 640, 550, 610, 700, 780, 670, 810, 640, 580, 740, 850, 700, 640],
  },
  '90d': {
    totalCalls: 1890,
    callsTrend: 24,
    ordersPlaced: 1190,
    ordersTrend: 20,
    revenue: 51200,
    revenueTrend: 26,
    upsellRevenue: 10100,
    upsellTrend: 32,
    answerRate: 97,
    avgCallDuration: 135,
    avgOrderValue: 43.03,
    conversionRate: 63,
    topItems: [
      { name: 'Large Pepperoni Pizza', count: 524, revenue: 9380.76 },
      { name: 'Family Combo Deal', count: 348, revenue: 15651.52 },
      { name: 'Buffalo Wings (Double)', count: 428, revenue: 5991.72 },
      { name: 'Caesar Salad', count: 276, revenue: 2481.24 },
      { name: 'Garlic Bread (Upsell)', count: 690, revenue: 2752.10 },
    ],
    dailyCalls: [],
    dailyRevenue: [],
  },
};

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const barWidth = 100 / data.length;

  return (
    <div className="flex items-end gap-[2px] h-16">
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all duration-300"
          style={{
            height: `${(val / max) * 100}%`,
            backgroundColor: color,
            opacity: i === data.length - 1 ? 1 : 0.4 + (i / data.length) * 0.6,
          }}
        />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>('30d');
  const data = analytics[range];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-ringo-muted mt-1">Deep dive into your AI agent&apos;s performance</p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center rounded-xl border border-ringo-border bg-ringo-card p-1">
          {timeRanges.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setRange(tr.value)}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200',
                range === tr.value
                  ? 'bg-ringo-teal text-white shadow-sm'
                  : 'text-ringo-muted hover:text-foreground'
              )}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Calls',
            value: data.totalCalls.toLocaleString(),
            trend: data.callsTrend,
            icon: Phone,
            color: 'teal',
          },
          {
            label: 'Orders Placed',
            value: data.ordersPlaced.toLocaleString(),
            trend: data.ordersTrend,
            icon: ShoppingCart,
            color: 'emerald',
          },
          {
            label: 'Revenue',
            value: formatCurrency(data.revenue),
            trend: data.revenueTrend,
            icon: DollarSign,
            color: 'purple',
          },
          {
            label: 'Upsell Revenue',
            value: formatCurrency(data.upsellRevenue),
            trend: data.upsellTrend,
            icon: Sparkles,
            color: 'amber',
          },
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
                  stat.trend > 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'
                )}>
                  {stat.trend > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                  {Math.abs(stat.trend)}%
                </span>
                <span className="text-[10px] text-ringo-muted">vs prev period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      {data.dailyCalls.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calls chart */}
          <div className="rounded-2xl border border-ringo-border bg-ringo-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Daily Calls</h3>
                <p className="text-[10px] text-ringo-muted mt-0.5">Call volume over time</p>
              </div>
              <div className="flex items-center gap-1.5 bg-ringo-teal/10 rounded-full px-2 py-1">
                <TrendingUp className="h-3 w-3 text-ringo-teal" />
                <span className="text-[10px] font-bold text-ringo-teal">+{data.callsTrend}%</span>
              </div>
            </div>
            <MiniBarChart data={data.dailyCalls} color="#1D9E75" />
          </div>

          {/* Revenue chart */}
          <div className="rounded-2xl border border-ringo-border bg-ringo-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Daily Revenue</h3>
                <p className="text-[10px] text-ringo-muted mt-0.5">Revenue captured over time</p>
              </div>
              <div className="flex items-center gap-1.5 bg-ringo-purple-light/10 rounded-full px-2 py-1">
                <TrendingUp className="h-3 w-3 text-ringo-purple-light" />
                <span className="text-[10px] font-bold text-ringo-purple-light">+{data.revenueTrend}%</span>
              </div>
            </div>
            <MiniBarChart data={data.dailyRevenue} color="#6C63FF" />
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5 text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-emerald-400/10 flex items-center justify-center mb-3">
            <Target className="h-5 w-5 text-emerald-400" />
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
          {data.topItems.map((item, i) => {
            const maxCount = data.topItems[0].count;
            return (
              <div key={item.name} className="flex items-center gap-4 px-6 py-4">
                <span className={cn(
                  'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                  i === 0 ? 'bg-ringo-amber/15 text-ringo-amber' :
                  i === 1 ? 'bg-ringo-muted/10 text-ringo-muted' :
                  'bg-ringo-border/30 text-ringo-muted'
                )}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-ringo-border/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ringo-teal to-emerald-400 transition-all duration-500"
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
    </div>
  );
}
