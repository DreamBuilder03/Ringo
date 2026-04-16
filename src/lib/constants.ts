import type { PricingTier } from '@/types/database';

export const BRAND = {
  name: 'Ringo',
  tagline: 'The phone rings. Ringo handles it.',
  domain: 'useringo.ai',
  colors: {
    dark: '#0A0A0A',
    teal: '#F3EEE3',
    amber: '#F3EEE3',
    purple: '#9C9C9C',
  },
} as const;

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    tier: 'starter',
    price: 799,
    callsPerDay: 'Up to 100 calls/day',
    features: [
      'Voice AI Agent',
      'SMS payment links',
      'Dashboard & analytics',
      'Bilingual (EN/ES)',
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
      'POS integration',
      'Smart upselling engine',
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
