// ──────────────────────────────────────────────────────────────────────────────
// withRetellValidation — wrapper for /api/tools/* routes called by a live
// Retell agent during a real PSTN call.
//
// Why this is separate from withValidation:
//   Retell treats any non-2xx tool response as a hard failure and refuses
//   to speak the `result` field back to the caller. The agent then goes
//   silent until reminder_message fires (~13s on call_d920aad6087e00095bd08f0eb95
//   on 2026-04-21). For voice UX this is unacceptable.
//
//   Therefore tool routes ALWAYS return 200, even on:
//     - rate-limit hit (429 → 200 + speakable fallback)
//     - Zod validation failure (400 → 200 + speakable fallback)
//     - JSON parse failure (400 → 200 + speakable fallback)
//
//   The fallback `result` text gives the caller a natural "give me a second"
//   so the conversation continues while we log + alert the failure server-side.
//
// Rate limit key:
//   Default key is the Retell call_id when present, falling back to client IP.
//   This means a single call cannot spam more than TOOL/min tool invocations
//   (60/min default — extremely generous for a 3-5 min phone call), but
//   shared Retell IPs across many simultaneous calls don't trigger limits.
//
// The wrapper still calls reportToolFailure() so the founder pager fires.
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import type { ZodSchema, z } from 'zod';
import { checkRateLimit, type LimitTier } from './rate-limit-upstash';
import { reportToolFailure } from './alerts';

export interface RetellValidationOptions<TBody extends ZodSchema> {
  /** Tool name for alerting / logging. Required. */
  toolName: string;
  /** Zod schema for the Retell envelope ({ args, call }). Required. */
  body: TBody;
  /** Rate limit tier (default 'TOOL'). */
  tier?: LimitTier;
  /** Speakable fallback returned to Retell on any validation/rate-limit failure. */
  fallbackResult?: string;
}

type RetellHandler<TBody extends ZodSchema> = (args: {
  body: z.infer<TBody>;
  req: NextRequest;
}) => Promise<NextResponse> | NextResponse;

const DEFAULT_FALLBACK = "Sorry — give me one second. Something hiccuped on our end.";

export function withRetellValidation<TBody extends ZodSchema>(
  opts: RetellValidationOptions<TBody>,
  handler: RetellHandler<TBody>
) {
  const fallbackResult = opts.fallbackResult || DEFAULT_FALLBACK;
  const tier = opts.tier || 'TOOL';

  return async (req: NextRequest): Promise<NextResponse> => {
    // ─── 1. Parse body (best-effort) ───────────────────────────────────────
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      // Malformed JSON — return speakable, alert
      reportToolFailure({
        toolName: opts.toolName,
        restaurantId: null,
        retellCallId: null,
        shortReason: 'Invalid JSON body',
      }).catch(() => {});
      return NextResponse.json({ result: fallbackResult }, { status: 200 });
    }

    // Extract call_id for rate-limit keying before validation
    const callId =
      (raw as any)?.call?.call_id && typeof (raw as any).call.call_id === 'string'
        ? (raw as any).call.call_id
        : undefined;

    // ─── 2. Rate limit ─────────────────────────────────────────────────────
    const blocked = await checkRateLimit(req, tier, callId ? { key: callId } : {});
    if (blocked) {
      // Rate limited — return speakable so the call continues, alert founder
      reportToolFailure({
        toolName: opts.toolName,
        restaurantId: null,
        retellCallId: callId ?? null,
        shortReason: 'rate limit hit',
      }).catch(() => {});
      return NextResponse.json({ result: fallbackResult }, { status: 200 });
    }

    // ─── 3. Validate body ──────────────────────────────────────────────────
    const parsed = opts.body.safeParse(raw);
    if (!parsed.success) {
      // Schema mismatch — return speakable so the call continues
      reportToolFailure({
        toolName: opts.toolName,
        restaurantId: null,
        retellCallId: callId ?? null,
        shortReason: `validation: ${parsed.error.issues
          .slice(0, 3)
          .map((i: any) => i.path.join('.') + ':' + i.message)
          .join('; ')
          .slice(0, 200)}`,
      }).catch(() => {});
      return NextResponse.json({ result: fallbackResult }, { status: 200 });
    }

    // ─── 4. Invoke real handler ────────────────────────────────────────────
    return handler({ body: parsed.data, req });
  };
}
