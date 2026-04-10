'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wifi,
  WifiOff,
  ExternalLink,
  CreditCard,
  User,
  Bell,
  Shield,
  ChevronRight,
  Zap,
  Check,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getUserRestaurant } from '@/lib/queries';
import type { Restaurant } from '@/types/database';

const posIntegrations = [
  { id: 'square', name: 'Square', description: 'Auto-sync menus and push orders directly to Square POS.' },
  { id: 'toast', name: 'Toast', description: 'Connect Toast POS for seamless menu and order management.' },
  { id: 'clover', name: 'Clover', description: 'Sync your Clover POS for automatic order routing.' },
  { id: 'spoton', name: 'SpotOn', description: 'Connect SpotOn POS for order sync.' },
];

const settingSections = [
  { id: 'agent', label: 'AI Agent', icon: Phone, description: 'Voice settings, greeting, and behavior' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and SMS alerts' },
  { id: 'team', label: 'Team Access', icon: User, description: 'Invite team members' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password and API keys' },
];

const planNames: Record<string, { name: string; price: string }> = {
  starter: { name: 'Starter', price: '$299/month' },
  growth: { name: 'Growth', price: '$599/month' },
  pro: { name: 'Enterprise', price: 'Custom' },
};

export default function SettingsPage() {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const r = await getUserRestaurant(supabase);
      setRestaurant(r);
      setLoading(false);
    }
    load();
  }, []);

  async function handleConnect(posId: string) {
    setConnecting(posId);
    // TODO: Redirect to real OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setConnecting(null);
  }

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <div className="h-8 w-8 mx-auto border-2 border-ringo-teal/30 border-t-ringo-teal rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const planInfo = restaurant?.plan_tier ? planNames[restaurant.plan_tier] : { name: 'No Plan', price: 'Not active' };
  const isConnected = (posId: string) => restaurant?.pos_type === posId && restaurant?.pos_connected;

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-ringo-muted mt-1">
          {restaurant ? `Managing ${restaurant.name}` : 'Manage your POS connections, billing, and preferences'}
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-2xl border border-ringo-teal/20 bg-gradient-to-r from-ringo-teal/[0.08] via-ringo-card to-ringo-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-ringo-teal/15 p-3">
              <Zap className="h-6 w-6 text-ringo-teal" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{planInfo.name} Plan</h3>
                <span className="rounded-full bg-ringo-teal/10 border border-ringo-teal/20 px-2.5 py-0.5 text-[10px] font-bold text-ringo-teal uppercase tracking-wider">
                  {restaurant?.stripe_subscription_id ? 'Active' : 'Trial'}
                </span>
              </div>
              <p className="text-sm text-ringo-muted mt-0.5">{planInfo.price}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm">
              <CreditCard className="h-3.5 w-3.5" /> Manage Billing
            </Button>
          </div>
        </div>
      </div>

      {/* POS Integrations */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">POS Integrations</h2>
        <div className="space-y-3">
          {posIntegrations.map((pos) => {
            const connected = isConnected(pos.id);
            return (
              <div
                key={pos.id}
                className={cn(
                  'rounded-2xl border p-5 transition-all duration-200',
                  connected
                    ? 'border-emerald-400/20 bg-emerald-400/[0.03]'
                    : 'border-ringo-border bg-ringo-card hover:border-ringo-border/80'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn('rounded-xl p-3', connected ? 'bg-emerald-400/10' : 'bg-ringo-border/30')}>
                      {connected ? <Wifi className="h-5 w-5 text-emerald-400" /> : <WifiOff className="h-5 w-5 text-ringo-muted" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <p className="text-sm font-bold text-foreground">{pos.name}</p>
                        {connected && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            <Check className="h-2.5 w-2.5" /> Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ringo-muted mt-0.5">{pos.description}</p>
                    </div>
                  </div>
                  <Button
                    variant={connected ? 'ghost' : 'secondary'}
                    size="sm"
                    loading={connecting === pos.id}
                    onClick={() => handleConnect(pos.id)}
                  >
                    {connected ? <>Manage <ExternalLink className="h-3 w-3" /></> : 'Connect'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* More Settings */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">More Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {settingSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                className="group rounded-2xl border border-ringo-border bg-ringo-card p-5 text-left hover:border-ringo-teal/30 hover:bg-ringo-teal/[0.02] transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-ringo-border/30 p-2.5 group-hover:bg-ringo-teal/10 transition-colors">
                    <Icon className="h-4 w-4 text-ringo-muted group-hover:text-ringo-teal transition-colors" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{section.label}</p>
                    <p className="text-[11px] text-ringo-muted">{section.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ringo-muted/30 group-hover:text-ringo-teal/50 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-6">
        <h3 className="text-sm font-bold text-red-400 mb-1">Danger Zone</h3>
        <p className="text-xs text-ringo-muted mb-4">These actions are permanent and cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="danger" size="sm">Pause AI Agent</Button>
          <Button variant="ghost" size="sm" className="text-red-400/60 hover:text-red-400">Delete Account</Button>
        </div>
      </div>
    </div>
  );
}
