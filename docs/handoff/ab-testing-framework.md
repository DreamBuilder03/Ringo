# A/B Testing Framework — Operator Manual

**Status:** shipped 2026-04-30 (C-3 of the AI smarter arc).
**Code:** `src/lib/experiments.ts`, `src/app/api/retell/inbound/route.ts`.
**Schema:** `supabase/migrations/2026_04_30_experiments.sql`.

The framework lets you run controlled experiments on the OMRI agent's behavior.
Define variants, assign each caller deterministically, see which variant
produces more orders / higher tickets / shorter calls. No dashboard yet —
everything is SQL.

---

## How it works at runtime

1. A caller dials a restaurant. Retell fires `call_inbound` with `agent_id` and `from_number`.
2. The webhook (`/api/retell/inbound`) looks up the restaurant, then in *parallel* with the
   orders query reads all `experiments` rows where `status = 'running'` and the experiment
   either is scoped to this restaurant or is global (`restaurant_id IS NULL`).
3. For each running experiment, the webhook deterministically picks a variant by hashing
   `SHA-256(<from_number>:<experiment.id>)` and modulo'ing by the total weight.
   Same caller + same experiment → same variant, every time.
4. The chosen variant's `overrides_patch` is sanitized (string-only, 500 chars max per
   value, safe-key regex, reserved keys blocked) and merged into the same dictionary
   as the per-restaurant `prompt_overrides`.
5. An additional `exp_<experiment_slug>=<variant_slug>` key is injected into Retell's
   dynamic variables. Prompts can reference these directly to branch by name.
6. Retell connects the call. The variant's overrides + `exp_*` keys are visible to the
   prompt as `{{key}}` placeholders.

## Two ways to express variant differences

Each variant has an `overrides_patch` (a JSONB dict, same shape as `prompt_overrides`).

You can use that patch in two ways:

**A. Direct override.** Variant `treatment` patches `upsell_focus` to `"the new garlic knots"`,
variant `control` patches it to `"a 2L Coke"`. The prompt template uses `{{upsell_focus}}`
unconditionally and the variant changes what's substituted.

**B. Branch by variant name.** Variant `treatment` writes `greeting_style: "warm"`, variant
`control` writes nothing. The prompt has an `{{#exp_greeting_v1}} ... {{/exp_greeting_v1}}`-style
branch (or just reads `{{exp_greeting_v1}}` and switches on the value). This works because
the webhook always sets `exp_<slug>=<variant_slug>` regardless of `overrides_patch` content.

Approach A keeps the prompt simple — no conditional logic, just substitution. Recommended
for most experiments. Approach B is for experiments where the prompts genuinely diverge
(different sentence structure, different tool-call rules, etc.).

---

## SQL recipes

All examples use the Supabase SQL editor. The tables are RLS-locked to service-role.

### Create an experiment with two variants

```sql
-- Step 1: define the experiment
INSERT INTO experiments (slug, restaurant_id, name, description, success_metric)
VALUES (
  'greeting_warmth_v1',
  NULL,                          -- NULL = global (all restaurants); use a UUID to scope
  'Warm vs neutral greeting',
  'Does a warmer opening line move more callers to place an order?',
  'order_placed'
)
RETURNING id;
-- copy the returned id

-- Step 2: define the variants (replace <exp-id> with the id from step 1)
INSERT INTO experiment_variants (experiment_id, slug, weight, overrides_patch, description)
VALUES
  ('<exp-id>', 'control', 50,
    '{"greeting_addition":""}'::jsonb,
    'No addition — default behavior'),
  ('<exp-id>', 'treatment', 50,
    '{"greeting_addition":"Hope you are having a great day!"}'::jsonb,
    'Warmer opener');

-- Step 3: start the experiment
UPDATE experiments
   SET status = 'running', start_at = now()
 WHERE slug = 'greeting_warmth_v1' AND restaurant_id IS NULL;
```

### 90/10 canary

```sql
INSERT INTO experiments (slug, name, success_metric)
VALUES ('upsell_canary_v1', 'Aggressive vs default upsell', 'order_total')
RETURNING id;

INSERT INTO experiment_variants (experiment_id, slug, weight, overrides_patch)
VALUES
  ('<exp-id>', 'control', 90, '{}'::jsonb),
  ('<exp-id>', 'canary',  10, '{"upsell_focus":"Always offer Crazy Bread + a 2L"}'::jsonb);

UPDATE experiments SET status='running', start_at=now() WHERE slug='upsell_canary_v1';
```

### Stop an experiment

```sql
UPDATE experiments
   SET status = 'stopped', end_at = now()
 WHERE slug = 'greeting_warmth_v1' AND restaurant_id IS NULL;
```

Stopping freezes assignments for new callers. Existing assignments stay in
`experiment_assignments` for analysis.

### List active experiments

```sql
SELECT
  e.slug,
  e.restaurant_id,
  e.success_metric,
  e.start_at,
  COUNT(v.id) AS variant_count,
  STRING_AGG(v.slug || ':' || v.weight, ', ' ORDER BY v.slug) AS variants
FROM experiments e
LEFT JOIN experiment_variants v ON v.experiment_id = e.id
WHERE e.status = 'running'
GROUP BY e.id;
```

---

## Reading results

### Per-variant outcome rate (order placed)

```sql
SELECT
  e.slug         AS experiment,
  v.slug         AS variant,
  COUNT(c.id)    AS calls,
  COUNT(c.id) FILTER (WHERE c.call_outcome = 'order_placed') AS orders,
  ROUND(
    100.0 * COUNT(c.id) FILTER (WHERE c.call_outcome = 'order_placed')
          / NULLIF(COUNT(c.id), 0),
    1
  ) AS order_rate_pct
FROM experiments e
JOIN experiment_variants v ON v.experiment_id = e.id
LEFT JOIN experiment_assignments a ON a.experiment_id = e.id AND a.variant_id = v.id
LEFT JOIN calls c ON c.id = a.call_id
WHERE e.slug = 'greeting_warmth_v1'
GROUP BY e.slug, v.slug
ORDER BY v.slug;
```

### Per-variant average order total (when success_metric = 'order_total')

```sql
SELECT
  v.slug AS variant,
  COUNT(o.id) AS orders,
  ROUND(AVG(o.total)::numeric, 2) AS avg_total,
  ROUND(SUM(o.total)::numeric, 2) AS revenue
FROM experiment_variants v
JOIN experiment_assignments a ON a.variant_id = v.id
JOIN calls c ON c.id = a.call_id
JOIN orders o ON o.call_id = c.id AND o.status IN ('paid','preparing','ready','completed','awaiting_handoff')
WHERE v.experiment_id = '<exp-id>'
GROUP BY v.slug
ORDER BY v.slug;
```

### Per-variant call duration

```sql
SELECT
  v.slug AS variant,
  COUNT(c.id) AS calls,
  ROUND(AVG(c.duration_seconds)::numeric, 0) AS avg_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY c.duration_seconds) AS p50_seconds
FROM experiment_variants v
JOIN experiment_assignments a ON a.variant_id = v.id
JOIN calls c ON c.id = a.call_id
WHERE v.experiment_id = '<exp-id>'
GROUP BY v.slug
ORDER BY v.slug;
```

---

## Sample size + significance heuristics

Don't ship variants on small samples. Rough rules:

- **For an order-rate experiment** (binary outcome ~30% baseline), you typically need
  ~400 calls per variant to detect a 10-point lift with confidence.
- **For an order-total experiment** (continuous outcome), 200-300 calls per variant.
- **For a duration experiment**, 150-200 calls per variant — variance is lower.

Online significance calculators that take (control conversions, control N, treatment
conversions, treatment N) are fine — Evan Miller's calculator is the classic one.
A 95% confidence interval that doesn't overlap is the bar.

Don't peek every hour and stop the moment one variant is winning. That's how you fool
yourself with random noise. Pick a sample-size target up front and stop only when you
hit it (or when one variant is unambiguously worse and the experiment is hurting users).

---

## Anti-patterns

- **Running 5 experiments at once on the same restaurant.** Variants compose
  multiplicatively. You can't cleanly attribute outcomes when greeting_v1 +
  upsell_canary_v1 + farewell_v2 + closing_v1 + name_pronunciation_v1 are all running.
  Cap to **one or two concurrent experiments** per restaurant.
- **Changing variant weights or `overrides_patch` mid-run.** This silently invalidates
  prior assignments. If you need to change a variant, stop the experiment and start
  a v2.
- **Reusing a slug after stopping.** Slugs are unique per scope. Naming them with
  monotonic suffixes (`_v1`, `_v2`) avoids confusion.
- **Adding a third variant mid-run.** Existing `control` and `treatment` callers
  re-hash to a new bucket distribution because totalWeight changed. Keep variants
  fixed once `running`.
- **Experiments that conflict with restaurant `prompt_overrides`.** Variant patches
  are merged AFTER restaurant overrides, so a variant key wins on collision.
  This is sometimes what you want, but be deliberate about it.
- **Putting reserved keys in `overrides_patch`.** Keys `is_returning`, `customer_name`,
  `total_orders`, `total_spent`, `last_order_summary` are sanitized out. Don't try to
  override the returning-customer recognition fields via variants.

---

## Known gaps (Phase 2)

1. **Assignment writes are not yet wired.** The `experiment_assignments` table exists
   and `recordAssignment()` is exported from `src/lib/experiments.ts`, but the inbound
   webhook does not call it — at the time `call_inbound` fires, Retell has not yet
   assigned a `call_id`. The right fix is to wire the assignment write from
   `/api/webhooks/retell` on `call_started`, parsing the `exp_*` dynamic variables
   from the call object. Until that lands, stats queries above will return zero rows.
2. **Interim stats source.** Until #1 ships, you can compute per-variant outcomes by
   pulling the Retell call list (their API), filtering on the `dynamic_variables`
   field for `exp_<slug> = <variant_slug>`, and joining to OMRI's `calls` table by
   `retell_call_id`. The dynamic variables ARE the source of truth — the table is just
   a faster lookup.
3. **No admin UI.** Experiments are SQL-only for now. A `/admin/experiments` page is
   slated for after the first paying pilot.
4. **No automated significance gate.** It's on you to read the stats query and decide.
   A future addition could auto-stop experiments that hit (a) target sample size and
   (b) p < 0.05.

---

## Operator quick-reference

| Action | SQL |
|---|---|
| Create experiment | `INSERT INTO experiments (slug, name, success_metric) VALUES (...)` |
| Add variant | `INSERT INTO experiment_variants (experiment_id, slug, weight, overrides_patch) VALUES (...)` |
| Start | `UPDATE experiments SET status='running', start_at=now() WHERE slug=...` |
| Stop | `UPDATE experiments SET status='stopped', end_at=now() WHERE slug=...` |
| List active | see "List active experiments" recipe above |
| See results | see "Reading results" recipes above |

When in doubt: one experiment at a time, fixed variants, fixed weights, target sample
size up front, read the result, ship the winner.
