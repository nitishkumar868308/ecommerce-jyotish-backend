/**
 * Astrologer-facing transactional emails. Two flows:
 *
 *   1. Registration ack — sent right after the astrologer submits their
 *      application. Reassures them the form went through and explains
 *      what happens next.
 *   2. Approval credentials — sent once the admin flips both `isApproved`
 *      and `isActive` to true. Carries the generated password in clear
 *      text (so they can log in) and a CTA to the Jyotish login page.
 *
 * Both are table-based HTML so Outlook/Gmail/Apple Mail render the same
 * thing across devices. No external CSS — every style is inline.
 */

interface RegistrationArgs {
  fullName: string | null | undefined;
  displayName: string | null | undefined;
  loginUrl: string;
  supportEmail?: string;
}

export function buildAstrologerRegistrationEmailHtml(
  args: RegistrationArgs,
): string {
  const { fullName, displayName, loginUrl, supportEmail } = args;
  const greeting = (displayName || fullName || 'there').toString().trim() || 'there';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Registration received</title>
  </head>
  <body style="margin:0; padding:0; background:#f3f0fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0fb; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 4px 14px rgba(88,28,135,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#a855f7); color:#ffffff; padding:28px 28px;">
                <p style="margin:0; font-size:11px; letter-spacing:3px; opacity:0.85; text-transform:uppercase;">Hecate Jyotish</p>
                <p style="margin:8px 0 0 0; font-size:22px; font-weight:700;">Welcome aboard, ${escapeHtml(greeting)} &#9734;</p>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 28px 10px 28px;">
                <p style="margin:0 0 12px 0; font-size:16px;">Your registration has been received.</p>
                <p style="margin:0; font-size:14px; color:#4b5563; line-height:1.65;">
                  Thank you for applying to become a Hecate Jyotish astrologer. Our
                  team is now reviewing your documents and certifications. You&rsquo;ll
                  hear from us once the review is complete &mdash; usually within
                  <strong>2 business days</strong>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:10px; background:#faf7ff;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 8px 0; font-size:11px; letter-spacing:1.5px; color:#7c3aed; text-transform:uppercase; font-weight:600;">What happens next</p>
                      <ol style="margin:0; padding-left:20px; font-size:13px; color:#4b5563; line-height:1.75;">
                        <li>Admin verifies your ID proof &amp; certifications.</li>
                        <li>On approval, we&rsquo;ll email you login credentials.</li>
                        <li>You sign in, set your availability, and start taking sessions.</li>
                      </ol>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:14px 28px 26px 28px;">
                <a href="${loginUrl}" target="_blank" rel="noopener noreferrer"
                  style="display:inline-block; background:linear-gradient(135deg,#7c3aed,#a855f7); color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:12px 28px; border-radius:10px; box-shadow:0 4px 10px rgba(124,58,237,0.35);">
                  Visit Jyotish login
                </a>
              </td>
            </tr>

            <tr>
              <td style="background:#faf7ff; padding:16px 28px; border-top:1px solid #ece4fa;">
                <p style="margin:0; font-size:11px; color:#6b7280; line-height:1.6;">
                  Questions about your application? Reply to this email or write to
                  <a href="mailto:${supportEmail ?? 'support@hecate.in'}" style="color:#7c3aed;">${escapeHtml(supportEmail ?? 'support@hecate.in')}</a>.
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

interface ApprovalArgs {
  fullName: string | null | undefined;
  displayName: string | null | undefined;
  email: string;
  password: string;
  loginUrl: string;
  supportEmail?: string;
}

export function buildAstrologerApprovedCredentialsEmailHtml(
  args: ApprovalArgs,
): string {
  const { fullName, displayName, email, password, loginUrl, supportEmail } = args;
  const greeting = (displayName || fullName || 'there').toString().trim() || 'there';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your Jyotish account is live</title>
  </head>
  <body style="margin:0; padding:0; background:#f3f0fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0fb; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 4px 14px rgba(88,28,135,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#d97706,#f59e0b); color:#ffffff; padding:28px 28px;">
                <p style="margin:0; font-size:11px; letter-spacing:3px; opacity:0.9; text-transform:uppercase;">Hecate Jyotish &mdash; You&rsquo;re approved</p>
                <p style="margin:8px 0 0 0; font-size:22px; font-weight:700;">Welcome, ${escapeHtml(greeting)} &#9734;</p>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 28px 10px 28px;">
                <p style="margin:0 0 12px 0; font-size:16px;">Your account is live.</p>
                <p style="margin:0; font-size:14px; color:#4b5563; line-height:1.65;">
                  Our team has reviewed and approved your registration. Use the
                  credentials below to sign in to the astrologer dashboard and
                  start configuring your profile, availability and services.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fde68a; border-radius:10px; background:#fffbeb;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 4px 0; font-size:11px; letter-spacing:1.5px; color:#92400e; text-transform:uppercase; font-weight:600;">Email</p>
                      <p style="margin:0 0 14px 0; font-family:'Courier New', monospace; font-size:15px; font-weight:600;">${escapeHtml(email)}</p>
                      <p style="margin:0 0 4px 0; font-size:11px; letter-spacing:1.5px; color:#92400e; text-transform:uppercase; font-weight:600;">Password</p>
                      <p style="margin:0; font-family:'Courier New', monospace; font-size:18px; font-weight:700; color:#b45309; letter-spacing:1px;">${escapeHtml(password)}</p>
                      <p style="margin:12px 0 0 0; font-size:11px; color:#92400e; line-height:1.5;">
                        For your security, change this password from the dashboard after your first sign in.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:14px 28px 26px 28px;">
                <a href="${loginUrl}" target="_blank" rel="noopener noreferrer"
                  style="display:inline-block; background:linear-gradient(135deg,#d97706,#f59e0b); color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:13px 32px; border-radius:10px; box-shadow:0 4px 10px rgba(217,119,6,0.35);">
                  Sign in now
                </a>
              </td>
            </tr>

            <tr>
              <td style="background:#fffbeb; padding:16px 28px; border-top:1px solid #fde68a;">
                <p style="margin:0; font-size:11px; color:#6b7280; line-height:1.6;">
                  Didn&rsquo;t expect this email? Reply and let us know &mdash; or reach
                  <a href="mailto:${supportEmail ?? 'support@hecate.in'}" style="color:#b45309;">${escapeHtml(supportEmail ?? 'support@hecate.in')}</a>.
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
