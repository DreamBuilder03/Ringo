'use client';

import { useEffect, useState } from 'react';
import { useStripe, useElements, CardElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Types from database
interface OrderItemData {
  name: string;
  quantity: number;
  price: number;
  is_upsell: boolean;
}

interface Order {
  id: string;
  restaurant_id: string;
  customer_phone: string;
  items: OrderItemData[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'payment_sent' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  restaurants?: { name: string; phone: string; address: string };
}

// Types for page states
type PageState = 'loading' | 'error' | 'already_paid' | 'payment_form' | 'processing' | 'success';

// Skeleton loader component
function OrderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gradient-to-r from-bone/5 to-bone/10 rounded-lg animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 bg-gradient-to-r from-bone/5 to-bone/10 rounded animate-pulse" />
        ))}
      </div>
      <div className="h-32 bg-gradient-to-r from-bone/5 to-bone/10 rounded-lg animate-pulse" />
    </div>
  );
}

// Payment form component
function PaymentForm({ order, onSuccess }: { order: Order; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage('Payment system not ready. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Step 1: Get clientSecret from backend
      const clientSecretRes = await fetch(`/api/orders/${order.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: order.total }),
      });

      if (!clientSecretRes.ok) {
        throw new Error('Failed to initialize payment');
      }

      const { clientSecret } = await clientSecretRes.json();

      // Step 2: Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const confirmRes = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            phone: order.customer_phone,
          },
        },
      });

      if (confirmRes.error) {
        setErrorMessage(confirmRes.error.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (confirmRes.paymentIntent?.status !== 'succeeded') {
        setErrorMessage('Payment was not completed. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Step 3: Update order in database with paymentIntentId
      const updateRes = await fetch(`/api/orders/${order.id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: confirmRes.paymentIntent.id,
        }),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to confirm payment on server');
      }

      // Success!
      onSuccess();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'An error occurred. Please try again.'
      );
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-bone">Order Summary</h2>

        {/* Order items */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-start text-sm"
            >
              <div>
                <p className="text-bone font-medium">{item.name}</p>
                <p className="text-bone/60 text-xs">Qty: {item.quantity}</p>
              </div>
              <p className="text-bone font-medium">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-bone/10 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-bone/70">Subtotal</span>
            <span className="text-bone">${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-bone/70">Tax</span>
            <span className="text-bone">${order.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-bone/10 pt-3 mt-3">
            <span className="text-base font-semibold text-bone">Total</span>
            <span className="text-xl font-bold text-bone">
              ${order.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Stripe Card Element */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-bone">Card Details</label>
        <div className="bg-bone/[0.03] border border-bone/[0.06] rounded-xl p-4 focus-within:border-bone/50 focus-within:bg-bone/[0.05] transition-all">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#F3EEE3',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  '::placeholder': {
                    color: 'rgba(255, 255, 255, 0.4)',
                  },
                },
                invalid: {
                  color: '#F3EEE3',
                },
              },
              hidePostalCode: true,
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-bone/10 border border-bone/30 rounded-lg p-4">
          <p className="text-bone text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-bone hover:bg-bone disabled:bg-bone/50 disabled:cursor-not-allowed text-bone font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px]"
      >
        {isProcessing ? (
          <>
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </>
        ) : (
          `Pay $${order.total.toFixed(2)}`
        )}
      </button>

      <p className="text-xs text-bone/50 text-center">
        Secure payment powered by Stripe
      </p>
    </form>
  );
}

// Success state component
function SuccessState({ order }: { order: Order }) {
  return (
    <div className="text-center space-y-6">
      {/* Checkmark Animation */}
      <div className="flex justify-center">
        <div className="relative w-20 h-20">
          <svg
            className="w-20 h-20 text-bone animate-scale-in"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="12" cy="12" r="11" stroke="currentColor" fill="teal" opacity={0.1} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4"
              stroke="currentColor"
              strokeWidth={2}
            />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-bone">Payment Successful!</h2>
        <p className="text-bone/70">Your order has been placed and confirmed.</p>
      </div>

      {/* Order Details */}
      <div className="bg-bone/[0.03] border border-bone/[0.06] rounded-2xl p-6 space-y-4 text-left">
        <div>
          <p className="text-bone/60 text-sm">Order ID</p>
          <p className="text-bone font-mono text-sm">{order.id}</p>
        </div>
        {order.restaurants && (
          <div>
            <p className="text-bone/60 text-sm">Restaurant</p>
            <p className="text-bone font-medium">{order.restaurants.name}</p>
          </div>
        )}
        <div>
          <p className="text-bone/60 text-sm">Total Paid</p>
          <p className="text-bone text-lg font-bold text-bone">
            ${order.total.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-bone/60 text-sm">Status</p>
          <p className="text-bone capitalize">{order.status}</p>
        </div>
      </div>

      <p className="text-sm text-bone/60">
        You'll receive a text update when your order is ready.
      </p>
    </div>
  );
}

// Error state component
function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-bone/10 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-bone"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-bone">Unable to Process</h2>
        <p className="text-bone/70">{message}</p>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="w-full bg-bone hover:bg-bone text-bone font-semibold py-3 px-4 rounded-xl transition-all min-h-[48px]"
      >
        Try Again
      </button>
    </div>
  );
}

// Main page component (wrapped in client provider)
function PaymentPageContent({ orderId }: { orderId: string }) {
  const [state, setState] = useState<PageState>('loading');
  const [order, setOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders?id=${orderId}`);

        if (!res.ok) {
          setState('error');
          setErrorMessage('Order not found. Please check the payment link and try again.');
          return;
        }

        const json = await res.json();
        const data: Order = json.order;

        if (!data) {
          setState('error');
          setErrorMessage('Order not found. Please check the payment link and try again.');
          return;
        }

        if (data.status === 'paid' || data.status === 'preparing' || data.status === 'ready' || data.status === 'completed') {
          setState('already_paid');
          setOrder(data);
          return;
        }

        setOrder(data);
        setState('payment_form');
      } catch (error) {
        setState('error');
        setErrorMessage('Failed to load order. Please try again.');
      }
    };

    fetchOrder();
  }, [orderId]);

  const handlePaymentSuccess = () => {
    if (order) {
      setOrder({ ...order, status: 'paid' });
    }
    setState('success');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-bone overflow-hidden">
      {/* Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-bone/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-bone/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="border-b border-bone/5 bg-zinc-950/80 backdrop-blur-sm">
          <div className="max-w-md mx-auto px-4 py-6">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bone to-bone flex items-center justify-center text-bone font-bold text-sm">
                ℜ
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-bone to-bone bg-clip-text text-transparent">
                Ringo
              </h1>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            {/* Glass Card */}
            <div className="bg-bone/[0.03] border border-bone/[0.06] backdrop-blur-sm rounded-2xl p-6 sm:p-8">
              {state === 'loading' && <OrderSkeleton />}

              {state === 'error' && <ErrorState message={errorMessage} />}

              {state === 'already_paid' && order && <SuccessState order={order} />}

              {state === 'payment_form' && order && (
                <>
                  {order.restaurants?.name && (
                    <div className="mb-6 text-center">
                      <h2 className="text-xl font-bold text-bone">{order.restaurants.name}</h2>
                      <p className="text-bone/50 text-sm mt-1">Complete your order payment</p>
                    </div>
                  )}
                  <PaymentForm order={order} onSuccess={handlePaymentSuccess} />
                </>
              )}

              {state === 'success' && order && <SuccessState order={order} />}
            </div>

            {/* Footer Branding */}
            <div className="mt-8 text-center">
              <p className="text-xs text-bone/40">
                Powered by{' '}
                <span className="text-bone/60 font-semibold">Ringo</span>
              </p>
              <p className="text-xs text-bone/30 mt-2">
                AI Voice Ordering for Restaurants
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        :global(.animate-scale-in) {
          animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}

// Export page component with Stripe wrapper
export default function PaymentPage({ params }: { params: { orderId: string } }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentPageContent orderId={params.orderId} />
    </Elements>
  );
}
