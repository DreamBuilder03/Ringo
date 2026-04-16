// ──────────────────────────────────────────────────────────────────────────────
// Simple in-memory sliding-window rate limiter for Next.js API routes.
//
// How it works:
//   Each unique key (usually an IP) gets an array of timestamps. On every
//   request we prune timestamps older than `windowMs`, then check if the
//   remaining count exceeds `max`. If yes → 429.
//
// Caveats:
//   - Per-instance memory — on Vercel each cold-start gets its own store.
//     Good enough to stop casual abuse; not a replacement for Redis-backed
//     limiting or Vercel's built-in WAF for true DDoS.
//   - Stale entries are cleaned up lazily + via a periodic sweep.
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitOptions {
  /** Maximum requests allowed in the window. Default: 20 */
  max?: number;
  /** Window size in milliseconds. Default: 60_000 (1 min) */
  windowMs?: number;
  /** Response message on 429. */
  message?: string;
}

// Global store shared across all limiters in the same process
const stores = new Map<string, Map<string, number[]>>();

// Periodic cleanup every 5 minutes
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    stores.forEach((store) => {
      store.forEach((timestamps, key) => {
        // Remove entries with no recent activity (> 10 min stale)
        if (timestamps.length === 0 || timestamps[timestamps.length - 1] < now - 600_000) {
          store.delete(key);
        }
      });
    });
  }, 300_000).unref?.(); // .unref() so it doesn't keep Node alive
}

function getClientIP(req: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back to x-real-ip then 'unknown'
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Create a rate limiter for a specific route group.
 *
 * Usage:
 *   const limiter = rateLimit({ max: 10, windowMs: 60_000 });
 *
 *   export async function POST(req: NextRequest) {
 *     const blocked = limiter(req);
 *     if (blocked) return blocked;   // returns a 429 NextResponse
 *     // ... normal handler
 *   }
 */
export function rateLimit(opts: RateLimitOptions = {}) {
  const { max = 20, windowMs = 60_000, message = 'Too many requests — please try again later.' } = opts;

  // Each limiter instance gets its own store keyed by a unique id
  const id = `rl_${Math.random().toString(36).slice(2)}`;
  const store = new Map<string, number[]>();
  stores.set(id, store);
  scheduleCleanup();

  return function check(req: NextRequest): NextResponse | null {
    const ip = getClientIP(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = store.get(ip);
    if (!timestamps) {
      timestamps = [];
      store.set(ip, timestamps);
    }

    // Prune old entries
    while (timestamps.length > 0 && timestamps[0] < windowStart) {
      timestamps.shift();
    }

    if (timestamps.length >= max) {
      const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      return NextResponse.json(
        { error: message },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(timestamps[0] + windowMs),
          },
        }
      );
    }

    timestamps.push(now);
    return null; // not blocked
  };
}
