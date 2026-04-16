'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserRestaurant } from '@/lib/queries';
import { useRestaurantStore } from '@/stores/restaurant-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Zap,
} from 'lucide-react';
import type { Order, OrderStatus } from '@/types/database';

const STATUS_CONFIG: Record<OrderStatus, { badge: string; color: string; label: string }> = {
  building: { badge: 'default', color: 'bg-chalk0', label: 'Building' },
  pending: { badge: 'warning', color: 'bg-bone', label: 'Pending' },
  payment_sent: { badge: 'info', color: 'bg-bone', label: 'Payment Sent' },
  paid: { badge: 'success', color: 'bg-bone', label: 'Paid' },
  preparing: { badge: 'warning', color: 'bg-bone', label: 'Preparing' },
  ready: { badge: 'success', color: 'bg-bone', label: 'Ready' },
  completed: { badge: 'success', color: 'bg-bone', label: 'Completed' },
  cancelled: { badge: 'danger', color: 'bg-bone', label: 'Cancelled' },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'building', label: 'Building' },
  { value: 'pending', label: 'Pending' },
  { value: 'payment_sent', label: 'Payment Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function maskPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  const last4 = cleaned.slice(-4);
  return `***-***-${last4}`;
}

interface OrderCardProps {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
}

function OrderCard({ order, isExpanded, onToggle }: OrderCardProps) {
  const config = STATUS_CONFIG[order.status];

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 hover:bg-graphite/40 transition-colors text-left"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left side: ID, Status, Phone */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="font-mono text-sm font-semibold text-foreground">
                #{order.id.slice(0, 8).toUpperCase()}
              </div>
              <Badge variant={config.badge as any}>
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-ringo-muted">
              {maskPhoneNumber(order.customer_phone)}
            </p>
            <p className="text-xs text-ringo-muted/60 mt-1">
              {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>

          {/* Right side: Total and expand icon */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-sm text-ringo-muted">Total</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(order.total)}
              </p>
            </div>
            <div className="text-ringo-muted">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-smoke px-4 py-4 space-y-4 bg-graphite/20">
          {/* Items */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Items</h4>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start justify-between p-2 rounded-lg text-sm',
                    item.is_upsell ? 'bg-bone/10 border border-bone/30' : 'bg-graphite/30'
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">{item.name}</span>
                      {item.is_upsell && (
                        <Zap className="h-3 w-3 text-bone" />
                      )}
                    </div>
                    <span className="text-xs text-ringo-muted">x{item.quantity}</span>
                  </div>
                  <span className="text-foreground font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="bg-graphite/30 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ringo-muted">Subtotal</span>
              <span className="text-foreground font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ringo-muted">Tax</span>
              <span className="text-foreground font-medium">{formatCurrency(order.tax)}</span>
            </div>
            <div className="border-t border-smoke pt-2 flex justify-between">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-sm font-bold text-bone">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Timeline</h4>
            <div className="space-y-2 text-sm">
              {order.created_at && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-bone mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-ringo-muted text-xs">Created</p>
                    <p className="text-foreground">
                      {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              )}

              {order.payment_link_sent_at && (
                <div className="flex items-start gap-3">
                  <CreditCard className="h-4 w-4 text-bone mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-ringo-muted text-xs">Payment Link Sent</p>
                    <p className="text-foreground">
                      {format(new Date(order.payment_link_sent_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              )}

              {order.paid_at && (
                <div className="flex items-start gap-3">
                  <CreditCard className="h-4 w-4 text-bone mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-ringo-muted text-xs">Payment Received</p>
                    <p className="text-foreground">
                      {format(new Date(order.paid_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              )}

              {order.pos_pushed_at && (
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-bone mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-ringo-muted text-xs">POS Pushed</p>
                    <p className="text-foreground">
                      {format(new Date(order.pos_pushed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {order.pos_order_id && (
                      <p className="text-ringo-muted text-xs mt-1">
                        POS ID: <span className="font-mono">{order.pos_order_id}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional info */}
          <div className="pt-2 space-y-2 text-xs">
            {order.call_id && (
              <p className="text-ringo-muted">
                Call ID: <span className="font-mono text-foreground">{order.call_id.slice(0, 8)}</span>
              </p>
            )}
            {order.payment_intent_id && (
              <p className="text-ringo-muted">
                Payment ID: <span className="font-mono text-foreground">{order.payment_intent_id.slice(0, 12)}...</span>
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchPhone, setSearchPhone] = useState('');
  const [page, setPage] = useState(0);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const pageSize = 20;
  const supabaseRef = useRef(createClient());
  const subscriptionRef = useRef<any>(null);
  const currentRestaurant = useRestaurantStore((s) => s.currentRestaurant);
  const setCurrentRestaurant = useRestaurantStore((s) => s.setCurrentRestaurant);

  // Load orders
  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      const supabase = supabaseRef.current;
      let restaurant = currentRestaurant;
      if (!restaurant) {
        restaurant = await getUserRestaurant(supabase);
        if (restaurant) setCurrentRestaurant(restaurant);
      }
      if (!restaurant) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('restaurant_id', restaurant.id);

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchPhone) {
        const cleanPhone = searchPhone.replace(/\D/g, '');
        query = query.ilike('customer_phone', `%${cleanPhone}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (!error) {
        setOrders((data || []) as Order[]);
        setTotalCount(count || 0);
      }
      setLoading(false);
    }

    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchPhone, page, currentRestaurant?.id]);

  // Subscribe to real-time changes
  useEffect(() => {
    async function subscribeToOrders() {
      const supabase = supabaseRef.current;
      let restaurant = currentRestaurant;
      if (!restaurant) {
        restaurant = await getUserRestaurant(supabase);
      }
      if (!restaurant) return;

      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      subscriptionRef.current = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurant.id}`,
          },
          () => {
            // Reload orders on any change
            const loadOrders = async () => {
              let restaurant = currentRestaurant;
              if (!restaurant) {
                restaurant = await getUserRestaurant(supabase);
              }
              if (!restaurant) return;

              let query = supabase
                .from('orders')
                .select('*', { count: 'exact' })
                .eq('restaurant_id', restaurant.id);

              if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
              }

              if (searchPhone) {
                const cleanPhone = searchPhone.replace(/\D/g, '');
                query = query.ilike('customer_phone', `%${cleanPhone}%`);
              }

              const { data, count } = await query
                .order('created_at', { ascending: false })
                .range(page * pageSize, page * pageSize + pageSize - 1);

              setOrders((data || []) as Order[]);
              setTotalCount(count || 0);
            };
            loadOrders();
          }
        )
        .subscribe();
    }

    subscribeToOrders();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchPhone, page, currentRestaurant?.id]);

  const toggleExpanded = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasOrders = orders.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm text-ringo-muted mt-1">
            {totalCount > 0 ? `${totalCount} total orders` : 'No orders yet'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-ringo-muted" />
        <input
          type="text"
          placeholder="Search by phone number..."
          value={searchPhone}
          onChange={(e) => {
            setSearchPhone(e.target.value);
            setPage(0);
          }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-smoke bg-coal text-foreground placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-bone/30 focus:border-bone/40 transition-colors transition-opacity"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setStatusFilter(filter.value);
              setPage(0);
            }}
            className={cn(
              'px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors transition-opacity whitespace-nowrap',
              statusFilter === filter.value
                ? 'bg-bone text-obsidian'
                : 'bg-coal border border-smoke text-ringo-muted hover:text-foreground'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="rounded-2xl border border-smoke bg-coal p-12 text-center">
          <div className="h-8 w-8 mx-auto border-2 border-bone/20 border-t-bone rounded-full animate-spin mb-3" />
          <p className="text-sm text-ringo-muted">Loading orders...</p>
        </div>
      ) : !hasOrders ? (
        <div className="rounded-2xl border border-smoke bg-coal p-12 text-center">
          <p className="text-sm text-ringo-muted">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isExpanded={expandedOrderIds.has(order.id)}
              onToggle={() => toggleExpanded(order.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-coal border border-smoke text-ringo-muted disabled:opacity-30 min-h-[44px] min-w-[44px]"
          >
            Previous
          </button>
          <span className="text-xs text-ringo-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-coal border border-smoke text-ringo-muted disabled:opacity-30 min-h-[44px] min-w-[44px]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
