import { NextResponse } from 'next/server';

/**
 * Square OAuth Authorization Route
 * Generates the Square OAuth authorization URL and redirects the user
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

  const squareAppId = process.env.SQUARE_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!squareAppId || !appUrl) {
    console.error('Missing Square configuration: SQUARE_APP_ID or NEXT_PUBLIC_APP_URL');
    return NextResponse.redirect(
      `${appUrl}/settings?error=missing_configuration`
    );
  }

  // Build Square OAuth authorization URL
  const squareAuthUrl = new URL('https://connect.squareup.com/oauth2/authorize');
  squareAuthUrl.searchParams.append('client_id', squareAppId);
  squareAuthUrl.searchParams.append('scope', 'ORDERS_WRITE ORDERS_READ MERCHANT_PROFILE_READ');
  squareAuthUrl.searchParams.append('state', restaurantId);
  squareAuthUrl.searchParams.append('redirect_uri', `${appUrl}/api/pos/square`);

  return NextResponse.redirect(squareAuthUrl.toString());
}
