import { NextRequest, NextResponse } from 'next/server';

// Demo-only lookup_item. Production route hits Supabase menu tables keyed by
// restaurant_id; the demo agent isn't a real restaurant, so we fake it.
// Just echoes back that the item exists and assigns a reasonable stub price.
// The real menu (stub_menu dynamic var) is already in the prompt context.

interface RetellRequest {
  call?: { call_id?: string; metadata?: { lead_id?: string } };
  args: { item_name?: string; name?: string; query?: string };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RetellRequest;
    const name = body.args?.item_name || body.args?.name || body.args?.query || '';
    if (!name) {
      return NextResponse.json({ result: "I didn't catch the item — which one?" });
    }
    // We always say "found" — the agent already has stub_menu in context.
    return NextResponse.json({
      result: `Found "${name}". Ready to add when the customer confirms.`,
      found: true,
      item_name: name,
    });
  } catch (err) {
    console.error('[demo/lookup-item]', err);
    return NextResponse.json({ result: 'One sec — let me try that again.' });
  }
}
