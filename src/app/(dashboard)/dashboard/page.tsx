'use client';

import { useState } from 'react';
import {
  Phone,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Sparkles,
  Calendar,
  ArrowUpRight,
  Zap,
  Activity,
  Target,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { CallLogTable } from '@/components/dashboard/call-log-table';
import { TranscriptViewer } from '@/components/dashboard/transcript-viewer';
import { PeakHoursHeatmap } from '@/components/dashboard/peak-hours-heatmap';
import { RoiSummary } from '@/components/dashboard/roi-summary';
import { formatCurrency } from '@/lib/utils';
import { mockCalls, mockHeatmapData } from '@/lib/mock-data';
import type { Call } from '@/types/database';

export default function DashboardPage() {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  const calls = mockCalls;

  const stats = {
    totalCalls: calls.length,
    ordersTaken: calls.filter((c) => c.call_outcome === 'order_placed').length,
    revenue: calls.reduce((sum, c) => sum + c.order_total, 0),
    upsellRevenue: calls.reduce((sum, c) => sum + c.upsell_total, 0),
  };

  const answerRate = calls.length > 0
    ? Math.round(((calls.length - calls.filter(c => c.call_outcome === 'missed').length) / calls.length) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
            </div>
          </div>
          <p className="text-sm text-ringo-muted">Today&apos;s performance overview &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick stats pills */}
          <div className="flex items-center gap-1.5 rounded-xl bg-ringo-card border border-ringo-border px-3 py-2">
            <Target className="h-3.5 w-3.5 text-ringo-teal" />
            <span className="text-xs font-semibold text-foreground">{answerRate}%</span>
            <span className="text-[10px] text-ringo-muted">answer rate</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-ringo-card border border-ringo-border px-3 py-2">
            <Activity className="h-3.5 w-3.5 text-ringo-amber" />
            <span className="text-xs font-semibold text-foreground">{stats.ordersTaken}/{stats.totalCalls}</span>
            <span className="text-[10px] text-ringo-muted">converted</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Calls"
          value={String(stats.totalCalls)}
          subtitle="today"
          icon={Phone}
          accentColor="teal"
          trend={{ value: 12, positive: true }}
          sparklineData={[3, 5, 4, 7, 6, 8, 5]}
        />
        <StatCard
          title="Orders Taken"
          value={String(stats.ordersTaken)}
          subtitle="today"
          icon={ShoppingCart}
          accentColor="emerald"
          trend={{ value: 8, positive: true }}
          sparklineData={[2, 3, 2, 4, 3, 5, 3]}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          subtitle="today"
          icon={DollarSign}
          accentColor="purple"
          trend={{ value: 15, positive: true }}
          sparklineData={[120, 180, 150, 220, 190, 280, 240]}
        />
        <StatCard
          title="Upsell Revenue"
          value={formatCurrency(stats.upsellRevenue)}
          subtitle="AI-generated"
          icon={Sparkles}
          accentColor="amber"
          trend={{ value: 22, positive: true }}
          sparklineData={[10, 15, 12, 20, 18, 25, 22]}
        />
      </div>

      {/* ROI Summary */}
      <RoiSummary
        monthlyOrderRevenue={12450.00}
        monthlyUpsellRevenue={2340.00}
        totalCalls={342}
      />

      {/* Two-column layout: Call Log + Heatmap */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Call Log - wider */}
        <div className="xl:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-foreground">Recent Calls</h2>
              <span className="text-xs font-semibold text-ringo-muted bg-ringo-card border border-ringo-border rounded-full px-2.5 py-0.5">
                {calls.length} today
              </span>
            </div>
            <button className="text-xs font-semibold text-ringo-teal hover:text-ringo-teal-light transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <CallLogTable calls={calls} onSelectCall={setSelectedCall} compact />
        </div>

        {/* Heatmap - narrower */}
        <div className="xl:col-span-2">
          <PeakHoursHeatmap data={mockHeatmapData} />
        </div>
      </div>

      {/* AI Insights Card */}
      <div className="rounded-2xl border border-ringo-purple/20 bg-gradient-to-r from-ringo-purple/[0.08] via-ringo-card to-ringo-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-ringo-purple-light/15 p-3 flex-shrink-0">
            <Zap className="h-6 w-6 text-ringo-purple-light" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground mb-1">AI Insights</h3>
            <div className="space-y-2">
              <p className="text-sm text-ringo-muted leading-relaxed">
                <span className="text-ringo-purple-light font-semibold">Upsell Performance:</span>{' '}
                Your AI agent successfully upsold on 60% of orders today, generating an extra {formatCurrency(stats.upsellRevenue)} in revenue. The garlic bread add-on was the top performer.
              </p>
              <p className="text-sm text-ringo-muted leading-relaxed">
                <span className="text-ringo-amber font-semibold">Peak Time Alert:</span>{' '}
                Friday 6-7 PM is your busiest hour with 22 calls. Consider adding a second AI line during this window to maintain response quality.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Viewer Modal */}
      {selectedCall && (
        <TranscriptViewer call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}
