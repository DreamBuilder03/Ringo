import type { PricingTier } from '@/types/database';

export const BRAND = {
  name: 'Ringo',
  tagline: 'The phone rings. Ringo handles it.',
  domain: 'useringo.ai',
  colors: {
    dark: '#0D0D12',
    teal: '#1D9E75',
    amber: '#EF9F27',
    purple: '#3C3489',
  },
} as const;

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    tier: 'starter',
    price: 799,
    callsPerDay: 'Up to 100 calls/day',
    features: [
      'AI-powered phone ordering',
      'Call transcripts & analytics',
      'Basic POS integration',
      'Email support',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
  },
  {
    name: 'Growth',
    tier: 'growth',
    price: 1499,
    callsPerDay: 'Up to 250 calls/day',
    features: [
      'Everything in Starter',
      'Smart upselling engine',
      'Peak hour analytics',
      'Priority support',
      'Custom voice persona',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || '',
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: 2299,
    callsPerDay: 'Unlimited calls',
    features: [
      'Everything in Growth',
      'Multi-location support',
      'Advanced ROI reporting',
      'Dedicated account manager',
      'Custom integrations',
      'White-glove onboarding',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
  },
];

export const POS_OPTIONS = [
  { value: 'square', label: 'Square' },
  { value: 'toast', label: 'Toast' },
  { value: 'clover', label: 'Clover' },
  { value: 'none', label: 'No POS System' },
] as const;
