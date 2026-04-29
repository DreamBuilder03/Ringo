import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types from database
interface OrderItemData {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  restaurant_id: string;
  items: OrderItemData[];
  total: number;
  created_at: string;
}

interface Restaurant {
  id: string;
  name: string;
}

export default async function OrderConfirmedPage({
  params,
}: {
  params: { orderId: string };
}) {
  const supabase = await createServerSupabaseClient();

  // Fetch order from database
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', params.orderId)
    .single();

  // If order not found, show error message
  if (orderError || !order) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-hidden flex flex-col">
        {/* Grid Background */}
        <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

        {/* Gradient Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-omri-teal/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-omri-teal/5 rounded-full blur-3xl" />
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <div className="border-b border-omri-border bg-background/80 backdrop-blur-sm">
            <div className="max-w-md mx-auto px-4 py-6">
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-omri-teal to-omri-teal-light flex items-center justify-center text-bone font-bold text-sm">
                  ℜ
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-omri-teal to-omri-teal-light bg-clip-text text-transparent">
                  OMRI
                </h1>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
              {/* Glass Card */}
              <div className="bg-omri-card border border-omri-border backdrop-blur-sm rounded-2xl p-6 sm:p-8">
                <div className="text-center space-y-4">
                  <p className="text-omri-muted text-sm">Order Not Found</p>
                  <h2 className="text-xl font-bold text-foreground">
                    Unable to Load Order
                  </h2>
                  <p className="text-omri-muted text-sm">
                    We couldn't find this order. Please check the link and try again.
                  </p>
                </div>
              </div>

              {/* Footer Branding */}
              <div className="mt-8 text-center">
                <p className="text-xs text-omri-muted">
                  Powered by{' '}
                  <span className="text-foreground/60 font-semibold">OMRI</span>
                </p>
                <p className="text-xs text-omri-muted/50 mt-2">
                  AI Voice Ordering for Restaurants
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch restaurant name
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('id', order.restaurant_id)
    .single();

  const restaurantName = restaurant?.name || 'Restaurant';
  const items: OrderItemData[] = order.items || [];
  const total = order.total || 0;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden flex flex-col">
      {/* Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-omri-teal/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-omri-teal/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="border-b border-omri-border bg-background/80 backdrop-blur-sm">
          <div className="max-w-md mx-auto px-4 py-6">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-omri-teal to-omri-teal-light flex items-center justify-center text-bone font-bold text-sm">
                ℜ
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-omri-teal to-omri-teal-light bg-clip-text text-transparent">
                OMRI
              </h1>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            {/* Glass Card */}
            <div className="bg-omri-card border border-omri-border backdrop-blur-sm rounded-2xl p-6 sm:p-8">
              {/* Success Section */}
              <div className="text-center space-y-6">
                {/* Green Checkmark */}
                <div className="flex justify-center">
                  <div className="relative">
                    <CheckCircle2
                      className="w-20 h-20 text-omri-teal-light animate-pulse"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>

                {/* Main Heading */}
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">
                    Payment Confirmed!
                  </h2>
                  <p className="text-omri-muted text-sm">
                    Your order has been placed successfully
                  </p>
                </div>

                {/* Order Details Card */}
                <div className="bg-background/50 border border-omri-border rounded-xl p-4 space-y-3 text-left">
                  {/* Restaurant Name */}
                  <div>
                    <p className="text-omri-muted text-xs uppercase tracking-wide font-medium">
                      Restaurant
                    </p>
                    <p className="text-foreground font-semibold text-base mt-1">
                      {restaurantName}
                    </p>
                  </div>

                  {/* Order Items */}
                  <div className="border-t border-omri-border pt-3">
                    <p className="text-omri-muted text-xs uppercase tracking-wide font-medium mb-2">
                      Order Items
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-start text-sm"
                        >
                          <div>
                            <p className="text-foreground font-medium">
                              {item.name}
                            </p>
                            <p className="text-omri-muted text-xs">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-foreground font-medium text-right">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t border-omri-border pt-3 flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-omri-teal-light text-xl font-bold">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Status Message */}
                <div className="bg-omri-teal/10 border border-omri-teal/30 rounded-lg p-4">
                  <p className="text-omri-muted text-sm">
                    Your order is being prepared. You'll receive updates via text message.
                  </p>
                </div>

                {/* Order ID */}
                <div className="pt-2">
                  <p className="text-omri-muted text-xs">Order ID</p>
                  <p className="text-foreground/70 font-mono text-xs mt-1">
                    {params.orderId}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Branding */}
            <div className="mt-8 text-center">
              <p className="text-xs text-omri-muted">
                Powered by{' '}
                <span className="text-foreground/60 font-semibold">OMRI</span>
              </p>
              <p className="text-xs text-omri-muted/50 mt-2">
                AI Voice Ordering for Restaurants
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
