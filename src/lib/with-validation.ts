// ──────────────────────────────────────────────────────────────────────────────
// withValidation — single helper that wraps an API route handler with:
//   1) Upstash rate limiting (per the named tier)
//   2) Zod input validation (schema parses JSON body, query, or both)
//
// This is the canonical wrapper for every public API route. Use it instead
// of bolting on rate-limit + zod separately at each route. Saves ~15 lines
// per route and makes it impossible to forget either one.
//
// Usage:
//   import { withValidation } from '@/lib/with-validation';
//   import { addToOrderSchema } from '@/lib/schemas/tools';
//
//   export const POST = withValidation(
//     { tier: 'TOOL', body: addToOrderSchema },
//     async ({ body, req }) => {
//       // body is fully typed and validated here
//       return NextResponse.json({ ok: true });
//     }
//   );
//
// On rate-limit hit  → 429 returned automatically (handler not invoked)
// On bad input       → 400 returned automatically with field errors
// On strict-mode key → 400 returned (we strip + reject unknown fields)
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import type { ZodSchema, z } from 'zod';
import { checkRateLimit, type LimitTier, type CheckOptions } from './rate-limit-upstash';

export interface ValidationOptions<TBody extends ZodSchema | undefined, TQuery extends ZodSchema | undefined> {
  /** Rate-limit tier from LIMITS catalog. Required. */
  tier: LimitTier;
  /** Optional explicit rate-limit key override (default: client IP). */
  rateLimitKey?: (req: NextRequest) => string | undefined;
  /** Zod schema for JSON body. Required for POST/PUT/PATCH. */
  body?: TBody;
  /** Zod schema for URL search params. Optional for GET. */
  query?: TQuery;
  /** Skip rate limiting if this returns true (e.g. cron secret matches). */
  skipRateLimit?: (req: NextRequest) => boolean;
}

type Handler<TBody extends ZodSchema | undefined, TQuery extends ZodSchema | undefined, TContext> = (args: {
  body: TBody extends ZodSchema ? z.infer<TBody> : undefined;
  query: TQuery extends ZodSchema ? z.infer<TQuery> : undefined;
  req: NextRequest;
  context: TContext;
}) => Promise<NextResponse> | NextResponse;

export function withValidation<
  TBody extends ZodSchema | undefined = undefined,
  TQuery extends ZodSchema | undefined = undefined,
  TContext = unknown,
>(
  opts: ValidationOptions<TBody, TQuery>,
  handler: Handler<TBody, TQuery, TContext>
) {
  return async (req: NextRequest, context: TContext): Promise<NextResponse> => {
    // ─── 1. Rate limit ─────────────────────────────────────────────────────
    const skipRl = opts.skipRateLimit?.(req) === true;
    if (!skipRl) {
      const rateLimitOpts: CheckOptions = {};
      const customKey = opts.rateLimitKey?.(req);
      if (customKey) rateLimitOpts.key = customKey;
      const blocked = await checkRateLimit(req, opts.tier, rateLimitOpts);
      if (blocked) return blocked;
    }

    // ─── 2. Body validation ────────────────────────────────────────────────
    let body: any = undefined;
    if (opts.body) {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON body.' },
          { status: 400 }
        );
      }
      const parsed = opts.body.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Validation failed.',
            details: parsed.error.issues.map((i: any) => ({
              path: i.path.join('.'),
              message: i.message,
              code: i.code,
            })),
          },
          { status: 400 }
        );
      }
      body = parsed.data;
    }

    // ─── 3. Query validation ───────────────────────────────────────────────
    let query: any = undefined;
    if (opts.query) {
      const url = new URL(req.url);
      const queryObj: Record<string, string> = {};
      url.searchParams.forEach((v, k) => {
        queryObj[k] = v;
      });
      const parsed = opts.query.safeParse(queryObj);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters.',
            details: parsed.error.issues.map((i: any) => ({
              path: i.path.join('.'),
              message: i.message,
              code: i.code,
            })),
          },
          { status: 400 }
        );
      }
      query = parsed.data;
    }

    // ─── 4. Invoke handler ─────────────────────────────────────────────────
    return handler({ body, query, req, context });
  };
}
