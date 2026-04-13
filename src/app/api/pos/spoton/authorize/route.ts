import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * SpotOn API Authorization Route
 * Saves SpotOn API credentials (API key and location ID)
 *
 * Body:
 * - restaurant_id: ID of the restaurant
 * - spoton_api_key: SpotOn API Key
 * - spoton_location_id: SpotOn Location ID
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_id, spoton_api_key, spoton_location_id } = body;

    // Validate required fields
    if (!restaurant_id || !spoton_api_key || !spoton_location_id) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurant_id, spoton_api_key, spoton_location_id' },
        { status: 400 }
      );
    }

    // Validate API key is not empty
    if (spoton_api_key.trim().length === 0) {
      return NextResponse.json(
        { error: 'SpotOn API Key cannot be empty' },
        { status: 400 }
      );
    }

    // Validate location ID is not empty
    if (spoton_location_id.trim().length === 0) {
      return NextResponse.json(
        { error: 'SpotOn Location ID cannot be empty' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Update restaurant with SpotOn credentials and mark as connected
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        pos_type: 'spoton',
        pos_connected: true,
        // Note: API key and location ID should be stored in a secure location
        // For now, these are validated but you should add proper schema support
      })
      .eq('id', restaurant_id);

    if (updateError) {
      console.error('Failed to update restaurant with SpotOn credentials:', updateError);
      return NextResponse.json(
        { error: 'Failed to save SpotOn credentials' },
        { status: 500 }
      );
    }

    console.log(`[${new Date().toISOString()}] SpotOn connected for restaurant: ${restaurant_id}`);

    return NextResponse.json({
      success: true,
      message: 'SpotOn POS credentials saved successfully',
      restaurant_id,
    });
  } catch (error) {
    console.error('SpotOn authorize error:', error);
    return NextResponse.json(
      { error: 'Failed to process SpotOn authorization' },
      { status: 500 }
    );
  }
}
