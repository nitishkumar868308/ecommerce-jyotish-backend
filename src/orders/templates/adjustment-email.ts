/**
 * HTML email sent to the shopper when an admin raises an additional
 * payment request against their order. Keeps the markup self-contained
 * (inline styles, table layout) so it renders consistently across Gmail,
 * Outlook, Apple Mail and mobile clients. No external CSS, no JS.
 */
interface BuildAdjustmentEmailArgs {
  userName: string | null | undefined;
  orderNumber: string | null | undefined;
  amount: number;
  currencySymbol: string;
  reason: string | null | undefined;
  adjustmentType: string;
  paymentUrl: string;
  impact: 'DEBIT' | 'CREDIT';
  supportEmail?: string;
}

export function buildAdjustmentEmailHtml(args: BuildAdjustmentEmailArgs): string {
  const {
    userName,
    orderNumber,
    amount,
    currencySymbol,
    reason,
    adjustmentType,
    paymentUrl,
    impact,
    supportEmail,
  } = args;

  const greetingName = (userName ?? 'Hi there').trim() || 'Hi there';
  const formattedAmount = `${currencySymbol}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const isDebit = impact === 'DEBIT';

  const headline = isDebit
    ? 'Additional payment required for your order'
    : 'Good news — a refund is on its way';

  const callout = isDebit
    ? 'Complete the payment to keep your order on track.'
    : 'No action needed from you — our finance team is processing it.';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${headline}</title>
  </head>
  <body style="margin:0; padding:0; background:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <!-- Brand -->
            <tr>
              <td style="background:linear-gradient(135deg,#6366f1,#4f46e5); color:#ffffff; padding:22px 28px;">
                <p style="margin:0; font-size:11px; letter-spacing:2px; opacity:0.85; text-transform:uppercase;">Hecate Wizard Mall</p>
                <p style="margin:4px 0 0 0; font-size:18px; font-weight:700;">${headline}</p>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding:24px 28px 0 28px;">
                <p style="margin:0 0 6px 0; font-size:16px;">Hi ${escapeHtml(greetingName)},</p>
                <p style="margin:0; font-size:14px; color:#4b5563; line-height:1.6;">
                  An adjustment has been raised against your order
                  <strong style="color:#1f2937;">${escapeHtml(orderNumber ?? '')}</strong>.
                  ${callout}
                </p>
              </td>
            </tr>

            <!-- Amount card -->
            <tr>
              <td style="padding:20px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:10px; background:#f9fafb;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0; font-size:11px; letter-spacing:1px; color:#6b7280; text-transform:uppercase;">
                        ${isDebit ? 'Amount due' : 'Refund amount'}
                      </p>
                      <p style="margin:6px 0 0 0; font-size:28px; font-weight:800; color:${isDebit ? '#dc2626' : '#059669'};">
                        ${escapeHtml(formattedAmount)}
                      </p>
                      <p style="margin:10px 0 0 0; font-size:12px; color:#6b7280;">
                        Type: <strong style="color:#1f2937;">${escapeHtml(adjustmentType)}</strong>
                      </p>
                      ${reason ? `
                      <p style="margin:6px 0 0 0; font-size:13px; color:#374151; line-height:1.5;">
                        <strong>Reason:</strong> ${escapeHtml(reason)}
                      </p>` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${isDebit ? `
            <!-- CTA -->
            <tr>
              <td align="center" style="padding:4px 28px 24px 28px;">
                <a href="${paymentUrl}" target="_blank" rel="noopener noreferrer"
                  style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:12px 28px; border-radius:8px;">
                  Pay ${escapeHtml(formattedAmount)} now
                </a>
                <p style="margin:14px 0 0 0; font-size:12px; color:#6b7280; line-height:1.6;">
                  Or copy-paste this link into your browser:<br />
                  <a href="${paymentUrl}" style="color:#4f46e5; word-break:break-all;">${escapeHtml(paymentUrl)}</a>
                </p>
              </td>
            </tr>` : ''}

            <!-- Order lookup -->
            <tr>
              <td style="padding:0 28px 24px 28px;">
                <p style="margin:0; font-size:12px; color:#6b7280; line-height:1.6;">
                  You can view the full order and all adjustment history any time from your
                  <strong style="color:#1f2937;">My Orders</strong> dashboard.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb; padding:16px 28px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; font-size:11px; color:#6b7280; line-height:1.6;">
                  Questions? Reply to this email or write to
                  <a href="mailto:${supportEmail ?? 'support@hecate.in'}" style="color:#4f46e5;">${escapeHtml(supportEmail ?? 'support@hecate.in')}</a>.
                </p>
                <p style="margin:6px 0 0 0; font-size:10px; color:#9ca3af;">
                  This is an automated message from Hecate Wizard Mall.
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

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
