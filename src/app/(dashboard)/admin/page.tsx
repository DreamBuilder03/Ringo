'use client';

import Link from 'next/link';
import { Building2, Phone, DollarSign, Plus, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/stat-card';
import { formatCurrency, formatPhoneNumber } from '@/lib/utils';
import { mockRestaurants } from '@/lib/mock-data';
import type { HealthStatus } from '@/types/database';

const healthColors: Record<HealthStatus, { badge: 'success' | 'warning' | 'danger'; label: string }> = {
  green: { badge: 'success', label: 'Healthy' },
  yellow: { badge: 'warning', label: 'Slow' },
  red: { badge: 'danger', label: 'Offline' },
};

export default function AdminPage() {
  const restaurants = mockRestaurants;

  const totalCallsToday = restaurants.reduce((sum, r) => sum + r.calls_today, 0);
  const totalRevenueToday = restaurants.reduce((sum, r) => sum + r.revenue_today, 0);
  const activeLocations = restaurants.filter((r) => r.health_status !== 'red').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Admin Panel</h1>
          <p className="text-sm text-ringo-muted mt-1">All restaurant locations</p>
        </div>
        <Link href="/admin/restaurants">
          <Button size="md">
            <Plus className="h-4 w-4" />
            Add Restaurant
          </Button>
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Locations"
          value={`${activeLocations}/${restaurants.length}`}
          icon={Building2}
        />
        <StatCard
          title="Total Calls Today"
          value={String(totalCallsToday)}
          icon={Phone}
        />
        <StatCard
          title="Total Revenue Today"
          value={formatCurrency(totalRevenueToday)}
          icon={DollarSign}
        />
      </div>

      {/* Restaurant List */}
      <div className="space-y-3">
        {restaurants.map((restaurant) => {
          const health = healthColors[restaurant.health_status];
          return (
            <Card key={restaurant.id} hover className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`h-3 w-3 rounded-full flex-shrink-0 ${
                    restaurant.health_status === 'green'
                      ? 'bg-emerald-400'
                      : restaurant.health_status === 'yellow'
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {restaurant.name}
                  </p>
                  <p className="text-xs text-ringo-muted truncate">
                    {restaurant.address} &middot; {formatPhoneNumber(restaurant.phone)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">
                    {restaurant.calls_today} calls
                  </p>
                  <p className="text-xs text-ringo-muted">
                    {formatCurrency(restaurant.revenue_today)}
                  </p>
                </div>

                <Badge variant={health.badge}>{health.label}</Badge>

                {restaurant.plan_tier && (
                  <Badge variant="info" className="hidden md:inline-flex capitalize">
                    {restaurant.plan_tier}
                  </Badge>
                )}

                <ChevronRight className="h-4 w-4 text-ringo-muted" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
