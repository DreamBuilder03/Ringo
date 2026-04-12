'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Phone,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  Activity,
  BarChart3,
  Users,
  Zap,
  ChevronRight,
  Headphones,
  UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { getUserRestaurant } from '@/lib/queries';
import type { UserRole } from '@/types/database';

const PLAN_CALL_LIMITS: Record<string, number> = {
  starter: 100,
  growth: 250,
  pro: 9999,
};

interface SidebarProps {
  role: UserRole;
}

const restaurantLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & stats' },
  { href: '/dashboard/calls', label: 'Call Log', icon: Phone, description: 'All call history' },
  { href: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed, description: 'Manage menu items' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, description: 'Deep insights' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'POS & billing' },
];

const adminLinks = [
  { href: '/admin', label: 'Admin Panel', icon: Shield, description: 'System overview' },
  { href: '/admin/restaurants', label: 'Restaurants', icon: Users, description: 'Manage clients' },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentPulse, setAgentPulse] = useState(true);
  const [todayCalls, setTodayCalls] = useState(0);
  const [callLimit, setCallLimit] = useState(100);

  // Simulated agent pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAgentPulse((prev) => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch today's call count and plan limit
  useEffect(() => {
    async function fetchCallStats() {
      const supabase = createClient();
      const restaurant = await getUserRestaurant(supabase);
      if (!restaurant) return;

      const limit = PLAN_CALL_LIMITS[restaurant.plan_tier || 'starter'] || 100;
      setCallLimit(limit);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', today.toISOString());

      setTodayCalls(count || 0);
    }
    fetchCallStats();

    // Refresh every 60 seconds
    const interval = setInterval(fetchCallStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const links = role === 'admin' ? [...adminLinks, ...restaurantLinks] : restaurantLinks;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 rounded-xl bg-ringo-card/90 backdrop-blur-sm border border-ringo-border p-2.5 shadow-lg"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-[280px] border-r border-ringo-border bg-ringo-darker flex flex-col transition-transform duration-300 ease-out overflow-hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />
        {/* Logo + Agent Status */}
        <div className="p-6 border-b border-ringo-border">
          <div className="flex items-center justify-between">
            <Image
              src="/ringo-logo.svg"
              alt="Ringo"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
            {role === 'admin' && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-ringo-amber bg-ringo-amber/10 px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </div>

          {/* Live Agent Status */}
          <div className="mt-4 rounded-xl bg-gradient-to-r from-[#C9A84C]/10 to-[#C9A84C]/5 border border-[#C9A84C]/20 p-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-8 w-8 rounded-lg bg-[#C9A84C]/20 flex items-center justify-center">
                  <Headphones className="h-4 w-4 text-[#C9A84C]" />
                </div>
                <div className={cn(
                  'absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ringo-darker transition-all duration-1000',
                  agentPulse ? 'bg-[#C9A84C] shadow-lg shadow-[#C9A84C]/50' : 'bg-[#C9A84C]'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">AI Agent Active</p>
                <p className="text-[10px] text-ringo-muted">Answering calls 24/7</p>
              </div>
              <Activity className="h-4 w-4 text-[#C9A84C] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-muted/60 px-3 mb-2">
            {role === 'admin' ? 'Administration' : 'Menu'}
          </p>
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200',
                  isActive
                    ? 'bg-[#C9A84C]/10 text-[#C9A84C] shadow-sm'
                    : 'text-ringo-muted hover:bg-ringo-card/80 hover:text-foreground'
                )}
              >
                <div className={cn(
                  'rounded-lg p-1.5 transition-colors',
                  isActive ? 'bg-[#C9A84C]/20' : 'bg-ringo-border/30 group-hover:bg-ringo-border/50'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{link.label}</p>
                  <p className={cn(
                    'text-[10px] transition-colors',
                    isActive ? 'text-[#C9A84C]/70' : 'text-ringo-muted/60'
                  )}>
                    {link.description}
                  </p>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-[#C9A84C]/50" />}
              </Link>
            );
          })}
        </nav>

        {/* Quick Stats Footer */}
        <div className="p-4 border-t border-ringo-border space-y-3">
          {/* Usage meter */}
          <div className="rounded-xl bg-ringo-card/50 border border-ringo-border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ringo-muted">Today&apos;s Calls</p>
              <span className="text-xs font-bold text-[#C9A84C]">
                {todayCalls} / {callLimit >= 9999 ? '∞' : callLimit}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-ringo-border/30 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  todayCalls / callLimit > 0.9
                    ? 'bg-gradient-to-r from-red-600 to-red-700'
                    : 'bg-gradient-to-r from-[#C9A84C] to-[#F5E196]'
                )}
                style={{ width: `${Math.min((todayCalls / callLimit) * 100, 100)}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ringo-muted hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
