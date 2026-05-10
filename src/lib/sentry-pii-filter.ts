// ──────────────────────────────────────────────────────────────────────────────
// Sentry PII filter — appendix B item #1.
//
// Strips known-PII keys from any Sentry event before it leaves the app.
// Applied via beforeSend in sentry.{server,client,edge}.config.ts.
//
// Why this matters:
//   Without this, an unhandled error in a tool route ships the full request
//   body — including the caller's phone, name, transcript snippet — to
//   Sentry's US servers. A logged-in Sentry user OR a Sentry employee could
//   theoretically read the customer PII of every restaurant we host.
//
// What this scrubs:
//   - Top-level event keys (request.data, request.headers, extra, contexts)
//   - Recursive walk of nested objects looking for known field names
//   - Arrays are walked too (contexts.args, etc.)
//
// What this does NOT do:
//   - Doesn't strip PII inside error message strings (e.g.
//     `new Error("Failed to look up phone +12095550100")`). That requires a
//     regex pass on event.message + event.exception[].value — punted to
//     Phase 2; for now, our error messages don't include phones intentionally
//     and Sentry-side data-scrubbing rules can catch the rest.
//
// Field list — keep this in sync with what we actually collect:
const SENSITIVE_KEYS = new Set([
  // Caller PII
  'from_number',
  'fromnumber',
  'customer_phone',
  'customerphone',
  'customer_name',
  'customername',
  'callback_phone',
  'callbackphone',
  'phone',
  'phone_number',
  'phonenumber',
  // Order content (may include allergy / address mentions)
  'transcript',
  'recording_url',
  'items', // order items can include "no peanuts" notes etc
  'notes',
  // Account / auth
  'email',
  'password',
  'auth_token',
  'authtoken',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'api_key',
  'apikey',
  // Square / Stripe / Twilio sensitive
  'square_access_token',
  'squareaccesstoken',
  'card',
  'card_number',
  'cardnumber',
  'cvv',
]);

const SCRUBBED = '[scrubbed:pii]';

function scrubValue(value: unknown, depth: number = 0): unknown {
  // Hard depth cap — defends against pathological nested objects + circular refs
  if (depth > 8) return value;
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((v) => scrubValue(v, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = SCRUBBED;
      } else {
        out[k] = scrubValue(v, depth + 1);
      }
    }
    return out;
  }

  return value;
}

/** beforeSend hook for Sentry. Returns the event with all PII fields scrubbed.
 *  Generic over the event type so it can be used for both `beforeSend` (ErrorEvent)
 *  and `beforeSendTransaction` (TransactionEvent) without TS friction. */
export function scrubEventPII<T>(event: T): T {
  return scrubValue(event, 0) as T;
}
