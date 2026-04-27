// ──────────────────────────────────────────────────────────────────────────────
// /handoff — tablet view for restaurants on handoff_tablet POS mode.
//
// Use case: franchisee runs a proprietary POS we cannot push to (Caesar Vision
// Cloud, Domino Pulse, Pizza Hut Brink). Customer pays via SMS link → Square
// confirms → Square webhook routes the order into handoff_orders → this tablet
// fires a chime so staff sees the order in real time and types it into their
// POS. Mark complete dismisses the row.
//
// Auth: protected by the (dashboard) layout's auth guard. Any user with a
// profiles.restaurant_id matching the order's restaurant_id sees their own
// queue. Admins see everything.
// ──────────────────────────────────────────────────────────────────────────────

'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface HandoffOrderItem {
  name: string;
  quantity: number;
  price?: number;
  modifiers?: Array<{ name: string; price?: number }>;
  notes?: string;
}

interface HandoffOrder {
  id: string;
  restaurant_id: string;
  order_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: HandoffOrderItem[];
  total_cents: number;
  eta_minutes: number | null;
  notes: string | null;
  paid_at: string;
  completed_at: string | null;
  created_at: string;
}

// ─── Web Audio API chime — synthesized, no asset file ─────────────────────────
function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Two-tone "ding-dong" — 880Hz then 660Hz, ~600ms total.
    const tones = [
      { freq: 880, start: 0, dur: 0.22 },
      { freq: 660, start: 0.18, dur: 0.4 },
    ];
    for (const t of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = t.freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, now + t.start);
      gain.gain.exponentialRampToValueAtTime(0.18, now + t.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t.start);
      osc.stop(now + t.start + t.dur + 0.05);
    }
    // Browsers throttle AudioContext after page idle; close to free resources.
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    // Silent failure — chime is nice-to-have, not load-bearing.
  }
}

function formatPhone(raw: string | null): string {
  if (!raw) return '—';
  const d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return raw;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function HandoffPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<HandoffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ─── Initial load: figure out which restaurant + fetch open queue ──────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError('Not signed in.');
          setLoading(false);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('restaurant_id, role')
          .eq('id', user.id)
          .single();
        const rid = (profile as any)?.restaurant_id;
        if (!rid) {
          setError('Your account is not scoped to a restaurant. Ask your admin to attach a restaurant_id to your profile.');
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setRestaurantId(rid);

        const { data: rows, error: loadErr } = await supabase
          .from('handoff_orders')
          .select('*')
          .eq('restaurant_id', rid)
          .is('completed_at', null)
          .order('paid_at', { ascending: true });

        if (cancelled) return;
        if (loadErr) {
          setError(loadErr.message);
        } else {
          setOrders((rows || []) as HandoffOrder[]);
        }
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load orders.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // ─── Realtime subscription: new INSERTs play chime + prepend to list ───────
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`handoff:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'handoff_orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as HandoffOrder;
          setOrders((prev) => {
            // Defensive: if we already have this row from initial load, no-op.
            if (prev.some((o) => o.id === row.id)) return prev;
            return [...prev, row];
          });
          if (audioUnlocked) playChime();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'handoff_orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as HandoffOrder;
          setOrders((prev) => {
            // If marked complete, drop from open list.
            if (row.completed_at) return prev.filter((o) => o.id !== row.id);
            // Otherwise patch in place.
            return prev.map((o) => (o.id === row.id ? row : o));
          });
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [restaurantId, supabase, audioUnlocked]);

  // ─── Mark complete ─────────────────────────────────────────────────────────
  async function markComplete(orderId: string) {
    // Optimistic update so the tablet feels snappy.
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    const { error: updErr } = await supabase
      .from('handoff_orders')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', orderId);
    if (updErr) {
      // Revert optimistic update would require refetch; for now show alert.
      setError(`Mark complete failed: ${updErr.message}. Refresh to retry.`);
    }
  }

  // ─── Browsers block AudioContext until a user gesture. Ask once. ───────────
  function unlockAudio() {
    setAudioUnlocked(true);
    playChime();
  }

  if (loading) {
    return (
      <div className="p-6 text-stone">
        Loading handoff queue…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-bone">Handoff Queue</h1>
          <p className="text-ash mt-1 text-sm">
            Paid orders waiting for staff. Tap <strong className="text-bone">Mark complete</strong> after typing into your POS.
          </p>
        </div>
        {!audioUnlocked && (
          <button
            onClick={unlockAudio}
            className="px-4 py-2 rounded-md border border-hairline-strong text-bone text-sm hover:bg-coal transition-colors"
            type="button"
          >
            🔔 Enable chime
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-md border border-hairline-strong bg-coal text-bone">
          <strong className="block mb-1">Error</strong>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-16 text-ash">
          <div className="text-2xl mb-2">No orders waiting</div>
          <div className="text-sm">When a paid order comes in, it&apos;ll appear here with a chime.</div>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => {
            const totalDollars = (o.total_cents / 100).toFixed(2);
            return (
              <li
                key={o.id}
                className="rounded-lg border border-hairline bg-coal p-5 md:p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-bone text-lg font-semibold">
                      {o.customer_name || 'Customer'}
                    </div>
                    <div className="text-stone text-sm">
                      {formatPhone(o.customer_phone)} · {timeAgo(o.paid_at)}
                      {o.eta_minutes != null && ` · ${o.eta_minutes} min ETA`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl text-bone italic">
                      ${totalDollars}
                    </div>
                    <div className="text-stone text-xs uppercase tracking-wider">paid</div>
                  </div>
                </div>

                <ul className="space-y-1 mb-4">
                  {o.items.map((item, idx) => (
                    <li key={idx} className="text-bone">
                      <span className="text-bone font-medium">{item.quantity}x</span>{' '}
                      <span>{item.name}</span>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <span className="text-stone text-sm">
                          {' — '}
                          {item.modifiers.map((m) => m.name).join(', ')}
                        </span>
                      )}
                      {item.notes && (
                        <div className="text-ash text-sm pl-6 italic">note: {item.notes}</div>
                      )}
                    </li>
                  ))}
                </ul>

                {o.notes && (
                  <div className="text-ash text-sm mb-4 italic">
                    Order notes: {o.notes}
                  </div>
                )}

                <button
                  onClick={() => markComplete(o.id)}
                  className="w-full md:w-auto px-6 py-3 rounded-md bg-bone text-obsidian font-semibold hover:bg-chalk transition-colors"
                  type="button"
                >
                  ✓ Mark complete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
