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

export interface PricingTier {
  name: string;
  tier: PlanTier;
  price: number;
  callsPerDay: string;
  features: string[];
  stripePriceId: string;
}
