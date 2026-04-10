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
    price: 299,
    callsPerDay: 'Up to 100 calls/day',
    features: [
      'Voice AI Agent',
      'Call transcripts & analytics',
      'POS integration',
      'Email support',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
  },
  {
    name: 'Growth',
    tier: 'growth',
    price: 599,
    callsPerDay: 'Up to 250 calls/day',
    features: [
      'Voice AI + Chat AI Agent',
      'Smart upselling engine',
      'Advanced analytics & ROI dashboard',
      'Custom voice persona',
      'Priority support',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || '',
  },
  {
    name: 'Enterprise',
    tier: 'pro',
    price: 0,
    callsPerDay: 'Unlimited calls',
    features: [
      'Everything in Growth',
      'Multi-location support',
      'Dedicated account manager',
      'Custom integrations',
      'White-glove onboarding',
      'SLA guarantee',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
  },
];

export const POS_OPTIONS = [
  { value: 'square', label: 'Square' },
  { value: 'toast', label: 'Toast' },
  { value: 'clover', label: 'Clover' },
  { value: 'spoton', label: 'SpotOn' },
  { value: 'aloha', label: 'Aloha' },
  { value: 'none', label: 'Other / None' },
] as const;
