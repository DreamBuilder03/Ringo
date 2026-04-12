import { NextResponse } from 'next/server';

/**
 * Clover OAuth Authorization Route
 * Generates the Clover OAuth authorization URL and redirects the user
 *
 * Query params:
 * - restaurant_id: ID of the restaurant to connect
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurant_id');

  if (!restaurantId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_restaurant_id`
    );
  }

  const cloverAppId = process.env.CLOVER_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!cloverAppId || !appUrl) {
    console.error('Missing Clover configuration: CLOVER_APP_ID or NEXT_PUBLIC_APP_URL');
    return NextResponse.redirect(
      `${appUrl}/settings?error=missing_configuration`
    );
  }

  // Build Clover OAuth authorization URL
  // Using sandbox endpoint for development; switch to https://clover.com/oauth/authorize for production
  const cloverAuthUrl = new URL('https://sandbox.dev.clover.com/oauth/authorize');
  cloverAuthUrl.searchParams.append('client_id', cloverAppId);
  cloverAuthUrl.searchParams.append('redirect_uri', `${appUrl}/api/pos/clover`);
  cloverAuthUrl.searchParams.append('state', restaurantId);

  return NextResponse.redirect(cloverAuthUrl.toString());
}
