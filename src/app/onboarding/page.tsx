// Real onboarding flow. Backed by the shared <OnboardingFlow> component
// in src/components/onboarding/onboarding-flow.tsx — same component powers
// /onboarding/demo with demoMode={true}.
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
