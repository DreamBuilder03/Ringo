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
  AlertCircle,
  X,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getUserRestaurant } from '@/lib/queries';
import type { Restaurant } from '@/types/database';

const posIntegrations = [
  { id: 'square', name: 'Square', description: 'Auto-sync menus and push orders directly to Square POS.' },
  { id: 'toast', name: 'Toast', description: 'Connect Toast POS for seamless menu and order management.' },
  { id: 'clover', name: 'Clover', description: 'Sync your Clover POS for automatic order routing.' },
  { id: 'spoton', name: 'SpotOn', description: 'Connect SpotOn POS for order sync and reporting.' },
];

const settingSections = [
  { id: 'agent', label: 'AI Agent', icon: Phone, description: 'Voice settings, greeting, and behavior' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and SMS alerts' },
  { id: 'team', label: 'Team Access', icon: User, description: 'Invite team members' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password and API keys' },
];

const planNames: Record<string, { name: string; price: string }> = {
  starter: { name: 'Starter', price: '$799/month' },
  growth: { name: 'Growth', price: '$1,499/month' },
  pro: { name: 'Enterprise', price: 'Custom' },
};

interface AlertState {
  type: 'success' | 'error';
  message: string;
}

export default function SettingsPage() {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [managingBilling, setManagingBilling] = useState(false);
  const [toastCredentials, setToastCredentials] = useState({
    toast_restaurant_guid: '',
    toast_api_key: '',
  });
  const [savingToast, setSavingToast] = useState(false);
  const [toastConnected, setToastConnected] = useState(false);
  const [spotonCredentials, setSpotOnCredentials] = useState({
    spoton_api_key: '',
    spoton_location_id: '',
  });
  const [savingSpotOn, setSavingSpotOn] = useState(false);
  const [spotonConnected, setSpotOnConnected] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'es' | 'both'>('en');
  const [spanishAgentId, setSpanishAgentId] = useState('');
  const [savingLanguage, setSavingLanguage] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const r = await getUserRestaurant(supabase);
      setRestaurant(r);
      setToastConnected(r?.pos_type === 'toast' && r?.pos_connected);
      setSpotOnConnected(r?.pos_type === 'spoton' && r?.pos_connected);
      if (r) {
        setPreferredLanguage(r.preferred_language || 'en');
        setSpanishAgentId(r.retell_agent_id_es || '');
      }
      setLoading(false);
    }
    load();
  }, []);

  // Check URL params for connection success/error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success === 'square_connected') {
      setAlert({
        type: 'success',
        message: 'Square POS connected successfully!',
      });
      setTimeout(() => setRestaurant((r) => r ? { ...r, pos_type: 'square', pos_connected: true } : null), 500);
      window.history.replaceState({}, '', '/settings');
    } else if (success === 'clover_connected') {
      setAlert({
        type: 'success',
        message: 'Clover POS connected successfully!',
      });
      setTimeout(() => setRestaurant((r) => r ? { ...r, pos_type: 'clover', pos_connected: true } : null), 500);
      window.history.replaceState({}, '', '/settings');
    } else if (error === 'square_failed') {
      setAlert({
        type: 'error',
        message: 'Failed to connect Square. Please try again.',
      });
      window.history.replaceState({}, '', '/settings');
    } else if (error === 'clover_failed') {
      setAlert({
        type: 'error',
        message: 'Failed to connect Clover. Please try again.',
      });
      window.history.replaceState({}, '', '/settings');
    } else if (error === 'missing_params') {
      setAlert({
        type: 'error',
        message: 'Missing required parameters. Please try again.',
      });
      window.history.replaceState({}, '', '/settings');
    } else if (success === 'spoton_connected') {
      setAlert({
        type: 'success',
        message: 'SpotOn POS connected successfully!',
      });
      setTimeout(() => setRestaurant((r) => r ? { ...r, pos_type: 'spoton', pos_connected: true } : null), 500);
      window.history.replaceState({}, '', '/settings');
    } else if (error === 'spoton_failed') {
      setAlert({
        type: 'error',
        message: 'Failed to connect SpotOn. Please check your credentials.',
      });
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  const handleSquareConnect = async () => {
    if (!restaurant) return;
    setConnecting('square');
    try {
      window.location.href = `/api/pos/square/authorize?restaurant_id=${restaurant.id}`;
    } catch (error) {
      console.error('Square connect error:', error);
      setAlert({
        type: 'error',
        message: 'Failed to initiate Square connection.',
      });
      setConnecting(null);
    }
  };

  const handleCloverConnect = async () => {
    if (!restaurant) return;
    setConnecting('clover');
    try {
      window.location.href = `/api/pos/clover/authorize?restaurant_id=${restaurant.id}`;
    } catch (error) {
      console.error('Clover connect error:', error);
      setAlert({
        type: 'error',
        message: 'Failed to initiate Clover connection.',
      });
      setConnecting(null);
    }
  };

  const handleToastConnect = async () => {
    if (!restaurant || !toastCredentials.toast_restaurant_guid || !toastCredentials.toast_api_key) {
      setAlert({
        type: 'error',
        message: 'Please fill in all Toast credentials.',
      });
      return;
    }

    setSavingToast(true);
    try {
      const response = await fetch('/api/pos/toast/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          toast_restaurant_guid: toastCredentials.toast_restaurant_guid,
          toast_api_key: toastCredentials.toast_api_key,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save Toast credentials');
      }

      setAlert({
        type: 'success',
        message: 'Toast POS connected successfully!',
      });
      setRestaurant((r) => r ? { ...r, pos_type: 'toast', pos_connected: true } : null);
      setToastConnected(true);
      setToastCredentials({ toast_restaurant_guid: '', toast_api_key: '' });
    } catch (error) {
      console.error('Toast connect error:', error);
      setAlert({
        type: 'error',
        message: 'Failed to connect Toast. Please check your credentials.',
      });
    } finally {
      setSavingToast(false);
    }
  };

  const handleSpotOnConnect = async () => {
    if (!restaurant || !spotonCredentials.spoton_api_key || !spotonCredentials.spoton_location_id) {
      setAlert({
        type: 'error',
        message: 'Please fill in all SpotOn credentials.',
      });
      return;
    }

    setSavingSpotOn(true);
    try {
      const response = await fetch('/api/pos/spoton/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          spoton_api_key: spotonCredentials.spoton_api_key,
          spoton_location_id: spotonCredentials.spoton_location_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save SpotOn credentials');
      }

      setAlert({
        type: 'success',
        message: 'SpotOn POS connected successfully!',
      });
      setRestaurant((r) => r ? { ...r, pos_type: 'spoton', pos_connected: true } : null);
      setSpotOnConnected(true);
      setSpotOnCredentials({ spoton_api_key: '', spoton_location_id: '' });
    } catch (error) {
      console.error('SpotOn connect error:', error);
      setAlert({
        type: 'error',
        message: 'Failed to connect SpotOn. Please check your credentials.',
      });
    } finally {
      setSavingSpotOn(false);
    }
  };

  const handleDisconnectPOS = async () => {
    if (!restaurant) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('restaurants')
        .update({ pos_type: 'none', pos_connected: false })
        .eq('id', restaurant.id);

      if (error) throw error;

      setAlert({
        type: 'success',
        message: 'POS disconnected successfully.',
      });
      setRestaurant((r) => r ? { ...r, pos_type: 'none', pos_connected: false } : null);
      setToastConnected(false);
      setToastCredentials({ toast_restaurant_guid: '', toast_api_key: '' });
      setSpotOnConnected(false);
      setSpotOnCredentials({ spoton_api_key: '', spoton_location_id: '' });
    } catch (error) {
      console.error('Disconnect error:', error);
      setAlert({
        type: 'error',
        message: 'Failed to disconnect POS.',
      });
    }
  };

  const handleBillingPortal = async () => {
    if (!restaurant?.stripe_customer_id) {
      setAlert({
        type: 'error',
        message: 'No billing account found.',
      });
      return;
    }

    setManagingBilling(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurant.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create billing portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Billing portal error:', error);
      setAlert({
        type: 'error',
        message: 'Failed to open billing portal.',
      });
    } finally {
      setManagingBilling(false);
    }
  };

  const handleSaveLanguageSettings = async () => {
    if (!restaurant) return;

    if ((preferredLanguage === 'es' || preferredLanguage === 'both') && !spanishAgentId.trim()) {
      setAlert({
        type: 'error',
        message: 'Please provide a Spanish Agent ID when selecting Spanish language support.',
      });
      return;
    }

    setSavingLanguage(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('restaurants')
        .update({
          preferred_language: preferredLanguage,
          retell_agent_id_es: spanishAgentId || null,
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      setAlert({
        type: 'success',
        message: 'Language settings saved successfully!',
      });
      setRestaurant((r) =>
        r
          ? {
              ...r,
              preferred_language: preferredLanguage,
              retell_agent_id_es: spanishAgentId || null,
            }
          : null
      );
    } catch (error) {
      console.error('Language settings save error:', error);
      setAlert({
        type: 'error',
        message: 'Failed to save language settings.',
      });
    } finally {
      setSavingLanguage(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl space-y-6 animate-fade-in">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <div className="h-8 w-8 mx-auto border-2 border-ringo-teal/30 border-t-ringo-teal rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const planInfo = restaurant?.plan_tier ? planNames[restaurant.plan_tier] : { name: 'No Plan', price: 'Not active' };
  const isConnected = (posId: string) => restaurant?.pos_type === posId && restaurant?.pos_connected;

  return (
    <div className="w-full max-w-4xl space-y-8 animate-fade-in px-4 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-ringo-muted mt-1">
          {restaurant ? `Managing ${restaurant.name}` : 'Manage your POS connections, billing, and preferences'}
        </p>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={cn(
            'rounded-2xl border p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2',
            alert.type === 'success'
              ? 'border-bone/20 bg-bone/[0.03]'
              : 'border-bone/20 bg-bone/[0.03]'
          )}
        >
          {alert.type === 'success' ? (
            <Check className="h-5 w-5 text-bone flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-bone flex-shrink-0 mt-0.5" />
          )}
          <p className={cn('text-sm font-medium flex-1', alert.type === 'success' ? 'text-bone' : 'text-bone')}>
            {alert.message}
          </p>
          <button
            onClick={() => setAlert(null)}
            className="text-ringo-muted hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
            <Button
              variant="secondary"
              size="sm"
              loading={managingBilling}
              onClick={handleBillingPortal}
            >
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
                    ? 'border-bone/20 bg-bone/[0.03]'
                    : 'border-ringo-border bg-ringo-card hover:border-ringo-border/80'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn('rounded-xl p-3', connected ? 'bg-bone/10' : 'bg-ringo-border/30')}>
                      {connected ? (
                        <Wifi className="h-5 w-5 text-bone" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-ringo-muted" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5">
                        <p className="text-sm font-bold text-foreground">{pos.name}</p>
                        {connected && (
                          <span className="flex items-center gap-1 rounded-full bg-bone/10 border border-bone/20 px-2 py-0.5 text-[10px] font-bold text-bone">
                            <Check className="h-2.5 w-2.5" /> Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ringo-muted mt-0.5">{pos.description}</p>
                    </div>
                  </div>
                  {connected ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDisconnectPOS}
                      className="text-bone/60 hover:text-bone"
                    >
                      Disconnect
                    </Button>
                  ) : pos.id === 'square' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={connecting === 'square'}
                      onClick={handleSquareConnect}
                    >
                      Connect <ExternalLink className="h-3 w-3" />
                    </Button>
                  ) : pos.id === 'clover' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={connecting === 'clover'}
                      onClick={handleCloverConnect}
                    >
                      Connect <ExternalLink className="h-3 w-3" />
                    </Button>
                  ) : null}
                </div>

                {/* Toast API Key Form */}
                {pos.id === 'toast' && !connected && (
                  <div className="mt-4 pt-4 border-t border-ringo-border/50 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Toast Restaurant GUID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                        value={toastCredentials.toast_restaurant_guid}
                        onChange={(e) =>
                          setToastCredentials((prev) => ({
                            ...prev,
                            toast_restaurant_guid: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-ringo-border bg-ringo-card px-3 py-2 text-sm text-foreground placeholder-ringo-muted focus:outline-none focus:ring-2 focus:ring-ringo-teal/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Toast API Key
                      </label>
                      <input
                        type="password"
                        placeholder="Your Toast API key"
                        value={toastCredentials.toast_api_key}
                        onChange={(e) =>
                          setToastCredentials((prev) => ({
                            ...prev,
                            toast_api_key: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-ringo-border bg-ringo-card px-3 py-2 text-sm text-foreground placeholder-ringo-muted focus:outline-none focus:ring-2 focus:ring-ringo-teal/50"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={savingToast}
                      onClick={handleToastConnect}
                      className="w-full"
                    >
                      Save Toast Credentials
                    </Button>
                  </div>
                )}

                {/* SpotOn API Key Form */}
                {pos.id === 'spoton' && !connected && (
                  <div className="mt-4 pt-4 border-t border-ringo-border/50 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        SpotOn API Key
                      </label>
                      <input
                        type="password"
                        placeholder="Your SpotOn API key"
                        value={spotonCredentials.spoton_api_key}
                        onChange={(e) =>
                          setSpotOnCredentials((prev) => ({
                            ...prev,
                            spoton_api_key: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-ringo-border bg-ringo-card px-3 py-2 text-sm text-foreground placeholder-ringo-muted focus:outline-none focus:ring-2 focus:ring-ringo-teal/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        SpotOn Location ID
                      </label>
                      <input
                        type="text"
                        placeholder="Your SpotOn Location ID"
                        value={spotonCredentials.spoton_location_id}
                        onChange={(e) =>
                          setSpotOnCredentials((prev) => ({
                            ...prev,
                            spoton_location_id: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-ringo-border bg-ringo-card px-3 py-2 text-sm text-foreground placeholder-ringo-muted focus:outline-none focus:ring-2 focus:ring-ringo-teal/50"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={savingSpotOn}
                      onClick={handleSpotOnConnect}
                      className="w-full"
                    >
                      Save SpotOn Credentials
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Language & Voice Agent */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">Language & Voice Agent</h2>
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-3">
              Preferred Language
            </label>
            <div className="space-y-2">
              {[
                { value: 'en' as const, label: 'English Only' },
                { value: 'es' as const, label: 'Spanish Only' },
                { value: 'both' as const, label: 'Both English & Spanish' },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-ringo-border/30 transition-colors"
                >
                  <input
                    type="radio"
                    name="language"
                    value={option.value}
                    checked={preferredLanguage === option.value}
                    onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'es' | 'both')}
                    className="h-4 w-4 cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {(preferredLanguage === 'es' || preferredLanguage === 'both') && (
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Spanish Agent ID
              </label>
              <input
                type="text"
                placeholder="agent_xxxxxxxx"
                value={spanishAgentId}
                onChange={(e) => setSpanishAgentId(e.target.value)}
                className="w-full rounded-lg border border-ringo-border bg-ringo-card px-3 py-2 text-sm text-foreground placeholder-ringo-muted focus:outline-none focus:ring-2 focus:ring-ringo-teal/50"
              />
              <p className="text-xs text-ringo-muted mt-2">
                Your Retell AI agent ID for Spanish language calls
              </p>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            loading={savingLanguage}
            onClick={handleSaveLanguageSettings}
            className="w-full"
          >
            <Globe className="h-3.5 w-3.5" /> Save Language Settings
          </Button>
        </div>
      </div>

      {/* More Settings */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">More Settings</h2>
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
      <div className="rounded-2xl border border-bone/20 bg-bone/[0.03] p-6">
        <h3 className="text-sm font-bold text-bone mb-1">Danger Zone</h3>
        <p className="text-xs text-ringo-muted mb-4">These actions are permanent and cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="danger" size="sm">
            Pause AI Agent
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-bone/60 hover:text-bone"
          >
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}
