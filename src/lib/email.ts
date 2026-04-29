/**
 * Email sending utility using Resend API
 * Env vars: RESEND_API_KEY, RESEND_FROM_EMAIL (optional)
 */

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[${new Date().toISOString()}] Email not configured — skipped to ${to}: ${subject}`
    );
    return { success: true, warning: 'Email not configured' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'OMRI <noreply@omriapp.com>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[${new Date().toISOString()}] Email send failed:`, err);
      return { success: false, error: err };
    }

    const data = await res.json();
    console.log(`[${new Date().toISOString()}] Email sent to ${to}: ${subject}`);
    return { success: true, id: data.id };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Email send error:`, error);
    return { success: false, error };
  }
}
