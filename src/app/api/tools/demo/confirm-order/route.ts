import { NextRequest, NextResponse } from 'next/server';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { confirmOrderSchema } from '@/lib/schemas/tools';

// Demo-only confirm_order. Always succeeds; no DB writes.
// Echoes the total so the agent has a concrete number to read.

interface RetellRequest {
  args: {
    items?: Array<{ name: string; price?: number; quantity?: number }>;
    total_amount?: number;
    total?: number;
  };
}

function formatItems(items?: RetellRequest['args']['items']): string {
  if (!items || items.length === 0) return 'your order';
  return items
    .map((i) => {
      const q = i.quantity && i.quantity > 1 ? `${i.quantity}x ` : '';
      return `${q}${i.name}`;
    })
    .join(', ');
}

function total(args: RetellRequest['args']): number {
  if (typeof args.total_amount === 'number') return args.total_amount;
  if (typeof args.total === 'number') return args.total;
  if (Array.isArray(args.items)) {
    return args.items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  }
  return 0;
}

export async function POST(req: NextRequest) {
  // Rate limit + Zod validation. On failure returns 200 + speakable fallback.
  const check = await validateRetellBody(req, confirmOrderSchema, 'demo/confirm-order');
  if (!check.ok) return check.response;

  try {
    const args = check.body.args as any;
    const t = total(args);
    const totalStr = t > 0 ? ` Total: $${t.toFixed(2)}.` : '';
    const itemsStr = formatItems(args.items);
    return NextResponse.json({
      result: `Confirmed: ${itemsStr}.${totalStr} Ready to send the payment link — what's the best mobile number?`,
      success: true,
    });
  } catch (err) {
    console.error('[demo/confirm-order]', err);
    // 200 — speakable fallback (Retell ignores result on non-2xx).
    return NextResponse.json({
      result: "Got it. What's the best mobile number to send the payment link to?",
    });
  }
}
