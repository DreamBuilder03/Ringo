'use client';

import { useState } from 'react';
import { Phone, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { CallLogTable } from '@/components/dashboard/call-log-table';
import { TranscriptViewer } from '@/components/dashboard/transcript-viewer';
import { PeakHoursHeatmap } from '@/components/dashboard/peak-hours-heatmap';
import { RoiSummary } from '@/components/dashboard/roi-summary';
import { Badge } from '@/components/ui/badge';
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-ringo-muted mt-1">Today&apos;s performance overview</p>
        </div>
        <Badge variant="success">
          <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-400 inline-block" />
          POS Connected
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Calls"
          value={String(stats.totalCalls)}
          subtitle="today"
          icon={Phone}
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Orders Taken"
          value={String(stats.ordersTaken)}
          subtitle="today"
          icon={ShoppingCart}
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Revenue Captured"
          value={formatCurrency(stats.revenue)}
          subtitle="today"
          icon={DollarSign}
          trend={{ value: 15, positive: true }}
        />
        <StatCard
          title="Upsell Revenue"
          value={formatCurrency(stats.upsellRevenue)}
          subtitle="today"
          icon={TrendingUp}
          trend={{ value: 22, positive: true }}
        />
      </div>

      {/* ROI Summary */}
      <RoiSummary
        monthlyOrderRevenue={12450.0}
        monthlyUpsellRevenue={2340.0}
        totalCalls={342}
      />

      {/* Call Log */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Live Call Log</h2>
        <CallLogTable calls={calls} onSelectCall={setSelectedCall} />
      </div>

      {/* Peak Hours Heatmap */}
      <PeakHoursHeatmap data={mockHeatmapData} />

      {/* Transcript Viewer Modal */}
      {selectedCall && (
        <TranscriptViewer call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}
