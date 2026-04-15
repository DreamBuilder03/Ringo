'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserRestaurant } from '@/lib/queries';
import { useRestaurantStore } from '@/stores/restaurant-store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  Repeat2,
} from 'lucide-react';
import type { Order, OrderStatus } from '@/types/database';

const STATUS_CONFIG: Record<OrderStatus, { color: string; label: string }> = {
  building: { color: 'bg-chalk0', label: 'Building' },
  pending: { color: 'bg-bone', label: 'Pending' },
  payment_sent: { color: 'bg-bone', label: 'Payment Sent' },
  paid: { color: 'bg-bone', label: 'Paid' },
  preparing: { color: 'bg-bone', label: 'Preparing' },
  ready: { color: 'bg-bone', label: 'Ready' },
  completed: { color: 'bg-bone', label: 'Completed' },
  cancelled: { color: 'bg-bone', label: 'Cancelled' },
};

type SortOption = 'spend' | 'count' | 'recent';

interface CustomerData {
  phone: string;
  orderCount: number;
  totalSpend: number;
  averageOrderValue: number;
  firstOrderDate: string;
  mostRecentOrderDate: string;
  orders: Order[];
  mostOrderedItems: Array<{ name: string; count: number }>;
}

function maskPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  const last4 = cleaned.slice(-4);
  return `(***) ***-${last4}`;
}

function getCustomerBadge(orderCount: number, totalSpend: number): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  if (orderCount >= 5 || totalSpend >= 500) {
    return { label: 'VIP', variant: 'default' };
  } else if (orderCount >= 2) {
    return { label: 'Regular', variant: 'secondary' };
  }
  return { label: 'New', variant: 'outline' };
}

function getMostOrderedItems(
  orders: Order[]
): Array<{ name: string; count: number }> {
  const itemCounts: Record<string, number> = {};

  orders.forEach((order) => {
    order.items.forEach((item) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });

  return Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

interface CustomerCardProps {
  customer: CustomerData;
  isExpanded: boolean;
  onToggle: () => void;
}

function CustomerCard({ customer, isExpanded, onToggle }: CustomerCardProps) {
  const [showFullPhone, setShowFullPhone] = useState(false);
  const badge = getCustomerBadge(customer.orderCount, customer.totalSpend);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 hover:bg-ringo-card/50 transition-colors text-left"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left side: Phone, badge, stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullPhone(!showFullPhone);
                }}
                className="font-mono text-sm font-semibold text-foreground hover:text-ringo-teal transition-colors"
              >
                {showFullPhone ? customer.phone : maskPhoneNumber(customer.phone)}
              </button>
              <Badge variant={badge.variant}>
                {badge.label}
              </Badge>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-ringo-muted text-xs">Orders</p>
                <p className="text-foreground font-semibold">{customer.orderCount}</p>
              </div>
              <div>
                <p className="text-ringo-muted text-xs">Avg. Order Value</p>
                <p className="text-foreground font-semibold">{formatCurrency(customer.averageOrderValue)}</p>
              </div>
              <div>
                <p className="text-ringo-muted text-xs">First Order</p>
                <p className="text-foreground text-xs">{format(new Date(customer.firstOrderDate), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-ringo-muted text-xs">Most Recent</p>
                <p className="text-foreground text-xs">{format(new Date(customer.mostRecentOrderDate), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Right side: Total spend and expand icon */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-sm text-ringo-muted">Total Spend</p>
              <p className="text-lg font-bold text-ringo-teal">
                {formatCurrency(customer.totalSpend)}
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
        <div className="border-t border-ringo-border px-4 py-4 space-y-4 bg-ringo-card/30">
          {/* Most ordered items */}
          {customer.mostOrderedItems.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Top Items</h4>
              <div className="space-y-2">
                {customer.mostOrderedItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg text-sm bg-ringo-card/50"
                  >
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-ringo-muted text-xs">Ordered {item.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order history */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Order History</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {customer.orders.length > 0 ? (
                customer.orders.map((order) => {
                  const config = STATUS_CONFIG[order.status];
                  return (
                    <div
                      key={order.id}
                      className="p-3 rounded-lg bg-ringo-card/50 border border-ringo-border/30"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                          <p className="text-xs text-ringo-muted mt-1">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="default" className="mb-1 block">
                            {STATUS_CONFIG[order.status].label}
                          </Badge>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(order.total)}
                          </p>
                        </div>
                      </div>

                      {/* Items in order */}
                      <div className="space-y-1 text-xs text-ringo-muted">
                        {order.items.slice(0, 3).map((item, i) => (
                          <p key={i} className="text-foreground/80">
                            {item.quantity}x {item.name}
                          </p>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-ringo-muted/60">+{order.items.length - 3} more items</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-ringo-muted">No orders found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

function StatsCard({ label, value, icon, description }: StatsCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ringo-muted mb-2">
            {label}
          </p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-ringo-muted mt-1">{description}</p>
          )}
        </div>
        <div className="text-ringo-muted/40 flex-shrink-0">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('spend');
  const [expandedPhones, setExpandedPhones] = useState<Set<string>>(new Set());
  const supabaseRef = useRef(createClient());
  const currentRestaurant = useRestaurantStore((s) => s.currentRestaurant);
  const setCurrentRestaurant = useRestaurantStore((s) => s.setCurrentRestaurant);

  // Load customers
  useEffect(() => {
    async function loadCustomers() {
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

      // Fetch all orders for this restaurant (excluding building status)
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, customer_phone, items, total, status, created_at')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'building')
        .order('created_at', { ascending: false });

      if (error || !orders) {
        setLoading(false);
        return;
      }

      // Group by customer phone and compute aggregates
      const customerMap = new Map<string, Order[]>();
      orders.forEach((order) => {
        const phone = order.customer_phone;
        if (!customerMap.has(phone)) {
          customerMap.set(phone, []);
        }
        customerMap.get(phone)!.push(order as Order);
      });

      // Convert to CustomerData array
      const customerDataArray: CustomerData[] = Array.from(customerMap.entries()).map(
        ([phone, phoneOrders]) => {
          const orderCount = phoneOrders.length;
          const totalSpend = phoneOrders.reduce((sum, o) => sum + o.total, 0);
          const averageOrderValue = totalSpend / orderCount;
          const firstOrderDate = phoneOrders[phoneOrders.length - 1].created_at;
          const mostRecentOrderDate = phoneOrders[0].created_at;
          const mostOrderedItems = getMostOrderedItems(phoneOrders);

          return {
            phone,
            orderCount,
            totalSpend,
            averageOrderValue,
            firstOrderDate,
            mostRecentOrderDate,
            orders: phoneOrders,
            mostOrderedItems,
          };
        }
      );

      setCustomers(customerDataArray);
      setLoading(false);
    }

    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRestaurant?.id]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...customers];

    // Apply search filter
    if (searchPhone) {
      const cleanPhone = searchPhone.replace(/\D/g, '');
      filtered = filtered.filter((c) =>
        c.phone.replace(/\D/g, '').includes(cleanPhone)
      );
    }

    // Apply sorting
    if (sortBy === 'spend') {
      filtered.sort((a, b) => b.totalSpend - a.totalSpend);
    } else if (sortBy === 'count') {
      filtered.sort((a, b) => b.orderCount - a.orderCount);
    } else if (sortBy === 'recent') {
      filtered.sort(
        (a, b) =>
          new Date(b.mostRecentOrderDate).getTime() -
          new Date(a.mostRecentOrderDate).getTime()
      );
    }

    setFilteredCustomers(filtered);
  }, [customers, searchPhone, sortBy]);

  // Calculate stats
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpend, 0);
  const averageLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const repeatCustomers = customers.filter((c) => c.orderCount >= 2).length;
  const repeatRate =
    totalCustomers > 0
      ? ((repeatCustomers / totalCustomers) * 100).toFixed(1)
      : '0';

  const toggleExpanded = (phone: string) => {
    setExpandedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) {
        next.delete(phone);
      } else {
        next.add(phone);
      }
      return next;
    });
  };

  const hasCustomers = customers.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-ringo-muted mt-1">
            {totalCustomers > 0
              ? `${totalCustomers} unique customers`
              : 'No customers yet'}
          </p>
        </div>
      </div>

      {/* Stats bar */}
      {hasCustomers && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            label="Total Customers"
            value={totalCustomers}
            icon={<Users className="h-8 w-8" />}
            description={`${repeatCustomers} are repeat customers`}
          />
          <StatsCard
            label="Average Lifetime Value"
            value={formatCurrency(averageLifetimeValue)}
            icon={<TrendingUp className="h-8 w-8" />}
            description="Per customer"
          />
          <StatsCard
            label="Repeat Customer Rate"
            value={`${repeatRate}%`}
            icon={<Repeat2 className="h-8 w-8" />}
            description="2+ orders"
          />
        </div>
      )}

      {/* Search */}
      {hasCustomers && (
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-ringo-muted" />
          <input
            type="text"
            placeholder="Search by phone number..."
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ringo-border bg-ringo-card text-foreground placeholder-ringo-muted focus:outline-none focus:ring-2 focus:ring-ringo-teal/50 transition-all"
          />
        </div>
      )}

      {/* Sort buttons */}
      {hasCustomers && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => setSortBy('spend')}
            className={cn(
              'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              sortBy === 'spend'
                ? 'bg-ringo-teal text-bone'
                : 'bg-ringo-card border border-ringo-border text-ringo-muted hover:text-foreground'
            )}
          >
            Highest Spend
          </button>
          <button
            onClick={() => setSortBy('count')}
            className={cn(
              'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              sortBy === 'count'
                ? 'bg-ringo-teal text-bone'
                : 'bg-ringo-card border border-ringo-border text-ringo-muted hover:text-foreground'
            )}
          >
            Most Orders
          </button>
          <button
            onClick={() => setSortBy('recent')}
            className={cn(
              'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              sortBy === 'recent'
                ? 'bg-ringo-teal text-bone'
                : 'bg-ringo-card border border-ringo-border text-ringo-muted hover:text-foreground'
            )}
          >
            Most Recent
          </button>
        </div>
      )}

      {/* Customers list */}
      {loading ? (
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <div className="h-8 w-8 mx-auto border-2 border-ringo-teal/30 border-t-ringo-teal rounded-full animate-spin mb-3" />
          <p className="text-sm text-ringo-muted">Loading customers...</p>
        </div>
      ) : !hasCustomers ? (
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <p className="text-sm text-ringo-muted">
            No customers yet. When orders start coming in, your customer base
            will appear here.
          </p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <p className="text-sm text-ringo-muted">
            No customers match your search.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.phone}
              customer={customer}
              isExpanded={expandedPhones.has(customer.phone)}
              onToggle={() => toggleExpanded(customer.phone)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
