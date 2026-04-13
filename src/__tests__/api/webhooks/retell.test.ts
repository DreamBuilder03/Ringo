/**
 * Tests for Retell webhook call classification logic
 * Tests the critical business logic for determining call outcomes
 * without requiring a full Supabase mock
 */

import { parseCallDuration, classifyCallOutcome } from '@/lib/retell';

describe('Retell Webhook - Call Classification', () => {
  describe('Critical business logic for call analytics', () => {
    it('should correctly classify calls for revenue tracking', () => {
      // Call that resulted in an order
      const orderCall = classifyCallOutcome(
        'Customer: I would like to order a burger and fries. Agent: That will be $15.99.'
      );
      expect(orderCall).toBe('order_placed');

      // Call that was missed (no interaction)
      const missedCall = classifyCallOutcome('');
      expect(missedCall).toBe('missed');

      // Call that was just an inquiry
      const inquiryCall = classifyCallOutcome('Customer: What are your hours?');
      expect(inquiryCall).toBe('inquiry');

      // Call with upsell attempt
      const upsellCall = classifyCallOutcome(
        'Agent: Would you like to add a drink to your order?'
      );
      expect(upsellCall).toBe('upsell_only');
    });

    it('should track order placed calls (revenue generating)', () => {
      const transcripts = [
        'I would like to place an order',
        'The total will be $25.50',
        'Your order has been confirmed',
        'Please confirm your order',
        'That will be $10 for your order',
      ];

      transcripts.forEach((transcript) => {
        const outcome = classifyCallOutcome(transcript);
        expect(outcome).toBe('order_placed');
      });
    });

    it('should track missed calls (for alerts)', () => {
      expect(classifyCallOutcome('')).toBe('missed');
      expect(classifyCallOutcome('   ')).toBe('missed');
      expect(classifyCallOutcome(undefined)).toBe('missed');
    });

    it('should track inquiry calls (potential follow-ups)', () => {
      const transcripts = [
        'What are your hours?',
        'Do you have vegetarian options?',
        'Is delivery available?',
        'What is your address?',
      ];

      transcripts.forEach((transcript) => {
        const outcome = classifyCallOutcome(transcript);
        expect(outcome).toBe('inquiry');
      });
    });

    it('should track upsell-only calls (incomplete orders)', () => {
      const transcripts = [
        'Would you like to add fries?',
        'Would you like to upgrade to a large?',
        'Make it a combo for a dollar more',
      ];

      transcripts.forEach((transcript) => {
        const outcome = classifyCallOutcome(transcript);
        expect(outcome).toBe('upsell_only');
      });
    });

    it('should handle analysis data override for uncertain transcripts', () => {
      // Transcript is ambiguous, but analysis provides clarity
      const ambiguousTranscript = 'Yes, okay, sounds good';

      // Without analysis, defaults to inquiry
      expect(classifyCallOutcome(ambiguousTranscript)).toBe('inquiry');

      // With analysis data, uses that classification
      expect(classifyCallOutcome(ambiguousTranscript, { call_outcome: 'order_placed' })).toBe(
        'order_placed'
      );
    });

    it('should calculate accurate call durations for billing/metrics', () => {
      // Short call (customer hung up quickly)
      const shortCall = parseCallDuration(1000000, 1000020000); // 20 seconds
      expect(shortCall).toBe(20);

      // Typical call (5 minutes)
      const typicalCall = parseCallDuration(1000000, 1000300000); // 300 seconds
      expect(typicalCall).toBe(300);

      // Long call (customer placing large order)
      const longCall = parseCallDuration(1000000, 1000900000); // 900 seconds (15 min)
      expect(longCall).toBe(900);

      // Missed call (no duration)
      const missedCallDuration = parseCallDuration(1000000, undefined);
      expect(missedCallDuration).toBe(0);
    });

    it('should prioritize real order outcome over keyword guessing', () => {
      // Transcript has no order keywords
      const transcript = 'Tell me more about your menu';

      // Without analysis: inquiry
      expect(classifyCallOutcome(transcript)).toBe('inquiry');

      // With analysis saying it was actually an order: use analysis
      expect(
        classifyCallOutcome(transcript, {
          call_outcome: 'order_placed',
          confidence: 0.95,
        })
      ).toBe('order_placed');
    });

    it('should handle complex multi-turn conversations', () => {
      const complexTranscript = `
        Customer: Hi, what's your number?
        Agent: We're at 555-1234.
        Customer: Great, I'd like to place an order.
        Agent: Sure, what would you like?
        Customer: A large pepperoni pizza.
        Agent: Anything else?
        Customer: No, that's it.
        Agent: Your total will be $18.99.
      `;

      expect(classifyCallOutcome(complexTranscript)).toBe('order_placed');
    });

    it('should handle case variations in transcripts', () => {
      const outcomes = [
        classifyCallOutcome('I WANT TO PLACE AN ORDER'),
        classifyCallOutcome('The TOTAL is $20'),
        classifyCallOutcome('ORDER placed SUCCESSFULLY'),
      ];

      outcomes.forEach((outcome) => {
        expect(outcome).toBe('order_placed');
      });
    });

    it('should not falsely classify casual mentions', () => {
      // These mention "order" but not in context of placing one
      const transcripts = [
        'In order to help you, I need your phone number',
        'Let me check the order of our menu items',
      ];

      // These will likely be 'inquiry' unless other keywords match
      transcripts.forEach((transcript) => {
        // May not always be perfect, but shouldn't be 'order_placed'
        const outcome = classifyCallOutcome(transcript);
        expect(['inquiry', 'upsell_only']).toContain(outcome);
      });
    });

    it('should handle real Ringo restaurant scenarios', () => {
      // Typical successful call
      const successfulCall = `
        Agent: Thanks for calling. Ready to order?
        Customer: Yes, I'd like a burrito with extra guac.
        Agent: Would you like to add chips?
        Customer: No, just the burrito.
        Agent: That will be $12.50.
      `;
      expect(classifyCallOutcome(successfulCall)).toBe('order_placed');

      // Typical inquiry call
      const inquiryCallExample = `
        Customer: Are you open on Sundays?
        Agent: Yes, we're open 10am to 10pm daily.
        Customer: Great, thanks!
      `;
      expect(classifyCallOutcome(inquiryCallExample)).toBe('inquiry');

      // Typical missed call (customer hung up)
      expect(classifyCallOutcome('')).toBe('missed');
    });

    it('should distinguish between placed orders and upsell attempts', () => {
      const upsellAttemptThenOrder = `
        Agent: Would you like to upgrade your drink?
        Customer: No thanks, just the burger.
        Agent: Your total is $12.99.
      `;

      // Order takes precedence
      expect(classifyCallOutcome(upsellAttemptThenOrder)).toBe('order_placed');

      const upsellAttemptWithoutOrder = 'Agent: Would you like to make that a combo?';

      // Just upsell attempt, no order confirmation
      expect(classifyCallOutcome(upsellAttemptWithoutOrder)).toBe('upsell_only');
    });
  });

  describe('Edge cases for robust analytics', () => {
    it('should handle extremely short calls', () => {
      expect(parseCallDuration(1000000, 1000001000)).toBe(1); // 1 second
    });

    it('should handle very long calls', () => {
      // 1 hour call
      expect(parseCallDuration(1000000, 1003600000)).toBe(3600);
    });

    it('should handle identical start/end timestamps', () => {
      expect(parseCallDuration(1000000, 1000000)).toBe(0);
    });

    it('should gracefully handle malformed transcript', () => {
      expect(classifyCallOutcome(null as any)).toBe('missed');
      expect(classifyCallOutcome('')).toBe('missed');
    });

    it('should handle analysis data without call_outcome field', () => {
      const transcript = 'Generic question about menu';
      const analysisData = { sentiment: 'neutral', duration: 45 };

      // Should fall back to keyword analysis
      expect(classifyCallOutcome(transcript, analysisData)).toBe('inquiry');
    });

    it('should handle invalid call_outcome values in analysis', () => {
      const transcript = 'What are your hours?';
      const analysisData = { call_outcome: 'invalid_outcome' };

      // Should ignore invalid and use keyword analysis
      expect(classifyCallOutcome(transcript, analysisData)).toBe('inquiry');
    });
  });
});
