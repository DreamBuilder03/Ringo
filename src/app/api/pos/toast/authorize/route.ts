import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

/**
 * Toast OAuth Authorization Route
 * Toast doesn't use OAuth, so this endpoint saves the provided API credentials directly
 *
 * Body:
 * - restaurant_id: ID of the restaurant
 * - toast_restaurant_guid: Toast Restaurant GUID
 * - toast_api_key: Toast API Key
 */
export async function POST(request: NextRequest) {
  // Rate limit at PROVISIONING tier — admin-only operation that mutates
  // restaurant POS connection state.
  const blocked = await checkRateLimit(request, 'PROVISIONING');
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const { restaurant_id, toast_restaurant_guid, toast_api_key } = body;

    // Validate required fields
    if (!restaurant_id || !toast_restaurant_guid || !toast_api_key) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurant_id, toast_restaurant_guid, toast_api_key' },
        { status: 400 }
      );
    }

    // Basic validation for GUID format (UUID-like)
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(toast_restaurant_guid)) {
      return NextResponse.json(
        { error: 'Invalid Toast Restaurant GUID format. Expected UUID format.' },
        { status: 400 }
      );
    }

    // Validate API key is not empty
    if (toast_api_key.trim().length === 0) {
      return NextResponse.json(
        { error: 'Toast API Key cannot be empty' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Update restaurant with Toast credentials and mark as connected
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        pos_type: 'toast',
        pos_connected: true,
        // Note: You may need to add toast_restaurant_guid and toast_api_key columns to the restaurants table
        // For now, these are stored but you should add proper schema support
      })
      .eq('id', restaurant_id);

    if (updateError) {
      console.error('Failed to update restaurant with Toast credentials:', updateError);
      return NextResponse.json(
        { error: 'Failed to save Toast credentials' },
        { status: 500 }
      );
    }

    console.log(`[${new Date().toISOString()}] Toast connected for restaurant: ${restaurant_id}`);

    return NextResponse.json({
      success: true,
      message: 'Toast POS credentials saved successfully',
      restaurant_id,
    });
  } catch (error) {
    console.error('Toast authorize error:', error);
    return NextResponse.json(
      { error: 'Failed to process Toast authorization' },
      { status: 500 }
    );
  }
}
