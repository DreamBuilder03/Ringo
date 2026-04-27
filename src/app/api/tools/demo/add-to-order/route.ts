import { NextRequest, NextResponse } from 'next/server';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { addToOrderSchema } from '@/lib/schemas/tools';

// Demo-only add_to_order. Always succeeds; no database writes.
// Just echoes the item count so the agent has something coherent to speak.

export async function POST(req: NextRequest) {
  // Rate limit + Zod validation. On failure returns 200 + speakable fallback.
  const check = await validateRetellBody(req, addToOrderSchema, 'demo/add-to-order');
  if (!check.ok) return check.response;

  try {
    const args = check.body.args as any;
    const name = args.item_name || args.name || 'item';
    const qty = args.quantity || 1;
    const mods = (args.modifiers || []).filter(Boolean);
    const modsStr = mods.length ? ` (${mods.join(', ')})` : '';
    return NextResponse.json({
      result: `Added ${qty} ${name}${modsStr} to the order.`,
      success: true,
    });
  } catch (err) {
    console.error('[demo/add-to-order]', err);
    // 200 — speakable fallback (Retell ignores result on non-2xx).
    return NextResponse.json({ result: 'Added.' });
  }
}
