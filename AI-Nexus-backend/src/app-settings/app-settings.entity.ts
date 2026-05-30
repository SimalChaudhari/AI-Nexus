import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type HomeHeroContent = {
  badge?: string;
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

  /** Home page CEO launch video section. */
  @Column({ type: 'jsonb', nullable: true })
  homeCeoLaunchContent?: HomeCeoLaunchContent | null;

  /** Persona -> recommended course IDs mapping, configurable by admin. */
  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'::jsonb" })
  personaCourseMappings?: Array<{ persona: string; courseIds: string[] }> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
