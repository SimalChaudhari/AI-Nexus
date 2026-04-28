import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AiForumEntity } from './ai-forum.entity';
import { AiForumCommentEntity } from './ai-forum-comments.entity';
import { AiForumCommentLikeEntity } from './ai-forum-comment-likes.entity';
import { PinnedAiForumEntity } from './pinned-ai-forum.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateAiForumPostDto, UpdateAiForumPostDto, CreateAiForumCommentDto, UpdateAiForumCommentDto } from './ai-forum.dto';
import { UserEntity, UserRole } from '../user/users.entity';
import { AiForumCommentsGateway } from './ai-forum-comments.gateway';
import {
    PaginatedQueryOptions,
    PaginatedResponse,
    PaginationService,
} from '../common/pagination/pagination.service';
import { EmailService } from '../service/email.service';

type GetAiForumPostsOptions = PaginatedQueryOptions & {
    userId?: string;
    usePagination?: boolean;
};

@Injectable()
export class AiForumService {
    constructor(
        @InjectRepository(AiForumEntity)
        private aiForumRepository: Repository<AiForumEntity>,
        @InjectRepository(AiForumCommentEntity)
        private commentRepository: Repository<AiForumCommentEntity>,
        @InjectRepository(AiForumCommentLikeEntity)
        private commentLikeRepository: Repository<AiForumCommentLikeEntity>,
        @InjectRepository(PinnedAiForumEntity)
        private pinnedAiForumRepository: Repository<PinnedAiForumEntity>,
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        private aiForumCommentsGateway: AiForumCommentsGateway,
        private readonly paginationService: PaginationService,
        private readonly emailService: EmailService,
    ) {}

    async getAll(options: GetAiForumPostsOptions = {}): Promise<any[] | PaginatedResponse<any>> {
        const usePagination = Boolean(options.usePagination);
        const { userId } = options;

        if (usePagination) {
            return this.paginationService.getPaginatedPinnedList({
                userId,
                queryOptions: options,
                repository: this.aiForumRepository,
                entityAlias: 'post',
                searchColumns: ['title', 'description'],
                pinnedJoinTable: 'pinned_posts',
                pinnedJoinAlias: 'pinnedAiForumPost',
                pinnedEntityIdColumn: 'postId',
                relations: ['comments', 'comments.user'],
                enrichEntities: async (posts, currentUserId) =>
                    Promise.all(
                        posts.map(async (post) => {
                            const commentsWithLikes = await this.enrichCommentsWithLikes(
                                post.comments || [],
                                currentUserId,
                            );
                            return { ...post, comments: commentsWithLikes };
                        }),
                    ),
                loadPinnedIds: async (postIds, currentUserId) => {
                    const pinnedAiForumPosts = await this.pinnedAiForumRepository.find({
                        where: { userId: currentUserId, postId: In(postIds) },
                        select: ['postId'],
                    });
                    return new Set(pinnedAiForumPosts.map((pinnedAiForumPost) => pinnedAiForumPost.postId));
                },
                orderByColumn: 'title',
                orderByDirection: 'ASC',
                orderByCaseInsensitive: true,
                prioritizePinnedInAllResults: true,
            });
        }

        const posts = await this.aiForumRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.comments', 'comments')
            .leftJoinAndSelect('comments.user', 'commentUser')
            .orderBy('LOWER(post.title)', 'ASC')
            .getMany();

        const postIds = posts.map((post) => post.id);
        const pinnedIds =
            userId && postIds.length
                ? new Set(
                      (
                          await this.pinnedAiForumRepository.find({
                              where: { userId, postId: In(postIds) },
                              select: ['postId'],
                          })
                      ).map((pinnedAiForumPost) => pinnedAiForumPost.postId),
                  )
                : new Set<string>();

        return Promise.all(
            posts.map(async (post) => {
                const commentsWithLikes = await this.enrichCommentsWithLikes(post.comments || [], userId);
                return {
                    ...post,
                    comments: commentsWithLikes,
                    isPinned: userId ? pinnedIds.has(post.id) : false,
                };
            }),
        );
    }

    async getAllPaginated(options: GetAiForumPostsOptions = {}): Promise<PaginatedResponse<any>> {
        return this.getAll({ ...options, usePagination: true }) as Promise<PaginatedResponse<any>>;
    }

    async getById(id: string, userId?: string): Promise<any> {
        const post = await this.aiForumRepository.findOne({
            where: { id },
            relations: ['comments', 'comments.user'],
        });
        if (!post) {
            throw new NotFoundException('AiForumPost not found');
        }

        const commentsWithLikes = await this.enrichCommentsWithLikes(post.comments || [], userId);
        let result: any = { ...post, comments: commentsWithLikes };
        if (userId) {
            const pinnedAiForumPost = await this.pinnedAiForumRepository.findOne({
                where: { userId, postId: id },
            });
            result = { ...result, isPinned: !!pinnedAiForumPost };
        }
        return result;
    }

    /** Serialize comment for WebSocket (no circular refs). */
    private toCommentPayload(
        comment: AiForumCommentEntity & { user?: UserEntity },
        likeCount: number,
        likedByCurrentUser: boolean,
    ): Record<string, unknown> {
        const user = comment.user;
        return {
            id: comment.id,
            content: comment.content,
            userId: comment.userId,
            postId: comment.postId,
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

    private async enrichCommentsWithLikes(
        comments: AiForumCommentEntity[],
        userId?: string,
    ): Promise<any[]> {
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

    async incrementViewCount(id: string): Promise<AiForumEntity> {
        const post = await this.aiForumRepository.findOne({
            where: { id },
            relations: ['comments', 'comments.user'],
        });
        if (!post) {
            throw new NotFoundException('AiForumPost not found');
        }

        post.viewCount += 1;
        await this.aiForumRepository.save(post);
        return post;
    }

    async create(createAiForumPostDto: CreateAiForumPostDto, userId?: string): Promise<{ message: string; post: AiForumEntity }> {
        const postData: Partial<AiForumEntity> = {
            title: createAiForumPostDto.title,
            description: createAiForumPostDto.description,
            viewCount: 0,
            userId: userId ?? null,
        };

        const post = this.aiForumRepository.create(postData);
        await this.aiForumRepository.save(post);

        this.aiForumCommentsGateway.emitToAiForumPostsList('post:created', post);

        return {
            message: 'AiForumPost created successfully',
            post,
        };
    }

    async update(id: string, updateAiForumPostDto: UpdateAiForumPostDto, userId?: string): Promise<{ message: string; post: AiForumEntity }> {
        const post = await this.aiForumRepository.findOne({ where: { id } });
        if (!post) {
            throw new NotFoundException('AiForumPost not found');
        }

        if (userId != null && post.userId !== userId) {
            throw new ForbiddenException('Not authorized to update this post');
        }

        if (updateAiForumPostDto.title !== undefined) {
            post.title = updateAiForumPostDto.title;
        }
        if (updateAiForumPostDto.description !== undefined) {
            post.description = updateAiForumPostDto.description;
        }

        await this.aiForumRepository.save(post);

        this.aiForumCommentsGateway.emitToAiForumPostsList('post:updated', post);

        return {
            message: 'AiForumPost updated successfully',
            post,
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const post = await this.aiForumRepository.findOne({ where: { id } });
        if (!post) {
            throw new NotFoundException('AiForumPost not found');
        }

        await this.aiForumRepository.remove(post);

        this.aiForumCommentsGateway.emitToAiForumPostsList('post:deleted', { postId: id });

        return { message: 'AiForumPost deleted successfully' };
    }

    async deleteOwnPost(id: string, userId: string): Promise<{ message: string }> {
        const post = await this.aiForumRepository.findOne({ where: { id } });
        if (!post) {
            throw new NotFoundException('AiForumPost not found');
        }
        if (!userId || post.userId !== userId) {
            throw new ForbiddenException('You can only delete your own posts');
        }

        await this.aiForumRepository.remove(post);
        this.aiForumCommentsGateway.emitToAiForumPostsList('post:deleted', { postId: id });
        return { message: 'AiForumPost deleted successfully' };
    }

    async bulkDeleteOwnPosts(
        userId: string,
        ids: string[],
    ): Promise<{ message: string; deletedCount: number; deletedIds: string[] }> {
        const uniqueIds = [...new Set((ids || []).filter(Boolean))];
        if (uniqueIds.length === 0) {
            return { message: 'No posts selected', deletedCount: 0, deletedIds: [] };
        }

        const ownPosts = await this.aiForumRepository.find({
            where: { id: In(uniqueIds), userId },
            select: ['id'],
        });
        const ownIds = ownPosts.map((p) => p.id);
        if (ownIds.length === 0) {
            return { message: 'No own posts found for deletion', deletedCount: 0, deletedIds: [] };
        }

        await this.aiForumRepository.delete({ id: In(ownIds), userId });
        ownIds.forEach((postId) => {
            this.aiForumCommentsGateway.emitToAiForumPostsList('post:deleted', { postId });
        });

        return {
            message: 'Selected posts deleted successfully',
            deletedCount: ownIds.length,
            deletedIds: ownIds,
        };
    }

    async addComment(
        postId: string,
        userId: string,
        createCommentDto: CreateAiForumCommentDto,
    ): Promise<{ message: string; comment: AiForumCommentEntity }> {
        const post = await this.aiForumRepository.findOne({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('AiForumPost not found');
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
            if (parentComment.postId !== postId) {
                throw new NotFoundException('Parent comment does not belong to this post');
            }
            parentCommentId = parentComment.id;
        }

        const commentData: Partial<AiForumCommentEntity> = {
            content: createCommentDto.content,
            postId,
            userId,
            parentCommentId,
        };

        const comment = this.commentRepository.create(commentData);
        await this.commentRepository.save(comment);

        const commentWithRelations = await this.commentRepository.findOne({
            where: { id: comment.id },
            relations: ['user', 'post'],
        });

        const threadStarterId = post.userId;
        const isSelfReply = threadStarterId != null && threadStarterId === userId;
        if (threadStarterId && !isSelfReply) {
            try {
                const threadStarter = await this.userRepository.findOne({
                    where: { id: threadStarterId },
                    select: ['id', 'email', 'firstname', 'lastname'],
                });

                if (threadStarter?.email) {
                    const threadStarterName =
                        `${threadStarter.firstname || ''} ${threadStarter.lastname || ''}`.trim() || 'there';
                    const replierName = `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username || 'A user';

                    await this.emailService.sendForumReplyNotificationEmail({
                        toEmail: threadStarter.email,
                        threadStarterName,
                        replierName,
                        postTitle: post.title,
                        replyContent: createCommentDto.content,
                        postId: post.id,
                    });
                }
            } catch (emailError) {
                // Keep forum interaction fast and resilient even if SMTP fails.
                console.error('Failed to send forum reply notification email:', emailError);
            }
        }

        const payload = this.toCommentPayload(commentWithRelations!, 0, false);
        this.aiForumCommentsGateway.emitToAiForumPost(postId, 'comment:added', payload);

        return {
            message: 'Comment added successfully',
            comment: commentWithRelations!,
        };
    }

    async getComments(postId: string, userId?: string): Promise<any[]> {
        const post = await this.aiForumRepository.findOne({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('AiForumPost not found');
        }

        const comments = await this.commentRepository.find({
            where: { postId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });

        const commentIds = comments.map((c) => c.id);
        if (commentIds.length === 0) {
            return [];
        }

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

    async updateComment(
        commentId: string,
        userId: string,
        updateCommentDto: UpdateAiForumCommentDto,
    ): Promise<{ message: string; comment: AiForumCommentEntity }> {
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

        const updatedComment = await this.commentRepository.findOne({
            where: { id: comment.id },
            relations: ['user', 'post'],
        });

        const postId = comment.postId;
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
        this.aiForumCommentsGateway.emitToAiForumPost(postId, 'comment:updated', payload);

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

        const postId = comment.postId;

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

        if (allIds.length > 0) {
            await this.commentLikeRepository.delete({ commentId: In(allIds) });
        }

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

        this.aiForumCommentsGateway.emitToAiForumPost(postId, 'comment:deleted', {
            commentId,
            postId,
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

    async toggleCommentLike(
        commentId: string,
        userId: string,
    ): Promise<{ message: string; liked: boolean; likeCount: number }> {
        const comment = await this.commentRepository.findOne({ where: { id: commentId }, select: ['id', 'postId'] });
        if (!comment) {
            throw new NotFoundException('Comment not found');
        }
        const postId = comment.postId;

        const existingLike = await this.commentLikeRepository.findOne({
            where: { userId, commentId },
        });

        let result: { message: string; liked: boolean };
        if (existingLike) {
            await this.commentLikeRepository.remove(existingLike);
            result = { message: 'Comment unliked successfully', liked: false };
        } else {
            result = await this.likeComment(commentId, userId);
        }

        const likeCount = await this.commentLikeRepository
            .createQueryBuilder('cl')
            .select('COUNT(*)', 'count')
            .where('cl.commentId = :id', { id: commentId })
            .getRawOne();
        const count = parseInt(likeCount?.count ?? '0', 10);
        this.aiForumCommentsGateway.emitToAiForumPost(postId, 'comment:likeToggled', {
            commentId,
            liked: result.liked,
            likeCount: count,
        });

        return { ...result, likeCount: count };
    }

    async pinAiForumPost(postId: string, userId: string): Promise<{ message: string; pinned: boolean }> {
        const post = await this.aiForumRepository.findOne({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('AiForumPost not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const existingPin = await this.pinnedAiForumRepository.findOne({
            where: { userId, postId },
        });

        if (existingPin) {
            return { message: 'AiForumPost is already pinned', pinned: true };
        }

        const pinnedAiForumPost = this.pinnedAiForumRepository.create({
            userId,
            postId,
        });
        await this.pinnedAiForumRepository.save(pinnedAiForumPost);
        return { message: 'AiForumPost pinned successfully', pinned: true };
    }

    async unpinAiForumPost(postId: string, userId: string): Promise<{ message: string; pinned: boolean }> {
        const pinnedAiForumPost = await this.pinnedAiForumRepository.findOne({
            where: { userId, postId },
        });

        if (!pinnedAiForumPost) {
            throw new NotFoundException('Pinned post not found');
        }

        await this.pinnedAiForumRepository.remove(pinnedAiForumPost);
        return { message: 'AiForumPost unpinned successfully', pinned: false };
    }

    async togglePinAiForumPost(postId: string, userId: string): Promise<{ message: string; pinned: boolean }> {
        const existingPin = await this.pinnedAiForumRepository.findOne({
            where: { userId, postId },
        });

        if (existingPin) {
            return await this.unpinAiForumPost(postId, userId);
        }
        return await this.pinAiForumPost(postId, userId);
    }

}

