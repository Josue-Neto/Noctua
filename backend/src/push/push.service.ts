import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as webpush from 'web-push';
import { SubscribeDto } from './push.dto';

@Injectable()
export class PushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushService.name);
  private timer?: NodeJS.Timeout;
  private working = false;
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}

  get configured() {
    return !!(
      this.config.get('VAPID_PUBLIC_KEY') &&
      this.config.get('VAPID_PRIVATE_KEY') &&
      this.config.get('VAPID_SUBJECT')
    );
  }
  publicKey() {
    if (!this.configured)
      throw new ServiceUnavailableException(
        'Notificações ainda não foram configuradas pela instituição.',
      );
    return { publicKey: this.config.get<string>('VAPID_PUBLIC_KEY') };
  }
  onModuleInit() {
    if (!this.configured) {
      this.logger.warn('Web Push desativado: configure as chaves VAPID.');
      return;
    }
    if (this.config.get('PUSH_WORKER_ENABLED', 'true') !== 'true') return;
    this.timer = setInterval(() => void this.tick(), 30000);
    this.timer.unref();
    void this.tick();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private validateEndpoint(endpoint: string) {
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      throw new BadRequestException('Assinatura inválida.');
    }
    const host = url.hostname.toLowerCase();
    const allowed =
      host === 'fcm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host.endsWith('.push.apple.com') ||
      host.endsWith('.notify.windows.com');
    if (
      url.protocol !== 'https:' ||
      url.port ||
      url.username ||
      url.password ||
      !allowed
    )
      throw new BadRequestException('Serviço de notificações não suportado.');
  }
  async subscribe(userId: string, dto: SubscribeDto) {
    this.publicKey();
    this.validateEndpoint(dto.endpoint);
    if (
      !/^[A-Za-z0-9_-]{87}$/.test(dto.keys.p256dh) ||
      !/^[A-Za-z0-9_-]{22}$/.test(dto.keys.auth)
    )
      throw new BadRequestException('Chaves da assinatura inválidas.');
    await this.db.transaction(async (m) => {
      await m.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      await m.query(
        'INSERT INTO notification_preferences (user_id,push_enabled) VALUES ($1,true) ON CONFLICT (user_id) DO UPDATE SET push_enabled=true,updated_at=NOW()',
        [userId],
      );
      await m.query(
        `INSERT INTO push_subscriptions (user_id,endpoint,p256dh_key,auth_key,expiration_time) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,p256dh_key=EXCLUDED.p256dh_key,auth_key=EXCLUDED.auth_key,expiration_time=EXCLUDED.expiration_time,updated_at=NOW()`,
        [
          userId,
          dto.endpoint,
          dto.keys.p256dh,
          dto.keys.auth,
          dto.expirationTime ?? null,
        ],
      );
    });
    return { subscribed: true };
  }
  async unsubscribe(userId: string, endpoint: string) {
    await this.db.query(
      'DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2',
      [userId, endpoint],
    );
    return { unsubscribed: true };
  }
  async tick() {
    if (this.working) return;
    this.working = true;
    try {
      await this.reconcile();
      for (let i = 0; i < 30; i++) if (!(await this.sendNext())) break;
    } catch (error) {
      this.logger.error(
        'Falha ao processar lembretes.',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      this.working = false;
    }
  }
  async reconcile() {
    await this.db.transaction(async (m) => {
      await m.query(`UPDATE notification_deliveries d SET status='cancelled' WHERE d.status='pending' AND NOT EXISTS (
        SELECT 1 FROM activities a JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=d.student_id JOIN notification_preferences p ON p.user_id=d.student_id
        WHERE a.id=d.activity_id AND a.status='published' AND a.due_at>NOW() AND p.push_enabled AND ((d.reminder_hours=24 AND p.remind_24_hours) OR (d.reminder_hours=48 AND p.remind_48_hours)) AND d.scheduled_at=a.due_at - d.reminder_hours * INTERVAL '1 hour')`);
      await m.query(
        `UPDATE push_device_deliveries pd SET status='cancelled' FROM notification_deliveries d WHERE pd.delivery_id=d.id AND pd.status='pending' AND d.status<>'pending'`,
      );
      await m.query(`INSERT INTO notification_deliveries(activity_id,student_id,reminder_hours,scheduled_at,status)
        SELECT a.id,cm.student_id,h.hours,a.due_at-h.hours*INTERVAL '1 hour','pending'
        FROM activities a JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN class_memberships cm ON cm.class_id=cs.class_id JOIN notification_preferences p ON p.user_id=cm.student_id
        CROSS JOIN (VALUES (24),(48)) AS h(hours)
        WHERE a.status='published' AND a.due_at>NOW() AND p.push_enabled AND ((h.hours=24 AND p.remind_24_hours) OR (h.hours=48 AND p.remind_48_hours))
        AND a.due_at-h.hours*INTERVAL '1 hour'>NOW()
        ON CONFLICT(activity_id,student_id,reminder_hours) DO UPDATE SET scheduled_at=EXCLUDED.scheduled_at,status='pending',sent_at=NULL
        WHERE notification_deliveries.scheduled_at IS DISTINCT FROM EXCLUDED.scheduled_at OR notification_deliveries.status='cancelled'`);
      await m.query(`INSERT INTO push_device_deliveries(delivery_id,subscription_id,scheduled_at,next_attempt_at,status)
        SELECT d.id,s.id,d.scheduled_at,d.scheduled_at,'pending' FROM notification_deliveries d JOIN push_subscriptions s ON s.user_id=d.student_id AND (s.expiration_time IS NULL OR s.expiration_time > EXTRACT(EPOCH FROM NOW())*1000)
        WHERE d.status='pending' AND d.scheduled_at>NOW()
        ON CONFLICT(delivery_id,subscription_id) DO UPDATE SET scheduled_at=EXCLUDED.scheduled_at,next_attempt_at=EXCLUDED.scheduled_at,status='pending',attempts=0,sent_at=NULL
        WHERE push_device_deliveries.scheduled_at IS DISTINCT FROM EXCLUDED.scheduled_at OR push_device_deliveries.status='cancelled'`);
    });
  }
  protected send(
    subscription: webpush.PushSubscription,
    payload: string,
    ttl: number,
  ) {
    return webpush.sendNotification(subscription, payload, {
      TTL: ttl,
      timeout: 8000,
      vapidDetails: {
        subject: this.config.getOrThrow('VAPID_SUBJECT'),
        publicKey: this.config.getOrThrow('VAPID_PUBLIC_KEY'),
        privateKey: this.config.getOrThrow('VAPID_PRIVATE_KEY'),
      },
    });
  }
  async sendNext(): Promise<boolean> {
    return this.db.transaction(async (m) => {
      const [row] =
        await m.query(`SELECT pd.id,pd.attempts,d.id AS delivery_id,d.reminder_hours,a.id AS activity_id,a.due_at,s.id AS subscription_id,s.endpoint,s.p256dh_key,s.auth_key
        FROM push_device_deliveries pd JOIN notification_deliveries d ON d.id=pd.delivery_id JOIN activities a ON a.id=d.activity_id JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=d.student_id JOIN notification_preferences p ON p.user_id=d.student_id JOIN push_subscriptions s ON s.id=pd.subscription_id AND s.user_id=d.student_id
        WHERE pd.status='pending' AND pd.next_attempt_at<=NOW() AND d.status='pending' AND a.status='published' AND a.due_at>NOW() AND (s.expiration_time IS NULL OR s.expiration_time>EXTRACT(EPOCH FROM NOW())*1000) AND d.scheduled_at=a.due_at-d.reminder_hours*INTERVAL '1 hour' AND p.push_enabled AND ((d.reminder_hours=24 AND p.remind_24_hours) OR (d.reminder_hours=48 AND p.remind_48_hours))
        ORDER BY pd.next_attempt_at LIMIT 1 FOR UPDATE OF pd,a,cm,p,s SKIP LOCKED`);
      if (!row) return false;
      try {
        this.validateEndpoint(row.endpoint);
        const payload = JSON.stringify({
          title: 'Lembrete da agenda',
          body: `Você tem uma atividade com prazo em ${row.reminder_hours} horas.`,
          url: `/atividades/${row.activity_id}`,
        });
        const ttl = Math.max(
          0,
          Math.min(
            3600,
            Math.floor((new Date(row.due_at).getTime() - Date.now()) / 1000),
          ),
        );
        await this.send(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh_key, auth: row.auth_key },
          },
          payload,
          ttl,
        );
        await m.query(
          "UPDATE push_device_deliveries SET status='sent',sent_at=NOW() WHERE id=$1",
          [row.id],
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410)
          await m.query('DELETE FROM push_subscriptions WHERE id=$1', [
            row.subscription_id,
          ]);
        else
          await m.query(
            "UPDATE push_device_deliveries SET attempts=attempts+1,status=CASE WHEN attempts+1>=5 THEN 'failed' ELSE 'pending' END,next_attempt_at=NOW()+INTERVAL '5 minutes' WHERE id=$1",
            [row.id],
          );
        this.logger.warn(
          `Entrega de lembrete falhou${status ? ` (${status})` : ''}.`,
        );
      }
      await m.query(
        "UPDATE notification_deliveries SET status='sent',sent_at=NOW() WHERE id=$1 AND status='pending' AND NOT EXISTS (SELECT 1 FROM push_device_deliveries WHERE delivery_id=$1 AND status='pending') AND EXISTS (SELECT 1 FROM push_device_deliveries WHERE delivery_id=$1 AND status='sent')",
        [row.delivery_id],
      );
      return true;
    });
  }
}
