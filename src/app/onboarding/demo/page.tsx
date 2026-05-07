// Demo onboarding flow — same UX as /onboarding but every backend write is
// short-circuited. Use this to:
//   - Test changes to the onboarding flow without polluting Supabase auth users
//   - Walk a prospect or stakeholder through the flow live without committing
//     anything to the DB
//   - Repeat the flow as many times as you want
//
// Both routes share src/components/onboarding/onboarding-flow.tsx — every
// change to the real flow updates this demo automatically.
import type { Metadata } from 'next';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

export const metadata: Metadata = {
  title: 'Onboarding · Demo · OMRI',
  // Tell search engines and link scrapers to skip this page; we don't want
  // demo URLs ranking or appearing in shared link previews as if they were
  // real signup pages.
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingDemoPage() {
  return <OnboardingFlow demoMode />;
}
