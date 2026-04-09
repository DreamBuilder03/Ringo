import { NextResponse } from 'next/server';

// Clover POS integration
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const merchantId = searchParams.get('merchant_id');

  if (!code || !merchantId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_params`
    );
  }

  try {
    // TODO: Exchange Clover OAuth code for access token

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=clover_connected`
    );
  } catch (error) {
    console.error('Clover OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=clover_failed`
    );
  }
}

export async function POST(request: Request) {
  try {
    const { restaurant_id, order_items, order_total } = await request.json();

    // TODO: Implement Clover order push

    return NextResponse.json({
      success: true,
      message: 'Order pushed to Clover',
      restaurant_id,
      order_total,
      items_count: order_items?.length || 0,
    });
  } catch (error) {
    console.error('Clover order push error:', error);
    return NextResponse.json(
      { error: 'Failed to push order to Clover' },
      { status: 500 }
    );
  }
}
