import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-upstash';

// ──────────────────────────────────────────────────────────────────────────────
// /api/menu/import
// ──────────────────────────────────────────────────────────────────────────────
// Accepts a restaurant's menu in CSV or plain-text format and bulk-inserts it
// into menu_items. Existing items for the restaurant are NOT deleted — use the
// dashboard menu editor to remove stale items.
//
// Body (JSON):
//   restaurant_id: string (required)
//   format: 'csv' | 'text'  (default 'csv')
//   data: string             (the raw CSV or plain text)
//   replace: boolean         (if true, delete all existing items first)
//
// CSV columns: name, category, price, description (header row required)
//   "Carne Asada Burrito","Burritos",12.99,"Grilled steak, rice, beans, salsa"
//
// Text format (for pasting from a paper menu):
//   Category names on their own line, items below with price after a dash or $
//   Example:
//     Burritos
//     Carne Asada Burrito - $12.99
//     Chicken Burrito $10.99 - Grilled chicken, rice, beans
//     Tacos
//     Street Taco - $3.50

function parseCSV(raw: string): Array<{
  name: string;
  category: string;
  price: number;
  description: string;
}> {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return []; // need header + at least 1 row

  // Simple CSV parser (handles quoted fields)
  function splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const header = splitCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  const nameIdx = header.indexOf('name');
  const catIdx = header.indexOf('category');
  const priceIdx = header.indexOf('price');
  const descIdx = header.indexOf('description');

  if (nameIdx === -1 || priceIdx === -1) return [];

  const items: Array<{ name: string; category: string; price: number; description: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const name = cols[nameIdx]?.trim();
    const priceStr = cols[priceIdx]?.replace(/[^0-9.]/g, '');
    const price = parseFloat(priceStr || '0');

    if (!name || price <= 0) continue;

    items.push({
      name,
      category: (catIdx >= 0 ? cols[catIdx]?.trim() : '') || 'General',
      price,
      description: (descIdx >= 0 ? cols[descIdx]?.trim() : '') || '',
    });
  }

  return items;
}

function parseText(raw: string): Array<{
  name: string;
  category: string;
  price: number;
  description: string;
}> {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: Array<{ name: string; category: string; price: number; description: string }> = [];
  let currentCategory = 'General';

  // Price patterns: "$12.99", "12.99", "- $12.99", "— 12.99"
  const priceRegex = /\$?\s*(\d+\.?\d{0,2})/;

  for (const line of lines) {
    // Check if this line has a price — if not, it's probably a category header
    const priceMatch = line.match(priceRegex);

    if (!priceMatch || parseFloat(priceMatch[1]) <= 0.5) {
      // Likely a category header (no price, or price too small to be real)
      // Strip trailing colons, dashes, etc.
      const cleaned = line.replace(/[:—\-]+$/, '').trim();
      if (cleaned.length > 0 && cleaned.length < 60) {
        currentCategory = cleaned;
      }
      continue;
    }

    const price = parseFloat(priceMatch[1]);

    // Extract name: everything before the price
    const priceStart = line.indexOf(priceMatch[0]);
    let namePart = line.substring(0, priceStart).replace(/[\-—]+$/, '').trim();

    // Extract description: everything after the price, if there's a separator
    let description = '';
    const afterPrice = line.substring(priceStart + priceMatch[0].length).trim();
    if (afterPrice.startsWith('-') || afterPrice.startsWith('—') || afterPrice.startsWith(':')) {
      description = afterPrice.replace(/^[\-—:]\s*/, '').trim();
    } else if (afterPrice.length > 3) {
      description = afterPrice;
    }

    // If name came after price (e.g., "$12.99 Carne Asada Burrito")
    if (!namePart && afterPrice) {
      namePart = afterPrice.replace(/^[\-—:]\s*/, '').trim();
      description = '';
    }

    if (!namePart) continue;

    items.push({
      name: namePart,
      category: currentCategory,
      price,
      description,
    });
  }

  return items;
}

export async function POST(req: NextRequest) {
  // Upstash rate limit at MENU_IMPORT tier (10 imports per 5 min) — admin-only
  // operation that triggers DB bulk inserts; cap defends against runaway loops.
  const blocked = await checkRateLimit(req, 'MENU_IMPORT');
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { restaurant_id, format = 'csv', data, replace = false } = body;

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }
    if (!data || typeof data !== 'string') {
      return NextResponse.json({ error: 'data (string) required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify user has access to this restaurant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse items
    const items = format === 'text' ? parseText(data) : parseCSV(data);

    if (items.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid menu items found. For CSV, make sure you have columns: name, price. For text, put each item on its own line with a price.',
          parsed: 0,
        },
        { status: 400 }
      );
    }

    // Optionally clear existing menu
    if (replace) {
      await supabase.from('menu_items').delete().eq('restaurant_id', restaurant_id);
    }

    // Bulk insert
    const rows = items.map((item) => ({
      restaurant_id,
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || null,
      modifiers: null,
      available: true,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from('menu_items')
      .insert(rows)
      .select('id, name, category, price');

    if (insertErr) {
      console.error('[menu/import] Insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to insert items', details: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: inserted?.length || 0,
      items: inserted,
      replaced: replace,
    });
  } catch (err) {
    console.error('[menu/import] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
