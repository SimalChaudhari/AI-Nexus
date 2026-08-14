import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscriptionEntity } from './push-subscription.entity';

export type PushPayload = {
  title: string;
  body?: string;
  link?: string;
  tag?: string;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly pushSubscriptionRepository: Repository<PushSubscriptionEntity>,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY || '';
    const privateKey = process.env.VAPID_PRIVATE_KEY || '';
    const subject = process.env.VAPID_SUBJECT || process.env.FROM_EMAIL || 'mailto:admin@localhost';

    this.enabled = Boolean(publicKey && privateKey);
    if (this.enabled) {
      webpush.setVapidDetails(
        subject.startsWith('mailto:') ? subject : `mailto:${subject}`,
        publicKey,
        privateKey,
      );
    } else {
      this.logger.warn('VAPID keys not configured — Web Push is disabled');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPublicKey(): string | null {
    return this.enabled ? process.env.VAPID_PUBLIC_KEY || null : null;
  }

  async saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<PushSubscriptionEntity> {
    const endpoint = String(subscription?.endpoint || '').trim();
    const p256dh = String(subscription?.keys?.p256dh || '').trim();
    const auth = String(subscription?.keys?.auth || '').trim();

    if (!endpoint || !p256dh || !auth) {
      throw new Error('Invalid push subscription payload');
    }

    const existing = await this.pushSubscriptionRepository.findOne({ where: { endpoint } });
    if (existing) {
      existing.userId = userId;
      existing.p256dh = p256dh;
      existing.auth = auth;
      return this.pushSubscriptionRepository.save(existing);
    }

    const created = this.pushSubscriptionRepository.create({
      userId,
      endpoint,
      p256dh,
      auth,
    });
    return this.pushSubscriptionRepository.save(created);
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await this.pushSubscriptionRepository.delete({ userId, endpoint });
  }

  async sendToUserIds(userIds: string[], payload: PushPayload): Promise<void> {
    if (!this.enabled || !userIds.length) return;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body || '',
      link: payload.link || '/announcements',
      tag: payload.tag,
    });

    const idChunkSize = 200;
    const sendChunkSize = 20;
    for (let i = 0; i < userIds.length; i += idChunkSize) {
      const chunkIds = userIds.slice(i, i + idChunkSize);
      const subscriptions = await this.pushSubscriptionRepository.find({
        where: { userId: In(chunkIds) },
      });
      if (!subscriptions.length) continue;

      for (let j = 0; j < subscriptions.length; j += sendChunkSize) {
        const batch = subscriptions.slice(j, j + sendChunkSize);
        await Promise.all(
          batch.map(async (sub) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                body,
              );
            } catch (error: any) {
              const statusCode = error?.statusCode;
              if (statusCode === 404 || statusCode === 410) {
                await this.pushSubscriptionRepository.delete({ id: sub.id });
                return;
              }
              this.logger.error(
                `Failed to send push to ${sub.id}: ${error instanceof Error ? error.message : error}`,
              );
            }
          }),
        );
      }
    }
  }
}
