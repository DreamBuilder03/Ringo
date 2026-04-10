'use client';

import { useState } from 'react';
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
  Globe,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const posIntegrations = [
  {
    id: 'square',
    name: 'Square',
    description: 'Auto-sync menus and push orders directly to Square POS.',
    connected: true,
    logo: '■',
  },
  {
    id: 'toast',
    name: 'Toast',
    description: 'Connect Toast POS for seamless menu and order management.',
    connected: false,
    logo: '🍞',
  },
  {
    id: 'clover',
    name: 'Clover',
    description: 'Sync your Clover POS for automatic order routing.',
    connected: false,
    logo: '☘',
  },
];

const settingSections = [
  {
    id: 'agent',
    label: 'AI Agent',
    icon: Phone,
    description: 'Voice settings, greeting, and behavior',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Email and SMS alerts for calls and orders',
  },
  {
    id: 'team',
    label: 'Team Access',
    icon: User,
    description: 'Invite team members and manage permissions',
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    description: 'Password, 2FA, and API keys',
  },
];

export default function SettingsPage() {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  async function handleConnect(posId: string) {
    setConnecting(posId);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setConnecting(null);
  }

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-ringo-muted mt-1">
          Manage your POS connections, billing, and preferences
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-2xl border border-ringo-teal/20 bg-gradient-to-r from-ringo-teal/[0.08] via-ringo-card to-ringo-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-ringo-teal/15 p-3">
              <Zap className="h-6 w-6 text-ringo-teal" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">Growth Plan</h3>
                <span className="rounded-full bg-ringo-teal/10 border border-ringo-teal/20 px-2.5 py-0.5 text-[10px] font-bold text-ringo-teal uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-sm text-ringo-muted mt-0.5">$1,499/month &middot; Up to 100 calls/day &middot; All features included</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm">
              <CreditCard className="h-3.5 w-3.5" /> Manage Billing
            </Button>
            <Button variant="ghost" size="sm" className="text-ringo-teal">
              Upgrade Plan
            </Button>
          </div>
        </div>

        {/* Usage bar */}
        <div className="mt-5 pt-4 border-t border-ringo-teal/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ringo-muted">Calls this billing period</p>
            <p className="text-xs font-bold text-foreground">742 / 3,000</p>
          </div>
          <div className="h-2 rounded-full bg-ringo-border/30 overflow-hidden">
            <div className="h-full w-[25%] rounded-full bg-gradient-to-r from-ringo-teal to-emerald-400" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-ringo-muted">Resets in 18 days</p>
            <p className="text-[10px] text-ringo-muted">25% used</p>
          </div>
        </div>
      </div>

      {/* POS Integrations */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-foreground">POS Integrations</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted bg-ringo-card border border-ringo-border rounded-full px-2.5 py-0.5">
            {posIntegrations.filter(p => p.connected).length} connected
          </span>
        </div>
        <div className="space-y-3">
          {posIntegrations.map((pos) => (
            <div
              key={pos.id}
              className={cn(
                'rounded-2xl border p-5 transition-all duration-200',
                pos.connected
                  ? 'border-emerald-400/20 bg-emerald-400/[0.03]'
                  : 'border-ringo-border bg-ringo-card hover:border-ringo-border/80'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'rounded-xl p-3 text-lg',
                    pos.connected ? 'bg-emerald-400/10' : 'bg-ringo-border/30'
                  )}>
                    {pos.connected ? (
                      <Wifi className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-ringo-muted" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <p className="text-sm font-bold text-foreground">{pos.name}</p>
                      {pos.connected && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <Check className="h-2.5 w-2.5" /> Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ringo-muted mt-0.5">{pos.description}</p>
                  </div>
                </div>

                <Button
                  variant={pos.connected ? 'ghost' : 'secondary'}
                  size="sm"
                  loading={connecting === pos.id}
                  onClick={() => handleConnect(pos.id)}
                >
                  {pos.connected ? (
                    <>Manage <ExternalLink className="h-3 w-3" /></>
                  ) : (
                    'Connect'
                  )}
                </Button>
              </div>
            </div>
          ))}
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
                onClick={() => setActiveSection(section.id)}
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
        <p className="text-xs text-ringo-muted mb-4">
          These actions are permanent and cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" size="sm">
            Pause AI Agent
          </Button>
          <Button variant="ghost" size="sm" className="text-red-400/60 hover:text-red-400">
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}
