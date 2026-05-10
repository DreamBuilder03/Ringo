import * as Sentry from '@sentry/nextjs';
import { scrubEventPII } from '@/lib/sentry-pii-filter';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Privacy Day 1 (Appendix B item #1): scrub PII before any event leaves
  // this app. See src/lib/sentry-pii-filter.ts for the field list.
  beforeSend: (event) => scrubEventPII(event),
  beforeSendTransaction: (transaction) => scrubEventPII(transaction),
});
