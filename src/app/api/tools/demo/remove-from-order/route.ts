import { NextRequest, NextResponse } from 'next/server';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { removeFromOrderSchema } from '@/lib/schemas/tools';

// Demo-only remove_from_order stub.

export async function POST(req: NextRequest) {
  // Rate limit + Zod validation. On failure returns 200 + speakable fallback.
  const check = await validateRetellBody(req, removeFromOrderSchema, 'demo/remove-from-order');
  if (!check.ok) return check.response;

  try {
    const args = check.body.args as any;
    const name = args.item_name || args.name || 'that item';
    return NextResponse.json({
      result: `Removed ${name} from the order.`,
      success: true,
    });
  } catch {
    // 200 — speakable fallback (Retell ignores result on non-2xx).
    return NextResponse.json({ result: 'Removed.' });
  }
}
