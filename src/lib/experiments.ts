// ──────────────────────────────────────────────────────────────────────────────
// A/B testing — variant assignment + persistence helpers (C-3).
//
// This file is small on purpose. The real surface area lives in:
//   - supabase/migrations/2026_04_30_experiments.sql        (data model)
//   - src/app/api/retell/inbound/route.ts                    (call-time wiring)
//   - docs/handoff/ab-testing-framework.md                   (operator manual)
//
// Determinism guarantees:
//   pickVariant(fromNumber, experimentId, variants) is a pure function. Same
//   inputs always return the same variant. SHA-256(`${from}:${experimentId}`)
//   is folded to a 32-bit unsigned int and taken modulo the sum of weights.
//   Different experimentIds for the same caller are independent (each gets its
//   own hash domain), so a caller can be in many experiments at once without
//   variants correlating across experiments.
//
// Performance:
//   The webhook is on the live-call critical path (<300ms target). Reads run
//   in parallel with the existing restaurant + orders queries. Writes are
//   fire-and-forget — recordAssignment never throws and is not awaited from
//   the webhook hot path.
// ──────────────────────────────────────────────────────────────────────────────

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExperimentVariant {
  id: string;
  slug: string;
  weight: number;
  overrides_patch: Record<string, unknown>;
}

export interface ActiveExperiment {
  id: string;
  slug: string;
  variants: ExperimentVariant[];
}

// ─── pickVariant — deterministic hash-based assignment ───────────────────────

/**
 * Pure function. Given a caller's phone, an experiment id, and the experiment's
 * variants, return the variant the caller should be assigned to. Returns null
 * only if the variants array is empty or all weights are non-positive.
 *
 * Determinism: same (fromNumber, experimentId) always picks the same variant.
 * The experimentId being part of the hash means the same caller can be
 * independently assigned across multiple concurrent experiments.
 */
export function pickVariant(
  fromNumber: string,
  experimentId: string,
  variants: ExperimentVariant[]
): ExperimentVariant | null {
  if (!Array.isArray(variants) || variants.length === 0) return null;

  // Filter to positive weights and preserve order so the hash is stable.
  const usable = variants.filter((v) => Number.isFinite(v.weight) && v.weight > 0);
  if (usable.length === 0) return null;

  const totalWeight = usable.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight <= 0) return null;

  // SHA-256 → 4 bytes → uint32 → modulo totalWeight. Cheap and well-distributed.
  // (Yes, we're only using 32 bits of the 256-bit hash. That's plenty for a
  // weight bucket up to 1000 — the migration caps weight at 1000 per variant.)
  const digest = createHash('sha256').update(`${fromNumber}:${experimentId}`).digest();
  const bucket = digest.readUInt32BE(0) % totalWeight;

  let cursor = 0;
  for (const v of usable) {
    cursor += v.weight;
    if (bucket < cursor) return v;
  }
  // Should be unreachable given the modulo above, but be safe.
  return usable[usable.length - 1];
}

// ─── DB readers ───────────────────────────────────────────────────────────────

/**
 * Returns all running experiments applicable to a restaurant: experiments
 * scoped to this restaurant_id, plus all global experiments (restaurant_id
 * IS NULL). Each experiment includes its variants pre-joined.
 *
 * Single round-trip via a JOIN — keeps the webhook's serial-call count flat.
 * Returns [] if the experiments table doesn't exist yet (so the webhook
 * tolerates running against a DB where the migration hasn't applied yet).
 */
export async function getActiveExperimentsForRestaurant(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<ActiveExperiment[]> {
  try {
    const { data, error } = await supabase
      .from('experiments')
      .select('id, slug, variants:experiment_variants(id, slug, weight, overrides_patch)')
      .eq('status', 'running')
      .or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`);

    if (error) {
      // Most common at startup: the migration hasn't run yet (relation does
      // not exist). Don't crash the inbound webhook over it.
      console.warn('[experiments] read failed:', error.message);
      return [];
    }
    if (!Array.isArray(data)) return [];

    return data
      .map((row) => ({
        id: row.id as string,
        slug: row.slug as string,
        variants: ((row.variants as ExperimentVariant[] | null) || []).map((v) => ({
          id: v.id,
          slug: v.slug,
          weight: Number(v.weight) || 0,
          overrides_patch: (v.overrides_patch as Record<string, unknown>) || {},
        })),
      }))
      .filter((e) => e.variants.length > 0); // skip experiments with no variants
  } catch (err) {
    console.warn('[experiments] read threw:', err);
    return [];
  }
}

// ─── DB writers ───────────────────────────────────────────────────────────────

/**
 * Fire-and-forget assignment recorder. Does NOT throw — any error is logged
 * and swallowed so the inbound webhook can call this without await.
 *
 * call_id at this point is whatever Retell told us (call_inbound payload).
 * Some payloads omit call_id; in that case we use a sentinel UUID so the row
 * still records WHICH variant was selected for stats purposes — at the cost
 * of losing the call→variant join. That's an acceptable degradation.
 */
export function recordAssignment(
  supabase: SupabaseClient,
  callId: string | null | undefined,
  experimentId: string,
  variantId: string,
  fromNumber: string | null
): void {
  // No await — we want this to run in the background.
  void supabase
    .from('experiment_assignments')
    .upsert(
      {
        call_id: callId || '00000000-0000-0000-0000-000000000000',
        experiment_id: experimentId,
        variant_id: variantId,
        from_number: fromNumber,
      },
      { onConflict: 'call_id,experiment_id', ignoreDuplicates: true }
    )
    .then(({ error }) => {
      if (error) {
        // Don't alert — assignment loss is data-quality not user-facing.
        console.warn('[experiments] assignment write failed:', error.message);
      }
    });
}

// ─── Sanitization (mirrors the rules in /api/retell/inbound for prompt_overrides) ─

const RESERVED_KEYS = new Set([
  'is_returning',
  'customer_name',
  'total_orders',
  'total_spent',
  'last_order_summary',
]);

/**
 * Apply the same sanitization rules used for restaurant prompt_overrides to a
 * variant's overrides_patch. Mutates the target dictionary in place.
 *
 * Why we re-sanitize per variant: variants are written by the analyst directly
 * into the DB with no app-side validation gate. Same defenses, same place.
 */
export function mergeVariantOverridesInto(
  target: Record<string, string>,
  patch: Record<string, unknown>,
  remainingKeyBudget: number
): number {
  let kept = 0;
  for (const [key, val] of Object.entries(patch)) {
    if (kept >= remainingKeyBudget) break;
    if (RESERVED_KEYS.has(key)) continue;
    if (typeof val !== 'string') continue;
    if (val.length > 500) continue;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue;
    target[key] = val;
    kept++;
  }
  return kept;
}
