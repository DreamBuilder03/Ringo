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
  Users,
  Globe,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPhoneNumber } from '@/lib/utils';
import { mockRestaurants } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { HealthStatus } from '@/types/database';
import { useState } from 'react';

const healthConfig: Record<HealthStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: typeof Wifi;
}> = {
  green: {
    label: 'Healthy',
    bg: 'bg-emerald-400/10',
    text: 'text-emerald-400',
    border: 'border-emerald-400/20',
    dot: 'bg-emerald-400',
    icon: Wifi,
  },
  yellow: {
    label: 'Slow',
    bg: 'bg-amber-400/10',
    text: 'text-amber-400',
    border: 'border-amber-400/20',
    dot: 'bg-amber-400',
    icon: AlertTriangle,
  },
  red: {
    label: 'Offline',
    bg: 'bg-red-400/10',
    text: 'text-red-400',
    border: 'border-red-400/20',
    dot: 'bg-red-400',
    icon: WifiOff,
  },
};

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const restaurants = mockRestaurants;

  const totalCallsToday = restaurants.reduce((sum, r) => sum + r.calls_today, 0);
  const totalRevenueToday = restaurants.reduce((sum, r) => sum + r.revenue_today, 0);
  const activeLocations = restaurants.filter((r) => r.health_status !== 'red').length;

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <span className="flex items-center gap-1.5 rounded-full bg-ringo-amber/10 border border-ringo-amber/20 px-2.5 py-1 text-[10px] font-bold text-ringo-amber uppercase tracking-wider">
              <Globe className="h-3 w-3" /> {restaurants.length} Locations
            </span>
          </div>
          <p className="text-sm text-ringo-muted">Monitor and manage all restaurant clients</p>
        </div>
        <Link href="/admin/restaurants">
          <Button size="md">
            <Plus className="h-4 w-4" /> Add Restaurant
          </Button>
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted">Active</p>
            <Building2 className="h-4 w-4 text-ringo-teal" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {activeLocations}<span className="text-ringo-muted text-lg">/{restaurants.length}</span>
          </p>
          <p className="text-[10px] text-ringo-muted mt-1">locations online</p>
        </div>

        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted">Calls Today</p>
            <Phone className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-foreground">{totalCallsToday}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 rounded-full px-1.5 py-0.5">↑ 18%</span>
            <span className="text-[10px] text-ringo-muted">vs yesterday</span>
          </div>
        </div>

        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted">Revenue Today</p>
            <DollarSign className="h-4 w-4 text-ringo-purple-light" />
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(totalRevenueToday)}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 rounded-full px-1.5 py-0.5">↑ 12%</span>
            <span className="text-[10px] text-ringo-muted">vs yesterday</span>
          </div>
        </div>

        <div className="rounded-2xl border border-ringo-teal/20 bg-gradient-to-br from-ringo-teal/[0.08] to-ringo-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted">MRR</p>
            <TrendingUp className="h-4 w-4 text-ringo-teal" />
          </div>
          <p className="text-3xl font-bold text-ringo-teal">$5,796</p>
          <p className="text-[10px] text-ringo-muted mt-1">monthly recurring</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ringo-muted" />
        <input
          type="text"
          placeholder="Search restaurants by name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-ringo-border bg-ringo-card pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-ringo-muted/50 focus:outline-none focus:border-ringo-teal/50 focus:ring-1 focus:ring-ringo-teal/20 transition-all"
        />
      </div>

      {/* Restaurant List */}
      <div className="space-y-3">
        {filteredRestaurants.map((restaurant) => {
          const health = healthConfig[restaurant.health_status];
          const HealthIcon = health.icon;

          return (
            <div
              key={restaurant.id}
              className={cn(
                'rounded-2xl border bg-ringo-card p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/5 cursor-pointer',
                restaurant.health_status === 'red' ? 'border-red-400/20' : 'border-ringo-border hover:border-ringo-teal/20'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Status indicator */}
                  <div className={cn(
                    'relative h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0',
                    health.bg
                  )}>
                    <HealthIcon className={cn('h-5 w-5', health.text)} />
                    <div className={cn(
                      'absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ringo-card',
                      health.dot,
                      restaurant.health_status === 'green' && 'animate-pulse'
                    )} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="text-sm font-bold text-foreground truncate">{restaurant.name}</p>
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border',
                        health.bg,
                        health.text,
                        health.border
                      )}>
                        {health.label}
                      </span>
                      {restaurant.plan_tier && (
                        <span className="hidden md:inline-flex rounded-full bg-ringo-border/30 px-2 py-0.5 text-[10px] font-semibold text-ringo-muted capitalize">
                          {restaurant.plan_tier}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ringo-muted truncate mt-0.5">
                      {restaurant.address} &middot; {formatPhoneNumber(restaurant.phone)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-shrink-0">
                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{restaurant.calls_today}</p>
                      <p className="text-[10px] text-ringo-muted">calls today</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(restaurant.revenue_today)}</p>
                      <p className="text-[10px] text-ringo-muted">revenue</p>
                    </div>
                    <div className="text-right hidden lg:block">
                      <p className="text-sm font-medium text-ringo-muted">
                        {restaurant.pos_connected ? (
                          <span className="text-emerald-400 font-semibold">POS ✓</span>
                        ) : (
                          <span className="text-ringo-muted/40">No POS</span>
                        )}
                      </p>
                      <p className="text-[10px] text-ringo-muted">{restaurant.pos_type}</p>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-ringo-muted/30" />
                </div>
              </div>
            </div>
          );
        })}

        {filteredRestaurants.length === 0 && (
          <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
            <Search className="h-8 w-8 mx-auto text-ringo-muted/30 mb-3" />
            <p className="text-sm font-medium text-ringo-muted">No restaurants found</p>
            <p className="text-xs text-ringo-muted/60 mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}
