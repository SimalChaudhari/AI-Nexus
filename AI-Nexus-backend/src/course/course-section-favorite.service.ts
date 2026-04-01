import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseSectionFavoriteEntity } from './course-section-favorite.entity';

@Injectable()
export class CourseSectionFavoriteService {
    constructor(
        @InjectRepository(CourseSectionFavoriteEntity)
        private favoriteRepository: Repository<CourseSectionFavoriteEntity>,
    ) {}

    async toggleFavorite(userId: string, sectionId: string): Promise<{ isFavorite: boolean }> {
        const existing = await this.favoriteRepository.findOne({
            where: { userId, sectionId },
        });

        if (existing) {
            await this.favoriteRepository.remove(existing);
            return { isFavorite: false };
        } else {
            const favorite = this.favoriteRepository.create({ userId, sectionId });
            await this.favoriteRepository.save(favorite);
            return { isFavorite: true };
        }
    }

    async isFavorite(userId: string, sectionId: string): Promise<boolean> {
        const favorite = await this.favoriteRepository.findOne({
            where: { userId, sectionId },
        });
        return !!favorite;
    }

    async getUserFavoriteSectionIds(userId: string): Promise<string[]> {
        const favorites = await this.favoriteRepository.find({
            where: { userId },
            select: ['sectionId'],
        });
        return favorites.map((f) => f.sectionId);
    }

    /** Get all favorite sections for the user with section, module, and course details (for single API favorites page). */
    async getAllFavoriteSectionsWithDetails(userId: string): Promise<
        { sectionId: string; sectionTitle: string; courseId: string; courseTitle: string; courseImage?: string; moduleTitle: string }[]
    > {
        const rows = await this.favoriteRepository
            .createQueryBuilder('f')
            .innerJoin('course_module_sections', 's', 's.id = f.sectionId')
            .innerJoin('course_modules', 'm', 'm.id = s.moduleId')
            .innerJoin('courses', 'c', 'c.id = m.courseId')
            .where('f.userId = :userId', { userId })
            .select('f.sectionId', 'sectionId')
            .addSelect('s.title', 'sectionTitle')
            .addSelect('c.id', 'courseId')
            .addSelect('c.title', 'courseTitle')
            .addSelect('c.image', 'courseImage')
            .addSelect('m.title', 'moduleTitle')
            .getRawMany();
        return rows.map((r) => ({
            sectionId: r.sectionId,
            sectionTitle: r.sectionTitle || '',
            courseId: r.courseId,
            courseTitle: r.courseTitle || '',
            courseImage: r.courseImage,
            moduleTitle: r.moduleTitle || '',
        }));
    }
}
