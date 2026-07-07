import { Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementEntity } from './announcements.entity';
import { PinnedAnnouncementEntity } from './pinned-announcements.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './announcements.dto';
import { UserEntity } from '../user/users.entity';
import { AnnouncementCommentsGateway } from './announcement-comments.gateway';
import { NotificationService } from '../notification/notification.service';
import {
    PaginatedQueryOptions,
    PaginatedResponse,
    PaginationService,
} from '../common/pagination/pagination.service';

type GetAnnouncementsOptions = PaginatedQueryOptions & {
    userId?: string;
    usePagination?: boolean;
};

@Injectable()
export class AnnouncementService {
    constructor(
        @InjectRepository(AnnouncementEntity)
        private announcementRepository: Repository<AnnouncementEntity>,
        @InjectRepository(PinnedAnnouncementEntity)
        private pinnedAnnouncementRepository: Repository<PinnedAnnouncementEntity>,
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        private announcementCommentsGateway: AnnouncementCommentsGateway,
        private readonly notificationService: NotificationService,
        private readonly paginationService: PaginationService,
    ) {}

    async getAll(options: GetAnnouncementsOptions = {}): Promise<any[] | PaginatedResponse<any>> {
        const usePagination = Boolean(options.usePagination);
        const { userId } = options;

        if (usePagination) {
            return this.paginationService.getPaginatedPinnedList({
                userId,
                queryOptions: options,
                repository: this.announcementRepository,
                entityAlias: 'announcement',
                searchColumns: ['title', 'description'],
                pinnedJoinTable: 'pinned_announcements',
                pinnedJoinAlias: 'pinnedAnnouncement',
                pinnedEntityIdColumn: 'announcementId',
                relations: ['createdBy'],
                enrichEntities: async (announcements) => announcements,
                loadPinnedIds: async (announcementIds, currentUserId) => {
                    const pinnedAnnouncements = await this.pinnedAnnouncementRepository.find({
                        where: { userId: currentUserId, announcementId: In(announcementIds) },
                        select: ['announcementId'],
                    });
                    return new Set(pinnedAnnouncements.map((pinnedAnnouncement) => pinnedAnnouncement.announcementId));
                },
                orderByColumn: 'createdAt',
                orderByDirection: 'DESC',
                orderByCaseInsensitive: false,
                prioritizePinnedInAllResults: true,
            });
        }

        const listQuery = this.announcementRepository
            .createQueryBuilder('announcement')
            .leftJoinAndSelect('announcement.createdBy', 'createdBy');

        if (userId) {
            listQuery.leftJoin(
                'pinned_announcements',
                'pinnedAnnouncement',
                'pinnedAnnouncement.announcementId = announcement.id AND pinnedAnnouncement.userId = :pinListUserId',
                { pinListUserId: userId },
            );
            listQuery
                .orderBy('CASE WHEN pinnedAnnouncement.id IS NULL THEN 1 ELSE 0 END', 'ASC')
                .addOrderBy('announcement.createdAt', 'DESC')
                .addOrderBy('announcement.id', 'DESC');
        } else {
            listQuery.orderBy('announcement.createdAt', 'DESC').addOrderBy('announcement.id', 'DESC');
        }

        const announcements = await listQuery.getMany();

        const announcementIds = announcements.map((announcement) => announcement.id);
        const pinnedIds =
            userId && announcementIds.length
                ? new Set(
                      (
                          await this.pinnedAnnouncementRepository.find({
                              where: { userId, announcementId: In(announcementIds) },
                              select: ['announcementId'],
                          })
                      ).map((pinnedAnnouncement) => pinnedAnnouncement.announcementId),
                  )
                : new Set<string>();

        return announcements.map((announcement) => ({
            ...announcement,
            isPinned: userId ? pinnedIds.has(announcement.id) : false,
        }));
    }

    async getAllPaginated(options: GetAnnouncementsOptions = {}): Promise<PaginatedResponse<any>> {
        return this.getAll({ ...options, usePagination: true }) as Promise<PaginatedResponse<any>>;
    }

    async getById(id: string, userId?: string): Promise<any> {
        const announcement = await this.announcementRepository.findOne({
            where: { id },
            relations: ['createdBy'],
        });
        if (!announcement) {
            throw new NotFoundException('Announcement not found');
        }

        let result: any = { ...announcement };
        if (userId) {
            const pinnedAnnouncement = await this.pinnedAnnouncementRepository.findOne({
                where: { userId, announcementId: id },
            });
            result = { ...result, isPinned: !!pinnedAnnouncement };
        }

        return result;
    }

    async incrementViewCount(id: string): Promise<AnnouncementEntity> {
        const announcement = await this.announcementRepository.findOne({
            where: { id },
            relations: ['createdBy'],
        });
        if (!announcement) {
            throw new NotFoundException('Announcement not found');
        }

        announcement.viewCount += 1;
        await this.announcementRepository.save(announcement);
        return announcement;
    }

    async create(createAnnouncementDto: CreateAnnouncementDto, createdById?: string): Promise<{ message: string; announcement: AnnouncementEntity }> {
        const announcementData: Partial<AnnouncementEntity> = {
            title: createAnnouncementDto.title,
            description: createAnnouncementDto.description,
            viewCount: 0,
            createdById: createdById ?? null,
        };

        const created = this.announcementRepository.create(announcementData);
        await this.announcementRepository.save(created);
        const announcement = await this.announcementRepository.findOne({
            where: { id: created.id },
            relations: ['createdBy'],
        });

        this.announcementCommentsGateway.emitToAnnouncementsList('announcement:created', announcement!);

        // In-app notification records + Web Push (non-blocking).
        void this.notificationService.notifyAnnouncementCreated(announcement!).catch((error) => {
            console.error('Failed to fan-out announcement notifications:', error);
        });

        return {
            message: 'Announcement created successfully',
            announcement: announcement!,
        };
    }

    async update(id: string, updateAnnouncementDto: UpdateAnnouncementDto): Promise<{ message: string; announcement: AnnouncementEntity }> {
        const announcement = await this.announcementRepository.findOne({ where: { id }, relations: ['createdBy'] });
        if (!announcement) {
            throw new NotFoundException('Announcement not found');
        }

        if (updateAnnouncementDto.title !== undefined) {
            announcement.title = updateAnnouncementDto.title;
        }
        if (updateAnnouncementDto.description !== undefined) {
            announcement.description = updateAnnouncementDto.description;
        }

        await this.announcementRepository.save(announcement);
        const updatedAnnouncement = await this.announcementRepository.findOne({
            where: { id: announcement.id },
            relations: ['createdBy'],
        });
        this.announcementCommentsGateway.emitToAnnouncementsList('announcement:updated', updatedAnnouncement!);

        return {
            message: 'Announcement updated successfully',
            announcement: updatedAnnouncement!,
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const announcement = await this.announcementRepository.findOne({ where: { id } });
        if (!announcement) {
            throw new NotFoundException('Announcement not found');
        }

        await this.announcementRepository.remove(announcement);

        this.announcementCommentsGateway.emitToAnnouncementsList('announcement:deleted', { announcementId: id });

        return { message: 'Announcement deleted successfully' };
    }

    async pinAnnouncement(announcementId: string, userId: string): Promise<{ message: string; pinned: boolean }> {
        const announcement = await this.announcementRepository.findOne({ where: { id: announcementId } });
        if (!announcement) {
            throw new NotFoundException('Announcement not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const existingPin = await this.pinnedAnnouncementRepository.findOne({
            where: { userId, announcementId },
        });

        if (existingPin) {
            return { message: 'Announcement is already pinned', pinned: true };
        }

        const pinnedAnnouncement = this.pinnedAnnouncementRepository.create({
            userId,
            announcementId,
        });

        await this.pinnedAnnouncementRepository.save(pinnedAnnouncement);
        return { message: 'Announcement pinned successfully', pinned: true };
    }

    async unpinAnnouncement(announcementId: string, userId: string): Promise<{ message: string; pinned: boolean }> {
        const pinnedAnnouncement = await this.pinnedAnnouncementRepository.findOne({
            where: { userId, announcementId },
        });

        if (!pinnedAnnouncement) {
            throw new NotFoundException('Pinned announcement not found');
        }

        await this.pinnedAnnouncementRepository.remove(pinnedAnnouncement);
        return { message: 'Announcement unpinned successfully', pinned: false };
    }

    async togglePinAnnouncement(announcementId: string, userId: string): Promise<{ message: string; pinned: boolean }> {
        const existingPin = await this.pinnedAnnouncementRepository.findOne({
            where: { userId, announcementId },
        });

        if (existingPin) {
            return await this.unpinAnnouncement(announcementId, userId);
        }
        return await this.pinAnnouncement(announcementId, userId);
    }
}
