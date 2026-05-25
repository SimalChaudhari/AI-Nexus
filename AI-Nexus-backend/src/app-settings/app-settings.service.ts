import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppSettingsEntity, WorkflowTemplatesPitchContent } from './app-settings.entity';
import { LocalStorageService } from '../service/local-storage.service';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseEnrollmentEntity } from '../course/course-enrollment.entity';

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

type FaqContentPayload = {
  pageHeading?: string;
  items?: Array<{ question?: string; answer?: string }>;
};

type CurriculumContentPayload = {
  smallTitle?: string;
  subtext?: string;
  hoursLabel?: string;
  pacingLabel?: string;
  courseIds?: string[];
};

type CurriculumCoursePayload = {
  id: string;
  title: string;
  modulesCount: number;
};

type CurriculumModulePayload = {
  index: number;
  title: string;
  description: string;
  courseId?: string;
};

type CurriculumPublicPayload = {
  smallTitle?: string;
  subtext?: string;
  hoursLabel?: string;
  pacingLabel?: string;
  courseIds: string[];
  courses: CurriculumCoursePayload[];
  headline: string;
  moduleCount: number;
  modules: CurriculumModulePayload[];
};

type ProgrammeFeesContentPayload = {
  heading?: string;
  tiers?: Array<{
    title?: string;
    description?: string;
    linkLabel?: string;
    linkHref?: string;
    price?: string;
    priceNote?: string;
    priceVariant?: 'primary' | 'default' | '';
  }>;
  fundingPartnersHeading?: string;
  fundingPartnersBody?: string;
  agency?: {
    logoUrl?: string;
    name?: string;
    tagline?: string;
  };
};

type HomeTestimonialsContentPayload = {
  heading?: string;
  subtitle?: string;
  testimonials?: Array<{
    quote?: string;
    name?: string;
    role?: string;
    avatarUrl?: string;
  }>;
  industryQuotes?: Array<{
    quote?: string;
    organisation?: string;
    logoUrl?: string;
  }>;
};

type HomeEmployerContentPayload = {
  heading?: string;
  subtitle?: string;
  heroImageUrl?: string;
  benefits?: Array<{ icon?: string; title?: string; description?: string }>;
  ctaLabel?: string;
  ctaHref?: string;
};

type HomeEmployeeContentPayload = {
  eyebrow?: string;
  heading?: string;
  headingAccent?: string;
  subtitle?: string;
  heroImageUrl?: string;
  heroPanelTitle?: string;
  heroPanelSubtitle?: string;
  benefitsLabel?: string;
  benefits?: Array<{
    icon?: string;
    iconColor?: string;
    title?: string;
    description?: string;
  }>;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  trustedLabel?: string;
  logos?: Array<{ name?: string; logoUrl?: string }>;
  stats?: Array<{ icon?: string; value?: string; label?: string }>;
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
const FAQ_PAGE_HEADING_MAX_LENGTH = 120;
const FAQ_QUESTION_MAX_LENGTH = 240;
const FAQ_ITEMS_MAX = 50;
const PROGRAMME_FEES_HEADING_MAX = 120;
const PROGRAMME_FEES_TIER_TITLE_MAX = 240;
const PROGRAMME_FEES_TIERS_MAX = 8;
const CURRICULUM_SMALL_TITLE_MAX = 120;
const CURRICULUM_SUBTEXT_MAX = 400;
const CURRICULUM_LABEL_MAX = 80;
const CURRICULUM_COURSES_MAX = 20;
const TESTIMONIALS_MAX = 12;
const INDUSTRY_QUOTES_MAX = 8;
const EMPLOYER_BENEFITS_MAX = 6;
const EMPLOYEE_BENEFITS_MAX = 6;
const EMPLOYEE_LOGOS_MAX = 12;
const EMPLOYEE_STATS_MAX = 6;

@Injectable()
export class AppSettingsService {
  private homeCardsColumnChecked = false;
  private homeJoinColumnChecked = false;
  private contactHeroColumnsChecked = false;
  private workflowTemplatesPitchColumnChecked = false;
  private faqColumnChecked = false;
  private programmeFeesColumnChecked = false;
  private curriculumColumnChecked = false;
  private homeTestimonialsColumnChecked = false;
  private homeEmployerColumnChecked = false;
  private homeEmployeeColumnChecked = false;

  constructor(
    @InjectRepository(AppSettingsEntity)
    private readonly appSettingsRepository: Repository<AppSettingsEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly courseModuleRepository: Repository<CourseModuleEntity>,
    @InjectRepository(CourseEnrollmentEntity)
    private readonly courseEnrollmentRepository: Repository<CourseEnrollmentEntity>,
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

  private async ensureWorkflowTemplatesPitchColumn(): Promise<void> {
    if (this.workflowTemplatesPitchColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "workflowTemplatesPitchContent" jsonb'
    );
    this.workflowTemplatesPitchColumnChecked = true;
  }

  private async ensureFaqColumn(): Promise<void> {
    if (this.faqColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "faqContent" jsonb'
    );
    this.faqColumnChecked = true;
  }

  private async ensureProgrammeFeesColumn(): Promise<void> {
    if (this.programmeFeesColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "programmeFeesContent" jsonb'
    );
    this.programmeFeesColumnChecked = true;
  }

  private async ensureCurriculumColumn(): Promise<void> {
    if (this.curriculumColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "curriculumContent" jsonb'
    );
    this.curriculumColumnChecked = true;
  }

  private async ensureHomeTestimonialsColumn(): Promise<void> {
    if (this.homeTestimonialsColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "homeTestimonialsContent" jsonb'
    );
    this.homeTestimonialsColumnChecked = true;
  }

  private async ensureHomeEmployerColumn(): Promise<void> {
    if (this.homeEmployerColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "homeEmployerContent" jsonb'
    );
    this.homeEmployerColumnChecked = true;
  }

  private async ensureHomeEmployeeColumn(): Promise<void> {
    if (this.homeEmployeeColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "homeEmployeeContent" jsonb'
    );
    this.homeEmployeeColumnChecked = true;
  }

  async getSettings(): Promise<AppSettingsEntity> {
    await this.ensureHomeCardsColumn();
    await this.ensureHomeJoinColumn();
    await this.ensureContactHeroColumns();
    await this.ensureWorkflowTemplatesPitchColumn();
    await this.ensureFaqColumn();
    await this.ensureProgrammeFeesColumn();
    await this.ensureCurriculumColumn();
    await this.ensureHomeTestimonialsColumn();
    await this.ensureHomeEmployerColumn();
    await this.ensureHomeEmployeeColumn();

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

  async uploadCourseDefaultImage(file: Express.Multer.File): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('course-default');

    const relativeUrl = await this.localStorageService.saveFile(file, 'course-default', {
      fileName: 'course-default',
    });

    settings.courseDefaultImageUrl = relativeUrl;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Course default image uploaded successfully',
      settings: saved,
    };
  }

  async removeCourseDefaultImage(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('course-default');

    settings.courseDefaultImageUrl = null;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Course default image removed successfully',
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

  /** Accepts stored `/uploads/...` or absolute URL from client; returns `/uploads/...` or ''. */
  private toStoredUploadPath(value: unknown): string {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return '';
    const idx = raw.indexOf('/uploads/');
    const path = idx >= 0 ? raw.slice(idx) : raw;
    if (!path.startsWith('/uploads/')) return '';
    if (path.includes('..')) return '';
    return path.length > 500 ? path.slice(0, 500) : path;
  }

  private sanitizeWorkflowTemplatesPitchContent(
    input: unknown,
    existing: WorkflowTemplatesPitchContent | null | undefined
  ): WorkflowTemplatesPitchContent {
    const source = input && typeof input === 'object' ? (input as any) : {};
    return {
      heading: this.cleanText(source.heading, 120) || this.cleanText(existing?.heading, 120),
      features: [0, 1, 2].map((i) => {
        const row =
          Array.isArray(source.features) && source.features[i] && typeof source.features[i] === 'object'
            ? (source.features[i] as any)
            : {};
        const prevRow =
          Array.isArray(existing?.features) && existing?.features[i] && typeof existing.features[i] === 'object'
            ? (existing.features[i] as any)
            : {};
        const fromInput = this.toStoredUploadPath(row?.iconUrl);
        const iconUrl = fromInput || this.toStoredUploadPath(prevRow?.iconUrl);
        return {
          iconUrl,
          title: this.cleanText(row?.title, 120),
          description: this.cleanText(row?.description, 600),
        };
      }),
    };
  }

  private sanitizePriceVariant(value: unknown): 'primary' | 'default' {
    const v = typeof value === 'string' ? value.trim() : '';
    return v === 'default' ? 'default' : 'primary';
  }

  private sanitizeProgrammeFeesContent(
    input: unknown,
    existing?: ProgrammeFeesContentPayload | null
  ): ProgrammeFeesContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawTiers = Array.isArray(source.tiers) ? source.tiers : [];
    const prevAgency =
      existing?.agency && typeof existing.agency === 'object' ? existing.agency : {};
    const nextAgency =
      source.agency && typeof source.agency === 'object' ? (source.agency as any) : {};
    const agencyInPayload = source.agency && typeof source.agency === 'object';
    const rawLogoInput = agencyInPayload ? nextAgency.logoUrl : undefined;
    const logoUrl =
      agencyInPayload && rawLogoInput !== undefined && rawLogoInput !== null
        ? this.toStoredUploadPath(rawLogoInput)
        : this.toStoredUploadPath(prevAgency?.logoUrl);

    return {
      heading: this.cleanText(source.heading, PROGRAMME_FEES_HEADING_MAX),
      tiers: rawTiers.slice(0, PROGRAMME_FEES_TIERS_MAX).map((tier: any) => ({
        title: this.cleanText(tier?.title, PROGRAMME_FEES_TIER_TITLE_MAX),
        description: this.cleanText(tier?.description),
        linkLabel: this.cleanText(tier?.linkLabel, 120),
        linkHref: this.cleanText(tier?.linkHref, 500),
        price: this.cleanText(tier?.price, 40),
        priceNote: this.cleanText(tier?.priceNote, 200),
        priceVariant: this.sanitizePriceVariant(tier?.priceVariant),
      })),
      fundingPartnersHeading: this.cleanText(source.fundingPartnersHeading, 80) || 'Funding Partners',
      fundingPartnersBody: this.cleanText(source.fundingPartnersBody),
      agency: {
        logoUrl,
        name: this.cleanText(nextAgency?.name ?? prevAgency?.name, 200),
        tagline: this.cleanText(nextAgency?.tagline ?? prevAgency?.tagline, 200),
      },
    };
  }

  private sanitizeCurriculumContent(input: unknown): CurriculumContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawIds = Array.isArray(source.courseIds) ? source.courseIds : [];
    const legacyCourseId = this.cleanText(source.courseId, 64);
    const seen = new Set<string>();
    const courseIds: string[] = [];

    const pushId = (value: string) => {
      const id = this.cleanText(value, 64);
      if (!/^[0-9a-f-]{36}$/i.test(id) || seen.has(id)) return;
      seen.add(id);
      courseIds.push(id);
    };

    rawIds.forEach((id: unknown) => pushId(String(id || '')));
    if (!courseIds.length && /^[0-9a-f-]{36}$/i.test(legacyCourseId)) {
      pushId(legacyCourseId);
    }

    return {
      smallTitle: this.cleanText(source.smallTitle, CURRICULUM_SMALL_TITLE_MAX),
      subtext: this.cleanText(source.subtext, CURRICULUM_SUBTEXT_MAX),
      hoursLabel: this.cleanText(source.hoursLabel, CURRICULUM_LABEL_MAX),
      pacingLabel: this.cleanText(source.pacingLabel, CURRICULUM_LABEL_MAX),
      courseIds: courseIds.slice(0, CURRICULUM_COURSES_MAX),
    };
  }

  private buildCurriculumHeadline(
    moduleCount: number,
    content: CurriculumContentPayload
  ): string {
    const parts: string[] = [];
    parts.push(`${moduleCount} module${moduleCount === 1 ? '' : 's'}`);
    if (content.hoursLabel) parts.push(content.hoursLabel);
    if (content.pacingLabel) parts.push(content.pacingLabel);
    return parts.join(' · ');
  }

  private async resolveCurriculumFromCourses(courseIds: string[]): Promise<{
    courses: CurriculumCoursePayload[];
    modules: CurriculumModulePayload[];
  }> {
    const courses: CurriculumCoursePayload[] = [];
    const modules: CurriculumModulePayload[] = [];
    let index = 0;

    for (const courseId of courseIds) {
      const course = await this.courseRepository.findOne({
        where: { id: courseId, isBundle: false },
      });
      if (!course) continue;

      const courseTitle = String(course.title || '').trim();
      if (!courseTitle) continue;

      const moduleRows = await this.courseModuleRepository.find({
        where: { courseId: course.id },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });

      courses.push({
        id: course.id,
        title: courseTitle,
        modulesCount: moduleRows.length,
      });

      moduleRows.forEach((row) => {
        const title = String(row.title || '').trim();
        if (!title) return;
        modules.push({
          index,
          courseId: course.id,
          title,
          description: String(row.description || '').trim(),
        });
        index += 1;
      });
    }

    return { courses, modules };
  }

  private async buildCurriculumPublicPayload(
    content?: CurriculumContentPayload | null
  ): Promise<CurriculumPublicPayload> {
    const sanitized = this.sanitizeCurriculumContent(content || {});
    const courseIds = sanitized.courseIds || [];
    const { courses, modules } = await this.resolveCurriculumFromCourses(courseIds);
    const moduleCount = modules.length;

    return {
      smallTitle: sanitized.smallTitle,
      subtext: sanitized.subtext,
      hoursLabel: sanitized.hoursLabel,
      pacingLabel: sanitized.pacingLabel,
      courseIds,
      courses,
      moduleCount,
      modules,
      headline: this.buildCurriculumHeadline(moduleCount, sanitized),
    };
  }

  private sanitizeHomeTestimonialsContent(input: unknown): HomeTestimonialsContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawTestimonials = Array.isArray(source.testimonials) ? source.testimonials : [];
    const rawQuotes = Array.isArray(source.industryQuotes) ? source.industryQuotes : [];
    return {
      heading: this.cleanText(source.heading, 120),
      subtitle: this.cleanText(source.subtitle),
      testimonials: rawTestimonials.slice(0, TESTIMONIALS_MAX).map((row: any) => ({
        quote: this.cleanText(row?.quote),
        name: this.cleanText(row?.name, 120),
        role: this.cleanText(row?.role, 160),
        avatarUrl:
          this.toStoredUploadPath(row?.avatarUrl) || this.cleanText(row?.avatarUrl, 500),
      })),
      industryQuotes: rawQuotes.slice(0, INDUSTRY_QUOTES_MAX).map((row: any) => ({
        quote: this.cleanText(row?.quote),
        organisation: this.cleanText(row?.organisation, 160),
        logoUrl: this.toStoredUploadPath(row?.logoUrl) || this.cleanText(row?.logoUrl, 500),
      })),
    };
  }

  private sanitizeHomeEmployerContent(input: unknown): HomeEmployerContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawBenefits = Array.isArray(source.benefits) ? source.benefits : [];
    return {
      heading: this.cleanText(source.heading, 120),
      subtitle: this.cleanText(source.subtitle),
      heroImageUrl:
        this.toStoredUploadPath(source.heroImageUrl) || this.cleanText(source.heroImageUrl, 500),
      benefits: rawBenefits.slice(0, EMPLOYER_BENEFITS_MAX).map((row: any) => ({
        icon: this.cleanText(row?.icon, 120),
        title: this.cleanText(row?.title, 120),
        description: this.cleanText(row?.description),
      })),
      ctaLabel: this.cleanText(source.ctaLabel, 80),
      ctaHref: this.cleanText(source.ctaHref, 500),
    };
  }

  private sanitizeIconColor(value: unknown): string {
    const raw = this.cleanText(value, 32);
    if (!raw) return '';
    if (/^#[0-9A-Fa-f]{3,8}$/.test(raw)) return raw;
    return '';
  }

  private sanitizeHomeEmployeeContent(input: unknown): HomeEmployeeContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawBenefits = Array.isArray(source.benefits) ? source.benefits : [];
    const rawLogos = Array.isArray(source.logos) ? source.logos : [];
    const rawStats = Array.isArray(source.stats) ? source.stats : [];
    return {
      eyebrow: this.cleanText(source.eyebrow, 120),
      heading: this.cleanText(source.heading, 160),
      headingAccent: this.cleanText(source.headingAccent, 80),
      subtitle: this.cleanText(source.subtitle),
      heroImageUrl:
        this.toStoredUploadPath(source.heroImageUrl) || this.cleanText(source.heroImageUrl, 500),
      heroPanelTitle: this.cleanText(source.heroPanelTitle, 120),
      heroPanelSubtitle: this.cleanText(source.heroPanelSubtitle, 200),
      benefitsLabel: this.cleanText(source.benefitsLabel, 120),
      benefits: rawBenefits.slice(0, EMPLOYEE_BENEFITS_MAX).map((row: any) => ({
        icon: this.cleanText(row?.icon, 120),
        iconColor: this.sanitizeIconColor(row?.iconColor),
        title: this.cleanText(row?.title, 120),
        description: this.cleanText(row?.description),
      })),
      primaryCtaLabel: this.cleanText(source.primaryCtaLabel, 80),
      primaryCtaHref: this.cleanText(source.primaryCtaHref, 500),
      secondaryCtaLabel: this.cleanText(source.secondaryCtaLabel, 80),
      secondaryCtaHref: this.cleanText(source.secondaryCtaHref, 500),
      trustedLabel: this.cleanText(source.trustedLabel, 120),
      logos: rawLogos.slice(0, EMPLOYEE_LOGOS_MAX).map((row: any) => ({
        name: this.cleanText(row?.name, 120),
        logoUrl: this.toStoredUploadPath(row?.logoUrl) || this.cleanText(row?.logoUrl, 500),
      })),
      stats: rawStats.slice(0, EMPLOYEE_STATS_MAX).map((row: any) => ({
        icon: this.cleanText(row?.icon, 120),
        value: this.cleanText(row?.value, 40),
        label: this.cleanText(row?.label, 120),
      })),
    };
  }

  private sanitizeFaqContent(input: unknown): FaqContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawItems = Array.isArray(source.items) ? source.items : [];
    return {
      pageHeading: this.cleanText(source.pageHeading, FAQ_PAGE_HEADING_MAX_LENGTH),
      items: rawItems.slice(0, FAQ_ITEMS_MAX).map((item: any) => ({
        question: this.cleanText(item?.question, FAQ_QUESTION_MAX_LENGTH),
        answer: this.cleanText(item?.answer),
      })),
    };
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

  async getFaqContent(): Promise<FaqContentPayload | null> {
    const settings = await this.getSettings();
    return settings.faqContent ? this.sanitizeFaqContent(settings.faqContent) : null;
  }

  async updateFaqContent(
    payload: FaqContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.faqContent = this.sanitizeFaqContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'FAQ content updated successfully',
      settings: saved,
    };
  }

  async getCurriculumContent(): Promise<CurriculumPublicPayload> {
    const settings = await this.getSettings();
    return this.buildCurriculumPublicPayload(settings.curriculumContent);
  }

  async updateCurriculumContent(
    payload: CurriculumContentPayload
  ): Promise<{
    message: string;
    settings: AppSettingsEntity;
    curriculum: CurriculumPublicPayload;
  }> {
    const settings = await this.getSettings();
    settings.curriculumContent = this.sanitizeCurriculumContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    const curriculum = await this.buildCurriculumPublicPayload(saved.curriculumContent);
    return {
      message: 'Curriculum content updated successfully',
      settings: saved,
      curriculum,
    };
  }

  async getProgrammeFeesContent(): Promise<ProgrammeFeesContentPayload | null> {
    const settings = await this.getSettings();
    return settings.programmeFeesContent
      ? this.sanitizeProgrammeFeesContent(settings.programmeFeesContent, settings.programmeFeesContent)
      : null;
  }

  async updateProgrammeFeesContent(
    payload: ProgrammeFeesContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.programmeFeesContent = this.sanitizeProgrammeFeesContent(
      payload,
      settings.programmeFeesContent
    );
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Programme fees content updated successfully',
      settings: saved,
    };
  }

  async updateHomeTestimonialsContent(
    payload: HomeTestimonialsContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.homeTestimonialsContent = this.sanitizeHomeTestimonialsContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home testimonials content updated successfully',
      settings: saved,
    };
  }

  async updateHomeEmployerContent(
    payload: HomeEmployerContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.homeEmployerContent = this.sanitizeHomeEmployerContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home employer content updated successfully',
      settings: saved,
    };
  }

  async uploadHomeEmployerHeroImage(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('home-employer-hero');
    const relativeUrl = await this.localStorageService.saveFile(file, 'home-employer-hero', {
      fileName: 'hero',
    });
    const existing = this.sanitizeHomeEmployerContent(settings.homeEmployerContent || {});
    settings.homeEmployerContent = this.sanitizeHomeEmployerContent({
      ...existing,
      heroImageUrl: relativeUrl,
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Employer section hero image uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeEmployerHeroImage(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('home-employer-hero');
    const existing = this.sanitizeHomeEmployerContent(settings.homeEmployerContent || {});
    settings.homeEmployerContent = this.sanitizeHomeEmployerContent({
      ...existing,
      heroImageUrl: '',
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Employer section hero image removed successfully',
      settings: saved,
    };
  }

  async updateHomeEmployeeContent(
    payload: HomeEmployeeContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.homeEmployeeContent = this.sanitizeHomeEmployeeContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home employee content updated successfully',
      settings: saved,
    };
  }

  async uploadHomeEmployeeHeroImage(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('home-employee-hero');
    const relativeUrl = await this.localStorageService.saveFile(file, 'home-employee-hero', {
      fileName: 'hero',
    });
    const existing = this.sanitizeHomeEmployeeContent(settings.homeEmployeeContent || {});
    settings.homeEmployeeContent = this.sanitizeHomeEmployeeContent({
      ...existing,
      heroImageUrl: relativeUrl,
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Employee section hero image uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeEmployeeHeroImage(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('home-employee-hero');
    const existing = this.sanitizeHomeEmployeeContent(settings.homeEmployeeContent || {});
    settings.homeEmployeeContent = this.sanitizeHomeEmployeeContent({
      ...existing,
      heroImageUrl: '',
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Employee section hero image removed successfully',
      settings: saved,
    };
  }

  async uploadHomeEmployeePartnerLogo(
    index: number,
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const slot = Math.max(0, Math.min(Math.floor(index), EMPLOYEE_LOGOS_MAX - 1));
    const folder = `home-employee-logos/${slot}`;
    await this.localStorageService.clearFolder(folder);
    const relativeUrl = await this.localStorageService.saveFile(file, folder, {
      fileName: 'logo',
    });
    const existing = this.sanitizeHomeEmployeeContent(settings.homeEmployeeContent || {});
    const logos = [...(existing.logos || [])];
    while (logos.length <= slot) {
      logos.push({ name: '', logoUrl: '' });
    }
    logos[slot] = { ...logos[slot], logoUrl: relativeUrl };
    settings.homeEmployeeContent = this.sanitizeHomeEmployeeContent({ ...existing, logos });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Partner logo uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeEmployeePartnerLogo(
    index: number
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const slot = Math.max(0, Math.min(Math.floor(index), EMPLOYEE_LOGOS_MAX - 1));
    const folder = `home-employee-logos/${slot}`;
    await this.localStorageService.clearFolder(folder);
    const existing = this.sanitizeHomeEmployeeContent(settings.homeEmployeeContent || {});
    const logos = [...(existing.logos || [])];
    while (logos.length <= slot) {
      logos.push({ name: '', logoUrl: '' });
    }
    logos[slot] = { ...logos[slot], logoUrl: '' };
    settings.homeEmployeeContent = this.sanitizeHomeEmployeeContent({ ...existing, logos });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Partner logo removed successfully',
      settings: saved,
    };
  }

  async uploadProgrammeFeesAgencyLogo(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('programme-fees-agency');
    const relativeUrl = await this.localStorageService.saveFile(file, 'programme-fees-agency', {
      fileName: 'agency-logo',
    });
    const existing = settings.programmeFeesContent || {};
    const agency = existing.agency && typeof existing.agency === 'object' ? { ...existing.agency } : {};
    settings.programmeFeesContent = this.sanitizeProgrammeFeesContent(
      { ...existing, agency: { ...agency, logoUrl: relativeUrl } },
      existing
    );
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Agency logo uploaded successfully',
      settings: saved,
    };
  }

  async removeProgrammeFeesAgencyLogo(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('programme-fees-agency');
    const existing = settings.programmeFeesContent || {};
    const agency = existing.agency && typeof existing.agency === 'object' ? { ...existing.agency } : {};
    agency.logoUrl = '';
    settings.programmeFeesContent = this.sanitizeProgrammeFeesContent(
      { ...existing, agency },
      existing
    );
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Agency logo removed successfully',
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

  async updateWorkflowTemplatesPitchContent(
    payload: WorkflowTemplatesPitchContent
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.workflowTemplatesPitchContent = this.sanitizeWorkflowTemplatesPitchContent(
      payload,
      settings.workflowTemplatesPitchContent
    );
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Workflow templates intro content updated successfully',
      settings: saved,
    };
  }

  async uploadWorkflowTemplatesPitchIcon(
    slot: number,
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    if (![0, 1, 2].includes(slot)) {
      throw new BadRequestException('Icon slot must be 0, 1, or 2');
    }
    const settings = await this.getSettings();
    const folder = `workflow-templates-pitch/${slot}`;
    await this.localStorageService.clearFolder(folder);
    const relativeUrl = await this.localStorageService.saveFile(file, folder, { fileName: 'icon' });

    const existing = settings.workflowTemplatesPitchContent || {};
    const features = Array.isArray(existing.features) ? [...existing.features] : [];
    while (features.length < 3) {
      features.push({ iconUrl: '', title: '', description: '' });
    }
    const prevRow = features[slot] && typeof features[slot] === 'object' ? (features[slot] as any) : {};
    features[slot] = {
      ...prevRow,
      iconUrl: relativeUrl,
    };

    settings.workflowTemplatesPitchContent = this.sanitizeWorkflowTemplatesPitchContent(
      { heading: existing.heading, features },
      existing
    );
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Workflow templates intro icon updated successfully',
      settings: saved,
    };
  }

  async removeWorkflowTemplatesPitchIcon(slot: number): Promise<{ message: string; settings: AppSettingsEntity }> {
    if (![0, 1, 2].includes(slot)) {
      throw new BadRequestException('Icon slot must be 0, 1, or 2');
    }
    const settings = await this.getSettings();
    const folder = `workflow-templates-pitch/${slot}`;
    await this.localStorageService.clearFolder(folder);

    const existing = settings.workflowTemplatesPitchContent || {};
    const features = Array.isArray(existing.features) ? [...existing.features] : [];
    while (features.length < 3) {
      features.push({ iconUrl: '', title: '', description: '' });
    }
    const prevRow = features[slot] && typeof features[slot] === 'object' ? { ...(features[slot] as any) } : {};
    prevRow.iconUrl = '';
    features[slot] = prevRow;

    settings.workflowTemplatesPitchContent = this.sanitizeWorkflowTemplatesPitchContent(
      { heading: existing.heading, features },
      existing
    );
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Workflow templates intro icon removed successfully',
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
    courseDefaultImageUrl: string | null;
    contactHeroContent: ContactHeroContentPayload | null;
    workflowTemplatesPitchContent: WorkflowTemplatesPitchContent | null;
    faqContent: FaqContentPayload | null;
    programmeFeesContent: ProgrammeFeesContentPayload | null;
    curriculumContent: CurriculumContentPayload | null;
    homeTestimonialsContent: HomeTestimonialsContentPayload | null;
    homeEmployerContent: HomeEmployerContentPayload | null;
    homeEmployeeContent: HomeEmployeeContentPayload | null;
    /** Total rows in course_enrollments (direct course enrollments). */
    totalCourseEnrollments: number;
  }> {
    const settings = await this.getSettings();
    const totalCourseEnrollments = await this.courseEnrollmentRepository.count();

    return {
      logoUrl: settings.logoUrl ?? null,
      homeHeroImageUrl: settings.homeHeroImageUrl ?? null,
      homeHeroContent: settings.homeHeroContent ?? null,
      homeCardsContent: settings.homeCardsContent ?? null,
      homeJoinContent: settings.homeJoinContent ?? null,
      contactHeroImageUrl: settings.contactHeroImageUrl ?? null,
      courseDefaultImageUrl: settings.courseDefaultImageUrl ?? null,
      contactHeroContent: settings.contactHeroContent ?? null,
      workflowTemplatesPitchContent: this.sanitizeWorkflowTemplatesPitchContent(
        settings.workflowTemplatesPitchContent || {},
        settings.workflowTemplatesPitchContent
      ),
      faqContent: settings.faqContent
        ? this.sanitizeFaqContent(settings.faqContent)
        : null,
      programmeFeesContent: settings.programmeFeesContent
        ? this.sanitizeProgrammeFeesContent(
            settings.programmeFeesContent,
            settings.programmeFeesContent
          )
        : null,
      curriculumContent: settings.curriculumContent
        ? this.sanitizeCurriculumContent(settings.curriculumContent)
        : null,
      homeTestimonialsContent: settings.homeTestimonialsContent
        ? this.sanitizeHomeTestimonialsContent(settings.homeTestimonialsContent)
        : null,
      homeEmployerContent: settings.homeEmployerContent
        ? this.sanitizeHomeEmployerContent(settings.homeEmployerContent)
        : null,
      homeEmployeeContent: settings.homeEmployeeContent
        ? this.sanitizeHomeEmployeeContent(settings.homeEmployeeContent)
        : null,
      totalCourseEnrollments,
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
