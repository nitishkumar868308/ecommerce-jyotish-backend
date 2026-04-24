/**
 * Shopper-facing order confirmation email sent once PayU returns
 * success. Responsive table-based HTML so Gmail, Outlook, Apple Mail
 * and every mobile client render it consistently.
 */
interface OrderConfirmationArgs {
  shippingName: string | null | undefined;
  orderNumber: string | null | undefined;
  invoiceNumber: string | null | undefined;
  totalAmount: number;
  currencySymbol: string;
  orderUrl: string;
  supportEmail?: string;
  platform?: 'wizard' | 'quickgo' | string;
}

export function buildOrderConfirmationEmailHtml(
  args: OrderConfirmationArgs,
): string {
  const {
    shippingName,
    orderNumber,
    invoiceNumber,
    totalAmount,
    currencySymbol,
    orderUrl,
    supportEmail,
    platform,
  } = args;

  const greeting = (shippingName ?? 'there').trim() || 'there';
  const amount = `${currencySymbol}${Number(totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const storeName = platform === 'quickgo' ? 'Hecate QuickGo' : 'Hecate Wizard Mall';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Order confirmed</title>
  </head>
  <body style="margin:0; padding:0; background:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:linear-gradient(135deg,#10b981,#047857); color:#ffffff; padding:24px 28px;">
                <p style="margin:0; font-size:11px; letter-spacing:2px; opacity:0.85; text-transform:uppercase;">${escapeHtml(storeName)}</p>
                <p style="margin:6px 0 0 0; font-size:20px; font-weight:700;">Order confirmed — thank you!</p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 28px 8px 28px;">
                <p style="margin:0 0 10px 0; font-size:16px;">Hi ${escapeHtml(greeting)},</p>
                <p style="margin:0; font-size:14px; color:#4b5563; line-height:1.6;">
                  We've received your payment and your order is in the queue.
                  A shipping update will follow once it's dispatched.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:10px; background:#f9fafb;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0; font-size:11px; letter-spacing:1px; color:#6b7280; text-transform:uppercase;">Order</p>
                      <p style="margin:4px 0 0 0; font-family:'Courier New', monospace; font-size:16px; font-weight:700;">${escapeHtml(orderNumber ?? '')}</p>
                      ${invoiceNumber ? `
                      <p style="margin:10px 0 0 0; font-size:11px; letter-spacing:1px; color:#6b7280; text-transform:uppercase;">Invoice</p>
                      <p style="margin:4px 0 0 0; font-family:'Courier New', monospace; font-size:14px;">${escapeHtml(invoiceNumber)}</p>` : ''}
                      <p style="margin:12px 0 0 0; font-size:11px; letter-spacing:1px; color:#6b7280; text-transform:uppercase;">Amount paid</p>
                      <p style="margin:4px 0 0 0; font-size:24px; font-weight:800; color:#047857;">${escapeHtml(amount)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:4px 28px 24px 28px;">
                <a href="${orderUrl}" target="_blank" rel="noopener noreferrer"
                  style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:12px 28px; border-radius:8px;">
                  View order details
                </a>
              </td>
            </tr>

            <tr>
              <td style="background:#f9fafb; padding:16px 28px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; font-size:11px; color:#6b7280; line-height:1.6;">
                  Questions? Reply to this email or write to
                  <a href="mailto:${supportEmail ?? 'support@hecate.in'}" style="color:#4f46e5;">${escapeHtml(supportEmail ?? 'support@hecate.in')}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Admin notification — short, scannable. Sent to ADMIN_EMAIL when a
 * paid order lands so ops can start packing without polling the admin
 * dashboard.
 */
export function buildAdminOrderNotificationHtml(args: {
  orderNumber: string | null | undefined;
  invoiceNumber: string | null | undefined;
  totalAmount: number;
  currencySymbol: string;
  userName: string | null | undefined;
  platform?: string;
  adminOrderUrl: string;
}): string {
  const {
    orderNumber,
    invoiceNumber,
    totalAmount,
    currencySymbol,
    userName,
    platform,
    adminOrderUrl,
  } = args;
  const amount = `${currencySymbol}${Number(totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  return `<!doctype html>
<html><body style="margin:0; padding:24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937; background:#f3f4f6;">
  <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden;">
    <div style="background:#4f46e5; color:#fff; padding:16px 20px;">
      <p style="margin:0; font-size:11px; letter-spacing:2px; text-transform:uppercase;">New paid order</p>
      <p style="margin:4px 0 0 0; font-family:'Courier New', monospace; font-size:18px; font-weight:700;">${escapeHtml(orderNumber ?? '')}</p>
    </div>
    <div style="padding:18px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
        <tr><td style="color:#6b7280; padding:4px 0;">Customer</td><td style="text-align:right; font-weight:600;">${escapeHtml(userName ?? '')}</td></tr>
        <tr><td style="color:#6b7280; padding:4px 0;">Source</td><td style="text-align:right; font-weight:600;">${escapeHtml(platform ?? 'wizard')}</td></tr>
        ${invoiceNumber ? `<tr><td style="color:#6b7280; padding:4px 0;">Invoice</td><td style="text-align:right; font-family:'Courier New', monospace;">${escapeHtml(invoiceNumber)}</td></tr>` : ''}
        <tr><td style="color:#6b7280; padding:4px 0;">Amount</td><td style="text-align:right; font-weight:700; color:#047857;">${escapeHtml(amount)}</td></tr>
      </table>
      <div style="margin-top:16px; text-align:center;">
        <a href="${adminOrderUrl}" style="display:inline-block; background:#1f2937; color:#fff; text-decoration:none; padding:10px 18px; border-radius:6px; font-size:13px;">Open in admin</a>
      </div>
    </div>
  </div>
</body></html>`;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
