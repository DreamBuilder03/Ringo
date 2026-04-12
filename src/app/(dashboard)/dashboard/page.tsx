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

        // Subscribe to realtime call updates (INSERT + UPDATE)
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
              }));
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'calls',
              filter: `restaurant_id=eq.${restaurant.id}`,
            },
            (payload) => {
              const updatedCall = payload.new as Call;
              setCalls((prev) =>
                prev.map((c) => (c.id === updatedCall.id ? updatedCall : c))
              );
              // Recalculate stats from scratch when a call is updated
              setCalls((prev) => {
                const todayCalls = prev;
                const orders = todayCalls.filter((c) => c.call_outcome === 'order_placed');
                setStats((s) => ({
                  ...s,
                  ordersTaken: orders.length,
                  revenue: orders.reduce((sum, c) => sum + (c.order_total || 0), 0),
                  upsellRevenue: orders.reduce((sum, c) => sum + (c.upsell_total || 0), 0),
                }));
                return prev;
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `restaurant_id=eq.${restaurant.id}`,
            },
            () => {
              // When orders change, refresh the full dashboard stats
              Promise.all([
                getDashboardStats(supabase, restaurant.id),
                getRecentCalls(supabase, restaurant.id, 20),
              ]).then(([freshStats, freshCalls]) => {
                setStats({
                  totalCalls: freshStats.totalCalls,
                  ordersTaken: freshStats.ordersTaken,
                  revenue: freshStats.revenue,
                  upsellRevenue: freshStats.upsellRevenue,
                  answerRate: freshStats.answerRate,
                });
                setCalls(freshCalls.calls);
              });
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
          <a href="/onboarding" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-[#C9A84C] text-[#0A0A0A] text-sm font-semibold">
            Complete Setup <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  const hasData = calls.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gold status banner */}
      <div className="rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-4 py-2.5 flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
        <span className="text-sm font-semibold text-[#C9A84C]">Ringo is live and handling your calls</span>
      </div>

      {/* Welcome header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <div className="flex items-center gap-1.5 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-2.5 py-1 shadow-sm shadow-[#C9A84C]/10">
              <div className="h-1.5 w-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
              <span className="text-[10px] font-bold text-[#C9A84C]">LIVE</span>
            </div>
          </div>
          <p className="text-sm text-ringo-muted">{restaurantName} &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        {hasData && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-ringo-card/80 backdrop-blur-sm border border-ringo-border px-3 py-2 shadow-sm ring-1 ring-black/[0.02]">
              <Target className="h-3.5 w-3.5 text-[#C9A84C]" />
              <span className="text-xs font-semibold text-foreground">{stats.answerRate}%</span>
              <span className="text-[10px] text-ringo-muted">answer rate</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-ringo-card/80 backdrop-blur-sm border border-ringo-border px-3 py-2 shadow-sm ring-1 ring-black/[0.02]">
              <Activity className="h-3.5 w-3.5 text-ringo-amber" />
              <span className="text-xs font-semibold text-foreground">{stats.ordersTaken}/{stats.totalCalls}</span>
              <span className="text-[10px] text-ringo-muted">converted</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <div className="bg-[rgba(201,168,76,0.12)] border border-[#C9A84C]/20 rounded-2xl p-1">
            <StatCard
              title="Revenue"
              value={formatCurrency(stats.revenue)}
              subtitle="today"
              icon={DollarSign}
              accentColor="purple"
            />
          </div>
        </div>
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
              <h2 className="text-lg font-bold text-foreground tracking-tight">Recent Calls</h2>
              {hasData && (
                <span className="text-xs font-semibold text-ringo-muted bg-ringo-card/80 backdrop-blur-sm border border-ringo-border rounded-full px-2.5 py-0.5 shadow-sm">
                  {calls.length} today
                </span>
              )}
            </div>
            {hasData && (
              <a href="/dashboard/calls" className="text-xs font-semibold text-[#C9A84C] hover:text-[#F5E196] transition-colors flex items-center gap-1 group">
                View all <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            )}
          </div>
          {!hasData ? (
            <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-8 text-center">
              <Phone className="w-8 h-8 text-[#C9A84C] mx-auto mb-3" />
              <p className="text-base font-semibold text-foreground mb-1">Ringo is ready</p>
              <p className="text-sm text-ringo-muted">Your first call will appear here in real time the moment it comes in.</p>
            </div>
          ) : (
            <CallLogTable calls={calls} onSelectCall={setSelectedCall} compact />
          )}
        </div>

        <div className="xl:col-span-2">
          <PeakHoursHeatmap data={heatmapData} />
        </div>
      </div>

      {/* AI Insights Card */}
      {hasData && (
        <div className="rounded-2xl border border-[#C9A84C]/20 bg-ringo-card/80 backdrop-blur-sm p-6 ring-1 ring-[#C9A84C]/5 shadow-sm relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-[#C9A84C]/10 to-transparent rounded-full blur-3xl -translate-x-12 -translate-y-12 pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="rounded-xl bg-[#C9A84C]/15 p-3 flex-shrink-0 shadow-sm shadow-[#C9A84C]/10">
              <Zap className="h-6 w-6 text-[#C9A84C]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground mb-1">AI Insights</h3>
              <p className="text-sm text-ringo-muted leading-relaxed">
                <span className="text-[#C9A84C] font-semibold">Performance:</span>{' '}
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
