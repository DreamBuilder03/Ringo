export type PlanTier = 'starter' | 'growth' | 'pro';
export type CallOutcome = 'order_placed' | 'inquiry' | 'missed' | 'upsell_only';
export type PosType = 'square' | 'toast' | 'clover' | 'none';
export type UserRole = 'admin' | 'restaurant';
export type HealthStatus = 'green' | 'yellow' | 'red';

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  pos_type: PosType;
  pos_connected: boolean;
  retell_agent_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan_tier: PlanTier | null;
  square_access_token: string | null;
  square_location_id: string | null;
  created_at: string;
  owner_user_id: string;
}

export interface Call {
  id: string;
  restaurant_id: string;
  retell_call_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  call_outcome: CallOutcome;
  order_total: number;
  upsell_total: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  call_id: string;
  restaurant_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  is_upsell: boolean;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  restaurant_id: string | null;
  full_name: string | null;
  email: string;
  created_at: string;
}

export interface DashboardStats {
  totalCalls: number;
  ordersTaken: number;
  revenueCapured: number;
  upsellRevenue: number;
}

export interface CallWithItems extends Call {
  order_items?: OrderItem[];
}

export interface RestaurantWithStats extends Restaurant {
  calls_today: number;
  revenue_today: number;
  last_call_time: string | null;
  health_status: HealthStatus;
}

export type OrderStatus = 'building' | 'pending' | 'payment_sent' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  restaurant_id: string;
  call_id: string | null;
  customer_phone: string;
  items: OrderItemData[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  payment_intent_id: string | null;
  payment_link_sent_at: string | null;
  paid_at: string | null;
  pos_order_id: string | null;
  pos_pushed_at: string | null;
  created_at: string;
}

export interface OrderItemData {
  name: string;
  quantity: number;
  price: number;
  is_upsell: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  category: string | null;
  price: number;
  description: string | null;
  modifiers: MenuModifier[] | null;
  available: boolean;
  created_at: string;
}

export interface MenuModifier {
  name: string;
  price: number;
}

export interface PricingTier {
  name: string;
  tier: PlanTier;
  price: number;
  callsPerDay: string;
  features: string[];
  stripePriceId: string;
}
