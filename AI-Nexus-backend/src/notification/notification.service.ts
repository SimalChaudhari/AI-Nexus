import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { NotificationEntity } from './notification.entity';
import { UserEntity, UserRole, UserStatus } from '../user/users.entity';
import { EmailService } from '../service/email.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly emailService: EmailService,
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
   * Email learners when an announcement is created.
   * In-app bell notifications and Web Push are disabled for now.
   */
  async notifyAnnouncementCreated(announcement: {
    id: string;
    title: string;
    description?: string;
  }): Promise<void> {
    const title = String(announcement.title || 'New announcement').trim() || 'New announcement';
    const pageSize = 500;
    const emailRecipients: Array<{ toEmail: string; name: string }> = [];
    const seenEmails = new Set<string>();
    let lastId: string | undefined;

    console.log(`[Announcement] Email fan-out started | id=${announcement.id} title=${title}`);

    while (true) {
      const users = await this.userRepository.find({
        where: lastId
          ? { status: UserStatus.Active, isDraft: false, id: MoreThan(lastId) }
          : { status: UserStatus.Active, isDraft: false },
        select: ['id', 'email', 'firstname', 'lastname', 'role'],
        order: { id: 'ASC' },
        take: pageSize,
      });
      if (!users.length) break;

      lastId = users[users.length - 1].id;
      for (const user of users) {
        if (user.role !== UserRole.User) continue;
        const email = String(user.email || '').trim().toLowerCase();
        if (!email || !email.includes('@') || seenEmails.has(email)) continue;
        seenEmails.add(email);
        emailRecipients.push({
          toEmail: String(user.email).trim(),
          name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'there',
        });
      }
    }

    if (!emailRecipients.length) {
      console.log('[Announcement] No email recipients | need active User accounts with a valid email');
      return;
    }

    console.log(`[Announcement] Recipients ready | emails=${emailRecipients.length}`);

    const result = await this.emailService.sendAnnouncementEmailsBulk(emailRecipients, {
      title,
      description: announcement.description || '',
    });
    console.log(
      `[Announcement] Email fan-out complete | recipients=${emailRecipients.length} sent=${result.sent} failed=${result.failed}`,
    );
  }
}
