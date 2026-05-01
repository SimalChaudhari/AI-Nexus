import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppSettingsEntity } from './app-settings.entity';
import { LocalStorageService } from '../service/local-storage.service';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';

type HomeHeroContentPayload = {
  headline?: string;
  description?: string;
  cta?: {
    label?: string;
    href?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    align?: 'left' | 'center' | 'right' | '';
  };
  event?: {
    startDateLabel?: string;
    startDate?: string;
    startTimeLabel?: string;
    startTime?: string;
  };
  stats?: Array<{ value?: string; label?: string; icon?: string }>;
};

const HERO_HEADLINE_MAX_LENGTH = 60;
const HERO_CTA_LABEL_MAX_LENGTH = 32;

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

  private cleanText(value: unknown, maxLength?: number): string {
    const cleaned = typeof value === 'string' ? value.trim() : '';
    if (!maxLength || maxLength < 1) return cleaned;
    return cleaned.slice(0, maxLength);
  }

  /** Allow #RGB, #RRGGBB, #RRGGBBAA only (empty = unset). */
  private sanitizeHexColor(value: unknown): string {
    const s = this.cleanText(value);
    if (!s) return '';
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(s) ? s : '';
  }

  private sanitizeCtaAlign(value: unknown): 'left' | 'center' | 'right' | '' {
    const s = this.cleanText(value).toLowerCase();
    if (s === 'left' || s === 'center' || s === 'right') return s;
    return '';
  }

  private sanitizeEventSlot(input: any) {
    return {
      startDateLabel: this.cleanText(input?.startDateLabel),
      startDate: this.cleanText(input?.startDate),
      startTimeLabel: this.cleanText(input?.startTimeLabel),
      startTime: this.cleanText(input?.startTime),
    };
  }

  private sanitizeHomeHeroContent(input: unknown): HomeHeroContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const stats = Array.isArray(source.stats) ? source.stats : [];
    const primaryEvent = this.sanitizeEventSlot(source.event);
    return {
      headline: this.cleanText(source.headline, HERO_HEADLINE_MAX_LENGTH),
      description: this.cleanText(source.description),
      cta: {
        label: this.cleanText(source.cta?.label, HERO_CTA_LABEL_MAX_LENGTH),
        href: this.cleanText(source.cta?.href),
        buttonColor: this.sanitizeHexColor(source.cta?.buttonColor),
        buttonTextColor: this.sanitizeHexColor(source.cta?.buttonTextColor),
        align: this.sanitizeCtaAlign(source.cta?.align),
      },
      event: primaryEvent,
      stats: stats.slice(0, 3).map((item: any) => ({
        value: this.cleanText(item?.value),
        label: this.cleanText(item?.label),
        icon: this.cleanText(item?.icon),
      })),
    };
  }

  async updateHomeHeroContent(
    payload: HomeHeroContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.homeHeroContent = this.sanitizeHomeHeroContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home hero content updated successfully',
      settings: saved,
    };
  }

  async getPublicSettings(): Promise<{
    logoUrl: string | null;
    homeHeroImageUrl: string | null;
    homeHeroContent: HomeHeroContentPayload | null;
  }> {
    const settings = await this.getSettings();

    return {
      logoUrl: settings.logoUrl ?? null,
      homeHeroImageUrl: settings.homeHeroImageUrl ?? null,
      homeHeroContent: settings.homeHeroContent ?? null,
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
