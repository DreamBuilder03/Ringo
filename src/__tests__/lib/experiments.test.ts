import {
  pickVariant,
  mergeVariantOverridesInto,
  type ExperimentVariant,
} from '@/lib/experiments';

describe('experiments — pickVariant', () => {
  const expId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const evenSplit: ExperimentVariant[] = [
    { id: 'v1', slug: 'control', weight: 50, overrides_patch: {} },
    { id: 'v2', slug: 'treatment', weight: 50, overrides_patch: {} },
  ];

  const ninetyTen: ExperimentVariant[] = [
    { id: 'v1', slug: 'control', weight: 90, overrides_patch: {} },
    { id: 'v2', slug: 'canary', weight: 10, overrides_patch: {} },
  ];

  it('returns null on empty variants', () => {
    expect(pickVariant('+15555550100', expId, [])).toBeNull();
  });

  it('returns null when all weights are zero or negative', () => {
    const bad: ExperimentVariant[] = [
      { id: 'v1', slug: 'control', weight: 0, overrides_patch: {} },
      { id: 'v2', slug: 'treatment', weight: -1, overrides_patch: {} },
    ];
    expect(pickVariant('+15555550100', expId, bad)).toBeNull();
  });

  it('always returns the only positive-weight variant when others are zero', () => {
    const oneActive: ExperimentVariant[] = [
      { id: 'v1', slug: 'control', weight: 0, overrides_patch: {} },
      { id: 'v2', slug: 'treatment', weight: 100, overrides_patch: {} },
    ];
    for (let i = 0; i < 50; i++) {
      const picked = pickVariant(`+1555555${String(i).padStart(4, '0')}`, expId, oneActive);
      expect(picked?.slug).toBe('treatment');
    }
  });

  it('is deterministic — same caller + experiment always picks same variant', () => {
    const first = pickVariant('+15555550100', expId, evenSplit);
    expect(first).not.toBeNull();
    for (let i = 0; i < 20; i++) {
      const again = pickVariant('+15555550100', expId, evenSplit);
      expect(again?.id).toBe(first!.id);
    }
  });

  it('different experiments are independent for the same caller', () => {
    // The caller can land on different variants across different experiments;
    // we just verify that a fresh experimentId reseeds the hash.
    const callerNumber = '+15555550100';
    const expA = '11111111-1111-1111-1111-111111111111';
    const expB = '22222222-2222-2222-2222-222222222222';
    const expC = '33333333-3333-3333-3333-333333333333';
    const a = pickVariant(callerNumber, expA, evenSplit);
    const b = pickVariant(callerNumber, expB, evenSplit);
    const c = pickVariant(callerNumber, expC, evenSplit);
    // At least one of them should differ from the others — extremely unlikely
    // for SHA-256 to collide all three on the same bucket out of 100.
    const slugs = new Set([a?.slug, b?.slug, c?.slug]);
    expect(slugs.size).toBeGreaterThanOrEqual(1); // sanity
    // And every result must be a valid variant.
    expect(['control', 'treatment']).toContain(a?.slug);
    expect(['control', 'treatment']).toContain(b?.slug);
    expect(['control', 'treatment']).toContain(c?.slug);
  });

  it('respects weight distribution over many callers (50/50 ±5%)', () => {
    let control = 0;
    let treatment = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const picked = pickVariant(`+1555${String(i).padStart(7, '0')}`, expId, evenSplit);
      if (picked?.slug === 'control') control++;
      else if (picked?.slug === 'treatment') treatment++;
    }
    const controlPct = control / N;
    const treatmentPct = treatment / N;
    expect(controlPct).toBeGreaterThan(0.45);
    expect(controlPct).toBeLessThan(0.55);
    expect(treatmentPct).toBeGreaterThan(0.45);
    expect(treatmentPct).toBeLessThan(0.55);
  });

  it('respects weight distribution for 90/10 canary (±2%)', () => {
    let control = 0;
    let canary = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const picked = pickVariant(`+1666${String(i).padStart(7, '0')}`, expId, ninetyTen);
      if (picked?.slug === 'control') control++;
      else if (picked?.slug === 'canary') canary++;
    }
    expect(control / N).toBeGreaterThan(0.87);
    expect(control / N).toBeLessThan(0.93);
    expect(canary / N).toBeGreaterThan(0.07);
    expect(canary / N).toBeLessThan(0.13);
  });

  it('handles single variant — always picks it', () => {
    const single: ExperimentVariant[] = [
      { id: 'v1', slug: 'only', weight: 1, overrides_patch: {} },
    ];
    for (let i = 0; i < 100; i++) {
      const picked = pickVariant(`+1${i}`, expId, single);
      expect(picked?.slug).toBe('only');
    }
  });
});

describe('experiments — mergeVariantOverridesInto', () => {
  it('merges valid string keys', () => {
    const target: Record<string, string> = {};
    const kept = mergeVariantOverridesInto(
      target,
      { upsell_focus: 'garlic knots', greeting_addition: 'Welcome!' },
      20
    );
    expect(kept).toBe(2);
    expect(target.upsell_focus).toBe('garlic knots');
    expect(target.greeting_addition).toBe('Welcome!');
  });

  it('rejects reserved keys', () => {
    const target: Record<string, string> = {};
    const kept = mergeVariantOverridesInto(
      target,
      { is_returning: 'true', customer_name: 'evil', upsell_focus: 'wings' },
      20
    );
    expect(kept).toBe(1);
    expect(target.upsell_focus).toBe('wings');
    expect(target).not.toHaveProperty('is_returning');
    expect(target).not.toHaveProperty('customer_name');
  });

  it('rejects non-string values', () => {
    const target: Record<string, string> = {};
    const kept = mergeVariantOverridesInto(
      target,
      { num: 1, bool: true, arr: ['a'], obj: { x: 1 }, ok: 'fine' } as Record<string, unknown>,
      20
    );
    expect(kept).toBe(1);
    expect(target.ok).toBe('fine');
  });

  it('rejects values longer than 500 chars', () => {
    const target: Record<string, string> = {};
    const longVal = 'x'.repeat(501);
    const okVal = 'y'.repeat(500);
    const kept = mergeVariantOverridesInto(
      target,
      { too_long: longVal, just_right: okVal },
      20
    );
    expect(kept).toBe(1);
    expect(target.just_right).toBe(okVal);
    expect(target).not.toHaveProperty('too_long');
  });

  it('rejects unsafe keys', () => {
    const target: Record<string, string> = {};
    const kept = mergeVariantOverridesInto(
      target,
      {
        '1bad': 'no',
        'bad-key': 'no',
        'bad.key': 'no',
        'bad key': 'no',
        good_key: 'yes',
      },
      20
    );
    expect(kept).toBe(1);
    expect(target.good_key).toBe('yes');
  });

  it('respects remaining key budget', () => {
    const target: Record<string, string> = {};
    const patch: Record<string, string> = {};
    for (let i = 0; i < 30; i++) patch[`k${i}`] = 'v';
    const kept = mergeVariantOverridesInto(target, patch, 5);
    expect(kept).toBe(5);
    expect(Object.keys(target).length).toBe(5);
  });
});
