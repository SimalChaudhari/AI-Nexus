import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type HomeHeroContent = {
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
    /** Hex color for button background, e.g. #d4f938 */
    buttonColor?: string;
    /** Hex color for button label */
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
  /** Hero stats icon size in px */
  statIconSize?: number;
  stats?: Array<{ value?: string; label?: string; icon?: string }>;
};

export type HomeCardsContent = {
  heading?: string;
  headingAccent?: string;
  headingColor?: string;
  headingAccentColor?: string;
  subtitle?: string;
  cards?: Array<{ icon?: string; title?: string; description?: string }>;
};

export type HomeJoinContent = {
  heading?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaIcon?: string;
};

export type WorkflowTemplatesPitchContent = {
  heading?: string;
  features?: Array<{ iconUrl?: string; title?: string; description?: string }>;
};

export type FaqContent = {
  pageHeading?: string;
  items?: Array<{ question?: string; answer?: string }>;
};

export type CurriculumContent = {
  smallTitle?: string;
  subtext?: string;
  /** Selected learning categories shown on the home page. */
  categoryIds?: string[];
  /** Courses to include (within selected categories). When categoryIds is set, only these courses are shown. */
  courseIds?: string[];
};

export type ProgrammeFeesContent = {
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

export type HomeTestimonialsContent = {
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

export type HomeProgrammeStructureContent = {
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

export type HomeFundingEligibilityContent = {
  eyebrow?: string;
  heading?: string;
  items?: Array<{
    id?: string;
    icon?: string;
    title?: string;
    description?: string;
  }>;
};

export type HomeEnrolOptionsContent = {
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
    action?: 'isca' | 'eligibility' | 'register' | string;
    href?: string;
  }>;
};

export type HomeEligibilityMembershipContent = {
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

export type HomeCeoLaunchContent = {
  eyebrow?: string;
  heading?: string;
  subtitle?: string;
  posterImageUrl?: string;
  videoUrl?: string;
  videoFileUrl?: string;
  quote?: string;
  stats?: Array<{ value?: string; label?: string }>;
  ctaLabel?: string;
  ctaHref?: string;
};

export type HomeEmployerContent = {
  heading?: string;
  subtitle?: string;
  heroImageUrl?: string;
  benefits?: Array<{ icon?: string; title?: string }>;
  logos?: Array<{ name?: string; logoUrl?: string }>;
  partnersHeading?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type PartnerWithIscaContent = {
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

export type HomeEmployeeContent = {
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

export type ContactHeroContent = {
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

export type FooterContent = {
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

/** Fixed vertical promo tab on the Learning page (right edge). */
export type LearningAdvertiseTabContent = {
  name?: string;
  link?: string;
};

/** Editable copy for registration welcome emails (admin Settings). */
export type WelcomeEmailContent = {
  subject?: string;
  heading?: string;
  intro?: string;
  /** Optional paragraph above account details / CTA. */
  bodyText?: string;
  /** When true, show the account-details card. */
  showAccountDetails?: boolean;
  /** Card header title, e.g. Account details. */
  accountDetailsTitle?: string;
  /** Fully editable rich HTML inside the account-details card. Supports {{email}}, {{companyName}}. */
  accountDetailsHtml?: string;
  /** @deprecated Prefer accountDetailsHtml. Kept for older saved settings. */
  detailsNote?: string;
  /** Explicitly show/hide the CTA button. */
  showCta?: boolean;
  /** CTA button label. */
  ctaLabel?: string;
  /** CTA button URL/path. */
  ctaUrl?: string;
  /** CTA horizontal alignment. */
  ctaAlign?: 'left' | 'center' | 'right';
  note?: string;
  footer?: string;
};

/** AI Nexus International marketing landing (hero, global learning, trust, footer). */
export type InternationalLandingContent = {
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

export type CertificateTemplateSettings = {
  titleLine1?: string;
  titleLine2Left?: string;
  titleLine2Right?: string;
  awardedToLabel?: string;
  sessionLabel?: string;
  cpeSectionLabel?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  issuerName?: string;
  /** Header logos left → center → right (img2, img1, img3). Only the center slot is drawn. */
  logoUrls?: string[];
  signatureUrl?: string | null;
};

export type MembershipPaymentSettings = {
  currency?: string;
  baseAmount?: number;
  verifiedBaseAmount?: number;
  gstRatePercent?: number;
  voucherDiscountAmount?: number;
  /** Exact promo payable amount keyed by ISO country code (ASEAN + China). */
  promoAmountsByCountry?: Record<string, number>;
  /** Manual country pricing: basePrice, discountPrice, active, promoCode. */
  countryPricing?: Record<string, {
    basePrice: number | null;
    discountPrice: number | null;
    active: boolean;
    promoCode: string | null;
  }>;
  /** Active admin promo/referral code shown in admin + used in full signup link. */
  referralCode?: string;
  referralLinkPath?: string;
  gstAmount?: number;
  totalAmount?: number;
  verifiedGstAmount?: number;
  verifiedTotalAmount?: number;
};

@Entity('app_settings')
export class AppSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  logoUrl?: string | null;

  /** Public home page hero section background (uploaded asset path or null = use built-in default). */
  @Column({ type: 'varchar', nullable: true })
  homeHeroImageUrl?: string | null;

  /** Public home hero text/cta/stats content managed from admin panel. */
  @Column({ type: 'jsonb', nullable: true })
  homeHeroContent?: HomeHeroContent | null;

  /** Public home cards section content managed from admin panel. */
  @Column({ type: 'jsonb', nullable: true })
  homeCardsContent?: HomeCardsContent | null;

  /** Public home join section content managed from admin panel. */
  @Column({ type: 'jsonb', nullable: true })
  homeJoinContent?: HomeJoinContent | null;

  /** Public contact hero background (uploaded asset path or null = use built-in default). */
  @Column({ type: 'varchar', nullable: true })
  contactHeroImageUrl?: string | null;

  /** Default fallback image for course cards across public pages. */
  @Column({ type: 'varchar', nullable: true })
  courseDefaultImageUrl?: string | null;

  /** Digital badge artwork shown on learner My Badges (null = built-in static asset). */
  @Column({ type: 'varchar', nullable: true })
  digitalBadgeImageUrl?: string | null;

  /** Issuer label on digital badges (e.g. AI Nexus). */
  @Column({ type: 'varchar', nullable: true })
  digitalBadgeIssuer?: string | null;

  /** When true, learners cannot view/download any certificates platform-wide. */
  @Column({ type: 'boolean', default: false })
  hideAllCertificates!: boolean;

  /** When true, learners cannot view/share any digital badges platform-wide. */
  @Column({ type: 'boolean', default: false })
  hideAllBadges!: boolean;

  /** When true, send welcome email after individual learner registration. */
  @Column({ type: 'boolean', default: true })
  userWelcomeEmailEnabled!: boolean;

  /** When true, send welcome email after corporate/HR registration. */
  @Column({ type: 'boolean', default: true })
  corporateWelcomeEmailEnabled!: boolean;

  /** Editable learner registration welcome email copy. */
  @Column({ type: 'jsonb', nullable: true })
  userWelcomeEmailContent?: WelcomeEmailContent | null;

  /** Editable corporate registration welcome email copy. */
  @Column({ type: 'jsonb', nullable: true })
  corporateWelcomeEmailContent?: WelcomeEmailContent | null;

  /** Public contact hero text and map points managed from admin panel. */
  @Column({ type: 'jsonb', nullable: true })
  contactHeroContent?: ContactHeroContent | null;

  /** Public copy for the workflows / templates “Why use AI resources?” strip (3 columns). */
  @Column({ type: 'jsonb', nullable: true })
  workflowTemplatesPitchContent?: WorkflowTemplatesPitchContent | null;

  /** Public FAQs page content managed from admin panel. */
  @Column({ type: 'jsonb', nullable: true })
  faqContent?: FaqContent | null;

  /** Programme fees & funding block (home page + public). */
  @Column({ type: 'jsonb', nullable: true })
  programmeFeesContent?: ProgrammeFeesContent | null;

  /** Home page curriculum block (course modules list). */
  @Column({ type: 'jsonb', nullable: true })
  curriculumContent?: CurriculumContent | null;

  /** Home page testimonials and industry quotes section. */
  @Column({ type: 'jsonb', nullable: true })
  homeTestimonialsContent?: HomeTestimonialsContent | null;

  /** Home page employer section. */
  @Column({ type: 'jsonb', nullable: true })
  homeEmployerContent?: HomeEmployerContent | null;

  /** Home page employee / learners section (dark band with benefits & partner logos). */
  @Column({ type: 'jsonb', nullable: true })
  homeEmployeeContent?: HomeEmployeeContent | null;

  /** Home page programme structure timeline (learning journey phases). */
  @Column({ type: 'jsonb', nullable: true })
  homeProgrammeStructureContent?: HomeProgrammeStructureContent | null;

  /** Home page funding & eligibility card grid. */
  @Column({ type: 'jsonb', nullable: true })
  homeFundingEligibilityContent?: HomeFundingEligibilityContent | null;

  /** Home page dual-panel eligibility check + ISCA membership promo. */
  @Column({ type: 'jsonb', nullable: true })
  homeEligibilityMembershipContent?: HomeEligibilityMembershipContent | null;

  /** Home page “How would you like to enrol?” option cards under the hero. */
  @Column({ type: 'jsonb', nullable: true })
  homeEnrolOptionsContent?: HomeEnrolOptionsContent | null;

  /** Home page CEO launch video section. */
  @Column({ type: 'jsonb', nullable: true })
  homeCeoLaunchContent?: HomeCeoLaunchContent | null;

  /** Partner with ISCA employer landing page content. */
  @Column({ type: 'jsonb', nullable: true })
  partnerWithIscaContent?: PartnerWithIscaContent | null;

  /** Public site footer — stats band, links, and copyright. */
  @Column({ type: 'jsonb', nullable: true })
  footerContent?: FooterContent | null;

  /** Learning page fixed vertical advertise / promo tab (name + link). */
  @Column({ type: 'jsonb', nullable: true })
  learningAdvertiseTabContent?: LearningAdvertiseTabContent | null;

  /** International site landing page — hero, global learning, trust bar, footer. */
  @Column({ type: 'jsonb', nullable: true })
  internationalLandingContent?: InternationalLandingContent | null;

  /** Persona -> recommended course IDs mapping, configurable by admin. */
  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'::jsonb" })
  personaCourseMappings?: Array<{ persona: string; courseIds: string[] }> | null;

  /** Membership signup payment amounts, GST rate, and voucher/referral discounted pricing. */
  @Column({ type: 'jsonb', nullable: true })
  membershipPaymentSettings?: MembershipPaymentSettings | null;

  /** Certificate PDF template — title/body copy, signatory block, logos, signature. */
  @Column({ type: 'jsonb', nullable: true })
  certificateTemplateSettings?: CertificateTemplateSettings | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
