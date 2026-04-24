/**
 * Password-reset OTP emails — shared template with a `variant` knob so
 * the same code serves both Wizard shoppers and Jyotish astrologers.
 * The visual difference is purely the header colour band + brand wordmark;
 * the copy, security warnings and OTP styling stay consistent so users
 * don't have to decode a different visual language for each surface.
 */

interface Args {
  name: string | null | undefined;
  otp: string;
  expiresInMinutes: number;
  supportEmail?: string;
  variant?: 'wizard' | 'jyotish';
  /** Optional deep link that pre-fills the email+code on the reset
   *  page so the shopper can skip typing the OTP manually. When
   *  present we render a prominent CTA button alongside the OTP box. */
  magicLink?: string;
}

export function buildResetPasswordOtpEmailHtml(args: Args): string {
  const {
    name,
    otp,
    expiresInMinutes,
    supportEmail,
    variant = 'wizard',
    magicLink,
  } = args;
  const greeting = (name ?? 'there').toString().trim() || 'there';

  const palette =
    variant === 'jyotish'
      ? {
          // Jyotish surface = purple + gold. Matches the login-jyotish /
          // register-jyotish visual theme so the OTP email doesn't feel
          // like it came from a different company.
          headerBg: 'linear-gradient(135deg,#7c3aed,#a855f7)',
          brandLabel: 'Hecate Jyotish',
          otpBg: '#faf7ff',
          otpBorder: '#ece4fa',
          otpColor: '#7c3aed',
          ctaBg: 'linear-gradient(135deg,#7c3aed,#a855f7)',
          footerBg: '#faf7ff',
          linkColor: '#7c3aed',
        }
      : {
          // Wizard surface = teal / emerald (matches header + order
          // confirmation email header band).
          headerBg: 'linear-gradient(135deg,#0d9488,#0f766e)',
          brandLabel: 'Hecate Wizard Mall',
          otpBg: '#ecfdf5',
          otpBorder: '#d1fae5',
          otpColor: '#047857',
          ctaBg: 'linear-gradient(135deg,#0d9488,#0f766e)',
          footerBg: '#ecfdf5',
          linkColor: '#0d9488',
        };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Password reset OTP</title>
  </head>
  <body style="margin:0; padding:0; background:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:${palette.headerBg}; color:#ffffff; padding:24px 28px;">
                <p style="margin:0; font-size:11px; letter-spacing:3px; opacity:0.85; text-transform:uppercase;">${escapeHtml(palette.brandLabel)}</p>
                <p style="margin:8px 0 0 0; font-size:20px; font-weight:700;">Password reset code</p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 28px 8px 28px;">
                <p style="margin:0 0 10px 0; font-size:16px;">Hi ${escapeHtml(greeting)},</p>
                <p style="margin:0; font-size:14px; color:#4b5563; line-height:1.65;">
                  Use the code below to reset your password. It&rsquo;s valid for
                  <strong>${expiresInMinutes} minutes</strong>. If you didn&rsquo;t ask for a reset,
                  you can safely ignore this email &mdash; no changes have been made.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:18px 28px;">
                <div style="display:inline-block; background:${palette.otpBg}; border:1px solid ${palette.otpBorder}; border-radius:12px; padding:18px 28px;">
                  <p style="margin:0 0 6px 0; font-size:11px; letter-spacing:2px; color:#6b7280; text-transform:uppercase;">Your code</p>
                  <p style="margin:0; font-family:'Courier New', monospace; font-size:30px; font-weight:800; color:${palette.otpColor}; letter-spacing:6px;">${escapeHtml(otp)}</p>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 28px 20px 28px;">
                <p style="margin:0; font-size:12px; color:#6b7280; line-height:1.6; text-align:center;">
                  Enter this 6-digit code on the reset page to continue.
                </p>
              </td>
            </tr>

            ${magicLink ? `<tr>
              <td align="center" style="padding:4px 28px 24px 28px;">
                <a href="${magicLink}" target="_blank" rel="noopener noreferrer"
                  style="display:inline-block; background:${palette.ctaBg}; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; padding:12px 26px; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.15);">
                  Or tap to reset instantly
                </a>
                <p style="margin:10px 0 0 0; font-size:11px; color:#9ca3af;">This link carries the code for you — you&rsquo;ll land straight on the new-password step.</p>
              </td>
            </tr>` : ''}

            <tr>
              <td style="background:${palette.footerBg}; padding:16px 28px; border-top:1px solid ${palette.otpBorder};">
                <p style="margin:0; font-size:11px; color:#6b7280; line-height:1.6;">
                  Didn&rsquo;t request this? Reply to this email or write to
                  <a href="mailto:${supportEmail ?? 'support@hecate.in'}" style="color:${palette.linkColor};">${escapeHtml(supportEmail ?? 'support@hecate.in')}</a>.
                  Never share this code with anyone.
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
