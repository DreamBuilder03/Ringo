import { NextRequest, NextResponse } from 'next/server';

// Demo-only remove_from_order stub.
interface RetellRequest {
  args: { item_name?: string; name?: string; quantity?: number };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RetellRequest;
    const name = body.args?.item_name || body.args?.name || 'that item';
    return NextResponse.json({
      result: `Removed ${name} from the order.`,
      success: true,
    });
  } catch {
    return NextResponse.json({ result: 'Removed.' });
  }
}
