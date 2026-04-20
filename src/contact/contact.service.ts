import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateContactDto, ReplyContactDto } from './dto';

const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async create(dto: CreateContactDto) {
    const subject = dto.subject?.trim() || 'New website enquiry';

    const created = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        subject,
        message: dto.message,
        platform: dto.platform || 'website',
      },
    });

    // Fire-and-forget — failures inside MailService are logged, never thrown.
    void this.notifyAdmin({
      contactId: created.id,
      name: dto.name,
      email: dto.email,
      subject,
      message: dto.message,
      platform: dto.platform || 'website',
    });

    void this.confirmToUser({
      to: dto.email,
      name: dto.name,
      subject,
      message: dto.message,
    });

    return created;
  }

  async findAll() {
    const rows = await this.prisma.contactMessage.findMany({
      where: { isDeleted: false },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    // Project computed fields the admin UI expects:
    //   isRead   — admin has opened the message
    //   repliedAt — timestamp of latest admin reply, or null if never replied
    return rows.map((row) => {
      const adminReplies = row.replies.filter((r) => r.sender === 'admin');
      const latestAdminReply = adminReplies[adminReplies.length - 1];
      return {
        ...row,
        isRead: row.readByAdmin,
        repliedAt: latestAdminReply?.createdAt ?? null,
      };
    });
  }

  async markRead(id: number) {
    const msg = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.contactMessage.update({
      where: { id },
      data: { readByAdmin: true },
    });
  }

  async reply(contactMessageId: number, dto: ReplyContactDto) {
    const msg = await this.prisma.contactMessage.findUnique({
      where: { id: contactMessageId },
    });
    if (!msg) throw new NotFoundException('Contact message not found');

    const body = (dto.body || dto.message || '').trim();
    if (!body) {
      throw new NotFoundException('Reply body is required');
    }

    const sender = dto.sender || 'admin';
    const reply = await this.prisma.messageReply.create({
      data: {
        contactMessageId,
        sender,
        message: body,
        readByAdmin: sender === 'admin',
      },
    });

    if (sender === 'admin') {
      await this.prisma.contactMessage.update({
        where: { id: contactMessageId },
        data: { readByUser: false, readByAdmin: true },
      });

      const subject = (dto.subject || `Re: your enquiry to Hecate Wizard Mall`).trim();
      void this.sendAdminReply({
        to: msg.email,
        name: msg.name,
        subject,
        body,
        originalMessage: msg.message,
      });
    }

    return reply;
  }

  async delete(id: number) {
    const msg = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.contactMessage.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // ─── Email helpers ──────────────────────────────────────────────

  private async notifyAdmin(data: {
    contactId: number;
    name: string;
    email: string;
    subject: string;
    message: string;
    platform: string;
  }) {
    const admin = this.mail.adminEmail;
    if (!admin) return;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
        <h2 style="color:#3b1f78;margin-bottom:8px;">New contact form submission</h2>
        <p style="margin:0 0 16px;color:#555;">Received from the ${escape(data.platform)} site.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#777;width:90px;">Name</td><td>${escape(data.name)}</td></tr>
          <tr><td style="padding:6px 0;color:#777;">Email</td><td><a href="mailto:${escape(data.email)}">${escape(data.email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#777;">Subject</td><td>${escape(data.subject)}</td></tr>
          <tr><td style="padding:6px 0;color:#777;vertical-align:top;">Message</td><td style="white-space:pre-wrap;">${escape(data.message)}</td></tr>
        </table>
        <p style="margin-top:24px;font-size:12px;color:#999;">Message ID #${data.contactId}</p>
      </div>
    `;
    await this.mail.send({
      to: admin,
      subject: `[Contact] ${data.subject} — ${data.name}`,
      html,
      replyTo: data.email,
    });
  }

  private async confirmToUser(data: {
    to: string;
    name: string;
    subject: string;
    message: string;
  }) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
        <h2 style="color:#3b1f78;">Hi ${escape(data.name)}, we got your message</h2>
        <p>Thanks for reaching out to <strong>Hecate Wizard Mall</strong>. Our team typically replies within 24 hours.</p>
        <div style="margin-top:16px;padding:12px 16px;background:#f5f3fa;border-left:3px solid #3b1f78;border-radius:4px;">
          <p style="margin:0 0 6px;font-weight:600;">Subject</p>
          <p style="margin:0 0 12px;">${escape(data.subject)}</p>
          <p style="margin:0 0 6px;font-weight:600;">Your message</p>
          <p style="margin:0;white-space:pre-wrap;">${escape(data.message)}</p>
        </div>
        <p style="margin-top:24px;font-size:13px;color:#777;">If you didn't send this, you can safely ignore the email.</p>
      </div>
    `;
    await this.mail.send({
      to: data.to,
      subject: `We received your message — ${data.subject}`,
      html,
    });
  }

  private async sendAdminReply(data: {
    to: string;
    name: string;
    subject: string;
    body: string;
    originalMessage: string;
  }) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
        <h2 style="color:#3b1f78;">Hi ${escape(data.name)},</h2>
        <div style="font-size:15px;line-height:1.55;white-space:pre-wrap;">${escape(data.body)}</div>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
        <p style="font-size:12px;color:#888;margin:0 0 4px;">In reply to your message:</p>
        <blockquote style="margin:0;padding:8px 12px;background:#fafafa;border-left:3px solid #ddd;color:#666;font-size:13px;white-space:pre-wrap;">${escape(data.originalMessage)}</blockquote>
        <p style="margin-top:24px;font-size:12px;color:#999;">— Hecate Wizard Mall Support</p>
      </div>
    `;
    await this.mail.send({
      to: data.to,
      subject: data.subject,
      html,
    });
  }
}
