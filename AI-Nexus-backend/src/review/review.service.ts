import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewEntity } from './review.entity';
import { CreateReviewDto } from './review.dto';
import { UpdateReviewDto } from './review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,
  ) {}

  private normalizePayload(dto: CreateReviewDto | UpdateReviewDto | (CreateReviewDto & { courseId?: string | null; speakerId?: string | null })): Partial<ReviewEntity> {
    const isSpeaker = dto.isSpeaker === true;
    const isCourse = isSpeaker ? false : (dto.isCourse !== false);
    const payload: Partial<ReviewEntity> = {
      ...(dto as Partial<ReviewEntity>),
      isSpeaker,
      isCourse,
    };
    if (isSpeaker) {
      payload.speakerId = dto.speakerId ?? undefined;
      // Store courseId when provided (e.g. feedback from course page). Rows with this courseId are deleted when the course is deleted (ON DELETE CASCADE).
      payload.courseId = dto.courseId ?? null;
    } else {
      payload.speakerId = null;
      payload.courseId = dto.courseId ?? undefined;
    }
    return payload;
  }

  async create(dto: CreateReviewDto): Promise<ReviewEntity> {
    const payload = this.normalizePayload(dto);
    if (payload.isCourse && !payload.courseId) {
      throw new BadRequestException('courseId is required when reviewing a course');
    }
    if (payload.isSpeaker && !payload.speakerId) {
      throw new BadRequestException('speakerId is required when reviewing a speaker');
    }
    const entity = this.reviewRepository.create(payload);
    return this.reviewRepository.save(entity);
  }

  async findAll(filters?: { courseId?: string; speakerId?: string; userId?: string }): Promise<ReviewEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters?.courseId) {
      where.courseId = filters.courseId;
      where.isCourse = true; // only course reviews (not speaker reviews that have courseId set)
    }
    if (filters?.speakerId) where.speakerId = filters.speakerId;
    if (filters?.userId) where.userId = filters.userId;
    return this.reviewRepository.find({
      where,
      relations: ['user', 'course', 'speaker'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ReviewEntity | null> {
    return this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'course', 'speaker'],
    });
  }

  async update(id: string, dto: UpdateReviewDto): Promise<ReviewEntity> {
    const existing = await this.reviewRepository.findOne({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Review not found');
    }
    const payload = this.normalizePayload({ ...existing, ...dto } as CreateReviewDto);
    const updateData: Record<string, unknown> = {
      isSpeaker: payload.isSpeaker,
      isCourse: payload.isCourse,
      rating: payload.rating ?? existing.rating,
      feedback: payload.feedback !== undefined ? payload.feedback : existing.feedback,
      courseId: payload.courseId ?? null,
      speakerId: payload.speakerId ?? null,
    };
    await this.reviewRepository.update(id, updateData);
    const updated = await this.findOne(id);
    if (!updated) throw new BadRequestException('Review not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.reviewRepository.delete(id);
  }
}
