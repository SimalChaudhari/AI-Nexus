import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseFavoriteEntity } from './course-favorite.entity';

@Injectable()
export class CourseFavoriteService {
    constructor(
        @InjectRepository(CourseFavoriteEntity)
        private favoriteRepository: Repository<CourseFavoriteEntity>,
    ) {}

    async toggleFavorite(userId: string, courseId: string): Promise<{ isFavorite: boolean }> {
        const existing = await this.favoriteRepository.findOne({
            where: { userId, courseId },
        });

        if (existing) {
            await this.favoriteRepository.remove(existing);
            return { isFavorite: false };
        } else {
            const favorite = this.favoriteRepository.create({ userId, courseId });
            await this.favoriteRepository.save(favorite);
            return { isFavorite: true };
        }
    }

    async isFavorite(userId: string, courseId: string): Promise<boolean> {
        const favorite = await this.favoriteRepository.findOne({
            where: { userId, courseId },
        });
        return !!favorite;
    }

    async getUserFavoriteCourseIds(userId: string): Promise<string[]> {
        const favorites = await this.favoriteRepository.find({
            where: { userId },
            select: ['courseId'],
        });
        return favorites.map((f) => f.courseId);
    }

    async getUserFavorites(userId: string): Promise<CourseFavoriteEntity[]> {
        return await this.favoriteRepository.find({
            where: { userId },
            relations: ['course'],
        });
    }
}
