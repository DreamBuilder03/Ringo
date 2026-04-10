'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, ExternalLink } from 'lucide-react';

const posIntegrations = [
  {
    id: 'square',
    name: 'Square',
    description: 'Connect your Square POS for automatic menu sync and order pushing.',
    connected: true,
  },
  {
    id: 'toast',
    name: 'Toast',
    description: 'Connect your Toast POS to sync menus and push orders.',
    connected: false,
  },
  {
    id: 'clover',
    name: 'Clover',
    description: 'Connect your Clover POS to sync menus and push orders.',
    connected: false,
  },
];

export default function SettingsPage() {
  const [connecting, setConnecting] = useState<string | null>(null);

  async function handleConnect(posId: string) {
    setConnecting(posId);
    // TODO: Redirect to OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setConnecting(null);
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-ringo-muted mt-1">
          Manage your POS connections and preferences
        </p>
      </div>

      {/* POS Integrations */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">POS Integrations</h2>
        <div className="space-y-3">
          {posIntegrations.map((pos) => (
            <Card key={pos.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-2.5 ${pos.connected ? 'bg-emerald-400/10' : 'bg-ringo-border'}`}>
                  {pos.connected ? (
                    <Wifi className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-ringo-muted" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{pos.name}</p>
                    <Badge variant={pos.connected ? 'success' : 'default'}>
                      {pos.connected ? 'Connected' : 'Not Connected'}
                    </Badge>
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
                  <>
                    Manage <ExternalLink className="h-3 w-3" />
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Account */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Account</h2>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Current Plan</p>
              <p className="text-xs text-ringo-muted mt-0.5">Growth &mdash; $1,499/mo</p>
            </div>
            <Button variant="secondary" size="sm">
              Manage Billing
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
