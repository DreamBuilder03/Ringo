// ──────────────────────────────────────────────────────────────────────────────
// Upstash-backed rate limiting for Next.js API routes.
//
// Why Upstash and not the in-memory rate-limit.ts:
//   Vercel's serverless functions do not share process memory across
//   invocations. Each cold start gets a fresh Map, so the old limiter could
//   be bypassed by sending requests fast enough to land on different
//   instances. Upstash uses Redis as a shared backing store so limits hold
//   across all serverless instances. This is the Production Standard.
//
// Behavior:
//   - Sliding window via @upstash/ratelimit
//   - Keyed by client IP by default, with optional userId override
//   - Returns 429 with Retry-After + X-RateLimit-* headers (same shape as
//     the old limiter so call sites are interchangeable)
//   - If Upstash env vars are missing (local dev), silently no-ops so
//     `npm run dev` still works without paid infra
//   - Per-route limits live in the LIMITS table at the bottom of this file
//     so they're greppable and reviewable in one place (audit requirement)
//
// Setup:
//   Vercel env vars required in Production + Preview:
//     UPSTASH_REDIS_REST_URL
//     UPSTASH_REDIS_REST_TOKEN
//   Both are obtained from the Upstash dashboard. Free tier is sufficient
//   for current traffic levels (10K commands/day).
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── Per-route rate limit catalog ─────────────────────────────────────────────
// Edit here when adding/changing limits. Format: requests per window.
// Tier names map to risk: AUTH (most strict) → TOOL (moderate) → READ (loose)
//
// Pre-pilot defaults are conservative. Loosen after observing real traffic.

export const LIMITS = {
  // Auth & account creation — hardest to abuse, brute-force protection
  AUTH: { max: 10, windowSec: 60 }, // 10/min per IP

  // Public marketing demo (lead capture, demo phone calls)
  DEMO_PUBLIC: { max: 30, windowSec: 60 }, // 30/min per IP
  DEMO_CALL_CREATE: { max: 5, windowSec: 60 }, // 5/min per IP — Retell calls cost money

  // Retell tool routes (called by our own Retell agent during a live call;
  // legitimate traffic is bursty but bounded by call duration ~3-5 min)
  TOOL: { max: 60, windowSec: 60 }, // 60/min per restaurant

  // POS push-to-kitchen routes (called by our own Square webhook; same
  // rationale — should never be hit by clients directly)
  POS: { max: 30, windowSec: 60 },

  // Webhooks (Square, Stripe, Retell) — providers send retries; allow burst
  WEBHOOK: { max: 200, windowSec: 60 },

  // Customer-facing pay link page
  PAY: { max: 30, windowSec: 60 },

  // Admin / dashboard reads — authenticated, looser
  ADMIN_READ: { max: 120, windowSec: 60 },

  // Cron jobs called by Vercel — guarded by CRON_SECRET separately, very loose
  CRON: { max: 10, windowSec: 60 },

  // Email / SMS sends (we pay per send) — strict
  SEND: { max: 20, windowSec: 60 },

  // Provisioning new restaurants — admin-only, very strict
  PROVISIONING: { max: 5, windowSec: 60 },

  // Menu import — admin-only, file upload pattern
  MENU_IMPORT: { max: 10, windowSec: 300 }, // 10 imports per 5 min
} as const;

export type LimitTier = keyof typeof LIMITS;

// ─── Internal: build limiter only if Upstash env vars present ─────────────────

let cachedRedis: Redis | null | undefined; // undefined = unchecked, null = unavailable
function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cachedRedis = null;
    return null;
  }
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

const limiterCache = new Map<LimitTier, Ratelimit>();
function getLimiter(tier: LimitTier): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  let limiter = limiterCache.get(tier);
  if (!limiter) {
    const { max, windowSec } = LIMITS[tier];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
      analytics: true,
      prefix: `omri:rl:${tier.toLowerCase()}`,
    });
    limiterCache.set(tier, limiter);
  }
  return limiter;
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CheckOptions {
  /** Override the rate limit key (default: client IP). Use for per-user or
   *  per-restaurant limits when caller is authenticated. */
  key?: string;
  /** Optional human-readable message returned in 429 body. */
  message?: string;
}

/**
 * Check a request against a rate limit tier.
 * Returns null if allowed, or a 429 NextResponse if blocked.
 *
 * Usage:
 *   const blocked = await checkRateLimit(req, 'TOOL');
 *   if (blocked) return blocked;
 *
 * Or with explicit key (e.g., per-restaurant):
 *   const blocked = await checkRateLimit(req, 'TOOL', { key: `r:${restaurantId}` });
 */
export async function checkRateLimit(
  req: NextRequest,
  tier: LimitTier,
  opts: CheckOptions = {}
): Promise<NextResponse | null> {
  const limiter = getLimiter(tier);
  if (!limiter) {
    // Upstash not configured (local dev without env vars). Allow through.
    if (process.env.NODE_ENV === 'production') {
      // In production this is a config error — log loudly but don't block traffic.
      console.error('[rate-limit] Upstash env vars missing in production. Allowing request.');
    }
    return null;
  }

  const key = opts.key || getClientIp(req);
  const { success, limit, remaining, reset } = await limiter.limit(`${tier}:${key}`);

  if (!success) {
    const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: opts.message || 'Too many requests — please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
        },
      }
    );
  }

  return null;
}
