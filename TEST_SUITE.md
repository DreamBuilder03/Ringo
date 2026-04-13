# Ringo Test Suite

Comprehensive test suite for the Ringo restaurant voice ordering system. Focuses on critical paths that directly impact revenue.

## Quick Start

### Installation

```bash
npm install
```

This installs Jest, React Testing Library, and other test dependencies as specified in `package.json`.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:ci
```

## Architecture

### Configuration Files

- **`jest.config.ts`** — Jest configuration with TypeScript support, jsdom environment, and path aliases
- **`jest.setup.ts`** — Initializes testing libraries (React Testing Library DOM matchers)

### Core Utilities (Testable)

#### `/src/lib/order-utils.ts`
Extracted order calculation logic for testability. Contains:
- `calculateOrderTotals()` — Core revenue calculation (critical path)
- `normalizePhone()` — Phone number normalization
- `maskPhone()` — Phone masking for display
- `formatOrderSummary()` — Voice response formatting
- `calculateUpsellTotal()` — Upsell tracking

#### `/src/lib/retell.ts`
Retell AI integration utilities:
- `parseCallDuration()` — Call duration calculation (for metrics)
- `classifyCallOutcome()` — Call classification for analytics (critical path)
- `verifyRetellWebhook()` — Webhook signature validation

#### `/src/lib/email.ts`
Email sending via Resend API:
- `sendEmail()` — Sends transactional emails with graceful fallback

## Test Files

### Unit Tests

#### **`src/__tests__/lib/order-utils.test.ts`**
Tests order calculation and formatting utilities.

**Critical paths tested:**
- Single and multiple item calculations
- Tax accuracy (Modesto CA: 8.75%)
- Decimal rounding to 2 places (currency precision)
- Empty order handling
- Upsell calculation and tracking
- Phone normalization and masking
- Order summary formatting

**Example scenarios:**
```typescript
// Revenue-critical: ensures money is calculated correctly
const items = [
  { name: 'Burger', quantity: 2, price: 10.0 },
  { name: 'Drink', quantity: 1, price: 3.0 }
];
const totals = calculateOrderTotals(items, 0.0875);
// subtotal: 23.00, tax: 2.01, total: 25.01
```

---

#### **`src/__tests__/lib/retell.test.ts`**
Tests Retell AI integration utilities.

**Critical paths tested:**
- Call duration parsing (handles missing end timestamps)
- Call outcome classification:
  - `order_placed` — Order keywords detected or analysis override
  - `inquiry` — Generic questions
  - `upsell_only` — Upsell attempts without confirmed order
  - `missed` — Empty transcript or no interaction
- Analysis data override (AI confidence > keyword guessing)

**Example scenarios:**
```typescript
// Revenue tracking: classifies which calls generated orders
classifyCallOutcome('I would like to place an order'); 
// → 'order_placed'

classifyCallOutcome(''); // Missed call
// → 'missed'
```

---

#### **`src/__tests__/lib/email.test.ts`**
Tests email utility with mocked Fetch API.

**Paths tested:**
- Successful email send with API key
- Missing API key (graceful skip with warning)
- API failures (network errors, validation failures)
- Custom from email configuration
- Correct Resend API payload construction
- Bearer token authentication
- Multiple consecutive emails

**Example scenarios:**
```typescript
// Graceful handling: emails are nice-to-have, not critical
process.env.RESEND_API_KEY = undefined;
const result = await sendEmail({ ... });
// result.success = true, result.warning = 'Email not configured'
```

---

### API Integration Tests

#### **`src/__tests__/api/tools/add-to-order.test.ts`**
Tests order building and calculation at the API layer.

**Critical revenue paths:**
- Single item calculation accuracy
- Multiple items with different quantities
- Tax calculation (8.75% default for Modesto)
- Custom restaurant tax rates
- Upsell tracking within orders
- Large orders (scaling accuracy)
- Precision maintenance across rounding
- Building order accumulation (adding items sequentially)
- Update scenarios (modifying existing orders)

**Real scenarios:**
```typescript
// Restaurant special: California (8.75% tax)
const items = [
  { name: 'Pizza', quantity: 1, price: 14.99 },
  { name: 'Drink', quantity: 2, price: 2.5 }
];
// Subtotal: 19.99, Tax: 1.45, Total: 21.44
```

---

#### **`src/__tests__/api/webhooks/retell.test.ts`**
Tests Retell webhook logic for call classification and duration.

**Critical analytics paths:**
- Revenue-generating calls (`order_placed`)
- Missed call alerts (`missed`)
- Follow-up opportunities (`inquiry`)
- Incomplete transactions (`upsell_only`)
- Analysis data override for accuracy
- Call duration for billing/metrics
- Multi-turn conversation handling
- Real restaurant scenarios

**Example scenario:**
```typescript
// Analytics: must correctly count orders vs inquiries
classifyCallOutcome(`
  Agent: Ready to order?
  Customer: Yes, a burrito please.
  Agent: That will be $12.50.
`);
// → 'order_placed' (revenue!)
```

## Coverage

Run coverage analysis:

```bash
npm run test:ci
```

Generates coverage report showing:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

Focus areas for coverage:
- Order calculation logic (100% — must be accurate)
- Call classification logic (100% — drives analytics)
- Email handling (100% — non-critical but important)

## Critical Paths

Tests are organized around these revenue-critical operations:

1. **Order Calculation** — Ensures correct subtotal, tax, total
   - Any error here loses money
   - Location: `order-utils.test.ts`, `add-to-order.test.ts`

2. **Call Classification** — Determines if a call was successful
   - Drives ROI calculations
   - Location: `retell.test.ts`, `webhooks/retell.test.ts`

3. **Upsell Tracking** — Measures secondary revenue
   - Location: `order-utils.test.ts` (upsell calculation)

4. **Email Delivery** — Alerts and confirmations
   - Non-critical (graceful failure)
   - Location: `email.test.ts`

## Running Specific Tests

```bash
# Test only order calculations
npm test order-utils.test

# Test only Retell utilities
npm test retell.test

# Test only email
npm test email.test

# Run with verbose output
npm test -- --verbose
```

## Debugging Tests

```bash
# Run specific test file with detailed output
npm test -- src/__tests__/lib/order-utils.test.ts --verbose

# Run single test case
npm test -- --testNamePattern="should calculate totals for a single item"

# Watch mode with focus
npm run test:watch -- order-utils.test
```

## CI/CD Integration

For automated testing in CI:

```bash
npm run test:ci
```

This runs with:
- Coverage collection
- No watch mode
- CI-optimized output

## Future Test Expansion

Current test suite covers pure utilities. When adding more tests:

1. **Supabase Queries** — Would need `@supabase/supabase-js` mocks
2. **API Route Handlers** — Would need request/response mocks
3. **React Components** — Would use React Testing Library
4. **Integration Tests** — Would test API routes end-to-end

## Key Testing Principles

1. **Revenue Protection** — Order calculations must be 100% accurate
2. **Analytics Accuracy** — Call classifications drive ROI metrics
3. **Graceful Failures** — Non-critical paths (email) should fail gracefully
4. **Real Scenarios** — Tests use realistic restaurant data
5. **Decimal Precision** — Currency calculations use proper rounding

## Troubleshooting

### Tests fail with "Cannot find module"
- Ensure path aliases in `jest.config.ts` match `tsconfig.json`
- Verify all imports use `@/` prefix

### Email tests failing
- Check that `global.fetch` is properly mocked
- Ensure environment variables are cleared between tests with `beforeEach`

### Precision/rounding issues
- Use `toBeCloseTo(value, 2)` for floating-point comparisons
- Always verify `subtotal + tax = total` matches with proper rounding

---

**Last updated:** 2026-04-12
**Test framework:** Jest 29.7.0 + React Testing Library 14.2.0
**Next.js version:** 14.2.35
