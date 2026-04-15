'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Wifi,
  WifiOff,
  DollarSign,
  PhoneCall,
  Clock,
  Bot,
  CreditCard,
  Activity,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatPhoneNumber, cn } from '@/lib/utils';
import type { Restaurant, Call } from '@/types/database';

interface RestaurantDetail extends Restaurant {
  calls_today: number;
  revenue_today: number;
  total_calls: number;
  total_revenue: number;
}

export default function RestaurantDetailPage({ params }: { params: { id: string } }) {
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Fetch restaurant
      const { data: rest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', params.id)
        .single();

      if (!rest) {
        setLoading(false);
        return;
      }

      // Fetch today's stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayCalls } = await supabase
        .from('calls')
        .select('order_total')
        .eq('restaurant_id', params.id)
        .gte('start_time', todayStart.toISOString());

      // Fetch all-time stats
      const { data: allCalls } = await supabase
        .from('calls')
        .select('order_total')
        .eq('restaurant_id', params.id);

      // Fetch recent calls
      const { data: recent } = await supabase
        .from('calls')
        .select('*')
        .eq('restaurant_id', params.id)
        .order('start_time', { ascending: false })
        .limit(10);

      setRestaurant({
        ...rest,
        calls_today: todayCalls?.length || 0,
        revenue_today: todayCalls?.reduce((sum, c) => sum + (c.order_total || 0), 0) || 0,
        total_calls: allCalls?.length || 0,
        total_revenue: allCalls?.reduce((sum, c) => sum + (c.order_total || 0), 0) || 0,
      });
      setRecentCalls(recent || []);
      setLoading(false);
    }

    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <div className="h-8 w-8 mx-auto border-2 border-ringo-teal/30 border-t-ringo-teal rounded-full animate-spin" />
          <p className="text-sm text-ringo-muted mt-3">Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ringo-muted hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <p className="text-lg font-bold text-foreground mb-2">Restaurant Not Found</p>
          <p className="text-sm text-ringo-muted">This restaurant doesn't exist or you don't have access.</p>
        </div>
      </div>
    );
  }

  const outcomeColors: Record<string, string> = {
    order_placed: 'text-bone bg-bone/10',
    inquiry: 'text-bone bg-bone/10',
    missed: 'text-bone bg-bone/10',
    upsell_only: 'text-bone bg-bone/10',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back nav */}
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ringo-muted hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Admin
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{restaurant.name}</h1>
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold',
              restaurant.retell_agent_id
                ? 'bg-bone/10 text-bone border border-bone/20'
                : 'bg-bone/10 text-bone border border-bone/20'
            )}>
              {restaurant.retell_agent_id ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {restaurant.retell_agent_id ? 'AI Active' : 'No Agent'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-ringo-muted">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {restaurant.address}</span>
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {formatPhoneNumber(restaurant.phone)}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted">Calls Today</p>
            <PhoneCall className="h-4 w-4 text-ringo-teal" />
          </div>
          <p className="text-3xl font-bold text-foreground">{restaurant.calls_today}</p>
        </div>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted">Revenue Today</p>
            <DollarSign className="h-4 w-4 text-bone" />
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(restaurant.revenue_today)}</p>
        </div>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted">Total Calls</p>
            <Activity className="h-4 w-4 text-ringo-purple-light" />
          </div>
          <p className="text-3xl font-bold text-foreground">{restaurant.total_calls}</p>
        </div>
        <div className="rounded-2xl border border-ringo-teal/20 bg-gradient-to-br from-ringo-teal/[0.08] to-ringo-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted">Total Revenue</p>
            <DollarSign className="h-4 w-4 text-ringo-teal" />
          </div>
          <p className="text-3xl font-bold text-ringo-teal">{formatCurrency(restaurant.total_revenue)}</p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Configuration */}
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Configuration</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ringo-muted flex items-center gap-2"><Bot className="h-4 w-4" /> Retell Agent</span>
              <span className="text-sm text-foreground font-mono">{restaurant.retell_agent_id || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ringo-muted flex items-center gap-2"><CreditCard className="h-4 w-4" /> POS System</span>
              <span className="text-sm text-foreground capitalize">{restaurant.pos_type === 'none' ? 'Not connected' : restaurant.pos_type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ringo-muted flex items-center gap-2"><DollarSign className="h-4 w-4" /> Plan</span>
              <span className="text-sm text-foreground capitalize">{restaurant.plan_tier || 'No plan'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ringo-muted flex items-center gap-2"><Clock className="h-4 w-4" /> Added</span>
              <span className="text-sm text-foreground">{new Date(restaurant.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Recent Calls */}
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent Calls</h3>
            <Link href={`/dashboard/calls`} className="text-xs text-ringo-teal hover:text-ringo-teal-light flex items-center gap-1">
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          {recentCalls.length === 0 ? (
            <p className="text-sm text-ringo-muted text-center py-6">No calls recorded yet</p>
          ) : (
            <div className="space-y-2">
              {recentCalls.slice(0, 5).map((call) => (
                <div key={call.id} className="flex items-center justify-between py-2 border-b border-ringo-border/50 last:border-0">
                  <div>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
                      outcomeColors[call.call_outcome] || 'text-ringo-muted bg-ringo-border/30'
                    )}>
                      {call.call_outcome.replace('_', ' ')}
                    </span>
                    <p className="text-[10px] text-ringo-muted mt-1">
                      {new Date(call.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(call.order_total)}</p>
                    {call.duration_seconds && (
                      <p className="text-[10px] text-ringo-muted">{Math.round(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
