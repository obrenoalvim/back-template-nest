import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly appUrl: string;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    this.from = this.config.get<string>('SMTP_FROM', 'noreply@example.com');

    const host = this.config.get<string>('SMTP_HOST');
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: this.config.get<number>('SMTP_PORT', 587),
          secure: this.config.get<number>('SMTP_PORT', 587) === 465,
          auth: {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASSWORD'),
          },
        })
      : null;
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/api/auth/verify-email?token=${token}`;
    await this.send(
      to,
      'Verify your email',
      `<p>Click to verify your email: <a href="${link}">${link}</a></p>`,
    );
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/api/auth/reset-password?token=${token}`;
    await this.send(
      to,
      'Reset your password',
      `<p>Click to reset your password: <a href="${link}">${link}</a></p>`,
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[dev email fallback] To: ${to} | Subject: ${subject}\n${html}`,
      );
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }
}
