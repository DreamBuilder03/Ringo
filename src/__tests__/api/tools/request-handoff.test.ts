/**
 * @jest-environment node
 *
 * Tests for /api/tools/request-handoff (C-4 — agent escalation tool).
 *
 * The route is a small composition of:
 *   - validateRetellBody (Zod + rate-limit + speakable-fallback wrapper)
 *   - createServiceRoleClient (Supabase)
 *   - sendFounderAlert (SMS+email pager — fire-and-forget)
 *
 * We mock createServiceRoleClient + sendFounderAlert. validateRetellBody is
 * left real because its rate limiter no-ops without Upstash env vars (test
 * env), and we want to exercise the real Zod path.
 */

import { NextRequest } from 'next/server';
import { requestHandoffSchema } from '@/lib/schemas/tools';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockInsert = jest.fn();
const mockSingle = jest.fn();
const mockOr = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ or: mockOr, single: mockSingle, eq: jest.fn(() => ({ single: mockSingle })) }));
const mockFrom = jest.fn((table: string) => {
  if (table === 'restaurants') {
    return { select: mockSelect };
  }
  if (table === 'handoff_requests') {
    return { insert: mockInsert };
  }
  return { select: mockSelect, insert: mockInsert };
});

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(async () => ({ from: mockFrom })),
}));

jest.mock('@/lib/alerts', () => ({
  sendFounderAlert: jest.fn(async () => undefined),
  reportToolFailure: jest.fn(async () => undefined),
}));

// Import AFTER mocks are set up.
import { POST } from '@/app/api/tools/request-handoff/route';
import { sendFounderAlert } from '@/lib/alerts';

// ─── Test helpers ─────────────────────────────────────────────────────────────
function makeReq(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: { get: (_k: string) => null } as unknown as Headers,
  } as unknown as NextRequest;
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    args: {
      reason: 'caller_request',
      summary: 'Caller asked to speak with a manager about catering for 80 people.',
      ...overrides,
    },
    call: {
      call_id: 'call_abc123',
      agent_id: 'agent_test_123',
      from_number: '+15555550100',
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Zod schema — requestHandoffSchema', () => {
  it('accepts a minimal valid body', () => {
    const r = requestHandoffSchema.safeParse(validBody());
    expect(r.success).toBe(true);
  });

  it('rejects missing reason', () => {
    const r = requestHandoffSchema.safeParse({
      args: { summary: 'x' },
      call: { agent_id: 'a' },
    });
    expect(r.success).toBe(false);
  });

  it('rejects unknown reason', () => {
    const r = requestHandoffSchema.safeParse({
      args: { reason: 'made_up_reason', summary: 'x' },
      call: { agent_id: 'a' },
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty summary', () => {
    const r = requestHandoffSchema.safeParse({
      args: { reason: 'complaint', summary: '' },
      call: { agent_id: 'a' },
    });
    expect(r.success).toBe(false);
  });

  it('caps summary at 500 chars', () => {
    const r = requestHandoffSchema.safeParse({
      args: { reason: 'complaint', summary: 'x'.repeat(501) },
      call: { agent_id: 'a' },
    });
    expect(r.success).toBe(false);
  });

  it('accepts optional uncertainty_score in [0..1]', () => {
    const ok = requestHandoffSchema.safeParse({
      args: { reason: 'agent_uncertainty', summary: 'x', uncertainty_score: 0.42 },
      call: { agent_id: 'a' },
    });
    expect(ok.success).toBe(true);
    const tooHigh = requestHandoffSchema.safeParse({
      args: { reason: 'agent_uncertainty', summary: 'x', uncertainty_score: 1.5 },
      call: { agent_id: 'a' },
    });
    expect(tooHigh.success).toBe(false);
  });
});

describe('POST /api/tools/request-handoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockReset();
    mockInsert.mockReset();
    // Default: restaurant lookup succeeds.
    mockSingle.mockResolvedValue({
      data: { id: 'rest_123', name: "Sal's Brick Oven Pizzeria" },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('happy path inserts handoff_requests row + pages founder', async () => {
    const res = await POST(makeReq(validBody()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result).toContain('call you back');
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.restaurant_id).toBe('rest_123');
    expect(inserted.reason).toBe('caller_request');
    expect(inserted.retell_call_id).toBe('call_abc123');

    // sendFounderAlert is called once (fire-and-forget; no await needed).
    expect(sendFounderAlert).toHaveBeenCalledTimes(1);
    const alertOpts = (sendFounderAlert as jest.Mock).mock.calls[0][0];
    expect(alertOpts.failureType).toBe('handoff_requested');
    expect(alertOpts.restaurantId).toBe('rest_123');
    expect(alertOpts.shortReason).toContain('caller asked for a person');
  });

  it('returns 200 + speakable when restaurant is unknown (demo agent)', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await POST(makeReq(validBody()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result).toContain('reach out');
    // No insert, no alert — we don't know who to escalate to.
    expect(mockInsert).not.toHaveBeenCalled();
    expect(sendFounderAlert).not.toHaveBeenCalled();
  });

  it('still pages owner even if the insert fails', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'simulated db error' } });

    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(200);
    expect(sendFounderAlert).toHaveBeenCalledTimes(1);
  });

  it('returns 200 + speakable on validation failure (no reason)', async () => {
    const res = await POST(makeReq({
      args: { summary: 'oops' },
      call: { call_id: 'c', agent_id: 'a' },
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result).toBeTruthy();
    // Validation failed → real route never ran → no insert, no alert.
    expect(mockInsert).not.toHaveBeenCalled();
    expect(sendFounderAlert).not.toHaveBeenCalled();
  });

  it('returns 200 + speakable on JSON parse failure', async () => {
    const badReq = {
      json: async () => { throw new Error('bad json'); },
      headers: { get: () => null } as unknown as Headers,
    } as unknown as NextRequest;
    const res = await POST(badReq);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result).toBeTruthy();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(sendFounderAlert).not.toHaveBeenCalled();
  });

  it('forwards uncertainty_score when agent provides one', async () => {
    await POST(makeReq(validBody({ reason: 'agent_uncertainty', summary: 'unsure', uncertainty_score: 0.78 })));
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.agent_uncertainty_score).toBeCloseTo(0.78);
  });

  it('uses callback_phone override when provided', async () => {
    await POST(makeReq(validBody({ callback_phone: '+15559998888' })));
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.from_number).toBe('+15559998888');
  });
});
