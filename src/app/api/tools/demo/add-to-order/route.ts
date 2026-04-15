import { NextRequest, NextResponse } from 'next/server';

// Demo-only add_to_order. Always succeeds; no database writes.
// Just echoes the item count so the agent has something coherent to speak.

interface RetellRequest {
  args: {
    item_name?: string;
    name?: string;
    quantity?: number;
    price?: number;
    modifiers?: string[];
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RetellRequest;
    const name = body.args?.item_name || body.args?.name || 'item';
    const qty = body.args?.quantity || 1;
    const mods = (body.args?.modifiers || []).filter(Boolean);
    const modsStr = mods.length ? ` (${mods.join(', ')})` : '';
    return NextResponse.json({
      result: `Added ${qty} ${name}${modsStr} to the order.`,
      success: true,
    });
  } catch (err) {
    console.error('[demo/add-to-order]', err);
    return NextResponse.json({ result: 'Added.' });
  }
}
