'use client';

import Link from 'next/link';
import {
  Building2,
  Phone,
  DollarSign,
  Plus,
  ChevronRight,
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  TrendingUp,
  Globe,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPhoneNumber } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getAllRestaurantsWithStats } from '@/lib/queries';
import { cn } from '@/lib/utils';
import type { HealthStatus, RestaurantWithStats } from '@/types/database';
import { useState, useEffect } from 'react';

const healthConfig: Record<HealthStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: typeof Wifi;
}> = {
  green: { label: 'Healthy', bg: 'bg-bone/10', text: 'text-bone', border: 'border-bone/20', dot: 'bg-bone', icon: Wifi },
  yellow: { label: 'Slow', bg: 'bg-bone/10', text: 'text-bone', border: 'border-bone/20', dot: 'bg-bone', icon: AlertTriangle },
  red: { label: 'Offline', bg: 'bg-bone/10', text: 'text-bone', border: 'border-bone/20', dot: 'bg-bone', icon: WifiOff },
};

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState<RestaurantWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const data = await getAllRestaurantsWithStats(supabase);
      setRestaurants(data);
      setLoading(false);
    }
    load();
  }, []);

  const totalCallsToday = restaurants.reduce((sum, r) => sum + r.calls_today, 0);
  const totalRevenueToday = restaurants.reduce((sum, r) => sum + r.revenue_today, 0);
  const activeLocations = restaurants.filter((r) => r.health_status !== 'red').length;

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        </div>
        <div className="rounded-2xl border border-omri-border bg-omri-card p-12 text-center">
          <div className="h-8 w-8 mx-auto border-2 border-omri-teal/30 border-t-omri-teal rounded-full animate-spin" />
          <p className="text-sm text-omri-muted mt-3">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <span className="flex items-center gap-1.5 rounded-full bg-omri-amber/10 border border-omri-amber/20 px-2.5 py-1 text-[10px] font-bold text-omri-amber uppercase tracking-wider">
              <Globe className="h-3 w-3" /> {restaurants.length} Locations
            </span>
          </div>
          <p className="text-sm text-omri-muted">Monitor and manage all restaurant clients</p>
        </div>
        <Link href="/admin/restaurants">
          <Button size="md"><Plus className="h-4 w-4" /> Add Restaurant</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-omri-border bg-omri-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-omri-muted">Active</p>
            <Building2 className="h-4 w-4 text-omri-teal" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {activeLocations}<span className="text-omri-muted text-lg">/{restaurants.length}</span>
          </p>
          <p className="text-[10px] text-omri-muted mt-1">locations online</p>
        </div>
        <div className="rounded-2xl border border-omri-border bg-omri-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-omri-muted">Calls Today</p>
            <Phone className="h-4 w-4 text-bone" />
          </div>
          <p className="text-3xl font-bold text-foreground">{totalCallsToday}</p>
          <p className="text-[10px] text-omri-muted mt-1">across all locations</p>
        </div>
        <div className="rounded-2xl border border-omri-border bg-omri-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-omri-muted">Revenue Today</p>
            <DollarSign className="h-4 w-4 text-omri-purple-light" />
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(totalRevenueToday)}</p>
          <p className="text-[10px] text-omri-muted mt-1">total captured</p>
        </div>
        <div className="rounded-2xl border border-omri-teal/20 bg-gradient-to-br from-omri-teal/[0.08] to-omri-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-omri-muted">MRR</p>
            <TrendingUp className="h-4 w-4 text-omri-teal" />
          </div>
          <p className="text-3xl font-bold text-omri-teal">
            {formatCurrency(restaurants.filter(r => r.plan_tier).length * 599)}
          </p>
          <p className="text-[10px] text-omri-muted mt-1">monthly recurring</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-omri-muted" />
        <input
          type="text"
          placeholder="Search restaurants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-omri-border bg-omri-card pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-omri-muted/50 focus:outline-none focus:border-omri-teal/50 focus:ring-1 focus:ring-omri-teal/20 transition-all"
        />
      </div>

      {/* Restaurant List */}
      <div className="space-y-3">
        {filteredRestaurants.length === 0 && (
          <div className="rounded-2xl border border-omri-border bg-omri-card p-12 text-center">
            {restaurants.length === 0 ? (
              <>
                <Building2 className="h-12 w-12 mx-auto text-omri-muted/20 mb-3" />
                <h3 className="text-lg font-bold text-foreground mb-2">No restaurants yet</h3>
                <p className="text-sm text-omri-muted mb-4">Add your first restaurant to get started.</p>
                <Link href="/admin/restaurants">
                  <Button size="md"><Plus className="h-4 w-4" /> Add Restaurant</Button>
                </Link>
              </>
            ) : (
              <>
                <Search className="h-8 w-8 mx-auto text-omri-muted/30 mb-3" />
                <p className="text-sm font-medium text-omri-muted">No restaurants match your search</p>
              </>
            )}
          </div>
        )}

        {filteredRestaurants.map((restaurant) => {
          const health = healthConfig[restaurant.health_status];
          const HealthIcon = health.icon;
          return (
            <Link
              href={`/admin/restaurants/${restaurant.id}`}
              key={restaurant.id}
              className={cn(
                'block rounded-2xl border bg-omri-card p-5 transition-all duration-200 hover:shadow-lg hover:shadow-obsidian/5 cursor-pointer',
                restaurant.health_status === 'red' ? 'border-bone/20' : 'border-omri-border hover:border-omri-teal/20'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn('relative h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0', health.bg)}>
                    <HealthIcon className={cn('h-5 w-5', health.text)} />
                    <div className={cn('absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-omri-card', health.dot, restaurant.health_status === 'green' && 'animate-pulse')} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="text-sm font-bold text-foreground truncate">{restaurant.name}</p>
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border', health.bg, health.text, health.border)}>
                        {health.label}
                      </span>
                      {restaurant.plan_tier && (
                        <span className="hidden md:inline-flex rounded-full bg-omri-border/30 px-2 py-0.5 text-[10px] font-semibold text-omri-muted capitalize">
                          {restaurant.plan_tier}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-omri-muted truncate mt-0.5">
                      {restaurant.address} &middot; {formatPhoneNumber(restaurant.phone)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{restaurant.calls_today}</p>
                      <p className="text-[10px] text-omri-muted">calls</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(restaurant.revenue_today)}</p>
                      <p className="text-[10px] text-omri-muted">revenue</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-omri-muted/30" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
