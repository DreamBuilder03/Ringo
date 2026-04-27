import { NextRequest, NextResponse } from 'next/server';
import { validateRetellBody } from '@/lib/with-retell-validation';
import { lookupItemSchema } from '@/lib/schemas/tools';

// Demo-only lookup_item. Production route hits Supabase menu tables keyed by
// restaurant_id; the demo agent isn't a real restaurant, so we fake it.
// Just echoes back that the item exists and assigns a reasonable stub price.
// The real menu (stub_menu dynamic var) is already in the prompt context.

export async function POST(req: NextRequest) {
  // Rate limit + Zod validation. On failure returns 200 + speakable fallback.
  const check = await validateRetellBody(req, lookupItemSchema, 'demo/lookup-item');
  if (!check.ok) return check.response;

  try {
    const args = check.body.args as any;
    const name = args.item_name || args.name || args.query || '';
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
