import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity, NotificationType } from './notification.entity';
import { UserEntity, UserStatus } from '../user/users.entity';
import { PushService } from './push.service';
import { NotificationGateway } from './notification.gateway';

function stripHtml(value: string): string {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly pushService: PushService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async listForUser(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const where: { userId: string; isRead?: boolean } = { userId };
    if (options.unreadOnly) {
      where.isRead = false;
    }

    const [rows, totalItems] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return {
      data: rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({ where: { userId, isRead: false } });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationRepository.save(notification);
    }
    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected || 0 };
  }

  /**
   * Create in-app notifications for all active users and send Web Push.
   * Runs after an announcement is created.
   */
  async notifyAnnouncementCreated(announcement: {
    id: string;
    title: string;
    description?: string;
  }): Promise<void> {
    const users = await this.userRepository.find({
      where: { status: UserStatus.Active },
      select: ['id'],
    });
    if (!users.length) return;

    const title = String(announcement.title || 'New announcement').trim() || 'New announcement';
    const plainBody = stripHtml(announcement.description || '');
    const body =
      plainBody.length > 180 ? `${plainBody.slice(0, 177)}...` : plainBody || 'A new announcement was posted.';
    const link = '/announcements';

    const rows = users.map((user) =>
      this.notificationRepository.create({
        userId: user.id,
        type: NotificationType.Announcement,
        title,
        body,
        link,
        referenceId: announcement.id,
        isRead: false,
      }),
    );

    // Insert in chunks to avoid huge payloads.
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await this.notificationRepository.save(rows.slice(i, i + chunkSize));
    }

    this.notificationGateway.emitToAll('notification:created', {
      type: NotificationType.Announcement,
      title,
      body,
      link,
      referenceId: announcement.id,
    });

    const userIds = users.map((user) => user.id);
    await this.pushService.sendToUserIds(userIds, {
      title,
      body,
      link,
      tag: `announcement-${announcement.id}`,
    });
  }
}
