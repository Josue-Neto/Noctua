import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  async sendAccountLink(email: string, subject: string, action: 'convite' | 'redefinir senha', url: string) {
    const host = this.config.get<string>('SMTP_HOST');
    const from = this.config.get<string>('MAIL_FROM');
    if (!host || !from) {
      if (this.config.get<string>('NODE_ENV') !== 'production') {
        this.logger.warn(`Link de ${action} para ${email}: ${url}`);
        return;
      }
      throw new ServiceUnavailableException('O envio de e-mail está temporariamente indisponível.');
    }

    if (!this.transporter) {
      const port = Number(this.config.get<string>('SMTP_PORT', '587'));
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: this.config.get<string>('SMTP_USER')
          ? { user: this.config.get<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASSWORD') }
          : undefined,
      });
    }

    await this.transporter.sendMail({
      from,
      to: email,
      subject,
      text: `Use este link para ${action}: ${url}\n\nSe você não solicitou esta ação, ignore esta mensagem.`,
      html: `<p>Use este link para ${action}:</p><p><a href="${url}">Continuar no Noctua</a></p><p>Se você não solicitou esta ação, ignore esta mensagem.</p>`,
    });
  }
}
