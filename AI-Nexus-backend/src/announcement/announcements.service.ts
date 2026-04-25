import { Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementEntity } from './announcements.entity';
import { CommentEntity } from './comments.entity';
import { CommentLikeEntity } from './comment-likes.entity';
import { PinnedAnnouncementEntity } from './pinned-announcements.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateAnnouncementDto, UpdateAnnouncementDto, CreateCommentDto, UpdateCommentDto } from './announcements.dto';
import { UserEntity, UserRole } from '../user/users.entity';
import { AnnouncementCommentsGateway } from './announcement-comments.gateway';
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
        @InjectRepository(CommentEntity)
        private commentRepository: Repository<CommentEntity>,
        @InjectRepository(CommentLikeEntity)
        private commentLikeRepository: Repository<CommentLikeEntity>,
        @InjectRepository(PinnedAnnouncementEntity)
        private pinnedAnnouncementRepository: Repository<PinnedAnnouncementEntity>,
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        private announcementCommentsGateway: AnnouncementCommentsGateway,
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
                relations: ['comments', 'comments.user', 'createdBy'],
                enrichEntities: async (announcements, currentUserId) =>
                    Promise.all(
                        announcements.map(async (announcement) => {
                            const commentsWithLikes = await this.enrichCommentsWithLikes(
                                announcement.comments || [],
                                currentUserId,
                            );
                            return { ...announcement, comments: commentsWithLikes };
                        }),
                    ),
                loadPinnedIds: async (announcementIds, currentUserId) => {
                    const pinnedAnnouncements = await this.pinnedAnnouncementRepository.find({
                        where: { userId: currentUserId, announcementId: In(announcementIds) },
                        select: ['announcementId'],
                    });
                    return new Set(pinnedAnnouncements.map((pinnedAnnouncement) => pinnedAnnouncement.announcementId));
                },
                orderByColumn: 'title',
                orderByDirection: 'ASC',
                orderByCaseInsensitive: true,
                prioritizePinnedInAllResults: true,
            });
        }

        const announcements = await this.announcementRepository
            .createQueryBuilder('announcement')
            .leftJoinAndSelect('announcement.comments', 'comments')
            .leftJoinAndSelect('comments.user', 'commentUser')
            .leftJoinAndSelect('announcement.createdBy', 'createdBy')
            .orderBy('LOWER(announcement.title)', 'ASC')
            .getMany();

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

        return Promise.all(
            announcements.map(async (announcement) => {
                const commentsWithLikes = await this.enrichCommentsWithLikes(announcement.comments || [], userId);
                return {
                    ...announcement,
                    comments: commentsWithLikes,
                    isPinned: userId ? pinnedIds.has(announcement.id) : false,
                };
            }),
        );
    }

    async getAllPaginated(options: GetAnnouncementsOptions = {}): Promise<PaginatedResponse<any>> {
        return this.getAll({ ...options, usePagination: true }) as Promise<PaginatedResponse<any>>;
    }

    async getById(id: string, userId?: string): Promise<any> {
        const announcement = await this.announcementRepository.findOne({
            where: { id },
            relations: ['comments', 'comments.user', 'createdBy'],
        });
        if (!announcement) {
            throw new NotFoundException('Announcement not found');
        }

        // Add like counts to comments
        const commentsWithLikes = await this.enrichCommentsWithLikes(announcement.comments || [], userId);

        // If user is logged in, add pinned status
        let result: any = { ...announcement, comments: commentsWithLikes };
        if (userId) {
            const pinnedAnnouncement = await this.pinnedAnnouncementRepository.findOne({
                where: { userId, announcementId: id },
            });
            result = { ...result, isPinned: !!pinnedAnnouncement };
        }

        return result;
    }

    /** Serialize comment for WebSocket (no circular refs). */
    private toCommentPayload(
        comment: CommentEntity & { user?: UserEntity },
        likeCount: number,
        likedByCurrentUser: boolean,
    ): Record<string, unknown> {
        const user = comment.user;
        return {
            id: comment.id,
            content: comment.content,
            userId: comment.userId,
            announcementId: comment.announcementId,
            parentCommentId: comment.parentCommentId ?? null,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            likeCount,
            likedByCurrentUser,
            user: user
                ? {
                    id: user.id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    username: user.username,
                    email: user.email,
                }
                : null,
        };
    }

    private async enrichCommentsWithLikes(comments: CommentEntity[], userId?: string): Promise<any[]> {
        if (!comments.length) return [];
        const commentIds = comments.map((c) => c.id);
        const likeCounts = await this.commentLikeRepository
            .createQueryBuilder('cl')
            .select('cl.commentId', 'commentId')
            .addSelect('COUNT(*)', 'count')
            .where('cl.commentId IN (:...ids)', { ids: commentIds })
            .groupBy('cl.commentId')
            .getRawMany();
        const countMap = new Map<string, number>();
        likeCounts.forEach((row: { commentId: string; count: string }) => {
            countMap.set(row.commentId, parseInt(row.count, 10));
        });
        let userLikedIds = new Set<string>();
        if (userId) {
            const userLikes = await this.commentLikeRepository.find({
                where: { userId, commentId: In(commentIds) },
                select: ['commentId'],
            });
            userLikedIds = new Set(userLikes.map((l) => l.commentId));
        }
        return comments.map((comment) => ({
            ...comment,
            likeCount: countMap.get(comment.id) || 0,
            likedByCurrentUser: userLikedIds.has(comment.id),
        }));
    }

    async incrementViewCount(id: string): Promise<AnnouncementEntity> {
        const announcement = await this.announcementRepository.findOne({
            where: { id },
            relations: ['comments', 'comments.user', 'createdBy'],
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
            relations: ['createdBy', 'comments', 'comments.user'],
        });

        this.announcementCommentsGateway.emitToAnnouncementsList('announcement:created', announcement!);

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
            relations: ['createdBy', 'comments', 'comments.user'],
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

    async addComment(announcementId: string, userId: string, createCommentDto: CreateCommentDto): Promise<{ message: string; comment: CommentEntity }> {
        const announcement = await this.announcementRepository.findOne({ where: { id: announcementId } });
        if (!announcement) {
            throw new NotFoundException('Announcement not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        let parentCommentId: string | null = null;
        if (createCommentDto.parentCommentId) {
            const parentComment = await this.commentRepository.findOne({
                where: { id: createCommentDto.parentCommentId },
            });
            if (!parentComment) {
                throw new NotFoundException('Parent comment not found');
            }
            if (parentComment.announcementId !== announcementId) {
                throw new NotFoundException('Parent comment does not belong to this announcement');
            }
            parentCommentId = parentComment.id;
        }

        const commentData: Partial<CommentEntity> = {
            content: createCommentDto.content,
            announcementId,
            userId,
            parentCommentId,
        };

        const comment = this.commentRepository.create(commentData);
        await this.commentRepository.save(comment);

        // Load the comment with relations for response
        const commentWithRelations = await this.commentRepository.findOne({
            where: { id: comment.id },
            relations: ['user', 'announcement'],
        });

        const payload = this.toCommentPayload(commentWithRelations!, 0, false);
        this.announcementCommentsGateway.emitToAnnouncement(announcementId, 'comment:added', payload);

        return {
            message: 'Comment added successfully',
            comment: commentWithRelations!,
        };
    }

    async getComments(announcementId: string, userId?: string): Promise<any[]> {
        const announcement = await this.announcementRepository.findOne({ where: { id: announcementId } });
        if (!announcement) {
            throw new NotFoundException('Announcement not found');
        }

        const comments = await this.commentRepository.find({
            where: { announcementId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });

        const commentIds = comments.map((c) => c.id);
        if (commentIds.length === 0) {
            return comments.map((comment) => ({
                ...comment,
                parentCommentId: comment.parentCommentId ?? null,
                likeCount: 0,
                likedByCurrentUser: false,
            }));
        }

        // Get like counts and liked status for each comment
        const likeCounts = await this.commentLikeRepository
            .createQueryBuilder('cl')
            .select('cl.commentId', 'commentId')
            .addSelect('COUNT(*)', 'count')
            .where('cl.commentId IN (:...ids)', { ids: commentIds })
            .groupBy('cl.commentId')
            .getRawMany();

        const countMap = new Map<string, number>();
        likeCounts.forEach((row: { commentId: string; count: string }) => {
            countMap.set(row.commentId, parseInt(row.count, 10));
        });

        let userLikedIds = new Set<string>();
        if (userId) {
            const userLikes = await this.commentLikeRepository.find({
                where: { userId, commentId: In(commentIds) },
                select: ['commentId'],
            });
            userLikedIds = new Set(userLikes.map((l) => l.commentId));
        }

        return comments.map((comment) => ({
            ...comment,
            parentCommentId: comment.parentCommentId ?? null,
            likeCount: countMap.get(comment.id) || 0,
            likedByCurrentUser: userLikedIds.has(comment.id),
        }));
    }

    async updateComment(commentId: string, userId: string, updateCommentDto: UpdateCommentDto): Promise<{ message: string; comment: CommentEntity }> {
        const comment = await this.commentRepository.findOne({
            where: { id: commentId },
            relations: ['user'],
        });
        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId }, select: ['id', 'role'] });
        const isAdmin = user?.role === UserRole.Admin;
        const isOwner = comment.userId === userId;
        if (!isOwner && !isAdmin) {
            throw new NotFoundException('You can only update your own comments');
        }

        comment.content = updateCommentDto.content;
        await this.commentRepository.save(comment);

        // Load with relations
        const updatedComment = await this.commentRepository.findOne({
            where: { id: comment.id },
            relations: ['user', 'announcement'],
        });

        const announcementId = comment.announcementId;
        const likeData = await this.commentLikeRepository
            .createQueryBuilder('cl')
            .select('COUNT(*)', 'count')
            .where('cl.commentId = :id', { id: comment.id })
            .getRawOne();
        const likeCount = parseInt(likeData?.count ?? '0', 10);
        const userLiked = await this.commentLikeRepository.findOne({
            where: { userId, commentId: comment.id },
        });
        const payload = this.toCommentPayload(updatedComment!, likeCount, !!userLiked);
        this.announcementCommentsGateway.emitToAnnouncement(announcementId, 'comment:updated', payload);

        return {
            message: 'Comment updated successfully',
            comment: updatedComment!,
        };
    }

    async deleteComment(commentId: string, userId: string): Promise<{ message: string }> {
        const comment = await this.commentRepository.findOne({ where: { id: commentId } });
        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        const announcementId = comment.announcementId;

        const user = await this.userRepository.findOne({ where: { id: userId }, select: ['id', 'role'] });
        const isAdmin = user?.role === UserRole.Admin;
        const isOwner = comment.userId === userId;
        if (!isOwner && !isAdmin) {
            throw new NotFoundException('You can only delete your own comments');
        }

        // Collect this comment and all descendant reply IDs
        const idsToDelete = new Set<string>([commentId]);
        let added = 1;
        while (added > 0) {
            added = 0;
            const replies = await this.commentRepository.find({
                where: { parentCommentId: In([...idsToDelete]) },
                select: ['id'],
            });
            for (const r of replies) {
                if (!idsToDelete.has(r.id)) {
                    idsToDelete.add(r.id);
                    added += 1;
                }
            }
        }
        const allIds = [...idsToDelete];

        // Delete all associated likes (comment_likes where commentId in allIds)
        if (allIds.length > 0) {
            await this.commentLikeRepository.delete({ commentId: In(allIds) });
        }

        // Delete comments: children before parents (leaves first)
        let remaining = new Set(allIds);
        while (remaining.size > 0) {
            const asArray = [...remaining];
            const commentsInSet = await this.commentRepository.find({
                where: { id: In(asArray) },
                select: ['id', 'parentCommentId'],
            });
            const parentIdsInSet = new Set(
                commentsInSet.map((c) => c.parentCommentId).filter((id): id is string => id != null && remaining.has(id)),
            );
            const leaves = asArray.filter((id) => !parentIdsInSet.has(id));
            for (const id of leaves) {
                await this.commentRepository.delete(id);
                remaining.delete(id);
            }
        }

        this.announcementCommentsGateway.emitToAnnouncement(announcementId, 'comment:deleted', {
            commentId,
            announcementId,
            deletedIds: allIds,
        });

        return { message: 'Comment deleted successfully' };
    }

    async likeComment(commentId: string, userId: string): Promise<{ message: string; liked: boolean }> {
        const comment = await this.commentRepository.findOne({ where: { id: commentId } });
        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const existingLike = await this.commentLikeRepository.findOne({
            where: { userId, commentId },
        });

        if (existingLike) {
            return { message: 'Comment already liked', liked: true };
        }

        const like = this.commentLikeRepository.create({ userId, commentId });
        await this.commentLikeRepository.save(like);
        return { message: 'Comment liked successfully', liked: true };
    }

    async unlikeComment(commentId: string, userId: string): Promise<{ message: string; liked: boolean }> {
        const existingLike = await this.commentLikeRepository.findOne({
            where: { userId, commentId },
        });

        if (!existingLike) {
            return { message: 'Comment not liked', liked: false };
        }

        await this.commentLikeRepository.remove(existingLike);
        return { message: 'Comment unliked successfully', liked: false };
    }

    async toggleCommentLike(commentId: string, userId: string): Promise<{ message: string; liked: boolean }> {
        const existingLike = await this.commentLikeRepository.findOne({
            where: { userId, commentId },
        });

        if (existingLike) {
            await this.commentLikeRepository.remove(existingLike);
            return { message: 'Comment unliked successfully', liked: false };
        }
        return await this.likeComment(commentId, userId);
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

        // Check if already pinned
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
        } else {
            return await this.pinAnnouncement(announcementId, userId);
        }
    }

}
