import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AppSettingsEntity,
  CertificateTemplateSettings,
  MembershipPaymentSettings,
  WelcomeEmailContent,
  WorkflowTemplatesPitchContent,
} from './app-settings.entity';
import { LocalStorageService } from '../service/local-storage.service';
import { UserEntity, UserRole, UserStatus } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseEnrollmentEntity } from '../course/course-enrollment.entity';
import { CategoryEntity } from '../category/categories.entity';
import {
  listCountryPricing,
  listPromoCountriesWithAmounts,
  promoAmountsFromCountryPricing,
  sanitizeCountryPricing,
  sanitizePromoAmountsByCountry,
} from '../intl-payment/intl-promo-countries';

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

type LearningAdvertiseTabContentPayload = {
  name?: string;
  link?: string;
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

type MembershipPaymentSettingsPayload = MembershipPaymentSettings;

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

type HomeEnrolOptionsContentPayload = {
  heading?: string;
  subtitle?: string;
  comparePrompt?: string;
  compareLinkLabel?: string;
  compareHref?: string;
  cards?: Array<{
    id?: string;
    title?: string;
    description?: string;
    ctaLabel?: string;
    icon?: string;
    accentColor?: string;
    action?: string;
    href?: string;
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
const LEARNING_ADVERTISE_TAB_NAME_MAX_LENGTH = 80;
const LEARNING_ADVERTISE_TAB_LINK_MAX_LENGTH = 500;
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
const ENROL_OPTIONS_HEADING_MAX = 120;
const ENROL_OPTIONS_SUBTITLE_MAX = 200;
const ENROL_OPTIONS_COMPARE_MAX = 160;
const ENROL_OPTIONS_CTA_MAX = 80;
const ENROL_OPTIONS_CARDS_MAX = 6;
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
const CERTIFICATE_TEMPLATE_LOGOS_MAX = 3;

export const DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS: CertificateTemplateSettings = {
  titleLine1: 'CERTIFICATE',
  titleLine2Left: 'OF',
  titleLine2Right: 'PARTICIPATION',
  awardedToLabel: 'has been awarded to',
  sessionLabel: 'for attending of the session',
  cpeSectionLabel: 'Cat 5 CPE Hours: {hours} Hour',
  signatoryName: 'Sign off: Fann Kor',
  signatoryTitle: 'CHIEF EXECUTIVE OFFICER',
  issuerName: 'ISCA ACADEMY PTE LTD',
  transcriptTitle: 'AI FLUENCY',
  logoUrls: ['', '', ''],
  signatureUrl: null,
};
const EMPLOYEE_BENEFITS_MAX = 6;
const EMPLOYEE_LOGOS_MAX = 100;
const EMPLOYEE_STATS_MAX = 6;
const PARTNER_STATS_MAX = 4;
const PARTNER_BENEFITS_MAX = 6;
const PARTNER_DASHBOARD_FEATURES_MAX = 8;
const PARTNER_STEPS_MAX = 3;
const PARTNER_FAQS_MAX = 20;
const PARTNER_HERO_ACTIONS_MAX = 4;
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
    mockupImageUrl?: string;
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

type InternationalLandingContentPayload = {
  hero?: {
    eyebrow?: string;
    titleLine1?: string;
    titleLine2?: string;
    body?: string;
    heroImageUrl?: string | null;
  };
  globalLearning?: {
    title?: string;
    points?: string[];
    imageUrl?: string | null;
    sideCard?: {
      icon?: string;
      title?: string;
      body?: string;
    };
  };
  trustItems?: Array<{
    icon?: string;
    line1?: string;
    line2?: string;
    accent?: string;
  }>;
  footer?: {
    tagline?: string;
    copyrightText?: string;
    social?: Array<{
      icon?: string;
      href?: string;
    }>;
    columns?: Array<{
      title?: string;
      links?: Array<{
        label?: string;
        href?: string;
      }>;
    }>;
  };
};

const INTL_LANDING_TRUST_MAX = 8;
const INTL_LANDING_TRUST_MIN = 1;
const INTL_LANDING_POINTS_MAX = 8;
const INTL_LANDING_FOOTER_COLS_MAX = 4;
const INTL_LANDING_FOOTER_LINKS_MAX = 10;
const INTL_LANDING_SOCIAL_MAX = 6;

export const DEFAULT_USER_WELCOME_EMAIL_CONTENT: Required<WelcomeEmailContent> = {
  subject: 'Welcome to AI Nexus — your account is ready',
  heading: 'Welcome to AI Nexus',
  intro:
    '<p>Thank you for joining AI Nexus. Your account has been created successfully and is ready to use.</p>',
  bodyText: '',
  showAccountDetails: false,
  accountDetailsTitle: 'Account details',
  accountDetailsHtml:
    '<p><strong>Sign-in email</strong><br>{{email}}</p><p>Use this email with the password you created during signup, or continue with your ISCA eServices login where applicable.</p>',
  detailsNote: '',
  showCta: false,
  ctaLabel: 'Sign In to AI Nexus',
  ctaUrl: '/auth/sign-in',
  ctaAlign: 'center',
  note: '<p>Need help getting started? Reply to this email or contact AI Nexus support.</p>',
  footer: 'AI Nexus learner welcome',
};

export const DEFAULT_CORPORATE_WELCOME_EMAIL_CONTENT: Required<WelcomeEmailContent> = {
  subject: 'Welcome to AI Nexus Corporate — your account is ready',
  heading: 'Welcome to AI Nexus Corporate',
  intro:
    '<p>Thank you for registering {{companyName}} on AI Nexus. Your corporate account is ready. Sign in to open the corporate portal and start enrolling your staff.</p>',
  bodyText: '',
  showAccountDetails: false,
  accountDetailsTitle: 'Corporate account details',
  accountDetailsHtml:
    '<p><strong>Company</strong><br>{{companyName}}</p><p><strong>Sign-in email</strong><br>{{email}}</p><p>Use your eServices credentials to sign in to the AI Nexus corporate portal and start enrolling your staff.</p>',
  detailsNote: '',
  showCta: false,
  ctaLabel: 'Open Corporate Portal',
  ctaUrl: '/corporate/overview',
  ctaAlign: 'center',
  note: '<p>Need help? Contact AI Nexus support and we will assist your HR team.</p>',
  footer: 'AI Nexus corporate welcome',
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
  private homeEnrolOptionsColumnChecked = false;
  private homeEligibilityMembershipColumnChecked = false;
  private homeCeoLaunchColumnChecked = false;
  private partnerWithIscaColumnChecked = false;
  private footerColumnChecked = false;
  private learningAdvertiseTabColumnChecked = false;
  private internationalLandingColumnChecked = false;
  private membershipPaymentSettingsColumnChecked = false;
  private certificateTemplateSettingsColumnChecked = false;

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

  private async ensureHomeEnrolOptionsColumn(): Promise<void> {
    if (this.homeEnrolOptionsColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "homeEnrolOptionsContent" jsonb'
    );
    this.homeEnrolOptionsColumnChecked = true;
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

  private async ensureLearningAdvertiseTabColumn(): Promise<void> {
    if (this.learningAdvertiseTabColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "learningAdvertiseTabContent" jsonb'
    );
    this.learningAdvertiseTabColumnChecked = true;
  }

  private async ensureInternationalLandingColumn(): Promise<void> {
    if (this.internationalLandingColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "internationalLandingContent" jsonb'
    );
    this.internationalLandingColumnChecked = true;
  }

  private async ensureCertificateTemplateSettingsColumn(): Promise<void> {
    if (this.certificateTemplateSettingsColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "certificateTemplateSettings" jsonb',
    );
    this.certificateTemplateSettingsColumnChecked = true;
  }

  private sanitizeCertificateTemplateSettings(
    input: unknown,
    existing?: CertificateTemplateSettings | null,
  ): CertificateTemplateSettings {
    const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
    const prev = existing || {};
    const prevLogos = Array.isArray(prev.logoUrls) ? [...prev.logoUrls] : [];
    const logoUrls: string[] = [];
    for (let i = 0; i < CERTIFICATE_TEMPLATE_LOGOS_MAX; i += 1) {
      const raw =
        Array.isArray(source.logoUrls) && source.logoUrls[i] != null
          ? source.logoUrls[i]
          : prevLogos[i];
      logoUrls.push(this.toStoredUploadPath(raw) || this.cleanText(raw, 500));
    }
    const signatureRaw =
      source.signatureUrl !== undefined ? source.signatureUrl : prev.signatureUrl;
    const cpeRaw = this.cleanText(source.cpeSectionLabel ?? prev.cpeSectionLabel, 120);
    const cpeSectionLabel =
      !cpeRaw || cpeRaw === 'Total CPE Hours and Pillar:'
        ? DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.cpeSectionLabel
        : cpeRaw;
    return {
      titleLine1:
        this.cleanText(source.titleLine1 ?? prev.titleLine1, 80) ||
        DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.titleLine1,
      titleLine2Left:
        this.cleanText(source.titleLine2Left ?? prev.titleLine2Left, 40) ||
        DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.titleLine2Left,
      titleLine2Right: (() => {
        const raw = this.cleanText(source.titleLine2Right ?? prev.titleLine2Right, 80);
        if (!raw || raw === 'ATTENDANCE') {
          return DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.titleLine2Right;
        }
        return raw;
      })(),
      awardedToLabel:
        this.cleanText(source.awardedToLabel ?? prev.awardedToLabel, 120) ||
        DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.awardedToLabel,
      sessionLabel:
        this.cleanText(source.sessionLabel ?? prev.sessionLabel, 120) ||
        DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.sessionLabel,
      cpeSectionLabel,
      signatoryName:
        this.cleanText(source.signatoryName ?? prev.signatoryName, 120) ||
        DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.signatoryName,
      signatoryTitle:
        this.cleanText(source.signatoryTitle ?? prev.signatoryTitle, 120) ||
        DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.signatoryTitle,
      issuerName:
        this.cleanText(source.issuerName ?? prev.issuerName, 120) ||
        DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.issuerName,
      transcriptTitle:
        this.cleanText(source.transcriptTitle ?? prev.transcriptTitle, 160) ||
        DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.transcriptTitle,
      logoUrls,
      signatureUrl:
        signatureRaw == null || signatureRaw === ''
          ? null
          : this.toStoredUploadPath(signatureRaw) || this.cleanText(signatureRaw, 500) || null,
    };
  }

  async getCertificateTemplateSettings(): Promise<CertificateTemplateSettings> {
    await this.ensureCertificateTemplateSettingsColumn();
    const settings = await this.getSettings();
    return this.sanitizeCertificateTemplateSettings(
      settings.certificateTemplateSettings || {},
      settings.certificateTemplateSettings,
    );
  }

  async getCertificateTemplateForPdf(): Promise<CertificateTemplateSettings> {
    return this.getCertificateTemplateSettings();
  }

  async updateCertificateTemplateSettings(payload: unknown): Promise<{
    message: string;
    settings: AppSettingsEntity;
    certificateTemplateSettings: CertificateTemplateSettings;
  }> {
    await this.ensureCertificateTemplateSettingsColumn();
    const settings = await this.getSettings();
    const sanitized = this.sanitizeCertificateTemplateSettings(
      payload,
      settings.certificateTemplateSettings,
    );
    settings.certificateTemplateSettings = sanitized;
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Certificate template settings updated successfully',
      settings: saved,
      certificateTemplateSettings: sanitized,
    };
  }

  async uploadCertificateTemplateLogo(
    index: number,
    file: Express.Multer.File,
  ): Promise<{ message: string; settings: AppSettingsEntity; certificateTemplateSettings: CertificateTemplateSettings }> {
    await this.ensureCertificateTemplateSettingsColumn();
    const settings = await this.getSettings();
    const slot = Math.max(0, Math.min(Math.floor(index), CERTIFICATE_TEMPLATE_LOGOS_MAX - 1));
    const folder = `certificate-template/logos/${slot}`;
    await this.localStorageService.clearFolder(folder);
    const relativeUrl = await this.localStorageService.saveFile(file, folder, {
      fileName: 'logo',
    });
    const existing = this.sanitizeCertificateTemplateSettings(
      settings.certificateTemplateSettings || {},
      settings.certificateTemplateSettings,
    );
    const logoUrls = [...(existing.logoUrls || ['', '', ''])];
    while (logoUrls.length < CERTIFICATE_TEMPLATE_LOGOS_MAX) logoUrls.push('');
    logoUrls[slot] = relativeUrl;
    settings.certificateTemplateSettings = { ...existing, logoUrls };
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Certificate logo uploaded successfully',
      settings: saved,
      certificateTemplateSettings: settings.certificateTemplateSettings,
    };
  }

  async removeCertificateTemplateLogo(
    index: number,
  ): Promise<{ message: string; settings: AppSettingsEntity; certificateTemplateSettings: CertificateTemplateSettings }> {
    await this.ensureCertificateTemplateSettingsColumn();
    const settings = await this.getSettings();
    const slot = Math.max(0, Math.min(Math.floor(index), CERTIFICATE_TEMPLATE_LOGOS_MAX - 1));
    await this.localStorageService.clearFolder(`certificate-template/logos/${slot}`);
    const existing = this.sanitizeCertificateTemplateSettings(
      settings.certificateTemplateSettings || {},
      settings.certificateTemplateSettings,
    );
    const logoUrls = [...(existing.logoUrls || ['', '', ''])];
    while (logoUrls.length < CERTIFICATE_TEMPLATE_LOGOS_MAX) logoUrls.push('');
    logoUrls[slot] = '';
    settings.certificateTemplateSettings = { ...existing, logoUrls };
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Certificate logo removed successfully',
      settings: saved,
      certificateTemplateSettings: settings.certificateTemplateSettings,
    };
  }

  async uploadCertificateTemplateSignature(
    file: Express.Multer.File,
  ): Promise<{ message: string; settings: AppSettingsEntity; certificateTemplateSettings: CertificateTemplateSettings }> {
    await this.ensureCertificateTemplateSettingsColumn();
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('certificate-template/signature');
    const relativeUrl = await this.localStorageService.saveFile(file, 'certificate-template/signature', {
      fileName: 'signature',
    });
    const existing = this.sanitizeCertificateTemplateSettings(
      settings.certificateTemplateSettings || {},
      settings.certificateTemplateSettings,
    );
    settings.certificateTemplateSettings = { ...existing, signatureUrl: relativeUrl };
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Certificate signature uploaded successfully',
      settings: saved,
      certificateTemplateSettings: settings.certificateTemplateSettings,
    };
  }

  async removeCertificateTemplateSignature(): Promise<{
    message: string;
    settings: AppSettingsEntity;
    certificateTemplateSettings: CertificateTemplateSettings;
  }> {
    await this.ensureCertificateTemplateSettingsColumn();
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('certificate-template/signature');
    const existing = this.sanitizeCertificateTemplateSettings(
      settings.certificateTemplateSettings || {},
      settings.certificateTemplateSettings,
    );
    settings.certificateTemplateSettings = { ...existing, signatureUrl: null };
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Certificate signature removed successfully',
      settings: saved,
      certificateTemplateSettings: settings.certificateTemplateSettings,
    };
  }

  private async ensureMembershipPaymentSettingsColumn(): Promise<void> {
    if (this.membershipPaymentSettingsColumnChecked) return;
    await this.appSettingsRepository.query(
      'ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "membershipPaymentSettings" jsonb'
    );
    this.membershipPaymentSettingsColumnChecked = true;
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
    await this.ensureHomeEnrolOptionsColumn();
    await this.ensureHomeEligibilityMembershipColumn();
    await this.ensureHomeCeoLaunchColumn();
    await this.ensurePartnerWithIscaColumn();
    await this.ensureFooterColumn();
    await this.ensureLearningAdvertiseTabColumn();
    await this.ensureInternationalLandingColumn();
    await this.ensureMembershipPaymentSettingsColumn();

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

  async uploadDigitalBadgeImage(file: Express.Multer.File): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('digital-badge');

    const relativeUrl = await this.localStorageService.saveFile(file, 'digital-badge', {
      fileName: 'digital-badge',
    });

    settings.digitalBadgeImageUrl = relativeUrl;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Digital badge image uploaded successfully',
      settings: saved,
    };
  }

  async removeDigitalBadgeImage(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('digital-badge');

    settings.digitalBadgeImageUrl = null;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Digital badge image removed successfully',
      settings: saved,
    };
  }

  async updateDigitalBadgeSettings(payload: {
    issuer?: unknown;
  }): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const issuer = this.cleanText(payload?.issuer, 120);
    settings.digitalBadgeIssuer = issuer || null;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Digital badge settings updated successfully',
      settings: saved,
    };
  }

  async updateCredentialVisibilitySettings(payload: {
    hideAllCertificates?: unknown;
    hideAllBadges?: unknown;
  }): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    if (payload?.hideAllCertificates !== undefined) {
      settings.hideAllCertificates = Boolean(payload.hideAllCertificates);
    }
    if (payload?.hideAllBadges !== undefined) {
      settings.hideAllBadges = Boolean(payload.hideAllBadges);
    }
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Credential visibility settings updated successfully',
      settings: saved,
    };
  }

  async getCredentialVisibilitySettings(): Promise<{
    hideAllCertificates: boolean;
    hideAllBadges: boolean;
  }> {
    const settings = await this.getSettings();
    return {
      hideAllCertificates: Boolean(settings.hideAllCertificates),
      hideAllBadges: Boolean(settings.hideAllBadges),
    };
  }

  async updateWelcomeEmailSettings(payload: {
    userWelcomeEmailEnabled?: unknown;
    corporateWelcomeEmailEnabled?: unknown;
    userWelcomeEmailContent?: unknown;
    corporateWelcomeEmailContent?: unknown;
  }): Promise<{
    message: string;
    data: {
      userWelcomeEmailEnabled: boolean;
      corporateWelcomeEmailEnabled: boolean;
      userWelcomeEmailContent: WelcomeEmailContent;
      corporateWelcomeEmailContent: WelcomeEmailContent;
    };
  }> {
    const settings = await this.getSettings();
    if (payload?.userWelcomeEmailEnabled !== undefined) {
      settings.userWelcomeEmailEnabled = Boolean(payload.userWelcomeEmailEnabled);
    }
    if (payload?.corporateWelcomeEmailEnabled !== undefined) {
      settings.corporateWelcomeEmailEnabled = Boolean(payload.corporateWelcomeEmailEnabled);
    }
    if (payload?.userWelcomeEmailContent !== undefined) {
      settings.userWelcomeEmailContent = this.sanitizeWelcomeEmailContent(
        payload.userWelcomeEmailContent,
        DEFAULT_USER_WELCOME_EMAIL_CONTENT,
      );
    }
    if (payload?.corporateWelcomeEmailContent !== undefined) {
      settings.corporateWelcomeEmailContent = this.sanitizeWelcomeEmailContent(
        payload.corporateWelcomeEmailContent,
        DEFAULT_CORPORATE_WELCOME_EMAIL_CONTENT,
      );
    }
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Welcome email settings updated successfully',
      data: {
        userWelcomeEmailEnabled: saved.userWelcomeEmailEnabled !== false,
        corporateWelcomeEmailEnabled: saved.corporateWelcomeEmailEnabled !== false,
        userWelcomeEmailContent: this.resolveWelcomeEmailContent(
          saved.userWelcomeEmailContent,
          DEFAULT_USER_WELCOME_EMAIL_CONTENT,
        ),
        corporateWelcomeEmailContent: this.resolveWelcomeEmailContent(
          saved.corporateWelcomeEmailContent,
          DEFAULT_CORPORATE_WELCOME_EMAIL_CONTENT,
        ),
      },
    };
  }

  async getWelcomeEmailSettings(): Promise<{
    userWelcomeEmailEnabled: boolean;
    corporateWelcomeEmailEnabled: boolean;
    userWelcomeEmailContent: WelcomeEmailContent;
    corporateWelcomeEmailContent: WelcomeEmailContent;
    defaults: {
      userWelcomeEmailContent: Required<WelcomeEmailContent>;
      corporateWelcomeEmailContent: Required<WelcomeEmailContent>;
    };
  }> {
    const settings = await this.getSettings();
    return {
      // Default ON when column is missing/null so existing behaviour is preserved.
      userWelcomeEmailEnabled: settings.userWelcomeEmailEnabled !== false,
      corporateWelcomeEmailEnabled: settings.corporateWelcomeEmailEnabled !== false,
      userWelcomeEmailContent: this.resolveWelcomeEmailContent(
        settings.userWelcomeEmailContent,
        DEFAULT_USER_WELCOME_EMAIL_CONTENT,
      ),
      corporateWelcomeEmailContent: this.resolveWelcomeEmailContent(
        settings.corporateWelcomeEmailContent,
        DEFAULT_CORPORATE_WELCOME_EMAIL_CONTENT,
      ),
      defaults: {
        userWelcomeEmailContent: { ...DEFAULT_USER_WELCOME_EMAIL_CONTENT },
        corporateWelcomeEmailContent: { ...DEFAULT_CORPORATE_WELCOME_EMAIL_CONTENT },
      },
    };
  }

  async previewWelcomeEmail(payload: {
    type?: unknown;
    content?: unknown;
  }): Promise<{ type: 'user' | 'corporate'; subject: string; html: string }> {
    const type = String(payload?.type || 'user').toLowerCase() === 'corporate' ? 'corporate' : 'user';
    const defaults =
      type === 'corporate'
        ? DEFAULT_CORPORATE_WELCOME_EMAIL_CONTENT
        : DEFAULT_USER_WELCOME_EMAIL_CONTENT;
    const saved = await this.getWelcomeEmailSettings();
    const baseContent =
      type === 'corporate'
        ? saved.corporateWelcomeEmailContent
        : saved.userWelcomeEmailContent;
    const content = this.resolveWelcomeEmailContent(
      payload?.content !== undefined ? payload.content : baseContent,
      defaults,
    );

    const sampleName = 'Alex Tan';
    const sampleEmail = type === 'corporate' ? 'hr@example.com' : 'learner@example.com';
    const sampleCompany = 'Acme Pte Ltd';
    const fill = (value: string) =>
      String(value || '')
        .replace(/\{\{\s*name\s*\}\}/gi, sampleName)
        .replace(/\{\{\s*email\s*\}\}/gi, sampleEmail)
        .replace(/\{\{\s*companyName\s*\}\}/gi, sampleCompany);

    const frontendBase = String(process.env.FRONTEND_URL || 'http://localhost:3000')
      .trim()
      .replace(/^https:\/\/(localhost|127\.0\.0\.1)/, 'http://$1');
    const resolveCtaUrl = (raw: string) => {
      const url = String(raw || '').trim();
      if (!url) return '';
      if (/^(https?:|mailto:)/i.test(url)) return url;
      return `${frontendBase}${url.startsWith('/') ? url : `/${url}`}`;
    };
    const ctaLabel = fill(content.ctaLabel || '').trim();
    const ctaUrl = resolveCtaUrl(fill(content.ctaUrl || ''));
    const showCta = Boolean(content.showCta) && Boolean(ctaLabel) && Boolean(ctaUrl);

    const { buildBrandTemplate, buildCorporateRegistrationWelcomeBodyHtml, buildUserRegistrationWelcomeBodyHtml } =
      await import('../service/email-template.util');

    const bodyHtml =
      type === 'corporate'
        ? buildCorporateRegistrationWelcomeBodyHtml({
            bodyText: fill(content.bodyText || ''),
            showAccountDetails: Boolean(content.showAccountDetails),
            accountDetailsTitle: fill(content.accountDetailsTitle || ''),
            accountDetailsHtml: fill(content.accountDetailsHtml || ''),
          })
        : buildUserRegistrationWelcomeBodyHtml({
            bodyText: fill(content.bodyText || ''),
            showAccountDetails: Boolean(content.showAccountDetails),
            accountDetailsTitle: fill(content.accountDetailsTitle || ''),
            accountDetailsHtml: fill(content.accountDetailsHtml || ''),
          });

    const html = buildBrandTemplate(frontendBase, {
      heading: fill(content.heading || ''),
      greetingName: sampleName,
      intro: fill(content.intro || ''),
      bodyHtml,
      ctaLabel: showCta ? ctaLabel : undefined,
      ctaUrl: showCta ? ctaUrl : undefined,
      ctaAlign: content.ctaAlign || 'center',
      note: fill(content.note || ''),
      footer: fill(content.footer || ''),
    });

    return {
      type,
      subject: fill(content.subject || ''),
      html,
    };
  }

  private sanitizeWelcomeEmailContent(
    value: unknown,
    defaults: Required<WelcomeEmailContent>,
  ): WelcomeEmailContent {
    const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    const plain = (raw: unknown, fallback: string, max: number): string => {
      if (typeof raw === 'string') return this.cleanText(raw, max);
      return fallback;
    };
    const html = (raw: unknown, fallback: string, max: number): string => {
      if (typeof raw === 'string') return String(raw).trim().slice(0, max);
      return fallback;
    };

    let accountDetailsHtml = defaults.accountDetailsHtml;
    if (typeof source.accountDetailsHtml === 'string') {
      accountDetailsHtml = String(source.accountDetailsHtml).trim().slice(0, 8000);
    } else if (typeof source.detailsNote === 'string' && String(source.detailsNote).trim()) {
      accountDetailsHtml = String(source.detailsNote).trim().slice(0, 8000);
    }

    return {
      subject: plain(source.subject, defaults.subject, 200) || defaults.subject,
      heading: plain(source.heading, defaults.heading, 160) || defaults.heading,
      intro: html(source.intro, defaults.intro, 8000) || defaults.intro,
      bodyText: html(source.bodyText, defaults.bodyText, 8000),
      showAccountDetails:
        source.showAccountDetails !== undefined
          ? Boolean(source.showAccountDetails)
          : Boolean(defaults.showAccountDetails),
      accountDetailsTitle: plain(
        source.accountDetailsTitle,
        defaults.accountDetailsTitle,
        120,
      ),
      accountDetailsHtml,
      detailsNote: '',
      showCta:
        source.showCta !== undefined ? Boolean(source.showCta) : Boolean(defaults.showCta),
      ctaLabel: plain(source.ctaLabel, defaults.ctaLabel, 80),
      ctaUrl: plain(source.ctaUrl, defaults.ctaUrl, 500),
      ctaAlign: this.normalizeCtaAlign(source.ctaAlign, defaults.ctaAlign),
      note: html(source.note, defaults.note, 4000),
      footer: plain(source.footer, defaults.footer, 200) || defaults.footer,
    };
  }

  private normalizeCtaAlign(
    value: unknown,
    fallback: 'left' | 'center' | 'right' = 'center',
  ): 'left' | 'center' | 'right' {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'left' || raw === 'center' || raw === 'right') return raw;
    return fallback;
  }

  private resolveWelcomeEmailContent(
    value: WelcomeEmailContent | null | undefined,
    defaults: Required<WelcomeEmailContent>,
  ): Required<WelcomeEmailContent> {
    const htmlOrDefault = (raw: unknown, fallback: string, max: number) => {
      if (raw === undefined || raw === null) return fallback;
      return String(raw).trim().slice(0, max);
    };
    const accountDetailsHtml = (() => {
      if (value?.accountDetailsHtml !== undefined && value?.accountDetailsHtml !== null) {
        return String(value.accountDetailsHtml).trim().slice(0, 8000);
      }
      if (value?.detailsNote) {
        return String(value.detailsNote).trim().slice(0, 8000);
      }
      return defaults.accountDetailsHtml;
    })();
    return {
      subject: this.cleanText(value?.subject, 200) || defaults.subject,
      heading: this.cleanText(value?.heading, 160) || defaults.heading,
      intro: htmlOrDefault(value?.intro, defaults.intro, 8000) || defaults.intro,
      bodyText: htmlOrDefault(value?.bodyText, defaults.bodyText, 8000),
      showAccountDetails:
        value?.showAccountDetails !== undefined
          ? Boolean(value.showAccountDetails)
          : Boolean(defaults.showAccountDetails),
      accountDetailsTitle:
        this.cleanText(value?.accountDetailsTitle, 120) || defaults.accountDetailsTitle,
      accountDetailsHtml: accountDetailsHtml || defaults.accountDetailsHtml,
      detailsNote: '',
      showCta: value?.showCta !== undefined ? Boolean(value.showCta) : Boolean(defaults.showCta),
      ctaLabel:
        value?.ctaLabel !== undefined
          ? this.cleanText(value.ctaLabel, 80)
          : defaults.ctaLabel,
      ctaUrl:
        value?.ctaUrl !== undefined ? this.cleanText(value.ctaUrl, 500) : defaults.ctaUrl,
      ctaAlign: this.normalizeCtaAlign(value?.ctaAlign, defaults.ctaAlign),
      note: htmlOrDefault(value?.note, defaults.note, 4000),
      footer: this.cleanText(value?.footer, 200) || defaults.footer,
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

  private sanitizeLearningAdvertiseTabContent(
    input: unknown
  ): LearningAdvertiseTabContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    return {
      name: this.cleanText(source.name, LEARNING_ADVERTISE_TAB_NAME_MAX_LENGTH),
      link: this.cleanText(source.link, LEARNING_ADVERTISE_TAB_LINK_MAX_LENGTH),
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

  private getDefaultMembershipPaymentSettings(): MembershipPaymentSettingsPayload {
    const baseAmount = 365.14;
    const verifiedBaseAmount = 300;
    const gstRatePercent = 9;
    const gstRate = gstRatePercent / 100;
    const gstAmount = Number((baseAmount * gstRate).toFixed(2));
    const verifiedGstAmount = Number((verifiedBaseAmount * gstRate).toFixed(2));

    return {
      currency: 'SGD',
      baseAmount,
      verifiedBaseAmount,
      gstRatePercent,
      voucherDiscountAmount: 100,
      promoAmountsByCountry: {},
      countryPricing: {},
      referralCode: '',
      referralLinkPath: '/auth/sign-up?membershipOutcome=paid-signup&ref=',
      gstAmount,
      totalAmount: Number((baseAmount + gstAmount).toFixed(2)),
      verifiedGstAmount,
      verifiedTotalAmount: Number((verifiedBaseAmount + verifiedGstAmount).toFixed(2)),
    };
  }

  private sanitizeMembershipPaymentSettings(
    input: unknown,
    existing?: MembershipPaymentSettingsPayload | null
  ): MembershipPaymentSettingsPayload {
    const defaults = this.getDefaultMembershipPaymentSettings();
    const source = input && typeof input === 'object' ? (input as any) : {};
    const prev = existing && typeof existing === 'object' ? existing : {};

    const cleanNumber = (value: unknown, fallback: number): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    };

    const currency =
      this.cleanText(source.currency ?? prev.currency, 10).toUpperCase() || defaults.currency!;
    const baseAmount = cleanNumber(source.baseAmount ?? prev.baseAmount, defaults.baseAmount!);
    const verifiedBaseAmount = cleanNumber(
      source.verifiedBaseAmount ?? prev.verifiedBaseAmount,
      defaults.verifiedBaseAmount!
    );
    const gstRatePercent = cleanNumber(
      source.gstRatePercent ?? prev.gstRatePercent,
      defaults.gstRatePercent!
    );
    const voucherDiscountAmount = cleanNumber(
      source.voucherDiscountAmount ?? prev.voucherDiscountAmount,
      defaults.voucherDiscountAmount!
    );
    const promoAmountsByCountry = sanitizePromoAmountsByCountry(
      source.promoAmountsByCountry ?? prev.promoAmountsByCountry,
    );
    const countryPricing = sanitizeCountryPricing(
      source.countryPricing ?? prev.countryPricing,
    );
    const syncedPromoAmounts = {
      ...promoAmountsByCountry,
      ...promoAmountsFromCountryPricing(countryPricing),
    };
    const referralCodeRaw = this.cleanText(
      source.referralCode ?? prev.referralCode,
      64,
    ).toUpperCase();
    const referralCode = /^[A-Z0-9_-]{2,64}$/.test(referralCodeRaw)
      ? referralCodeRaw
      : '';
    const referralLinkPathRaw =
      this.cleanText(source.referralLinkPath ?? prev.referralLinkPath, 200)
      || defaults.referralLinkPath!;
    // Prefer canonical auth signup referral path; keep leading slash.
    let referralLinkPath = referralLinkPathRaw.startsWith('/')
      ? referralLinkPathRaw
      : `/${referralLinkPathRaw}`;
    // Migrate legacy free-signup referral paths → paid membership signup.
    if (
      referralLinkPath === '/signup?ref=' ||
      referralLinkPath === '/auth/sign-up?ref='
    ) {
      referralLinkPath = defaults.referralLinkPath!;
    }

    const gstRate = gstRatePercent / 100;
    const gstAmount = Number((baseAmount * gstRate).toFixed(2));
    const totalAmount = Number((baseAmount + gstAmount).toFixed(2));
    const verifiedGstAmount = Number((verifiedBaseAmount * gstRate).toFixed(2));
    const verifiedTotalAmount = Number((verifiedBaseAmount + verifiedGstAmount).toFixed(2));

    return {
      currency,
      baseAmount,
      verifiedBaseAmount,
      gstRatePercent,
      voucherDiscountAmount,
      promoAmountsByCountry: syncedPromoAmounts,
      countryPricing,
      referralCode,
      referralLinkPath,
      gstAmount,
      totalAmount,
      verifiedGstAmount,
      verifiedTotalAmount,
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

  private sanitizeEnrolOptionAction(value: unknown): string {
    const action = String(value || '')
      .trim()
      .toLowerCase();
    if (action === 'isca' || action === 'eligibility' || action === 'register') {
      return action;
    }
    return 'eligibility';
  }

  private sanitizeEnrolOptionCard(row: any) {
    return {
      id: this.ensureTestimonialsItemId(row?.id),
      title: this.cleanText(row?.title, FUNDING_ELIGIBILITY_CARD_TITLE_MAX),
      description: this.cleanText(row?.description),
      ctaLabel: this.cleanText(row?.ctaLabel, ENROL_OPTIONS_CTA_MAX),
      icon: this.cleanText(row?.icon, FUNDING_ELIGIBILITY_ICON_MAX) || 'solar:user-rounded-bold-duotone',
      accentColor: this.sanitizeHexColor(row?.accentColor),
      action: this.sanitizeEnrolOptionAction(row?.action),
      href: this.cleanText(row?.href),
    };
  }

  private sanitizeHomeEnrolOptionsContent(input: unknown): HomeEnrolOptionsContentPayload {
    const source = input && typeof input === 'object' ? (input as any) : {};
    const rawCards = Array.isArray(source.cards) ? source.cards : [];
    return {
      heading: this.cleanText(source.heading, ENROL_OPTIONS_HEADING_MAX),
      subtitle: this.cleanText(source.subtitle, ENROL_OPTIONS_SUBTITLE_MAX),
      comparePrompt: this.cleanText(source.comparePrompt, ENROL_OPTIONS_COMPARE_MAX),
      compareLinkLabel: this.cleanText(source.compareLinkLabel, ENROL_OPTIONS_CTA_MAX),
      compareHref: this.cleanText(source.compareHref),
      cards: rawCards.slice(0, ENROL_OPTIONS_CARDS_MAX).map((row: any) => this.sanitizeEnrolOptionCard(row)),
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
    const mockupImageUrl =
      this.toStoredUploadPath(dashboard.mockupImageUrl) ||
      this.cleanText(dashboard.mockupImageUrl, 500);
    const howItWorks =
      source.howItWorks && typeof source.howItWorks === 'object' ? source.howItWorks : {};
    const faq = source.faq && typeof source.faq === 'object' ? source.faq : {};
    const cta = source.cta && typeof source.cta === 'object' ? source.cta : {};

    const rawStats = Array.isArray(source.stats) ? source.stats : [];
    const rawActions = Array.isArray(hero.actions) ? hero.actions : [];
    const rawBenefits = Array.isArray(benefits.items) ? benefits.items : [];
    const rawFeatures = Array.isArray(dashboard.features) ? dashboard.features : [];
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
        mockupImageUrl,
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

  private defaultInternationalLandingContent(): InternationalLandingContentPayload {
    return {
      hero: {
        eyebrow: 'AI Nexus International',
        titleLine1: 'AI Fluency.',
        titleLine2: 'Global Impact.',
        body:
          'Future-ready AI learning for accountancy and finance professionals — practical skills, recognized credentials, and career growth no matter where you practice.',
        heroImageUrl: null,
      },
      globalLearning: {
        title: 'A Global Learning Experience',
        points: [
          'Localized content in your language',
          'Relevant to your market and regulations',
          'Recognized credentials that travel with you',
          "Built by ISCA — Asia's trusted accountancy body",
        ],
        imageUrl: null,
        sideCard: {
          icon: 'solar:users-group-rounded-bold-duotone',
          title: 'For Professionals. By Professionals.',
          body: 'Join a global community of accountancy and finance professionals building AI fluency for real-world impact.',
        },
      },
      trustItems: [
        {
          icon: 'solar:diploma-linear',
          line1: 'Industry-Recognized',
          line2: 'Certificates',
          accent: '#002060',
        },
        {
          icon: 'solar:shield-check-linear',
          line1: 'Verifiable Digital',
          line2: 'Credentials',
          accent: '#C00000',
        },
        {
          icon: 'solar:clock-circle-linear',
          line1: 'Flexible Learning',
          line2: 'Anytime, Anywhere',
          accent: '#0f766e',
        },
        {
          icon: 'solar:medal-ribbons-star-linear',
          line1: 'CPE Hours',
          line2: 'Eligible',
          accent: '#185FA5',
        },
      ],
      footer: {
        tagline: 'Practical AI learning for accountancy and finance professionals worldwide.',
        copyrightText: '© {year} ISCA · AI Nexus International. All rights reserved.',
        social: [
          { icon: 'mdi:linkedin', href: '' },
          { icon: 'mdi:youtube', href: '' },
          { icon: 'solar:letter-bold', href: '' },
        ],
        columns: [
          {
            title: 'Platform',
            links: [
              { label: 'AI Fluency', href: '/dashboard' },
              { label: 'Register', href: '/auth/sign-up' },
              { label: 'Sign in', href: '/auth/sign-in' },
              { label: 'FAQ', href: '' },
              { label: 'Sustainability Qualifications', href: '' },
              { label: 'Accountify', href: '' },
              { label: 'Boardflix', href: '' },
            ],
          },
          {
            title: 'Resources',
            links: [
              { label: 'About', href: '' },
              { label: 'FAQs', href: '' },
              { label: 'Help Centre', href: '' },
              { label: 'Contact Us', href: '' },
            ],
          },
          {
            title: 'Legal',
            links: [
              { label: 'Terms of Use', href: '' },
              { label: 'Privacy Policy', href: '' },
              { label: 'Cookie Policy', href: '' },
            ],
          },
        ],
      },
    };
  }

  private sanitizeInternationalLandingContent(
    input: unknown
  ): InternationalLandingContentPayload {
    const defaults = this.defaultInternationalLandingContent();
    const source = input && typeof input === 'object' ? (input as any) : {};
    const heroSrc = source.hero && typeof source.hero === 'object' ? source.hero : {};
    const globalSrc =
      source.globalLearning && typeof source.globalLearning === 'object'
        ? source.globalLearning
        : {};
    const sideSrc =
      globalSrc.sideCard && typeof globalSrc.sideCard === 'object' ? globalSrc.sideCard : {};
    const footerSrc = source.footer && typeof source.footer === 'object' ? source.footer : {};
    const rawPoints = Array.isArray(globalSrc.points)
      ? globalSrc.points
      : defaults.globalLearning?.points || [];
    const rawTrust = Array.isArray(source.trustItems)
      ? source.trustItems
      : defaults.trustItems || [];
    const rawSocial = Array.isArray(footerSrc.social)
      ? footerSrc.social
      : defaults.footer?.social || [];
    const rawColumns = Array.isArray(footerSrc.columns)
      ? footerSrc.columns
      : defaults.footer?.columns || [];

    return {
      hero: {
        eyebrow:
          this.cleanText(heroSrc.eyebrow, 80) ||
          this.cleanText(defaults.hero?.eyebrow, 80),
        titleLine1:
          this.cleanText(heroSrc.titleLine1, 80) ||
          this.cleanText(defaults.hero?.titleLine1, 80),
        titleLine2:
          this.cleanText(heroSrc.titleLine2, 80) ||
          this.cleanText(defaults.hero?.titleLine2, 80),
        body:
          this.cleanText(heroSrc.body, 500) || this.cleanText(defaults.hero?.body, 500),
        heroImageUrl: this.cleanText(heroSrc.heroImageUrl, 500) || null,
      },
      globalLearning: {
        title:
          this.cleanText(globalSrc.title, 120) ||
          this.cleanText(defaults.globalLearning?.title, 120),
        points: (rawPoints.length ? rawPoints : defaults.globalLearning?.points || [])
          .slice(0, INTL_LANDING_POINTS_MAX)
          .map((p: unknown) => this.cleanText(p, 200))
          .filter(Boolean),
        imageUrl: this.cleanText(globalSrc.imageUrl, 500) || null,
        sideCard: {
          icon:
            this.cleanText(sideSrc.icon, 120) ||
            this.cleanText(defaults.globalLearning?.sideCard?.icon, 120),
          title:
            this.cleanText(sideSrc.title, 120) ||
            this.cleanText(defaults.globalLearning?.sideCard?.title, 120),
          body:
            this.cleanText(sideSrc.body, 400) ||
            this.cleanText(defaults.globalLearning?.sideCard?.body, 400),
        },
      },
      trustItems: (() => {
        const rows = (rawTrust.length ? rawTrust : defaults.trustItems || [])
          .slice(0, INTL_LANDING_TRUST_MAX)
          .map((item: any, index: number) => {
            const row = item && typeof item === 'object' ? item : {};
            const fallback =
              defaults.trustItems?.[index] || defaults.trustItems?.[0] || {};
            return {
              icon: this.cleanText(row?.icon, 120) || this.cleanText(fallback?.icon, 120),
              line1: this.cleanText(row?.line1, 80) || this.cleanText(fallback?.line1, 80),
              line2: this.cleanText(row?.line2, 80) || this.cleanText(fallback?.line2, 80),
              accent:
                this.sanitizeHexColor(row?.accent) ||
                this.sanitizeHexColor(fallback?.accent) ||
                '#002060',
            };
          })
          .filter((row: { line1: string; line2: string; icon: string }) =>
            Boolean(row.icon || row.line1 || row.line2)
          );
        return rows.length >= INTL_LANDING_TRUST_MIN
          ? rows
          : (defaults.trustItems || []).slice(0, INTL_LANDING_TRUST_MAX);
      })(),
      footer: {
        tagline:
          this.cleanText(footerSrc.tagline, 240) ||
          this.cleanText(defaults.footer?.tagline, 240),
        copyrightText:
          this.cleanText(footerSrc.copyrightText, 200) ||
          this.cleanText(defaults.footer?.copyrightText, 200),
        social: (rawSocial.length ? rawSocial : defaults.footer?.social || [])
          .slice(0, INTL_LANDING_SOCIAL_MAX)
          .map((item: any) => ({
            icon: this.cleanText(item?.icon, 120),
            href: this.cleanText(item?.href, 500),
          }))
          .filter((item: { icon: string }) => Boolean(item.icon)),
        columns: (rawColumns.length ? rawColumns : defaults.footer?.columns || [])
          .slice(0, INTL_LANDING_FOOTER_COLS_MAX)
          .map((col: any, colIndex: number) => {
            const fallbackCol = defaults.footer?.columns?.[colIndex] || { title: '', links: [] };
            const links = Array.isArray(col?.links) ? col.links : fallbackCol.links || [];
            return {
              title:
                this.cleanText(col?.title, 60) || this.cleanText(fallbackCol.title, 60),
              links: links
                .slice(0, INTL_LANDING_FOOTER_LINKS_MAX)
                .map((link: any) => ({
                  label: this.cleanText(link?.label, 80),
                  href: this.cleanText(link?.href, 500),
                }))
                .filter((link: { label: string }) => Boolean(link.label)),
            };
          })
          .filter((col: { title: string }) => Boolean(col.title)),
      },
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

  async getMembershipPaymentSettings(): Promise<MembershipPaymentSettingsPayload & {
    websiteBaseUrl: string;
    exampleReferralLink: string;
    fullReferralLink: string;
    promoCountries: ReturnType<typeof listPromoCountriesWithAmounts>;
    countryPricingList: ReturnType<typeof listCountryPricing>;
  }> {
    const settings = await this.getSettings();
    const payment = settings.membershipPaymentSettings
      ? this.sanitizeMembershipPaymentSettings(
          settings.membershipPaymentSettings,
          settings.membershipPaymentSettings
        )
      : this.getDefaultMembershipPaymentSettings();

    const websiteBaseUrl = this.getPublicWebsiteBaseUrl();
    const path = String(
      payment.referralLinkPath || '/auth/sign-up?membershipOutcome=paid-signup&ref=',
    );
    const savedCode = String(payment.referralCode || '').trim().toUpperCase();
    const fullReferralLink = savedCode ? `${websiteBaseUrl}${path}${savedCode}` : '';
    const exampleReferralLink = fullReferralLink || `${websiteBaseUrl}${path}SP001`;

    return {
      ...payment,
      promoCountries: listPromoCountriesWithAmounts(payment.promoAmountsByCountry),
      countryPricingList: listCountryPricing(
        payment.countryPricing,
        payment.promoAmountsByCountry,
      ),
      websiteBaseUrl,
      exampleReferralLink,
      fullReferralLink,
    };
  }

  /** Public website origin from FRONTEND_URL (production/staging), used for referral links. */
  private getPublicWebsiteBaseUrl(): string {
    const raw = String(process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
    return raw || 'http://localhost:3000';
  }

  async updateMembershipPaymentSettings(
    payload: MembershipPaymentSettingsPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    const next = this.sanitizeMembershipPaymentSettings(
      payload,
      settings.membershipPaymentSettings
    );
    const persisted = JSON.parse(JSON.stringify(next)) as MembershipPaymentSettingsPayload;
    await this.appSettingsRepository.update(
      { id: settings.id },
      { membershipPaymentSettings: persisted },
    );
    const saved = await this.getSettings();
    return {
      message: 'Membership payment settings updated successfully',
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

  async updateHomeEnrolOptionsContent(
    payload: HomeEnrolOptionsContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.homeEnrolOptionsContent = this.sanitizeHomeEnrolOptionsContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Home enrol options content updated successfully',
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

  async updateLearningAdvertiseTabContent(
    payload: LearningAdvertiseTabContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.learningAdvertiseTabContent = this.sanitizeLearningAdvertiseTabContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Learning advertise tab updated successfully',
      settings: saved,
    };
  }

  async updateInternationalLandingContent(
    payload: InternationalLandingContentPayload
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    settings.internationalLandingContent = this.sanitizeInternationalLandingContent(payload);
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'International landing content updated successfully',
      settings: saved,
    };
  }

  async uploadInternationalLandingHeroImage(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('international-landing-hero');
    const relativeUrl = await this.localStorageService.saveFile(file, 'international-landing-hero', {
      fileName: 'hero',
    });
    const existing = this.sanitizeInternationalLandingContent(
      settings.internationalLandingContent || {}
    );
    settings.internationalLandingContent = this.sanitizeInternationalLandingContent({
      ...existing,
      hero: {
        ...existing.hero,
        heroImageUrl: relativeUrl,
      },
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'International landing hero image uploaded successfully',
      settings: saved,
    };
  }

  async removeInternationalLandingHeroImage(): Promise<{
    message: string;
    settings: AppSettingsEntity;
  }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('international-landing-hero');
    const existing = this.sanitizeInternationalLandingContent(
      settings.internationalLandingContent || {}
    );
    settings.internationalLandingContent = this.sanitizeInternationalLandingContent({
      ...existing,
      hero: {
        ...existing.hero,
        heroImageUrl: '',
      },
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'International landing hero image removed successfully',
      settings: saved,
    };
  }

  async uploadInternationalLandingGlobalImage(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('international-landing-global');
    const relativeUrl = await this.localStorageService.saveFile(
      file,
      'international-landing-global',
      {
        fileName: 'global-learning',
      }
    );
    const existing = this.sanitizeInternationalLandingContent(
      settings.internationalLandingContent || {}
    );
    settings.internationalLandingContent = this.sanitizeInternationalLandingContent({
      ...existing,
      globalLearning: {
        ...existing.globalLearning,
        imageUrl: relativeUrl,
      },
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'International global learning image uploaded successfully',
      settings: saved,
    };
  }

  async removeInternationalLandingGlobalImage(): Promise<{
    message: string;
    settings: AppSettingsEntity;
  }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('international-landing-global');
    const existing = this.sanitizeInternationalLandingContent(
      settings.internationalLandingContent || {}
    );
    settings.internationalLandingContent = this.sanitizeInternationalLandingContent({
      ...existing,
      globalLearning: {
        ...existing.globalLearning,
        imageUrl: '',
      },
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'International global learning image removed successfully',
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

  async uploadPartnerWithIscaMockupImage(
    file: Express.Multer.File
  ): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('partner-with-isca-mockup');
    const relativeUrl = await this.localStorageService.saveFile(file, 'partner-with-isca-mockup', {
      fileName: 'mockup',
    });
    const existing = this.sanitizePartnerWithIscaContent(settings.partnerWithIscaContent || {});
    settings.partnerWithIscaContent = this.sanitizePartnerWithIscaContent({
      ...existing,
      dashboard: {
        ...existing.dashboard,
        mockupImageUrl: relativeUrl,
      },
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Partner with ISCA dashboard mockup image uploaded successfully',
      settings: saved,
    };
  }

  async removePartnerWithIscaMockupImage(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();
    await this.localStorageService.clearFolder('partner-with-isca-mockup');
    const existing = this.sanitizePartnerWithIscaContent(settings.partnerWithIscaContent || {});
    settings.partnerWithIscaContent = this.sanitizePartnerWithIscaContent({
      ...existing,
      dashboard: {
        ...existing.dashboard,
        mockupImageUrl: '',
      },
    });
    const saved = await this.appSettingsRepository.save(settings);
    return {
      message: 'Partner with ISCA dashboard mockup image removed successfully',
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
    digitalBadgeImageUrl: string | null;
    digitalBadgeIssuer: string | null;
    hideAllCertificates: boolean;
    hideAllBadges: boolean;
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
    homeEnrolOptionsContent: HomeEnrolOptionsContentPayload | null;
    homeEligibilityMembershipContent: HomeEligibilityMembershipContentPayload | null;
    homeCeoLaunchContent: HomeCeoLaunchContentPayload | null;
    partnerWithIscaContent: PartnerWithIscaContentPayload | null;
    footerContent: FooterContentPayload | null;
    learningAdvertiseTabContent: LearningAdvertiseTabContentPayload | null;
    internationalLandingContent: InternationalLandingContentPayload | null;
    membershipPaymentSettings: MembershipPaymentSettingsPayload;
    /** Active learner accounts on the platform (non-draft, non-admin). */
    totalCourseEnrollments: number;
  }> {
    const settings = await this.getSettings();
    const totalCourseEnrollments = await this.userRepository.count({
      where: {
        status: UserStatus.Active,
        isDraft: false,
        role: UserRole.User,
      },
    });

    return {
      logoUrl: settings.logoUrl ?? null,
      homeHeroImageUrl: settings.homeHeroImageUrl ?? null,
      homeHeroContent: settings.homeHeroContent ?? null,
      homeCardsContent: settings.homeCardsContent ?? null,
      homeJoinContent: settings.homeJoinContent ?? null,
      contactHeroImageUrl: settings.contactHeroImageUrl ?? null,
      courseDefaultImageUrl: settings.courseDefaultImageUrl ?? null,
      digitalBadgeImageUrl: settings.digitalBadgeImageUrl ?? null,
      digitalBadgeIssuer: settings.digitalBadgeIssuer ?? null,
      hideAllCertificates: Boolean(settings.hideAllCertificates),
      hideAllBadges: Boolean(settings.hideAllBadges),
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
      homeEnrolOptionsContent: settings.homeEnrolOptionsContent
        ? this.sanitizeHomeEnrolOptionsContent(settings.homeEnrolOptionsContent)
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
      learningAdvertiseTabContent: settings.learningAdvertiseTabContent
        ? this.sanitizeLearningAdvertiseTabContent(settings.learningAdvertiseTabContent)
        : null,
      internationalLandingContent: this.sanitizeInternationalLandingContent(
        settings.internationalLandingContent || null
      ),
      membershipPaymentSettings: settings.membershipPaymentSettings
        ? this.sanitizeMembershipPaymentSettings(
            settings.membershipPaymentSettings,
            settings.membershipPaymentSettings
          )
        : this.getDefaultMembershipPaymentSettings(),
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
