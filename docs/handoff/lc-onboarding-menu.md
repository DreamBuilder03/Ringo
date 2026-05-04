# LC Master Menu — Pre-seed flow (B2 of LC Readiness Sprint)

**Goal:** spin up a new LC location's menu in one SQL statement instead of typing every
Hot-N-Ready and Crazy Combo by hand.

**Files:**
- Migration: `supabase/migrations/2026_05_04_brand_column.sql` (adds `restaurants.brand`)
- Seed + helper: `supabase/seeds/lc_master_menu.sql` (master template + `clone_lc_master_menu_to()` function)
- Runbook: `~/Desktop/Brain Agent/lc_onboarding_runbook.md` (the 30-min onboarding clock)

---

## Two-minute mental model

1. **`lc_master_menu`** is a single canonical table with the LC catalog (Hot-N-Ready,
   Stuffed Crust, Detroit-Style, Crazy Bread, Wings, drinks, combos). RLS-locked to
   service-role only — restaurants don't touch it directly.
2. **`restaurants.brand`** is a new column. New LC franchisees onboard with `brand = 'little_caesars'`.
3. **`clone_lc_master_menu_to(restaurant_id)`** is a Postgres function. One call, the
   restaurant's `menu_items` table is fully populated with every LC item. Idempotent —
   safe to re-run; only inserts rows that don't already exist for that restaurant.
4. After the clone, owners do per-location price overrides via plain `UPDATE menu_items`.

---

## Day-of-onboarding flow (the only commands you need)

### Step 1 — Apply the migration once (production)

Run in Supabase SQL editor:

```sql
-- Apply both files in order:
-- 1. supabase/migrations/2026_05_04_brand_column.sql
-- 2. supabase/seeds/lc_master_menu.sql
```

Verify:

```sql
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'brand';
-- → 1 row

SELECT COUNT(*) AS lc_items FROM lc_master_menu;
-- → ~40 rows
```

### Step 2 — Onboard a new LC location

When you create the restaurant row, set `brand = 'little_caesars'`. Then call the helper:

```sql
INSERT INTO restaurants (name, address, brand, plan_tier, ...)
VALUES ('Little Caesars Modesto #1234', '...', 'little_caesars', 'growth', ...)
RETURNING id;
-- copy the returned UUID

SELECT clone_lc_master_menu_to('<the-uuid>');
-- → returns row count copied (e.g., 38)
```

That's it. The new location now has the entire LC menu wired and the agent can `lookup_item` against it.

### Step 3 — Per-location deviations (optional)

If the franchisee charges different prices than the LC default:

```sql
UPDATE menu_items SET price = 13.99
 WHERE restaurant_id = '<the-uuid>'
   AND name = 'Hot-N-Ready Detroit-Style Pepperoni';

-- Mark seasonal LTOs unavailable until they roll out
UPDATE menu_items SET available = false
 WHERE restaurant_id = '<the-uuid>'
   AND name LIKE '%Buffalo Ranch%';
```

---

## Safety guarantees built into `clone_lc_master_menu_to`

1. **Brand check.** The function `RAISES EXCEPTION` if the restaurant's brand isn't `little_caesars`. We will never accidentally seed the LC menu onto a Domino's or Pizza Hut location.
2. **Idempotent.** Re-running the function only inserts rows that don't already exist. You can safely re-run after a partial failure.
3. **Per-location overrides survive.** Once a restaurant's `menu_items` row exists, the function leaves it alone. Owner price updates are never overwritten by re-seeding.
4. **Master menu corrections propagate forward.** Editing a price in `lc_master_menu` and re-running `INSERT ... ON CONFLICT` only affects that master table — existing restaurants keep their copies. The corrected price flows to NEW restaurants on their next clone.

---

## Brand picker UI (next iteration — currently a SQL-only flow)

The current pattern requires SQL access to set `brand` and call the clone function.
The next iteration is a brand picker on `/onboarding`:

1. Owner picks "I'm a Little Caesars" / "Domino's" / "Independent" radio at the top of the form.
2. Form auto-fills sensible LC defaults (pos_mode = handoff_tablet, plan_tier = growth, preferred_language = bilingual).
3. On Stripe checkout success, the provisioning route calls `clone_lc_master_menu_to(...)` server-side.
4. Owner lands on the dashboard with the menu pre-populated. Their first task is reviewing prices.

That UI is ~2 hours of work and slated for the LC sprint — see B2 in `~/Desktop/Brain Agent/sprint_lc_readiness.md` (or the Brain). For the FIRST LC location, the SQL flow above is fine.

---

## Adding more brands later

Same pattern, scoped to brand:

1. Create a new master table: `dominos_master_menu`, `pizza_hut_master_menu`, etc.
2. Create a brand-specific clone helper: `clone_dominos_master_menu_to(...)`.
3. Add the brand value to the conventional list in `2026_05_04_brand_column.sql` comment.
4. Update `/admin/fleet` filter chips automatically pick it up — they read `DISTINCT brand FROM restaurants`.

When OMRI hits 5+ franchise brands the master tables get unified into one `franchise_master_menu` with a brand column. Premature for now.

---

## Anti-patterns

- **Don't seed before setting `brand = 'little_caesars'`.** The clone helper will refuse and you'll think the function is broken. Set `brand` first.
- **Don't edit `lc_master_menu` to fix one restaurant's price.** That's what per-restaurant `UPDATE menu_items` is for. Edit the master only when LC's published default actually changes.
- **Don't truncate-and-rebuild a restaurant's menu** by `DELETE FROM menu_items` + re-clone. You'll wipe per-location overrides. If you genuinely need a clean reset, snapshot the overrides first, re-clone, then re-apply.
