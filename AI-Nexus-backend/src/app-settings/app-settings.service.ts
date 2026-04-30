import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppSettingsEntity } from './app-settings.entity';
import { LocalStorageService } from '../service/local-storage.service';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';

@Injectable()
export class AppSettingsService {
  constructor(
    @InjectRepository(AppSettingsEntity)
    private readonly appSettingsRepository: Repository<AppSettingsEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    private readonly localStorageService: LocalStorageService
  ) {}

  async getSettings(): Promise<AppSettingsEntity> {
    const settings = await this.appSettingsRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });

    if (settings.length > 0) {
      return settings[0];
    }

    const created = this.appSettingsRepository.create({
      logoUrl: null,
      homeHeroImageUrl: null,
    });
    return this.appSettingsRepository.save(created);
  }

  async uploadLogo(file: Express.Multer.File): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('logo');

    const relativeUrl = await this.localStorageService.saveFile(file, 'logo', {
      fileName: 'site-logo',
    });

    settings.logoUrl = relativeUrl;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Logo uploaded successfully',
      settings: saved,
    };
  }

  async removeLogo(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('logo');

    settings.logoUrl = null;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Logo removed successfully',
      settings: saved,
    };
  }

  async uploadHomeHeroImage(file: Express.Multer.File): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('home-hero');

    const relativeUrl = await this.localStorageService.saveFile(file, 'home-hero', {
      fileName: 'home-hero-bg',
    });

    settings.homeHeroImageUrl = relativeUrl;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Home hero image uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeHeroImage(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('home-hero');

    settings.homeHeroImageUrl = null;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Home hero image removed successfully',
      settings: saved,
    };
  }

  async getPublicSettings(): Promise<{ logoUrl: string | null; homeHeroImageUrl: string | null }> {
    const settings = await this.getSettings();

    return {
      logoUrl: settings.logoUrl ?? null,
      homeHeroImageUrl: settings.homeHeroImageUrl ?? null,
    };
  }

  private normalizeText(value: string | null | undefined): string {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getRecommendationsForUser(userId: string): Promise<{
    persona: string | null;
    courseIds: string[];
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'persona', 'financeRole', 'aiExperienceLevel', 'aiLearningGoals', 'aiUseAreas'],
    });
    const financeRole = user?.financeRole?.trim() || user?.persona?.trim() || null;
    const aiLevel = user?.aiExperienceLevel?.trim() || null;
    const goals = Array.isArray(user?.aiLearningGoals) ? user.aiLearningGoals : [];
    const useAreas = Array.isArray(user?.aiUseAreas) ? user.aiUseAreas : [];

    const allCourses = await this.courseRepository.find({
      select: ['id', 'title', 'description', 'marketData', 'roles', 'aiLevel', 'goals', 'useAreas', 'createdAt'],
    });

    const normalizeArray = (value: unknown): string[] =>
      Array.isArray(value)
        ? value
            .map((row) => this.normalizeText(typeof row === 'string' ? row : ''))
            .filter(Boolean)
        : [];

    const normalizedRole = this.normalizeText(financeRole || '');
    const normalizedAiLevel = this.normalizeText(aiLevel || '');
    const normalizedGoals = normalizeArray(goals);
    const normalizedUseAreas = normalizeArray(useAreas);

    const scoreRows = allCourses.map((course) => {
      const courseRoles = normalizeArray(course.roles);
      const courseAiLevels = normalizeArray(course.aiLevel);
      const courseGoals = normalizeArray(course.goals);
      const courseUseAreas = normalizeArray(course.useAreas);
      const searchableText = this.normalizeText(
        `${course.title || ''} ${course.description || ''} ${course.marketData || ''}`,
      );

      let score = 0;
      if (normalizedRole && courseRoles.includes(normalizedRole)) score += 35;
      if (normalizedAiLevel && courseAiLevels.includes(normalizedAiLevel)) score += 35;

      const matchedGoals = normalizedGoals.filter((goal) => courseGoals.includes(goal));
      score += matchedGoals.length * 18;

      // Fallback semantic support: if goals/use-areas are not tagged in course arrays,
      // still allow text match in title/description/marketData.
      const textGoalHits = normalizedGoals.filter(
        (goal) => !courseGoals.includes(goal) && searchableText.includes(goal),
      );
      score += textGoalHits.length * 8;

      const matchedUseAreas = normalizedUseAreas.filter((area) => courseUseAreas.includes(area));
      score += matchedUseAreas.length * 14;

      const useAreaTextHits = normalizedUseAreas.filter(
        (area) => !courseUseAreas.includes(area) && searchableText.includes(area),
      );
      score += useAreaTextHits.length * 6;

      return { id: course.id, score, createdAt: course.createdAt };
    });

    const courseIds = scoreRows
      .filter((row) => row.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .map((row) => row.id);

    return { persona: financeRole, courseIds };
  }
}
