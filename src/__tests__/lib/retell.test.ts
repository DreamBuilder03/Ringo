import { parseCallDuration, classifyCallOutcome } from '@/lib/retell';

describe('Retell Utilities', () => {
  describe('parseCallDuration', () => {
    it('should calculate duration correctly for valid timestamps', () => {
      const startTimestamp = 1000000;
      const endTimestamp = 1000060000; // 60 seconds later

      const duration = parseCallDuration(startTimestamp, endTimestamp);

      expect(duration).toBe(60);
    });

    it('should return 0 when end_timestamp is missing', () => {
      const startTimestamp = 1000000;

      const duration = parseCallDuration(startTimestamp);

      expect(duration).toBe(0);
    });

    it('should return 0 when end_timestamp is undefined', () => {
      const startTimestamp = 1000000;

      const duration = parseCallDuration(startTimestamp, undefined);

      expect(duration).toBe(0);
    });

    it('should handle same start and end timestamps', () => {
      const timestamp = 1000000;

      const duration = parseCallDuration(timestamp, timestamp);

      expect(duration).toBe(0);
    });

    it('should round to nearest second', () => {
      const startTimestamp = 1000000;
      const endTimestamp = 1000500; // 500ms

      const duration = parseCallDuration(startTimestamp, endTimestamp);

      expect(duration).toBe(0); // Less than 1 second rounds to 0
    });

    it('should handle millisecond precision correctly', () => {
      const startTimestamp = 1000000;
      const endTimestamp = 1001500; // 1.5 seconds

      const duration = parseCallDuration(startTimestamp, endTimestamp);

      expect(duration).toBe(2); // Rounds to 2
    });

    it('should handle long duration calls', () => {
      const startTimestamp = 1000000;
      const endTimestamp = 1000000 + 15 * 60 * 1000; // 15 minutes

      const duration = parseCallDuration(startTimestamp, endTimestamp);

      expect(duration).toBe(900); // 15 minutes in seconds
    });
  });

  describe('classifyCallOutcome', () => {
    it('should return "missed" for empty transcript', () => {
      expect(classifyCallOutcome('')).toBe('missed');
    });

    it('should return "missed" for whitespace-only transcript', () => {
      expect(classifyCallOutcome('   \n\t  ')).toBe('missed');
    });

    it('should return "missed" for undefined transcript', () => {
      expect(classifyCallOutcome(undefined)).toBe('missed');
    });

    it('should return "order_placed" when transcript contains order keywords', () => {
      const transcripts = [
        'I would like to place an order for a burger',
        'The total will be 15.99',
        'Your order has been placed',
        'Please confirm your order',
        'That will be 25 dollars',
      ];

      transcripts.forEach((transcript) => {
        expect(classifyCallOutcome(transcript)).toBe('order_placed');
      });
    });

    it('should return "order_placed" case-insensitively', () => {
      expect(classifyCallOutcome('ORDER PLACED, TOTAL IS $20')).toBe('order_placed');
      expect(classifyCallOutcome('CONFIRM your order')).toBe('order_placed');
    });

    it('should return "upsell_only" when transcript contains upsell keywords', () => {
      const transcripts = [
        'Would you like to add fries to your order?',
        'Would you like to upgrade to a large?',
        'Make it a combo for just a dollar more',
      ];

      transcripts.forEach((transcript) => {
        expect(classifyCallOutcome(transcript)).toBe('upsell_only');
      });
    });

    it('should prioritize order_placed over upsell_only', () => {
      const transcript = 'Would you like to upgrade? Order total is $20';
      expect(classifyCallOutcome(transcript)).toBe('order_placed');
    });

    it('should return "inquiry" for generic conversation', () => {
      const transcripts = [
        'What are your hours?',
        'Do you have vegetarian options?',
        'Is delivery available?',
        'What do you recommend?',
      ];

      transcripts.forEach((transcript) => {
        expect(classifyCallOutcome(transcript)).toBe('inquiry');
      });
    });

    it('should override transcript keywords with analysisData.call_outcome', () => {
      const transcript = 'No order or upsell keywords here';
      const analysisData = { call_outcome: 'order_placed' };

      expect(classifyCallOutcome(transcript, analysisData)).toBe('order_placed');
    });

    it('should validate call_outcome from analysisData against allowed values', () => {
      const transcript = 'Generic conversation';

      // Valid override
      expect(classifyCallOutcome(transcript, { call_outcome: 'inquiry' })).toBe('inquiry');

      // Invalid override — should fall back to keyword analysis
      expect(classifyCallOutcome(transcript, { call_outcome: 'invalid_outcome' })).toBe(
        'inquiry'
      );
    });

    it('should handle analysisData with other custom fields', () => {
      const transcript = 'What are your hours';
      const analysisData = {
        sentiment: 'positive',
        customer_name: 'John',
        call_outcome: 'inquiry',
      };

      expect(classifyCallOutcome(transcript, analysisData)).toBe('inquiry');
    });

    it('should prefer analysisData override even for matched keywords', () => {
      const transcript = 'I would like to place an order';
      const analysisData = { call_outcome: 'inquiry' };

      expect(classifyCallOutcome(transcript, analysisData)).toBe('inquiry');
    });

    it('should handle complex transcripts with multiple intents', () => {
      const transcript =
        'Agent: Would you like to add fries? Customer: Yes. Agent: Your total is $15.99';

      expect(classifyCallOutcome(transcript)).toBe('order_placed');
    });
  });
});
