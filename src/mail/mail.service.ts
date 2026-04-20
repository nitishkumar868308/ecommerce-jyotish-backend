import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const portStr = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP_HOST/SMTP_USER/SMTP_PASS not configured — emails will be skipped (only logged).',
      );
      return;
    }

    const port = portStr ? Number(portStr) : 465;
    // Pooled connections + tight timeouts. Contact replies were observed
    // taking several seconds because every call was opening a fresh SMTP
    // connection; pooling keeps a warm connection around so admin replies
    // hit the user's inbox in under a second.
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  /**
   * Send an email. Never throws — failures are logged so business flows
   * (contact submission, admin reply) keep working even when SMTP is down.
   */
  async send({ to, subject, html, replyTo }: SendMailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. Would have sent: ${subject} → ${to}`);
      return false;
    }
    try {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER;
      await this.transporter.sendMail({ from, to, subject, html, replyTo });
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send mail to ${to}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  get adminEmail(): string {
    return process.env.ADMIN_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || '';
  }
}
