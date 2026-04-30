// /book — single source of truth for "book a demo" links across the site.
//
// All href="/book" links (demo flow, demo finalize-payment SMS, footer CTAs)
// land here. We server-redirect to whatever DEMO_BOOKING_URL holds in Vercel
// env vars — typically a Calendly URL. The env var is the only place to
// edit when the booking destination changes; no code change needed.
//
// If DEMO_BOOKING_URL isn't set, we fall back to a safe default that explains
// the situation rather than infinite-looping back to /book itself.

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic'; // no caching — env var read on every hit
export const revalidate = 0;

export default function BookPage() {
  const url = process.env.DEMO_BOOKING_URL;

  if (url && /^https?:\/\//i.test(url) && !url.includes('joinomri.com/book')) {
    // External-facing redirect (e.g., calendly.com/...). Next.js redirect()
    // throws a special error that the framework catches and converts to a
    // 307 response.
    redirect(url);
  }

  // Defensive fallback: env var missing or misconfigured. Show a friendly
  // page rather than infinite-redirecting. This page should not normally
  // render in production once the env var is set.
  return (
    <main className="min-h-screen bg-obsidian text-bone flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="font-display text-4xl">Booking link not configured</h1>
        <p className="text-stone">
          Email <a href="mailto:misael@joinomri.com" className="underline hover:text-bone">misael@joinomri.com</a> and we&apos;ll get you on the calendar within the hour.
        </p>
        <p className="text-ash text-sm pt-4">
          (Heads up to ops: <code className="font-mono">DEMO_BOOKING_URL</code> env var
          is missing or points back at this page in Vercel. Set it to the
          Calendly URL.)
        </p>
      </div>
    </main>
  );
}
