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

type HomeCardsContentPayload = {
  heading?: string;
  headingAccent?: string;
  headingColor?: string;
  headingAccentColor?: string;
  subtitle?: string;
  cards?: Array<{ icon?: string; title?: string; description?: string }>;
};

type HomeJoinContentPayload = {
  heading?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaIcon?: string;
};

type ContactHeroContentPayload = {
  headingLine1?: string;
  headingLine2?: string;
  infoTitle?: string;
  infoSubtitle?: string;
  contacts?: Array<{
    details?: string;
    address?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    website?: string;
    addressIcon?: string;
    phoneIcon?: string;
    emailIcon?: string;
    whatsappIcon?: string;
    websiteIcon?: string;
    lat?: number | string;
    lng?: number | string;
  }>;
};

const HERO_HEADLINE_MAX_LENGTH = 60;
const HERO_CTA_LABEL_MAX_LENGTH = 32;
const HOME_JOIN_HEADING_MAX_LENGTH = 100;
const HOME_JOIN_CTA_LABEL_MAX_LENGTH = 40;
const CONTACT_HEADING_LINE_MAX_LENGTH = 80;

@Injectable()
export class AppSettingsService {
  private homeCardsColumnChecked = false;
  private homeJoinColumnChecked = false;
  private contactHeroColumnsChecked = false;

  constructor(
    @InjectRepository(AppSettingsEntity)
    private readonly appSettingsRepository: Repository<AppSettingsEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    private readonly localStorageService: LocalStorageService
  ) {}

  private async ensureHomeCardsColumn(): Promise<void> {
    if (this.homeCardsColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "homeCardsContent" jsonb'
    );
    this.homeCardsColumnChecked = true;
  }

  private async ensureHomeJoinColumn(): Promise<void> {
    if (this.homeJoinColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "homeJoinContent" jsonb'
    );
    this.homeJoinColumnChecked = true;
  }

  private async ensureContactHeroColumns(): Promise<void> {
    if (this.contactHeroColumnsChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "contactHeroImageUrl" varchar'
    );
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "contactHeroContent" jsonb'
    );
    this.contactHeroColumnsChecked = true;
  }

  async getSettings(): Promise<AppSettingsEntity> {
    await this.ensureHomeCardsColumn();
    await this.ensureHomeJoinColumn();
    await this.ensureContactHeroColumns();

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

  async uploadContactHeroImage(file: Express.Multer.File): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('contact-hero');

    const relativeUrl = await this.localStorageService.saveFile(file, 'contact-hero', {
      fileName: 'contact-hero-bg',
    });

    settings.contactHeroImageUrl = relativeUrl;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Contact hero image uploaded successfully',
      settings: saved,
    };
  }

  async removeContactHeroImage(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('contact-hero');

    settings.contactHeroImageUrl = null;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Contact hero image removed successfully',
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

  private sanitizeHomeCardsContent(input: unknown): HomeCardsContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawCards = Array.isArray(source.cards) ? source.cards : [];
    return {
      heading: this.cleanText(source.heading, 80),
      headingAccent: this.cleanText(source.headingAccent, 80),
      headingColor: this.sanitizeHexColor(source.headingColor),
      headingAccentColor: this.sanitizeHexColor(source.headingAccentColor),
      subtitle: this.cleanText(source.subtitle),
      cards: rawCards.slice(0, 12).map((card: any) => ({
        icon: this.cleanText(card?.icon, 120),
        title: this.cleanText(card?.title, 80),
        description: this.cleanText(card?.description),
      })),
    };
  }

  private sanitizeHomeJoinContent(input: unknown): HomeJoinContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    return {
      heading: this.cleanText(source.heading, HOME_JOIN_HEADING_MAX_LENGTH),
      subtitle: this.cleanText(source.subtitle),
      ctaLabel: this.cleanText(source.ctaLabel, HOME_JOIN_CTA_LABEL_MAX_LENGTH),
      ctaHref: this.cleanText(source.ctaHref),
      ctaIcon: this.cleanText(source.ctaIcon, 120),
    };
  }

  private sanitizeContactLatLng(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private sanitizeContactHeroContent(input: unknown): ContactHeroContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const contacts = Array.isArray(source.contacts) ? source.contacts : [];

    return {
      headingLine1: this.cleanText(source.headingLine1, CONTACT_HEADING_LINE_MAX_LENGTH),
      headingLine2: this.cleanText(source.headingLine2, CONTACT_HEADING_LINE_MAX_LENGTH),
      infoTitle: this.cleanText(source.infoTitle, 120),
      infoSubtitle: this.cleanText(source.infoSubtitle, 240),
      contacts: contacts.slice(0, 12).map((item: any) => {
        const lat = this.sanitizeContactLatLng(item?.lat);
        const lng = this.sanitizeContactLatLng(item?.lng);
        return {
          details: this.cleanText(item?.details),
          address: this.cleanText(item?.address),
          phone: this.cleanText(item?.phone, 60),
          email: this.cleanText(item?.email, 120),
          whatsapp: this.cleanText(item?.whatsapp, 60),
          website: this.cleanText(item?.website, 160),
          addressIcon: this.cleanText(item?.addressIcon, 120),
          phoneIcon: this.cleanText(item?.phoneIcon, 120),
          emailIcon: this.cleanText(item?.emailIcon, 120),
          whatsappIcon: this.cleanText(item?.whatsappIcon, 120),
          websiteIcon: this.cleanText(item?.websiteIcon, 120),
          lat: lat ?? '',
          lng: lng ?? '',
        };
      }),
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

  async updateHomeCardsContent(
    payload: HomeCardsContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.homeCardsContent = this.sanitizeHomeCardsContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home cards content updated successfully',
      settings: saved,
    };
  }

  async updateHomeJoinContent(
    payload: HomeJoinContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.homeJoinContent = this.sanitizeHomeJoinContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home join content updated successfully',
      settings: saved,
    };
  }

  async updateContactHeroContent(
    payload: ContactHeroContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.contactHeroContent = this.sanitizeContactHeroContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Contact hero content updated successfully',
      settings: saved,
    };
  }

  async getPublicSettings(): Promise<{
    logoUrl: string | null;
    homeHeroImageUrl: string | null;
    homeHeroContent: HomeHeroContentPayload | null;
    homeCardsContent: HomeCardsContentPayload | null;
    homeJoinContent: HomeJoinContentPayload | null;
    contactHeroImageUrl: string | null;
    contactHeroContent: ContactHeroContentPayload | null;
  }> {
    const settings = await this.getSettings();

    return {
      logoUrl: settings.logoUrl ?? null,
      homeHeroImageUrl: settings.homeHeroImageUrl ?? null,
      homeHeroContent: settings.homeHeroContent ?? null,
      homeCardsContent: settings.homeCardsContent ?? null,
      homeJoinContent: settings.homeJoinContent ?? null,
      contactHeroImageUrl: settings.contactHeroImageUrl ?? null,
      contactHeroContent: settings.contactHeroContent ?? null,
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
