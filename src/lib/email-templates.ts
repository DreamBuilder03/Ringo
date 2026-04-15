/**
 * Email templates for Ringo notifications
 * All templates use inline CSS for email client compatibility
 */

const BRAND_GOLD = '#F3EEE3';
const BRAND_DARK = '#0A0A0A';

function emailWrapper(title: string, content: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background-color: #141414; }
    .header { background-color: ${BRAND_DARK}; color: ${BRAND_GOLD}; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .body { background-color: white; padding: 32px 24px; color: #2E2E2E; }
    .body h2 { margin-top: 0; color: ${BRAND_DARK}; font-size: 20px; font-weight: 600; }
    .body p { line-height: 1.6; margin: 12px 0; }
    .button { display: inline-block; background-color: ${BRAND_GOLD}; color: ${BRAND_DARK}; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { background-color: #141414; padding: 24px; text-align: center; color: #6B6B6B; font-size: 12px; border-top: 1px solid #2E2E2E; }
    .stat-box { background-color: #141414; border-left: 4px solid ${BRAND_GOLD}; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .stat-label { font-size: 12px; color: #9C9C9C; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
    .stat-value { font-size: 32px; font-weight: 700; color: ${BRAND_DARK}; margin: 4px 0 0 0; }
    .order-item { padding: 8px 0; border-bottom: 1px solid #2E2E2E; }
    .order-item-last { padding: 8px 0; }
    .item-name { font-weight: 500; color: ${BRAND_DARK}; }
    .item-meta { font-size: 12px; color: #9C9C9C; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0;">Sent by Ringo AI • <a href="https://useringo.ai" style="color: ${BRAND_GOLD}; text-decoration: none;">useringo.ai</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

export function orderConfirmationEmail({
  restaurantName,
  orderId,
  items,
  subtotal,
  tax,
  total,
  paymentUrl,
}: {
  restaurantName: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentUrl: string;
}): string {
  const itemsHtml = items
    .map(
      (item) =>
        `<div class="order-item">
      <div class="item-name">${item.name}</div>
      <div class="item-meta">Qty: ${item.quantity} × $${item.price.toFixed(2)}</div>
    </div>`
    )
    .join('');

  const content = `
    <h2>Your Order is Ready for Payment</h2>
    <p>Hi there! Your order from <strong>${restaurantName}</strong> has been confirmed and is ready to pay.</p>

    <div style="background-color: #141414; border: 1px solid #2E2E2E; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${BRAND_DARK};">Order Summary</h3>
      ${itemsHtml}
      <div style="padding-top: 12px; border-top: 2px solid #2E2E2E; margin-top: 12px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span>Subtotal:</span>
          <strong>$${subtotal.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span>Tax:</span>
          <strong>$${tax.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 18px; color: ${BRAND_DARK};">
          <span>Total:</span>
          <strong>$${total.toFixed(2)}</strong>
        </div>
      </div>
    </div>

    <center>
      <a href="${paymentUrl}" class="button">Pay Now</a>
    </center>

    <p style="font-size: 12px; color: #9C9C9C; margin-top: 24px;">Once you pay, your order goes straight to the kitchen. You'll be able to track it in real-time.</p>
  `;

  return emailWrapper('Payment Ready', content);
}

export function orderPaidEmail({
  restaurantName,
  orderId,
  items,
  total,
  customerPhone,
}: {
  restaurantName: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  customerPhone: string;
}): string {
  const itemsHtml = items
    .map(
      (item) =>
        `<div class="order-item">
      <div class="item-name">${item.name}</div>
      <div class="item-meta">Qty: ${item.quantity}</div>
    </div>`
    )
    .join('');

  const content = `
    <h2>New Paid Order</h2>
    <p>Great news! You just received a new paid order from <strong>${customerPhone}</strong>.</p>

    <div class="stat-box">
      <p class="stat-label">Order ID</p>
      <p class="stat-value" style="font-size: 18px; margin-top: 4px;">${orderId}</p>
    </div>

    <div style="background-color: #141414; border: 1px solid #2E2E2E; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${BRAND_DARK};">Order Details</h3>
      ${itemsHtml}
      <div style="padding-top: 12px; border-top: 2px solid #2E2E2E; margin-top: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 16px; color: ${BRAND_DARK};">
          <span>Total:</span>
          <strong>$${total.toFixed(2)}</strong>
        </div>
      </div>
    </div>

    <p style="font-size: 12px; color: #9C9C9C;">This order has been sent to your POS system. Get cooking!</p>
  `;

  return emailWrapper('New Paid Order', content);
}

export function dailySummaryEmail({
  restaurantName,
  date,
  totalCalls,
  ordersPlaced,
  revenue,
  upsellRevenue,
  answerRate,
  topItems,
}: {
  restaurantName: string;
  date: string;
  totalCalls: number;
  ordersPlaced: number;
  revenue: number;
  upsellRevenue: number;
  answerRate: number;
  topItems: Array<{ name: string; quantity: number }>;
}): string {
  const topItemsHtml = topItems
    .slice(0, 5)
    .map(
      (item) =>
        `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #141414;">
      <span>${item.name}</span>
      <strong>${item.quantity} sold</strong>
    </div>`
    )
    .join('');

  const content = `
    <h2>Daily Performance Summary</h2>
    <p>Here's how <strong>${restaurantName}</strong> performed on ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}:</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
      <div class="stat-box" style="border-left-color: #F3EEE3;">
        <p class="stat-label">Calls Answered</p>
        <p class="stat-value">${totalCalls}</p>
      </div>
      <div class="stat-box" style="border-left-color: #F3EEE3;">
        <p class="stat-label">Orders Placed</p>
        <p class="stat-value">${ordersPlaced}</p>
      </div>
      <div class="stat-box" style="border-left-color: ${BRAND_GOLD};">
        <p class="stat-label">Revenue</p>
        <p class="stat-value">$${revenue.toFixed(0)}</p>
      </div>
      <div class="stat-box" style="border-left-color: #F3EEE3;">
        <p class="stat-label">Upsell Revenue</p>
        <p class="stat-value">$${upsellRevenue.toFixed(0)}</p>
      </div>
    </div>

    <div style="background-color: #141414; border: 1px solid #2E2E2E; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${BRAND_DARK};">Answer Rate</h3>
      <div style="background-color: white; border-radius: 4px; overflow: hidden;">
        <div style="height: 30px; background-color: #2E2E2E; display: flex; align-items: center;">
          <div style="height: 100%; background-color: #F3EEE3; width: ${answerRate}%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 12px;">
            ${answerRate}%
          </div>
        </div>
      </div>
    </div>

    ${
      topItems.length > 0
        ? `
    <div style="background-color: #141414; border: 1px solid #2E2E2E; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${BRAND_DARK};">Top Items</h3>
      ${topItemsHtml}
    </div>
    `
        : ''
    }

    <p style="text-align: center; color: #9C9C9C; font-size: 12px; margin-top: 24px;">Check your dashboard for more detailed insights.</p>
  `;

  return emailWrapper('Daily Summary', content);
}

export function failedCallAlertEmail({
  restaurantName,
  callTime,
  duration,
  transcript,
}: {
  restaurantName: string;
  callTime: string;
  duration: number;
  transcript?: string;
}): string {
  const durationMinutes = Math.floor(duration / 60);
  const durationSeconds = duration % 60;

  const content = `
    <h2>Missed Call Alert</h2>
    <p>A call came in to <strong>${restaurantName}</strong> but wasn't completed. Here are the details:</p>

    <div style="background-color: #141414; border-left: 4px solid #F3EEE3; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #6B6B6B;"><strong>This call was not successfully completed.</strong> The customer may need to call back or you may want to follow up.</p>
    </div>

    <div class="stat-box">
      <p class="stat-label">Call Time</p>
      <p style="margin: 4px 0; color: ${BRAND_DARK};">${new Date(callTime).toLocaleString()}</p>
    </div>

    <div class="stat-box">
      <p class="stat-label">Duration</p>
      <p style="margin: 4px 0; color: ${BRAND_DARK};">${durationMinutes}m ${durationSeconds}s</p>
    </div>

    ${
      transcript
        ? `
    <div style="background-color: #141414; border: 1px solid #2E2E2E; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${BRAND_DARK};">Call Transcript</h3>
      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #2E2E2E; font-family: monospace; white-space: pre-wrap; word-wrap: break-word; max-height: 300px; overflow: auto;">
        ${transcript}
      </p>
    </div>
    `
        : ''
    }

    <p style="font-size: 12px; color: #9C9C9C;">Review the transcript and consider following up with the customer if they left important information.</p>
  `;

  return emailWrapper('Missed Call Alert', content);
}

export function welcomeEmail({
  restaurantName,
  ownerName,
}: {
  restaurantName: string;
  ownerName: string;
}): string {
  const content = `
    <h2>Welcome to Ringo, ${ownerName}!</h2>
    <p>We're thrilled to have <strong>${restaurantName}</strong> on board. Your AI phone agent is being set up and will be ready in just a few minutes.</p>

    <div style="background-color: #141414; border-left: 4px solid ${BRAND_GOLD}; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: ${BRAND_DARK};"><strong>What's Next?</strong></p>
      <ul style="margin: 12px 0 0 0; padding-left: 20px;">
        <li style="margin: 6px 0;">Set up your Retell phone number in the dashboard</li>
        <li style="margin: 6px 0;">Connect your POS system for instant order sync</li>
        <li style="margin: 6px 0;">Customize your agent's voice and behavior</li>
        <li style="margin: 6px 0;">Start receiving orders 24/7</li>
      </ul>
    </div>

    <center>
      <a href="https://app.useringo.ai/dashboard" class="button">Go to Dashboard</a>
    </center>

    <div style="background-color: #141414; border: 1px solid #2E2E2E; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: ${BRAND_DARK};">Quick Tips</h3>
      <ul style="margin: 12px 0; padding-left: 20px;">
        <li style="margin: 8px 0; font-size: 13px;"><strong>Test Your Agent:</strong> Call the Ringo number to see it in action</li>
        <li style="margin: 8px 0; font-size: 13px;"><strong>Set Business Hours:</strong> Control when calls are accepted</li>
        <li style="margin: 8px 0; font-size: 13px;"><strong>Monitor Analytics:</strong> Track calls, orders, and revenue in real-time</li>
      </ul>
    </div>

    <p style="text-align: center; color: #9C9C9C; font-size: 12px; margin-top: 24px;">Questions? We're here to help at support@useringo.ai or (855) RINGO-AI</p>
  `;

  return emailWrapper('Welcome to Ringo', content);
}

/**
 * Monthly ROI report — the retention/renewal driver.
 *
 * Goal: every 1st of the month, show the owner *in dollars* why Ringo pays for
 * itself. We lead with total revenue captured, then subtract the subscription
 * cost, then surface the signature pay-before-prep savings (no-shows avoided)
 * so they internalize the "Ringo saves me money Loman can't" story.
 */
export function monthlyRoiEmail({
  restaurantName,
  monthLabel,            // e.g. "March 2026"
  totalCalls,
  ordersPlaced,
  orderRevenue,
  upsellRevenue,
  avoidedNoShowRevenue,  // $ of paid-before-prep tickets that would've ghosted pre-Ringo
  monthlyCost,           // their Ringo subscription $ for the month
}: {
  restaurantName: string;
  monthLabel: string;
  totalCalls: number;
  ordersPlaced: number;
  orderRevenue: number;
  upsellRevenue: number;
  avoidedNoShowRevenue: number;
  monthlyCost: number;
}): string {
  const captured = orderRevenue + upsellRevenue;
  const totalValue = captured + avoidedNoShowRevenue;
  const netGain = totalValue - monthlyCost;
  const roiMultiple = monthlyCost > 0 ? (totalValue / monthlyCost).toFixed(1) : '—';
  const fmt = (n: number) =>
    '$' + Math.round(n).toLocaleString('en-US');

  const content = `
    <h2>${restaurantName} — ROI for ${monthLabel}</h2>
    <p>Here's what Ringo did for you last month.</p>

    <div class="stat-box">
      <p class="stat-label">Total value delivered</p>
      <p class="stat-value">${fmt(totalValue)}</p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #6B6B6B;">
        ${roiMultiple}× your ${fmt(monthlyCost)} subscription
      </p>
    </div>

    <div style="display: block; margin: 20px 0;">
      <div style="padding: 12px 0; border-bottom: 1px solid #E5E5E5;">
        <span style="color: #6B6B6B;">Calls handled</span>
        <span style="float: right; font-weight: 600; color: ${BRAND_DARK};">${totalCalls.toLocaleString()}</span>
      </div>
      <div style="padding: 12px 0; border-bottom: 1px solid #E5E5E5;">
        <span style="color: #6B6B6B;">Orders placed</span>
        <span style="float: right; font-weight: 600; color: ${BRAND_DARK};">${ordersPlaced.toLocaleString()}</span>
      </div>
      <div style="padding: 12px 0; border-bottom: 1px solid #E5E5E5;">
        <span style="color: #6B6B6B;">Order revenue captured</span>
        <span style="float: right; font-weight: 600; color: ${BRAND_DARK};">${fmt(orderRevenue)}</span>
      </div>
      <div style="padding: 12px 0; border-bottom: 1px solid #E5E5E5;">
        <span style="color: #6B6B6B;">Upsell revenue (AI-driven)</span>
        <span style="float: right; font-weight: 600; color: ${BRAND_DARK};">${fmt(upsellRevenue)}</span>
      </div>
      <div style="padding: 12px 0;">
        <span style="color: #6B6B6B;">Wasted food avoided (pay-before-prep)</span>
        <span style="float: right; font-weight: 600; color: ${BRAND_DARK};">${fmt(avoidedNoShowRevenue)}</span>
      </div>
    </div>

    <div style="background-color: #F7F4EC; border-left: 4px solid ${BRAND_GOLD}; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #6B6B6B;">Net gain this month</p>
      <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 700; color: ${BRAND_DARK};">${fmt(netGain)}</p>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #6B6B6B;">
        Ringo's pay-before-prep is what separates us from every other voice AI —
        no other vendor stops the kitchen from firing tickets that never get picked up.
      </p>
    </div>

    <center>
      <a href="https://www.useringo.ai/dashboard/analytics" class="button">See full analytics</a>
    </center>

    <p style="text-align: center; color: #9C9C9C; font-size: 12px; margin-top: 24px;">
      Know a restaurant that could use this? Refer them and we'll credit you one month free.<br/>
      Reply to this email and we'll make it happen.
    </p>
  `;

  return emailWrapper(`Your ${monthLabel} ROI`, content);
}
