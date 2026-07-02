import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppSettingsEntity, WorkflowTemplatesPitchContent } from './app-settings.entity';
import { LocalStorageService } from '../service/local-storage.service';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseEnrollmentEntity } from '../course/course-enrollment.entity';
import { CategoryEntity } from '../category/categories.entity';

type HomeHeroContentPayload = {
  badgeLogoUrl?: string;
  headline?: string;
  headlineAccent?: string;
  headlineColor?: string;
  headlineAccentColor?: string;
  description?: string;
  cta?: {
    label?: string;
    href?: string;
    icon?: string;
    buttonColor?: string;
    buttonTextColor?: string;
  };
  secondaryCtas?: Array<{
    label?: string;
    href?: string;
    icon?: string;
    variant?: string;
    buttonColor?: string;
    buttonTextColor?: string;
  }>;
  statIconSize?: number;
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
  categoryIds?: string[];
  courseIds?: string[];
};

type CurriculumCoursePayload = {
  id: string;
  title: string;
  modulesCount: number;
  categoryId?: string;
};

type CurriculumCategoryPayload = {
  id: string;
  title: string;
  courseIds: string[];
  courses: CurriculumCoursePayload[];
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
  categoryIds: string[];
  categories: CurriculumCategoryPayload[];
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
    id?: string;
    quote?: string;
    name?: string;
    role?: string;
    avatarUrl?: string;
    rating?: number;
  }>;
  industryQuotes?: Array<{
    id?: string;
    quote?: string;
    organisation?: string;
    logoUrl?: string;
  }>;
};

type HomeProgrammeStructureContentPayload = {
  eyebrow?: string;
  heading?: string;
  headingUnderlineWord?: string;
  phases?: Array<{
    id?: string;
    label?: string;
    title?: string;
    description?: string;
    icon?: string;
  }>;
};

type HomeFundingEligibilityContentPayload = {
  eyebrow?: string;
  heading?: string;
  items?: Array<{
    id?: string;
    icon?: string;
    title?: string;
    description?: string;
  }>;
};

type HomeEligibilityMembershipContentPayload = {
  leftPanel?: {
    heading?: string;
    subtitle?: string;
    heroImageUrl?: string;
    questions?: Array<{
      id?: string;
      icon?: string;
      iconColor?: string;
      text?: string;
    }>;
    ctaLabel?: string;
    ctaHref?: string;
  };
  rightPanel?: {
    eyebrow?: string;
    heading?: string;
    benefits?: Array<{
      id?: string;
      icon?: string;
      label?: string;
    }>;
    primaryCtaLabel?: string;
    primaryCtaHref?: string;
    secondaryCtaLabel?: string;
    secondaryCtaHref?: string;
  };
};

type HomeCeoLaunchContentPayload = {
  eyebrow?: string;
  heading?: string;
  subtitle?: string;
  posterImageUrl?: string;
  videoUrl?: string;
  videoFileUrl?: string;
  quote?: string;
  statIconSize?: number;
  stats?: Array<{ value?: string; label?: string; icon?: string }>;
  ctaLabel?: string;
  ctaHref?: string;
};

type HomeEmployerContentPayload = {
  heading?: string;
  subtitle?: string;
  heroImageUrl?: string;
  benefits?: Array<{ icon?: string; title?: string }>;
  logos?: Array<{ name?: string; logoUrl?: string }>;
  partnersHeading?: string;
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
  }>;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  partnersHeading?: string;
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
    whatsappLink?: string;
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
const CURRICULUM_SUBTEXT_MAX = 4000;
const CURRICULUM_COURSES_MAX = 100;
const CURRICULUM_CATEGORIES_MAX = 20;
const TESTIMONIALS_MAX = 12;
const INDUSTRY_QUOTES_MAX = 8;
const PROGRAMME_STRUCTURE_EYEBROW_MAX = 80;
const PROGRAMME_STRUCTURE_HEADING_MAX = 160;
const PROGRAMME_STRUCTURE_PHASE_LABEL_MAX = 40;
const PROGRAMME_STRUCTURE_PHASE_TITLE_MAX = 120;
const PROGRAMME_STRUCTURE_HEADING_UNDERLINE_MAX = 40;
const PROGRAMME_STRUCTURE_PHASE_ICON_MAX = 120;
const PROGRAMME_STRUCTURE_PHASES_MAX = 8;
const FUNDING_ELIGIBILITY_EYEBROW_MAX = 80;
const FUNDING_ELIGIBILITY_HEADING_MAX = 160;
const FUNDING_ELIGIBILITY_CARD_TITLE_MAX = 120;
const FUNDING_ELIGIBILITY_ICON_MAX = 120;
const FUNDING_ELIGIBILITY_ITEMS_MAX = 6;
const ELIGIBILITY_MEMBERSHIP_HEADING_MAX = 120;
const ELIGIBILITY_MEMBERSHIP_SUBTITLE_MAX = 200;
const ELIGIBILITY_MEMBERSHIP_QUESTION_MAX = 160;
const ELIGIBILITY_MEMBERSHIP_ICON_MAX = 120;
const ELIGIBILITY_MEMBERSHIP_QUESTIONS_MAX = 4;
const ELIGIBILITY_MEMBERSHIP_BENEFITS_MAX = 4;
const ELIGIBILITY_MEMBERSHIP_BENEFIT_LABEL_MAX = 120;
const CEO_LAUNCH_EYEBROW_MAX = 80;
const CEO_LAUNCH_HEADING_MAX = 160;
const CEO_LAUNCH_STATS_MAX = 4;
const CEO_LAUNCH_STAT_VALUE_MAX = 40;
const CEO_LAUNCH_STAT_LABEL_MAX = 120;
const CEO_LAUNCH_STAT_ICON_MAX = 500;
const EMPLOYER_BENEFITS_MAX = 6;
const EMPLOYER_LOGOS_MAX = 50;
const EMPLOYEE_BENEFITS_MAX = 6;
const EMPLOYEE_LOGOS_MAX = 12;
const EMPLOYEE_STATS_MAX = 6;
const PARTNER_STATS_MAX = 4;
const PARTNER_BENEFITS_MAX = 6;
const PARTNER_DASHBOARD_FEATURES_MAX = 8;
const PARTNER_STEPS_MAX = 3;
const PARTNER_FAQS_MAX = 20;
const PARTNER_HERO_ACTIONS_MAX = 4;
const PARTNER_MOCKUP_TABS_MAX = 5;
const PARTNER_MOCKUP_SUMMARY_STATS_MAX = 3;
const PARTNER_MOCKUP_STAFF_ROWS_MAX = 8;
const PARTNER_LOGOS_MAX = 50;
const FOOTER_STATS_MAX = 4;
const FOOTER_LINKS_MAX = 8;

type PartnerWithIscaContentPayload = {
  hero?: {
    eyebrow?: string;
    headline?: string;
    headlineAccent?: string;
    description?: string;
    heroImageUrl?: string;
    placeholderText?: string;
    actions?: Array<{
      label?: string;
      variant?: string;
      scrollTo?: string;
      href?: string;
    }>;
  };
  stats?: Array<{ icon?: string; title?: string; label?: string }>;
  benefits?: {
    eyebrow?: string;
    title?: string;
    items?: Array<{
      icon?: string;
      iconTone?: string;
      title?: string;
      description?: string;
    }>;
  };
  dashboard?: {
    eyebrow?: string;
    title?: string;
    description?: string;
    features?: Array<{ title?: string; description?: string }>;
    mockup?: {
      companyLogoText?: string;
      companyName?: string;
      companySub?: string;
      companyCode?: string;
      tabs?: string[];
      summaryStats?: Array<{
        label?: string;
        value?: string;
        sub?: string;
        valueTone?: string;
        subColor?: string;
      }>;
      overallCompletionLabel?: string;
      overallCompletionSubtitle?: string;
      overallCompletionPercent?: string;
      staffActivityLabel?: string;
      staffRows?: Array<{
        initials?: string;
        name?: string;
        role?: string;
        progress?: number;
        progressColor?: string;
        status?: string;
        statusTone?: string;
        cert?: string | null;
      }>;
    };
  };
  howItWorks?: {
    eyebrow?: string;
    title?: string;
    note?: string;
    steps?: Array<{
      icon?: string;
      badge?: string;
      title?: string;
      description?: string;
      done?: boolean;
    }>;
  };
  faq?: {
    eyebrow?: string;
    title?: string;
    items?: Array<{ question?: string; answer?: string }>;
  };
  cta?: {
    eyebrow?: string;
    title?: string;
    description?: string;
    buttonLabel?: string;
    buttonHref?: string;
  };
};

type FooterContentPayload = {
  stats?: Array<{
    value?: string;
    label?: string;
    icon?: string;
    useLiveEnrollment?: boolean;
  }>;
  domainLine?: string;
  copyrightText?: string;
  links?: Array<{
    label?: string;
    path?: string;
    external?: boolean;
    icon?: string;
  }>;
};

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
  private homeProgrammeStructureColumnChecked = false;
  private homeFundingEligibilityColumnChecked = false;
  private homeEligibilityMembershipColumnChecked = false;
  private homeCeoLaunchColumnChecked = false;
  private partnerWithIscaColumnChecked = false;
  private footerColumnChecked = false;

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
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
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

  private async ensureHomeProgrammeStructureColumn(): Promise<void> {
    if (this.homeProgrammeStructureColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "homeProgrammeStructureContent" jsonb'
    );
    this.homeProgrammeStructureColumnChecked = true;
  }

  private async ensureHomeFundingEligibilityColumn(): Promise<void> {
    if (this.homeFundingEligibilityColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "homeFundingEligibilityContent" jsonb'
    );
    this.homeFundingEligibilityColumnChecked = true;
  }

  private async ensureHomeEligibilityMembershipColumn(): Promise<void> {
    if (this.homeEligibilityMembershipColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "homeEligibilityMembershipContent" jsonb'
    );
    this.homeEligibilityMembershipColumnChecked = true;
  }

  private async ensureHomeCeoLaunchColumn(): Promise<void> {
    if (this.homeCeoLaunchColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "homeCeoLaunchContent" jsonb'
    );
    this.homeCeoLaunchColumnChecked = true;
  }

  private async ensurePartnerWithIscaColumn(): Promise<void> {
    if (this.partnerWithIscaColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "partnerWithIscaContent" jsonb'
    );
    this.partnerWithIscaColumnChecked = true;
  }

  private async ensureFooterColumn(): Promise<void> {
    if (this.footerColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "footerContent" jsonb'
    );
    this.footerColumnChecked = true;
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
    await this.ensureHomeProgrammeStructureColumn();
    await this.ensureHomeFundingEligibilityColumn();
    await this.ensureHomeEligibilityMembershipColumn();
    await this.ensureHomeCeoLaunchColumn();
    await this.ensurePartnerWithIscaColumn();
    await this.ensureFooterColumn();

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

  async uploadHomeHeroStatIcon(
    index: number,
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    if (!Number.isInteger(index) || index < 0 || index > 3) {
      throw new BadRequestException('Invalid hero stat index');
    }

    const settings = await this.getSettings();
    const heroContent =
      settings.homeHeroContent && typeof settings.homeHeroContent === 'object'
        ? { ...(settings.homeHeroContent as any) }
        : {};
    const stats = Array.isArray(heroContent.stats) ? [...heroContent.stats] : [];
    while (stats.length <= index) {
      stats.push({ value: '', label: '', icon: '' });
    }

    const folder = `home-hero-stats/${index}`;
    await this.localStorageService.clearFolder(folder);
    const relativeUrl = await this.localStorageService.saveFile(file, folder, {
      fileName: 'icon',
    });

    const current = stats[index] && typeof stats[index] === 'object' ? stats[index] : {};
    stats[index] = { ...current, icon: relativeUrl };
    heroContent.stats = stats;
    settings.homeHeroContent = heroContent;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Home hero stat icon uploaded successfully',
      settings: saved,
    };
  }

  async uploadHomeHeroBadgeLogo(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const heroContent =
      settings.homeHeroContent && typeof settings.homeHeroContent === 'object'
        ? { ...(settings.homeHeroContent as any) }
        : {};

    await this.localStorageService.clearFolder('home-hero-badge-logo');
    const relativeUrl = await this.localStorageService.saveFile(file, 'home-hero-badge-logo', {
      fileName: 'logo',
    });

    heroContent.badgeLogoUrl = relativeUrl;
    settings.homeHeroContent = this.sanitizeHomeHeroContent(heroContent);
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Home hero badge logo uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeHeroBadgeLogo(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const heroContent =
      settings.homeHeroContent && typeof settings.homeHeroContent === 'object'
        ? { ...(settings.homeHeroContent as any) }
        : {};

    await this.localStorageService.clearFolder('home-hero-badge-logo');
    heroContent.badgeLogoUrl = '';
    settings.homeHeroContent = this.sanitizeHomeHeroContent(heroContent);
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Home hero badge logo removed successfully',
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

  private sanitizeHeroStatIconSize(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return 26;
    return Math.max(16, Math.min(56, Math.round(n)));
  }

  private sanitizeHomeHeroContent(input: unknown): HomeHeroContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const stats = Array.isArray(source.stats) ? source.stats : [];
    const secondaryCtas = Array.isArray(source.secondaryCtas) ? source.secondaryCtas : [];
    return {
      badgeLogoUrl:
        this.toStoredUploadPath(source.badgeLogoUrl) || this.cleanText(source.badgeLogoUrl, 500),
      headline: this.cleanText(source.headline, HERO_HEADLINE_MAX_LENGTH),
      headlineAccent: this.cleanText(source.headlineAccent, HERO_HEADLINE_MAX_LENGTH),
      headlineColor: this.sanitizeHexColor(source.headlineColor),
      headlineAccentColor: this.sanitizeHexColor(source.headlineAccentColor),
      description: this.cleanText(source.description),
      cta: {
        label: this.cleanText(source.cta?.label, HERO_CTA_LABEL_MAX_LENGTH),
        href: this.cleanText(source.cta?.href),
        icon: this.cleanText(source.cta?.icon, 120),
        buttonColor: this.sanitizeHexColor(source.cta?.buttonColor),
        buttonTextColor: this.sanitizeHexColor(source.cta?.buttonTextColor),
      },
      secondaryCtas: secondaryCtas.slice(0, 5).map((item: any) => ({
        label: this.cleanText(item?.label, HERO_CTA_LABEL_MAX_LENGTH),
        href: this.cleanText(item?.href),
        icon: this.cleanText(item?.icon, 120),
        variant: this.cleanText(item?.variant, 40),
        buttonColor: this.sanitizeHexColor(item?.buttonColor),
        buttonTextColor: this.sanitizeHexColor(item?.buttonTextColor),
      })),
      statIconSize: this.sanitizeHeroStatIconSize(source?.statIconSize),
      stats: stats.slice(0, 4).map((item: any) => ({
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
    const rawCategoryIds = Array.isArray(source.categoryIds) ? source.categoryIds : [];
    const rawCourseIds = Array.isArray(source.courseIds) ? source.courseIds : [];
    const legacyCourseId = this.cleanText(source.courseId, 64);
    const seenCategories = new Set<string>();
    const seenCourses = new Set<string>();
    const categoryIds: string[] = [];
    const courseIds: string[] = [];

    const pushCategoryId = (value: string) => {
      const id = this.cleanText(value, 64);
      if (!/^[0-9a-f-]{36}$/i.test(id) || seenCategories.has(id)) return;
      seenCategories.add(id);
      categoryIds.push(id);
    };

    const pushCourseId = (value: string) => {
      const id = this.cleanText(value, 64);
      if (!/^[0-9a-f-]{36}$/i.test(id) || seenCourses.has(id)) return;
      seenCourses.add(id);
      courseIds.push(id);
    };

    rawCategoryIds.forEach((id: unknown) => pushCategoryId(String(id || '')));
    rawCourseIds.forEach((id: unknown) => pushCourseId(String(id || '')));

    if (!categoryIds.length && !courseIds.length && /^[0-9a-f-]{36}$/i.test(legacyCourseId)) {
      pushCourseId(legacyCourseId);
    }

    return {
      smallTitle: this.cleanText(source.smallTitle, CURRICULUM_SMALL_TITLE_MAX),
      subtext: this.cleanText(source.subtext, CURRICULUM_SUBTEXT_MAX),
      categoryIds: categoryIds.slice(0, CURRICULUM_CATEGORIES_MAX),
      courseIds: courseIds.slice(0, CURRICULUM_COURSES_MAX),
    };
  }

  private buildCurriculumHeadline(moduleCount: number): string {
    if (moduleCount <= 0) return '';
    return `${moduleCount} module${moduleCount === 1 ? '' : 's'}`;
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

  private async resolveCurriculumFromCategories(
    categoryIds: string[],
    selectedCourseIds: string[] = []
  ): Promise<{
    categories: CurriculumCategoryPayload[];
    courses: CurriculumCoursePayload[];
    modules: CurriculumModulePayload[];
    courseIds: string[];
  }> {
    const categories: CurriculumCategoryPayload[] = [];
    const courses: CurriculumCoursePayload[] = [];
    const modules: CurriculumModulePayload[] = [];
    const courseIds: string[] = [];
    const selectedSet = new Set(selectedCourseIds);
    let index = 0;

    for (const categoryId of categoryIds) {
      const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
      if (!category) continue;

      const categoryTitle = String(category.title || '').trim();
      if (!categoryTitle) continue;

      const categoryCourses = await this.courseRepository.find({
        where: { categoryId: category.id, isBundle: false },
        order: { createdAt: 'ASC' },
      });

      const categoryCoursePayloads: CurriculumCoursePayload[] = [];
      const categoryCourseIds: string[] = [];

      for (const course of categoryCourses) {
        const courseTitle = String(course.title || '').trim();
        if (!courseTitle) continue;
        if (!selectedSet.has(course.id)) continue;

        const moduleRows = await this.courseModuleRepository.find({
          where: { courseId: course.id },
          order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });

        const coursePayload: CurriculumCoursePayload = {
          id: course.id,
          title: courseTitle,
          modulesCount: moduleRows.length,
          categoryId: category.id,
        };

        categoryCoursePayloads.push(coursePayload);
        categoryCourseIds.push(course.id);
        courses.push(coursePayload);
        courseIds.push(course.id);

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

      categories.push({
        id: category.id,
        title: categoryTitle,
        courseIds: categoryCourseIds,
        courses: categoryCoursePayloads,
      });
    }

    return { categories, courses, modules, courseIds };
  }

  private async buildCurriculumPublicPayload(
    content?: CurriculumContentPayload | null
  ): Promise<CurriculumPublicPayload> {
    const sanitized = this.sanitizeCurriculumContent(content || {});
    const categoryIds = sanitized.categoryIds || [];

    if (categoryIds.length) {
      const resolved = await this.resolveCurriculumFromCategories(
        categoryIds,
        sanitized.courseIds || []
      );
      const moduleCount = resolved.modules.length;

      return {
        smallTitle: sanitized.smallTitle,
        subtext: sanitized.subtext,
        categoryIds,
        categories: resolved.categories,
        courseIds: resolved.courseIds,
        courses: resolved.courses,
        moduleCount,
        modules: resolved.modules,
        headline: this.buildCurriculumHeadline(moduleCount),
      };
    }

    const courseIds = sanitized.courseIds || [];
    const { courses, modules } = await this.resolveCurriculumFromCourses(courseIds);
    const moduleCount = modules.length;

    return {
      smallTitle: sanitized.smallTitle,
      subtext: sanitized.subtext,
      categoryIds: [],
      categories: [],
      courseIds,
      courses,
      moduleCount,
      modules,
      headline: this.buildCurriculumHeadline(moduleCount),
    };
  }

  private isTestimonialsItemId(value: unknown): boolean {
    const id = this.cleanText(String(value ?? ''), 64);
    return /^[0-9a-f-]{36}$/i.test(id);
  }

  private ensureTestimonialsItemId(value: unknown): string {
    return this.isTestimonialsItemId(value) ? this.cleanText(String(value), 64) : randomUUID();
  }

  private requireTestimonialsItemId(value: unknown, label: string): string {
    if (!this.isTestimonialsItemId(value)) {
      throw new BadRequestException(`Invalid ${label} id`);
    }
    return this.cleanText(String(value), 64);
  }

  private sanitizeHomeTestimonialsContent(input: unknown): HomeTestimonialsContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawTestimonials = Array.isArray(source.testimonials) ? source.testimonials : [];
    const rawQuotes = Array.isArray(source.industryQuotes) ? source.industryQuotes : [];
    return {
      heading: this.cleanText(source.heading, 120),
      subtitle: this.cleanText(source.subtitle),
      testimonials: rawTestimonials.slice(0, TESTIMONIALS_MAX).map((row: any) => {
        const ratingRaw = Number(row?.rating);
        const rating =
          Number.isFinite(ratingRaw) && ratingRaw > 0
            ? Math.min(5, Math.max(1, ratingRaw))
            : 5;
        return {
          id: this.ensureTestimonialsItemId(row?.id),
          quote: this.cleanText(row?.quote),
          name: this.cleanText(row?.name, 120),
          role: this.cleanText(row?.role, 160),
          avatarUrl:
            this.toStoredUploadPath(row?.avatarUrl) || this.cleanText(row?.avatarUrl, 500),
          rating,
        };
      }),
      industryQuotes: rawQuotes.slice(0, INDUSTRY_QUOTES_MAX).map((row: any) => ({
        id: this.ensureTestimonialsItemId(row?.id),
        quote: this.cleanText(row?.quote),
        organisation: this.cleanText(row?.organisation, 160),
        logoUrl: this.toStoredUploadPath(row?.logoUrl) || this.cleanText(row?.logoUrl, 500),
      })),
    };
  }

  private sanitizeHomeProgrammeStructureContent(
    input: unknown
  ): HomeProgrammeStructureContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawPhases = Array.isArray(source.phases) ? source.phases : [];
    return {
      eyebrow: this.cleanText(source.eyebrow, PROGRAMME_STRUCTURE_EYEBROW_MAX),
      heading: this.cleanText(source.heading, PROGRAMME_STRUCTURE_HEADING_MAX),
      headingUnderlineWord: this.cleanText(
        source.headingUnderlineWord,
        PROGRAMME_STRUCTURE_HEADING_UNDERLINE_MAX
      ),
      phases: rawPhases.slice(0, PROGRAMME_STRUCTURE_PHASES_MAX).map((row: any, index: number) => {
        const labelRaw = this.cleanText(row?.label, PROGRAMME_STRUCTURE_PHASE_LABEL_MAX);
        return {
          id: this.ensureTestimonialsItemId(row?.id),
          label: labelRaw || `Phase ${index + 1}`,
          title: this.cleanText(row?.title, PROGRAMME_STRUCTURE_PHASE_TITLE_MAX),
          description: this.cleanText(row?.description),
          icon:
            this.toStoredUploadPath(row?.icon) ||
            this.cleanText(row?.icon, PROGRAMME_STRUCTURE_PHASE_ICON_MAX),
        };
      }),
    };
  }

  private sanitizeFundingEligibilityCard(row: any) {
    return {
      id: this.ensureTestimonialsItemId(row?.id),
      icon: this.cleanText(row?.icon, FUNDING_ELIGIBILITY_ICON_MAX) || 'solar:flag-bold-duotone',
      title: this.cleanText(row?.title, FUNDING_ELIGIBILITY_CARD_TITLE_MAX),
      description: this.cleanText(row?.description),
    };
  }

  private sanitizeHomeFundingEligibilityContent(
    input: unknown
  ): HomeFundingEligibilityContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawItems = Array.isArray(source.items)
      ? source.items
      : [
          ...(Array.isArray(source.topRow) ? source.topRow : []),
          ...(Array.isArray(source.bottomRow) ? source.bottomRow : []),
        ];
    return {
      eyebrow: this.cleanText(source.eyebrow, FUNDING_ELIGIBILITY_EYEBROW_MAX),
      heading: this.cleanText(source.heading, FUNDING_ELIGIBILITY_HEADING_MAX),
      items: rawItems.slice(0, FUNDING_ELIGIBILITY_ITEMS_MAX).map((row: any) =>
        this.sanitizeFundingEligibilityCard(row)
      ),
    };
  }

  private sanitizeEligibilityMembershipIconColor(value: unknown): 'blue' | 'red' {
    return String(value || '').trim().toLowerCase() === 'red' ? 'red' : 'blue';
  }

  private sanitizeHomeEligibilityMembershipContent(
    input: unknown
  ): HomeEligibilityMembershipContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const leftSource =
      source.leftPanel && typeof source.leftPanel === 'object' ? source.leftPanel : {};
    const rightSource =
      source.rightPanel && typeof source.rightPanel === 'object' ? source.rightPanel : {};
    const rawQuestions = Array.isArray(leftSource.questions) ? leftSource.questions : [];
    const rawBenefits = Array.isArray(rightSource.benefits) ? rightSource.benefits : [];

    return {
      leftPanel: {
        heading: this.cleanText(leftSource.heading, ELIGIBILITY_MEMBERSHIP_HEADING_MAX),
        subtitle: this.cleanText(leftSource.subtitle, ELIGIBILITY_MEMBERSHIP_SUBTITLE_MAX),
        heroImageUrl:
          this.toStoredUploadPath(leftSource.heroImageUrl) ||
          this.cleanText(leftSource.heroImageUrl, 500),
        questions: rawQuestions.slice(0, ELIGIBILITY_MEMBERSHIP_QUESTIONS_MAX).map((row: any) => ({
          id: this.ensureTestimonialsItemId(row?.id),
          icon: this.cleanText(row?.icon, ELIGIBILITY_MEMBERSHIP_ICON_MAX) || 'solar:user-bold-duotone',
          iconColor: this.sanitizeEligibilityMembershipIconColor(row?.iconColor),
          text: this.cleanText(row?.text, ELIGIBILITY_MEMBERSHIP_QUESTION_MAX),
        })),
        ctaLabel: this.cleanText(leftSource.ctaLabel, 80),
        ctaHref: this.cleanText(leftSource.ctaHref, 500),
      },
      rightPanel: {
        eyebrow: this.cleanText(rightSource.eyebrow, ELIGIBILITY_MEMBERSHIP_HEADING_MAX),
        heading: this.cleanText(rightSource.heading, ELIGIBILITY_MEMBERSHIP_HEADING_MAX),
        benefits: rawBenefits.slice(0, ELIGIBILITY_MEMBERSHIP_BENEFITS_MAX).map((row: any) => ({
          id: this.ensureTestimonialsItemId(row?.id),
          icon: this.cleanText(row?.icon, ELIGIBILITY_MEMBERSHIP_ICON_MAX) || 'solar:star-bold-duotone',
          label: this.cleanText(row?.label, ELIGIBILITY_MEMBERSHIP_BENEFIT_LABEL_MAX),
        })),
        primaryCtaLabel: this.cleanText(rightSource.primaryCtaLabel, 80),
        primaryCtaHref: this.cleanText(rightSource.primaryCtaHref, 500),
        secondaryCtaLabel: this.cleanText(rightSource.secondaryCtaLabel, 80),
        secondaryCtaHref: this.cleanText(rightSource.secondaryCtaHref, 500),
      },
    };
  }

  private sanitizeHomeCeoLaunchContent(input: unknown): HomeCeoLaunchContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawStats = Array.isArray(source.stats) ? source.stats : [];
    return {
      eyebrow: this.cleanText(source.eyebrow, CEO_LAUNCH_EYEBROW_MAX),
      heading: this.cleanText(source.heading, CEO_LAUNCH_HEADING_MAX),
      subtitle: this.cleanText(source.subtitle),
      posterImageUrl:
        this.toStoredUploadPath(source.posterImageUrl) ||
        this.cleanText(source.posterImageUrl, 500),
      videoUrl: this.cleanText(source.videoUrl, 500),
      videoFileUrl:
        this.toStoredUploadPath(source.videoFileUrl) ||
        this.cleanText(source.videoFileUrl, 500),
      quote: this.cleanText(source.quote),
      statIconSize: this.sanitizeHeroStatIconSize(source?.statIconSize),
      stats: rawStats.slice(0, CEO_LAUNCH_STATS_MAX).map((row: any) => ({
        value: this.cleanText(row?.value, CEO_LAUNCH_STAT_VALUE_MAX),
        label: this.cleanText(row?.label, CEO_LAUNCH_STAT_LABEL_MAX),
        icon: this.toStoredUploadPath(row?.icon) || this.cleanText(row?.icon, CEO_LAUNCH_STAT_ICON_MAX),
      })),
      ctaLabel: this.cleanText(source.ctaLabel, 80),
      ctaHref: this.cleanText(source.ctaHref, 500),
    };
  }

  private sanitizeHomeEmployerContent(input: unknown): HomeEmployerContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawBenefits = Array.isArray(source.benefits) ? source.benefits : [];
    const rawLogos = Array.isArray(source.logos) ? source.logos : [];
    return {
      heading: this.cleanText(source.heading, 120),
      subtitle: this.cleanText(source.subtitle),
      heroImageUrl:
        this.toStoredUploadPath(source.heroImageUrl) || this.cleanText(source.heroImageUrl, 500),
      benefits: rawBenefits.slice(0, EMPLOYER_BENEFITS_MAX).map((row: any) => ({
        icon: this.cleanText(row?.icon, 120),
        title: this.cleanText(row?.title, 120),
      })),
      logos: rawLogos.slice(0, EMPLOYER_LOGOS_MAX).map((row: any) => ({
        name: this.cleanText(row?.name, 120),
        logoUrl: this.toStoredUploadPath(row?.logoUrl) || this.cleanText(row?.logoUrl, 500),
      })),
      partnersHeading: this.cleanText(source.partnersHeading, 120),
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
      })),
      primaryCtaLabel: this.cleanText(source.primaryCtaLabel, 80),
      primaryCtaHref: this.cleanText(source.primaryCtaHref, 500),
      secondaryCtaLabel: this.cleanText(source.secondaryCtaLabel, 80),
      secondaryCtaHref: this.cleanText(source.secondaryCtaHref, 500),
      partnersHeading: this.cleanText(source.partnersHeading, 120),
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

  private sanitizePartnerWithIscaContent(input: unknown): PartnerWithIscaContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const hero = source.hero && typeof source.hero === 'object' ? source.hero : {};
    const benefits = source.benefits && typeof source.benefits === 'object' ? source.benefits : {};
    const dashboard = source.dashboard && typeof source.dashboard === 'object' ? source.dashboard : {};
    const mockup =
      dashboard.mockup && typeof dashboard.mockup === 'object' ? dashboard.mockup : {};
    const howItWorks =
      source.howItWorks && typeof source.howItWorks === 'object' ? source.howItWorks : {};
    const faq = source.faq && typeof source.faq === 'object' ? source.faq : {};
    const cta = source.cta && typeof source.cta === 'object' ? source.cta : {};

    const rawStats = Array.isArray(source.stats) ? source.stats : [];
    const rawActions = Array.isArray(hero.actions) ? hero.actions : [];
    const rawBenefits = Array.isArray(benefits.items) ? benefits.items : [];
    const rawFeatures = Array.isArray(dashboard.features) ? dashboard.features : [];
    const rawTabs = Array.isArray(mockup.tabs) ? mockup.tabs : [];
    const rawSummaryStats = Array.isArray(mockup.summaryStats) ? mockup.summaryStats : [];
    const rawStaffRows = Array.isArray(mockup.staffRows) ? mockup.staffRows : [];
    const rawSteps = Array.isArray(howItWorks.steps) ? howItWorks.steps : [];
    const rawFaqs = Array.isArray(faq.items) ? faq.items : [];

    return {
      hero: {
        eyebrow: this.cleanText(hero.eyebrow, 120),
        headline: this.cleanText(hero.headline, 160),
        headlineAccent: this.cleanText(hero.headlineAccent, 160),
        description: this.cleanText(hero.description, 2000),
        heroImageUrl: this.cleanText(hero.heroImageUrl, 500),
        placeholderText: this.cleanText(hero.placeholderText, 500),
        actions: rawActions.slice(0, PARTNER_HERO_ACTIONS_MAX).map((row: any) => ({
          label: this.cleanText(row?.label, 80),
          variant: this.cleanText(row?.variant, 20) === 'red' ? 'red' : 'outline',
          scrollTo: this.cleanText(row?.scrollTo, 80),
          href: this.cleanText(row?.href, 240),
        })),
      },
      stats: rawStats.slice(0, PARTNER_STATS_MAX).map((row: any) => ({
        icon: this.cleanText(row?.icon, 120),
        title: this.cleanText(row?.title, 80),
        label: this.cleanText(row?.label, 160),
      })),
      benefits: {
        eyebrow: this.cleanText(benefits.eyebrow, 120),
        title: this.cleanText(benefits.title, 240),
        items: rawBenefits.slice(0, PARTNER_BENEFITS_MAX).map((row: any) => ({
          icon: this.cleanText(row?.icon, 120),
          iconTone: this.cleanText(row?.iconTone, 20),
          title: this.cleanText(row?.title, 160),
          description: this.cleanText(row?.description, 1000),
        })),
      },
      dashboard: {
        eyebrow: this.cleanText(dashboard.eyebrow, 120),
        title: this.cleanText(dashboard.title, 240),
        description: this.cleanText(dashboard.description, 2000),
        features: rawFeatures.slice(0, PARTNER_DASHBOARD_FEATURES_MAX).map((row: any) => ({
          title: this.cleanText(row?.title, 160),
          description: this.cleanText(row?.description, 500),
        })),
        mockup: {
          companyLogoText: this.cleanText(mockup.companyLogoText, 40),
          companyName: this.cleanText(mockup.companyName, 120),
          companySub: this.cleanText(mockup.companySub, 120),
          companyCode: this.cleanText(mockup.companyCode, 40),
          tabs: rawTabs.slice(0, PARTNER_MOCKUP_TABS_MAX).map((tab: any) => this.cleanText(tab, 40)),
          summaryStats: rawSummaryStats.slice(0, PARTNER_MOCKUP_SUMMARY_STATS_MAX).map((row: any) => ({
            label: this.cleanText(row?.label, 80),
            value: this.cleanText(row?.value, 40),
            sub: this.cleanText(row?.sub, 80),
            valueTone: this.cleanText(row?.valueTone, 20),
            subColor: this.cleanText(row?.subColor, 40),
          })),
          overallCompletionLabel: this.cleanText(mockup.overallCompletionLabel, 80),
          overallCompletionSubtitle: this.cleanText(mockup.overallCompletionSubtitle, 120),
          overallCompletionPercent: this.cleanText(mockup.overallCompletionPercent, 20),
          staffActivityLabel: this.cleanText(mockup.staffActivityLabel, 80),
          staffRows: rawStaffRows.slice(0, PARTNER_MOCKUP_STAFF_ROWS_MAX).map((row: any) => ({
            initials: this.cleanText(row?.initials, 4),
            name: this.cleanText(row?.name, 80),
            role: this.cleanText(row?.role, 80),
            progress: Math.max(0, Math.min(100, Number(row?.progress) || 0)),
            progressColor: this.cleanText(row?.progressColor, 20),
            status: this.cleanText(row?.status, 40),
            statusTone: this.cleanText(row?.statusTone, 20),
            cert: row?.cert === 'download' ? 'download' : null,
          })),
        },
      },
      howItWorks: {
        eyebrow: this.cleanText(howItWorks.eyebrow, 120),
        title: this.cleanText(howItWorks.title, 240),
        note: this.cleanText(howItWorks.note, 160),
        steps: rawSteps.slice(0, PARTNER_STEPS_MAX).map((row: any) => ({
          icon: this.cleanText(row?.icon, 120),
          badge: this.cleanText(row?.badge, 80),
          title: this.cleanText(row?.title, 160),
          description: this.cleanText(row?.description, 1000),
          done: Boolean(row?.done),
        })),
      },
      faq: {
        eyebrow: this.cleanText(faq.eyebrow, 120),
        title: this.cleanText(faq.title, 240),
        items: rawFaqs.slice(0, PARTNER_FAQS_MAX).map((row: any) => ({
          question: this.cleanText(row?.question, FAQ_QUESTION_MAX_LENGTH),
          answer: this.cleanText(row?.answer),
        })),
      },
      cta: {
        eyebrow: this.cleanText(cta.eyebrow, 120),
        title: this.cleanText(cta.title, 240),
        description: this.cleanText(cta.description, 1000),
        buttonLabel: this.cleanText(cta.buttonLabel, 80),
        buttonHref: this.cleanText(cta.buttonHref, 240),
      },
    };
  }

  private defaultFooterContent(): FooterContentPayload {
    return {
      stats: [
        {
          value: '12K+',
          label: 'Learners enrolled in courses',
          icon: 'solar:book-bookmark-bold-duotone',
          useLiveEnrollment: true,
        },
        {
          value: '180+',
          label: 'AI resources',
          icon: 'solar:library-bold-duotone',
          useLiveEnrollment: false,
        },
        {
          value: '40+',
          label: 'Expert mentors',
          icon: 'solar:users-group-rounded-bold-duotone',
          useLiveEnrollment: false,
        },
        {
          value: '24/7',
          label: 'Community access',
          icon: 'solar:chat-round-dots-bold-duotone',
          useLiveEnrollment: false,
        },
      ],
      domainLine: 'ainexus.com · AI learning & community',
      copyrightText: '© {year} AI Nexus. All rights reserved.',
      links: [
        { label: 'Home', path: '/home', external: false, icon: 'solar:home-bold' },
        { label: 'Learning', path: '/learning', external: false, icon: 'solar:book-2-bold' },
        { label: 'AI Resources', path: '/ai-resources', external: false, icon: 'solar:widget-bold' },
        { label: 'AI Forum', path: '/ai-forum', external: false, icon: 'solar:chat-round-bold' },
        { label: 'Contact', path: '/contact-us', external: false, icon: 'solar:map-point-bold' },
      ],
    };
  }

  private sanitizeFooterContent(input: unknown): FooterContentPayload {
    const defaults = this.defaultFooterContent();
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawStats = Array.isArray(source.stats) ? source.stats : defaults.stats || [];
    const rawLinks = Array.isArray(source.links) ? source.links : defaults.links || [];

    return {
      domainLine:
        this.cleanText(source.domainLine, 160) || this.cleanText(defaults.domainLine, 160),
      copyrightText:
        this.cleanText(source.copyrightText, 200) || this.cleanText(defaults.copyrightText, 200),
      stats: Array.from({ length: FOOTER_STATS_MAX }, (_, index) => {
        const row = rawStats[index] && typeof rawStats[index] === 'object' ? rawStats[index] : {};
        const fallback =
          Array.isArray(defaults.stats) && defaults.stats[index]
            ? defaults.stats[index]
            : defaults.stats?.[0] || {};
        return {
          value: this.cleanText(row?.value, 40) || this.cleanText(fallback?.value, 40),
          label: this.cleanText(row?.label, 120) || this.cleanText(fallback?.label, 120),
          icon: this.cleanText(row?.icon, 120) || this.cleanText(fallback?.icon, 120),
          useLiveEnrollment: Boolean(row?.useLiveEnrollment ?? fallback?.useLiveEnrollment),
        };
      }),
      links: (rawLinks.length ? rawLinks : defaults.links || [])
        .slice(0, FOOTER_LINKS_MAX)
        .map((item: any, index: number) => {
          const fallback =
            Array.isArray(defaults.links) && defaults.links[index]
              ? defaults.links[index]
              : defaults.links?.[0] || {};
          return {
            label: this.cleanText(item?.label, 80) || this.cleanText(fallback?.label, 80),
            path: this.cleanText(item?.path, 240) || this.cleanText(fallback?.path, 240),
            external: Boolean(item?.external ?? fallback?.external),
            icon: this.cleanText(item?.icon, 120) || this.cleanText(fallback?.icon, 120),
          };
        }),
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
          whatsappLink: this.cleanText(item?.whatsappLink, 200),
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

  async uploadHomeTestimonialsAvatar(
    itemId: string,
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const id = this.requireTestimonialsItemId(itemId, 'testimonial');
    const settings = await this.getSettings();
    const existing = this.sanitizeHomeTestimonialsContent(settings.homeTestimonialsContent || {});
    const testimonials = [...(existing.testimonials || [])];
    const index = testimonials.findIndex((row) => row.id === id);
    if (index < 0) {
      throw new NotFoundException('Testimonial not found');
    }
    const folder = `home-testimonials-avatars/${id}`;
    await this.localStorageService.clearFolder(folder);
    const relativeUrl = await this.localStorageService.saveFile(file, folder, {
      fileName: 'avatar',
    });
    testimonials[index] = { ...testimonials[index], avatarUrl: relativeUrl };
    settings.homeTestimonialsContent = this.sanitizeHomeTestimonialsContent({
      ...existing,
      testimonials,
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Testimonial avatar uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeTestimonialsAvatar(
    itemId: string
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const id = this.requireTestimonialsItemId(itemId, 'testimonial');
    const settings = await this.getSettings();
    const existing = this.sanitizeHomeTestimonialsContent(settings.homeTestimonialsContent || {});
    const testimonials = [...(existing.testimonials || [])];
    const index = testimonials.findIndex((row) => row.id === id);
    if (index < 0) {
      throw new NotFoundException('Testimonial not found');
    }
    const folder = `home-testimonials-avatars/${id}`;
    await this.localStorageService.clearFolder(folder);
    testimonials[index] = { ...testimonials[index], avatarUrl: '' };
    settings.homeTestimonialsContent = this.sanitizeHomeTestimonialsContent({
      ...existing,
      testimonials,
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Testimonial avatar removed successfully',
      settings: saved,
    };
  }

  async uploadHomeTestimonialsIndustryLogo(
    itemId: string,
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const id = this.requireTestimonialsItemId(itemId, 'industry quote');
    const settings = await this.getSettings();
    const existing = this.sanitizeHomeTestimonialsContent(settings.homeTestimonialsContent || {});
    const industryQuotes = [...(existing.industryQuotes || [])];
    const index = industryQuotes.findIndex((row) => row.id === id);
    if (index < 0) {
      throw new NotFoundException('Industry quote not found');
    }
    const folder = `home-testimonials-industry-logos/${id}`;
    await this.localStorageService.clearFolder(folder);
    const relativeUrl = await this.localStorageService.saveFile(file, folder, {
      fileName: 'logo',
    });
    industryQuotes[index] = { ...industryQuotes[index], logoUrl: relativeUrl };
    settings.homeTestimonialsContent = this.sanitizeHomeTestimonialsContent({
      ...existing,
      industryQuotes,
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Industry quote logo uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeTestimonialsIndustryLogo(
    itemId: string
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const id = this.requireTestimonialsItemId(itemId, 'industry quote');
    const settings = await this.getSettings();
    const existing = this.sanitizeHomeTestimonialsContent(settings.homeTestimonialsContent || {});
    const industryQuotes = [...(existing.industryQuotes || [])];
    const index = industryQuotes.findIndex((row) => row.id === id);
    if (index < 0) {
      throw new NotFoundException('Industry quote not found');
    }
    const folder = `home-testimonials-industry-logos/${id}`;
    await this.localStorageService.clearFolder(folder);
    industryQuotes[index] = { ...industryQuotes[index], logoUrl: '' };
    settings.homeTestimonialsContent = this.sanitizeHomeTestimonialsContent({
      ...existing,
      industryQuotes,
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Industry quote logo removed successfully',
      settings: saved,
    };
  }

  async updateHomeProgrammeStructureContent(
    payload: HomeProgrammeStructureContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.homeProgrammeStructureContent = this.sanitizeHomeProgrammeStructureContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home programme structure content updated successfully',
      settings: saved,
    };
  }

  async uploadHomeProgrammeStructurePhaseIcon(
    phaseId: string,
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const id = this.requireTestimonialsItemId(phaseId, 'journey phase');

    const settings = await this.getSettings();
    const existing = this.sanitizeHomeProgrammeStructureContent(
      settings.homeProgrammeStructureContent || {}
    );
    const phases = [...(existing.phases || [])];
    const index = phases.findIndex((row) => row.id === id);
    if (index < 0) {
      throw new NotFoundException('Journey phase not found');
    }

    const folder = `home-programme-structure-icons/${id}`;
    await this.localStorageService.clearFolder(folder);
    const relativeUrl = await this.localStorageService.saveFile(file, folder, {
      fileName: 'icon',
    });

    phases[index] = { ...phases[index], icon: relativeUrl };
    settings.homeProgrammeStructureContent = this.sanitizeHomeProgrammeStructureContent({
      ...existing,
      phases,
    });
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Journey phase icon uploaded successfully',
      settings: saved,
    };
  }

  async updateHomeFundingEligibilityContent(
    payload: HomeFundingEligibilityContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.homeFundingEligibilityContent = this.sanitizeHomeFundingEligibilityContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home funding & eligibility content updated successfully',
      settings: saved,
    };
  }

  async updateHomeEligibilityMembershipContent(
    payload: HomeEligibilityMembershipContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const existing = this.sanitizeHomeEligibilityMembershipContent(
      settings.homeEligibilityMembershipContent || {}
    );
    const next = this.sanitizeHomeEligibilityMembershipContent(payload);
    settings.homeEligibilityMembershipContent = {
      ...next,
      leftPanel: {
        ...next.leftPanel,
        heroImageUrl: next.leftPanel?.heroImageUrl || existing.leftPanel?.heroImageUrl || '',
      },
    };
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home eligibility & membership content updated successfully',
      settings: saved,
    };
  }

  async uploadHomeEligibilityMembershipHeroImage(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('home-eligibility-membership-hero');
    const relativeUrl = await this.localStorageService.saveFile(file, 'home-eligibility-membership-hero', {
      fileName: 'hero',
    });

    const existing = this.sanitizeHomeEligibilityMembershipContent(
      settings.homeEligibilityMembershipContent || {}
    );
    settings.homeEligibilityMembershipContent = this.sanitizeHomeEligibilityMembershipContent({
      ...existing,
      leftPanel: {
        ...existing.leftPanel,
        heroImageUrl: relativeUrl,
      },
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Eligibility section hero image uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeEligibilityMembershipHeroImage(): Promise<{
    message: string;
    settings: AppSettingsEntity;
  }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('home-eligibility-membership-hero');
    const existing = this.sanitizeHomeEligibilityMembershipContent(
      settings.homeEligibilityMembershipContent || {}
    );
    settings.homeEligibilityMembershipContent = this.sanitizeHomeEligibilityMembershipContent({
      ...existing,
      leftPanel: {
        ...existing.leftPanel,
        heroImageUrl: '',
      },
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Eligibility section hero image removed successfully',
      settings: saved,
    };
  }

  async updateHomeCeoLaunchContent(
    payload: HomeCeoLaunchContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const existing = this.sanitizeHomeCeoLaunchContent(settings.homeCeoLaunchContent || {});
    const videoUrl = this.cleanText(payload?.videoUrl, 500);
    const useVideoUrl = Boolean(videoUrl);

    if (useVideoUrl && String(existing.videoFileUrl || '').trim()) {
      await this.localStorageService.clearFolder('home-ceo-launch-video');
    }

    settings.homeCeoLaunchContent = this.sanitizeHomeCeoLaunchContent({
      ...existing,
      ...payload,
      posterImageUrl: payload.posterImageUrl ?? existing.posterImageUrl,
      videoUrl,
      videoFileUrl: useVideoUrl ? '' : payload.videoFileUrl ?? existing.videoFileUrl,
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home CEO launch content updated successfully',
      settings: saved,
    };
  }

  async uploadHomeCeoLaunchPoster(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('home-ceo-launch-poster');
    const relativeUrl = await this.localStorageService.saveFile(file, 'home-ceo-launch-poster', {
      fileName: 'poster',
    });
    const existing = this.sanitizeHomeCeoLaunchContent(settings.homeCeoLaunchContent || {});
    settings.homeCeoLaunchContent = this.sanitizeHomeCeoLaunchContent({
      ...existing,
      posterImageUrl: relativeUrl,
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'CEO launch poster uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeCeoLaunchPoster(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('home-ceo-launch-poster');
    const existing = this.sanitizeHomeCeoLaunchContent(settings.homeCeoLaunchContent || {});
    settings.homeCeoLaunchContent = this.sanitizeHomeCeoLaunchContent({
      ...existing,
      posterImageUrl: '',
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'CEO launch poster removed successfully',
      settings: saved,
    };
  }

  async uploadHomeCeoLaunchVideo(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('home-ceo-launch-video');
    const relativeUrl = await this.localStorageService.saveFile(file, 'home-ceo-launch-video', {
      fileName: 'ceo-video',
    });
    const existing = this.sanitizeHomeCeoLaunchContent(settings.homeCeoLaunchContent || {});
    settings.homeCeoLaunchContent = this.sanitizeHomeCeoLaunchContent({
      ...existing,
      videoFileUrl: relativeUrl,
      videoUrl: '',
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'CEO launch video uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeCeoLaunchVideo(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('home-ceo-launch-video');
    const existing = this.sanitizeHomeCeoLaunchContent(settings.homeCeoLaunchContent || {});
    settings.homeCeoLaunchContent = this.sanitizeHomeCeoLaunchContent({
      ...existing,
      videoFileUrl: '',
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'CEO launch video removed successfully',
      settings: saved,
    };
  }

  async uploadHomeCeoLaunchStatIcon(
    index: number,
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const slot = Math.max(0, Math.min(Math.floor(index), CEO_LAUNCH_STATS_MAX - 1));
    const folder = `home-ceo-launch-stat-icons/${slot}`;
    await this.localStorageService.clearFolder(folder);
    const relativeUrl = await this.localStorageService.saveFile(file, folder, {
      fileName: 'icon',
    });
    const existing = this.sanitizeHomeCeoLaunchContent(settings.homeCeoLaunchContent || {});
    const stats = [...(existing.stats || [])];
    while (stats.length <= slot) stats.push({ value: '', label: '', icon: '' });
    stats[slot] = { ...stats[slot], icon: relativeUrl };
    settings.homeCeoLaunchContent = this.sanitizeHomeCeoLaunchContent({ ...existing, stats });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'CEO launch stat icon uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeCeoLaunchStatIcon(
    index: number
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const slot = Math.max(0, Math.min(Math.floor(index), CEO_LAUNCH_STATS_MAX - 1));
    const folder = `home-ceo-launch-stat-icons/${slot}`;
    await this.localStorageService.clearFolder(folder);
    const existing = this.sanitizeHomeCeoLaunchContent(settings.homeCeoLaunchContent || {});
    const stats = [...(existing.stats || [])];
    while (stats.length <= slot) stats.push({ value: '', label: '', icon: '' });
    stats[slot] = { ...stats[slot], icon: '' };
    settings.homeCeoLaunchContent = this.sanitizeHomeCeoLaunchContent({ ...existing, stats });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'CEO launch stat icon removed successfully',
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

  async updatePartnerWithIscaContent(
    payload: PartnerWithIscaContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.partnerWithIscaContent = this.sanitizePartnerWithIscaContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Partner with ISCA content updated successfully',
      settings: saved,
    };
  }

  async updateFooterContent(
    payload: FooterContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.footerContent = this.sanitizeFooterContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Footer content updated successfully',
      settings: saved,
    };
  }

  async uploadPartnerWithIscaHeroImage(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('partner-with-isca-hero');
    const relativeUrl = await this.localStorageService.saveFile(file, 'partner-with-isca-hero', {
      fileName: 'hero',
    });
    const existing = this.sanitizePartnerWithIscaContent(settings.partnerWithIscaContent || {});
    settings.partnerWithIscaContent = this.sanitizePartnerWithIscaContent({
      ...existing,
      hero: {
        ...existing.hero,
        heroImageUrl: relativeUrl,
      },
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Partner with ISCA hero image uploaded successfully',
      settings: saved,
    };
  }

  async removePartnerWithIscaHeroImage(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('partner-with-isca-hero');
    const existing = this.sanitizePartnerWithIscaContent(settings.partnerWithIscaContent || {});
    settings.partnerWithIscaContent = this.sanitizePartnerWithIscaContent({
      ...existing,
      hero: {
        ...existing.hero,
        heroImageUrl: '',
      },
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Partner with ISCA hero image removed successfully',
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

  async uploadHomeEmployerLogo(
    index: number,
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const slot = Math.max(0, Math.min(Math.floor(index), EMPLOYER_LOGOS_MAX - 1));
    const folder = `home-employer-logos/${slot}`;
    await this.localStorageService.clearFolder(folder);
    const relativeUrl = await this.localStorageService.saveFile(file, folder, {
      fileName: 'logo',
    });
    const existing = this.sanitizeHomeEmployerContent(settings.homeEmployerContent || {});
    const logos = [...(existing.logos || [])];
    while (logos.length <= slot) logos.push({ name: '', logoUrl: '' });
    logos[slot] = { ...logos[slot], logoUrl: relativeUrl };
    settings.homeEmployerContent = this.sanitizeHomeEmployerContent({ ...existing, logos });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Employer logo uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeEmployerLogo(
    index: number
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const slot = Math.max(0, Math.min(Math.floor(index), EMPLOYER_LOGOS_MAX - 1));
    const folder = `home-employer-logos/${slot}`;
    await this.localStorageService.clearFolder(folder);
    const existing = this.sanitizeHomeEmployerContent(settings.homeEmployerContent || {});
    const logos = [...(existing.logos || [])];
    while (logos.length <= slot) logos.push({ name: '', logoUrl: '' });
    logos[slot] = { ...logos[slot], logoUrl: '' };
    settings.homeEmployerContent = this.sanitizeHomeEmployerContent({ ...existing, logos });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Employer logo removed successfully',
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
    homeProgrammeStructureContent: HomeProgrammeStructureContentPayload | null;
    homeFundingEligibilityContent: HomeFundingEligibilityContentPayload | null;
    homeEligibilityMembershipContent: HomeEligibilityMembershipContentPayload | null;
    homeCeoLaunchContent: HomeCeoLaunchContentPayload | null;
    partnerWithIscaContent: PartnerWithIscaContentPayload | null;
    footerContent: FooterContentPayload | null;
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
      homeProgrammeStructureContent: settings.homeProgrammeStructureContent
        ? this.sanitizeHomeProgrammeStructureContent(settings.homeProgrammeStructureContent)
        : null,
      homeFundingEligibilityContent: settings.homeFundingEligibilityContent
        ? this.sanitizeHomeFundingEligibilityContent(settings.homeFundingEligibilityContent)
        : null,
      homeEligibilityMembershipContent: settings.homeEligibilityMembershipContent
        ? this.sanitizeHomeEligibilityMembershipContent(settings.homeEligibilityMembershipContent)
        : null,
      homeCeoLaunchContent: settings.homeCeoLaunchContent
        ? this.sanitizeHomeCeoLaunchContent(settings.homeCeoLaunchContent)
        : null,
      partnerWithIscaContent: settings.partnerWithIscaContent
        ? this.sanitizePartnerWithIscaContent(settings.partnerWithIscaContent)
        : null,
      footerContent: settings.footerContent
        ? this.sanitizeFooterContent(settings.footerContent)
        : this.sanitizeFooterContent(null),
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
