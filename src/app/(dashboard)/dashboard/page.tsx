'use client';

import { useState, useEffect } from 'react';
import {
  Phone,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Sparkles,
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
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getUserRestaurant, getDashboardStats, getRecentCalls, getMonthlyStats, getPeakHours } from '@/lib/queries';
import type { Call } from '@/types/database';

export default function DashboardPage() {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCalls: 0, ordersTaken: 0, revenue: 0, upsellRevenue: 0, answerRate: 100 });
  const [calls, setCalls] = useState<Call[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({ monthlyOrderRevenue: 0, monthlyUpsellRevenue: 0, totalCalls: 0, revenueChange: 0 });
  const [heatmapData, setHeatmapData] = useState<Record<string, Record<number, number>>>({});
  const [restaurantName, setRestaurantName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const supabase = createClient();
        const restaurant = await getUserRestaurant(supabase);

        if (!restaurant) {
          setError('No restaurant found. Complete onboarding first.');
          setLoading(false);
          return;
        }

        setRestaurantName(restaurant.name);

        // Load all data in parallel
        const [dashStats, recentCalls, monthly, peakHours] = await Promise.all([
          getDashboardStats(supabase, restaurant.id),
          getRecentCalls(supabase, restaurant.id, 20),
          getMonthlyStats(supabase, restaurant.id),
          getPeakHours(supabase, restaurant.id),
        ]);

        setStats({
          totalCalls: dashStats.totalCalls,
          ordersTaken: dashStats.ordersTaken,
          revenue: dashStats.revenue,
          upsellRevenue: dashStats.upsellRevenue,
          answerRate: dashStats.answerRate,
        });
        setCalls(recentCalls.calls);
        setMonthlyStats({
          monthlyOrderRevenue: monthly.monthlyOrderRevenue,
          monthlyUpsellRevenue: monthly.monthlyUpsellRevenue,
          totalCalls: monthly.totalCalls,
          revenueChange: monthly.revenueChange,
        });
        setHeatmapData(peakHours);

        // Subscribe to realtime call updates
        const channel = supabase
          .channel('calls-realtime')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'calls',
              filter: `restaurant_id=eq.${restaurant.id}`,
            },
            (payload) => {
              const newCall = payload.new as Call;
              setCalls((prev) => [newCall, ...prev]);
              setStats((prev) => ({
                ...prev,
                totalCalls: prev.totalCalls + 1,
                ordersTaken: newCall.call_outcome === 'order_placed' ? prev.ordersTaken + 1 : prev.ordersTaken,
                revenue: prev.revenue + (newCall.order_total || 0),
                upsellRevenue: prev.upsellRevenue + (newCall.upsell_total || 0),
              }));
            }
          )
          .subscribe();

        setLoading(false);

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('Failed to load dashboard data.');
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-ringo-amber/10 flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-ringo-amber" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Getting Started</h2>
          <p className="text-sm text-ringo-muted max-w-sm">{error}</p>
          <a href="/onboarding" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-ringo-teal text-white text-sm font-semibold">
            Complete Setup <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  const hasData = calls.length > 0;

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
          <p className="text-sm text-ringo-muted">{restaurantName} &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        {hasData && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-ringo-card border border-ringo-border px-3 py-2">
              <Target className="h-3.5 w-3.5 text-ringo-teal" />
              <span className="text-xs font-semibold text-foreground">{stats.answerRate}%</span>
              <span className="text-[10px] text-ringo-muted">answer rate</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-ringo-card border border-ringo-border px-3 py-2">
              <Activity className="h-3.5 w-3.5 text-ringo-amber" />
              <span className="text-xs font-semibold text-foreground">{stats.ordersTaken}/{stats.totalCalls}</span>
              <span className="text-[10px] text-ringo-muted">converted</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Calls"
          value={String(stats.totalCalls)}
          subtitle="today"
          icon={Phone}
          accentColor="teal"
        />
        <StatCard
          title="Orders Taken"
          value={String(stats.ordersTaken)}
          subtitle="today"
          icon={ShoppingCart}
          accentColor="emerald"
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          subtitle="today"
          icon={DollarSign}
          accentColor="purple"
        />
        <StatCard
          title="Upsell Revenue"
          value={formatCurrency(stats.upsellRevenue)}
          subtitle="AI-generated"
          icon={Sparkles}
          accentColor="amber"
        />
      </div>

      {/* ROI Summary */}
      <RoiSummary
        monthlyOrderRevenue={monthlyStats.monthlyOrderRevenue}
        monthlyUpsellRevenue={monthlyStats.monthlyUpsellRevenue}
        totalCalls={monthlyStats.totalCalls}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-foreground">Recent Calls</h2>
              {hasData && (
                <span className="text-xs font-semibold text-ringo-muted bg-ringo-card border border-ringo-border rounded-full px-2.5 py-0.5">
                  {calls.length} today
                </span>
              )}
            </div>
            {hasData && (
              <a href="/dashboard/calls" className="text-xs font-semibold text-ringo-teal hover:text-ringo-teal-light transition-colors flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
          <CallLogTable calls={calls} onSelectCall={setSelectedCall} compact />
        </div>

        <div className="xl:col-span-2">
          <PeakHoursHeatmap data={heatmapData} />
        </div>
      </div>

      {/* AI Insights Card */}
      {hasData && (
        <div className="rounded-2xl border border-ringo-purple/20 bg-gradient-to-r from-ringo-purple/[0.08] via-ringo-card to-ringo-card p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-ringo-purple-light/15 p-3 flex-shrink-0">
              <Zap className="h-6 w-6 text-ringo-purple-light" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground mb-1">AI Insights</h3>
              <p className="text-sm text-ringo-muted leading-relaxed">
                <span className="text-ringo-purple-light font-semibold">Performance:</span>{' '}
                Your AI agent handled {stats.totalCalls} calls today with a {stats.answerRate}% answer rate, capturing {formatCurrency(stats.revenue + stats.upsellRevenue)} in total revenue.
                {stats.upsellRevenue > 0 && (
                  <> Upselling added an extra {formatCurrency(stats.upsellRevenue)} to your bottom line.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Viewer Modal */}
      {selectedCall && (
        <TranscriptViewer call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}
