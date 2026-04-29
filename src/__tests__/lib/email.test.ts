import { sendEmail } from '@/lib/email';

// Mock fetch globally
global.fetch = jest.fn();

describe('Email Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    // Clear environment variables
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should successfully send email with API key configured', async () => {
      process.env.RESEND_API_KEY = 'test-api-key-123';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'email-id-123' }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Order Confirmation',
        html: '<p>Your order has been placed</p>',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('email-id-123');
      expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-api-key-123',
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('customer@example.com'),
      });
    });

    it('should use custom from email when provided', async () => {
      process.env.RESEND_API_KEY = 'test-api-key-123';
      process.env.RESEND_FROM_EMAIL = 'custom@myrestaurant.com';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'email-id-456' }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await sendEmail({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.from).toBe('custom@myrestaurant.com');
    });

    it('should use default from email when not configured', async () => {
      process.env.RESEND_API_KEY = 'test-api-key-123';
      delete process.env.RESEND_FROM_EMAIL;

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'email-id-789' }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await sendEmail({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.from).toBe('OMRI <noreply@omriapp.com>');
    });

    it('should return success with warning when API key is missing', async () => {
      delete process.env.RESEND_API_KEY;

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Order Confirmation',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.warning).toBe('Email not configured');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API failure gracefully', async () => {
      process.env.RESEND_API_KEY = 'test-api-key-123';

      const mockResponse = {
        ok: false,
        json: jest
          .fn()
          .mockResolvedValue({ error: 'Invalid email address', message: 'Validation failed' }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      process.env.RESEND_API_KEY = 'test-api-key-123';

      const error = new Error('Network timeout');
      (global.fetch as jest.Mock).mockRejectedValueOnce(error);

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should construct correct payload with all fields', async () => {
      process.env.RESEND_API_KEY = 'test-api-key-123';
      process.env.RESEND_FROM_EMAIL = 'sender@example.com';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'email-id-999' }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await sendEmail({
        to: 'recipient@example.com',
        subject: 'Order Confirmation #12345',
        html: '<h1>Welcome</h1><p>Your order details here</p>',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);

      expect(callBody).toEqual({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Order Confirmation #12345',
        html: '<h1>Welcome</h1><p>Your order details here</p>',
      });
    });

    it('should handle json parsing error from API response', async () => {
      process.env.RESEND_API_KEY = 'test-api-key-123';

      const mockResponse = {
        ok: false,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle multiple consecutive emails', async () => {
      process.env.RESEND_API_KEY = 'test-api-key-123';

      const mockResponse1 = {
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'email-1' }),
      };

      const mockResponse2 = {
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'email-2' }),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result1 = await sendEmail({
        to: 'user1@example.com',
        subject: 'Order 1',
        html: '<p>Order 1</p>',
      });

      const result2 = await sendEmail({
        to: 'user2@example.com',
        subject: 'Order 2',
        html: '<p>Order 2</p>',
      });

      expect(result1.success).toBe(true);
      expect(result1.id).toBe('email-1');
      expect(result2.success).toBe(true);
      expect(result2.id).toBe('email-2');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should include bearer token in auth header', async () => {
      process.env.RESEND_API_KEY = 'secret-key-xyz';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'email-id' }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer secret-key-xyz');
    });
  });
});
