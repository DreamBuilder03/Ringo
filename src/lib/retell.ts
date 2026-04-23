import crypto from 'crypto';

export function verifyRetellWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    // timingSafeEqual requires same length buffers
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

// Retell disconnection_reason values that count as real failures (not clean hangups).
// Source: Retell API docs + observed production traffic.
// machine_detected included because an agent answering a voicemail is a broken inbound route.
export const RETELL_ERROR_DISCONNECTION_REASONS = new Set<string>([
  'error_inbound_webhook',
  'error_llm_websocket_open',
  'error_llm_websocket_lost_connection',
  'error_llm_websocket_runtime',
  'error_no_audio_received',
  'error_user_not_responsive',
  'machine_detected',
]);

export function isErrorDisconnection(reason: string | null | undefined): boolean {
  return !!reason && RETELL_ERROR_DISCONNECTION_REASONS.has(reason);
}

export interface RetellCallEvent {
  event: 'call_started' | 'call_ended' | 'call_analyzed';
  call: {
    call_id: string;
    agent_id: string;
    call_status: string;
    /**
     * Populated by Retell on call_ended / call_analyzed events. Values like
     * 'user_hangup', 'agent_hangup', 'end_call_tool' are benign; see
     * RETELL_ERROR_DISCONNECTION_REASONS for the set that should fire alerts.
     */
    disconnection_reason?: string;
    start_timestamp: number;
    end_timestamp?: number;
    transcript?: string;
    recording_url?: string;
    call_analysis?: {
      call_summary?: string;
      custom_analysis_data?: Record<string, unknown>;
    };
    metadata?: Record<string, string>;
  };
}

export function parseCallDuration(
  startTimestamp: number,
  endTimestamp?: number
): number {
  if (!endTimestamp) return 0;
  return Math.round((endTimestamp - startTimestamp) / 1000);
}

export function classifyCallOutcome(
  transcript: string | undefined,
  analysisData?: Record<string, unknown>
): 'order_placed' | 'inquiry' | 'missed' | 'upsell_only' {
  if (!transcript || transcript.trim().length === 0) return 'missed';

  const lowerTranscript = transcript.toLowerCase();

  if (analysisData?.call_outcome) {
    const outcome = String(analysisData.call_outcome);
    if (['order_placed', 'inquiry', 'missed', 'upsell_only'].includes(outcome)) {
      return outcome as 'order_placed' | 'inquiry' | 'missed' | 'upsell_only';
    }
  }

  const orderKeywords = ['order', 'total', 'that will be', 'placed your order', 'confirm'];
  const upsellKeywords = ['would you like to add', 'upgrade', 'make it a combo'];

  const hasOrder = orderKeywords.some((kw) => lowerTranscript.includes(kw));
  const hasUpsell = upsellKeywords.some((kw) => lowerTranscript.includes(kw));

  if (hasOrder) return 'order_placed';
  if (hasUpsell) return 'upsell_only';
  return 'inquiry';
}
