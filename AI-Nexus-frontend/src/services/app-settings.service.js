import axios from 'src/utils/axios';
import { normalizePartnerWithIscaContent } from 'src/sections/partner-with-isca/partner-with-isca-defaults';
import { CONFIG } from 'src/config-global';

const ASSET_BASE_URL = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');

function normalizeAssetUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function normalizeMaybeAssetIcon(value) {
  const raw = value != null ? String(value).trim() : '';
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads/') || raw.startsWith('uploads/')) return normalizeAssetUrl(raw);
  return raw;
}

function transformProgrammeFeesContent(source) {
  if (!source || typeof source !== 'object') return null;
  const rawTiers = Array.isArray(source.tiers) ? source.tiers : [];
  return {
    heading: source.heading != null ? String(source.heading) : '',
    tiers: rawTiers.slice(0, 8).map((tier) => ({
      title: tier?.title != null ? String(tier.title) : '',
      description: tier?.description != null ? String(tier.description) : '',
      linkLabel: tier?.linkLabel != null ? String(tier.linkLabel) : '',
      linkHref: tier?.linkHref != null ? String(tier.linkHref) : '',
      price: tier?.price != null ? String(tier.price) : '',
      priceNote: tier?.priceNote != null ? String(tier.priceNote) : '',
      priceVariant: tier?.priceVariant === 'default' ? 'default' : 'primary',
    })),
    fundingPartnersHeading:
      source.fundingPartnersHeading != null ? String(source.fundingPartnersHeading) : '',
    fundingPartnersBody: source.fundingPartnersBody != null ? String(source.fundingPartnersBody) : '',
    agency: {
      logoUrl: normalizeAssetUrl(source?.agency?.logoUrl || ''),
      name: source?.agency?.name != null ? String(source.agency.name) : '',
      tagline: source?.agency?.tagline != null ? String(source.agency.tagline) : '',
    },
  };
}

function transformCurriculumStored(source) {
  if (!source || typeof source !== 'object') {
    return null;
  }
  const rawCategoryIds = Array.isArray(source.categoryIds) ? source.categoryIds : [];
  const rawCourseIds = Array.isArray(source.courseIds)
    ? source.courseIds
    : source.courseId
      ? [source.courseId]
      : [];
  const categoryIds = rawCategoryIds.slice(0, 20).map((id) => String(id || '')).filter(Boolean);
  return {
    smallTitle: source.smallTitle != null ? String(source.smallTitle) : '',
    subtext: source.subtext != null ? String(source.subtext) : '',
    categoryIds,
    courseIds: rawCourseIds.slice(0, 100).map((id) => String(id || '')).filter(Boolean),
  };
}

function transformCurriculumContent(source) {
  if (!source || typeof source !== 'object') {
    return null;
  }
  const rawModules = Array.isArray(source.modules) ? source.modules : [];
  const rawCourses = Array.isArray(source.courses) ? source.courses : [];
  const rawCategories = Array.isArray(source.categories) ? source.categories : [];
  const rawCategoryIds = Array.isArray(source.categoryIds) ? source.categoryIds : [];
  const rawIds = Array.isArray(source.courseIds)
    ? source.courseIds
    : source.courseId
      ? [source.courseId]
      : [];
  return {
    smallTitle: source.smallTitle != null ? String(source.smallTitle) : '',
    subtext: source.subtext != null ? String(source.subtext) : '',
    categoryIds: rawCategoryIds.map((id) => String(id || '')).filter(Boolean),
    categories: rawCategories.map((category) => ({
      id: category?.id != null ? String(category.id) : '',
      title: category?.title != null ? String(category.title) : '',
      courseIds: Array.isArray(category?.courseIds)
        ? category.courseIds.map((id) => String(id || '')).filter(Boolean)
        : [],
      courses: Array.isArray(category?.courses)
        ? category.courses.map((course) => ({
            id: course?.id != null ? String(course.id) : '',
            title: course?.title != null ? String(course.title) : '',
            modulesCount: Number(course?.modulesCount) || 0,
            categoryId: course?.categoryId != null ? String(course.categoryId) : '',
          }))
        : [],
    })),
    courseIds: rawIds.map((id) => String(id || '')).filter(Boolean),
    courses: rawCourses.map((course) => ({
      id: course?.id != null ? String(course.id) : '',
      title: course?.title != null ? String(course.title) : '',
      modulesCount: Number(course?.modulesCount) || 0,
      categoryId: course?.categoryId != null ? String(course.categoryId) : '',
    })),
    headline: source.headline != null ? String(source.headline) : '',
    moduleCount: Number(source.moduleCount) || 0,
    modules: rawModules.map((row, index) => ({
      index: Number.isFinite(row?.index) ? Number(row.index) : index,
      title: row?.title != null ? String(row.title) : '',
      description: row?.description != null ? String(row.description) : '',
      courseId: row?.courseId != null ? String(row.courseId) : '',
    })),
  };
}

function transformTestimonialsContent(source) {
  if (!source || typeof source !== 'object') return null;
  const rawTestimonials = Array.isArray(source.testimonials) ? source.testimonials : [];
  const rawQuotes = Array.isArray(source.industryQuotes) ? source.industryQuotes : [];
  return {
    heading: source.heading != null ? String(source.heading) : '',
    subtitle: source.subtitle != null ? String(source.subtitle) : '',
    testimonials: rawTestimonials.slice(0, 12).map((row) => ({
      id: row?.id != null ? String(row.id) : '',
      quote: row?.quote != null ? String(row.quote) : '',
      name: row?.name != null ? String(row.name) : '',
      role: row?.role != null ? String(row.role) : '',
      avatarUrl: normalizeAssetUrl(row?.avatarUrl || ''),
      rating: row?.rating != null ? Number(row.rating) : 5,
    })),
    industryQuotes: rawQuotes.slice(0, 8).map((row) => ({
      id: row?.id != null ? String(row.id) : '',
      quote: row?.quote != null ? String(row.quote) : '',
      organisation: row?.organisation != null ? String(row.organisation) : '',
      logoUrl: normalizeAssetUrl(row?.logoUrl || ''),
    })),
  };
}

function transformProgrammeStructureContent(source) {
  if (!source || typeof source !== 'object') return null;
  const rawPhases = Array.isArray(source.phases) ? source.phases : [];
  return {
    eyebrow: source.eyebrow != null ? String(source.eyebrow) : '',
    heading: source.heading != null ? String(source.heading) : '',
    headingUnderlineWord:
      source.headingUnderlineWord != null ? String(source.headingUnderlineWord) : '',
    phases: rawPhases.slice(0, 8).map((row, index) => ({
      id: row?.id != null ? String(row.id) : '',
      label: String(row?.label ?? '').trim() || `Phase ${index + 1}`,
      title: row?.title != null ? String(row.title) : '',
      description: row?.description != null ? String(row.description) : '',
      icon: normalizeMaybeAssetIcon(row?.icon),
    })),
  };
}

function transformFundingEligibilityCard(row) {
  return {
    id: row?.id != null ? String(row.id) : '',
    icon: row?.icon != null ? String(row.icon) : 'solar:flag-bold-duotone',
    title: row?.title != null ? String(row.title) : '',
    description: row?.description != null ? String(row.description) : '',
  };
}

function transformCeoLaunchContent(source) {
  if (!source || typeof source !== 'object') return null;
  const rawStats = Array.isArray(source.stats) ? source.stats : [];
  return {
    eyebrow: source.eyebrow != null ? String(source.eyebrow) : '',
    heading: source.heading != null ? String(source.heading) : '',
    subtitle: source.subtitle != null ? String(source.subtitle) : '',
    posterImageUrl: normalizeAssetUrl(source.posterImageUrl || ''),
    videoUrl: source.videoUrl != null ? String(source.videoUrl) : '',
    videoFileUrl: normalizeAssetUrl(source.videoFileUrl || ''),
    quote: source.quote != null ? String(source.quote) : '',
    statIconSize: Number.isFinite(Number(source?.statIconSize))
      ? Number(source.statIconSize)
      : 30,
    stats: rawStats.slice(0, 4).map((row) => ({
      value: row?.value != null ? String(row.value) : '',
      label: row?.label != null ? String(row.label) : '',
      icon: normalizeMaybeAssetIcon(row?.icon),
    })),
    ctaLabel: source.ctaLabel != null ? String(source.ctaLabel) : '',
    ctaHref: source.ctaHref != null ? String(source.ctaHref) : '',
  };
}

function transformFundingEligibilityContent(source) {
  if (!source || typeof source !== 'object') return null;
  const rawItems = Array.isArray(source.items)
    ? source.items
    : [
        ...(Array.isArray(source.topRow) ? source.topRow : []),
        ...(Array.isArray(source.bottomRow) ? source.bottomRow : []),
      ];
  return {
    eyebrow: source.eyebrow != null ? String(source.eyebrow) : '',
    heading: source.heading != null ? String(source.heading) : '',
    items: rawItems.slice(0, 6).map(transformFundingEligibilityCard),
  };
}

function transformEnrolOptionsCard(row) {
  return {
    id: row?.id != null ? String(row.id) : '',
    title: row?.title != null ? String(row.title) : '',
    description: row?.description != null ? String(row.description) : '',
    ctaLabel: row?.ctaLabel != null ? String(row.ctaLabel) : '',
    icon: row?.icon != null ? String(row.icon) : '',
    accentColor: row?.accentColor != null ? String(row.accentColor) : '',
    action: row?.action != null ? String(row.action) : '',
    href: row?.href != null ? String(row.href) : '',
  };
}

function transformEnrolOptionsContent(source) {
  if (!source || typeof source !== 'object') return null;
  const rawCards = Array.isArray(source.cards) ? source.cards : [];
  return {
    heading: source.heading != null ? String(source.heading) : '',
    subtitle: source.subtitle != null ? String(source.subtitle) : '',
    comparePrompt: source.comparePrompt != null ? String(source.comparePrompt) : '',
    compareLinkLabel: source.compareLinkLabel != null ? String(source.compareLinkLabel) : '',
    compareHref: source.compareHref != null ? String(source.compareHref) : '',
    cards: rawCards.slice(0, 6).map(transformEnrolOptionsCard),
  };
}

function transformEligibilityMembershipContent(source) {
  if (!source || typeof source !== 'object') return null;
  const left = source.leftPanel && typeof source.leftPanel === 'object' ? source.leftPanel : {};
  const right = source.rightPanel && typeof source.rightPanel === 'object' ? source.rightPanel : {};
  const rawQuestions = Array.isArray(left.questions) ? left.questions : [];
  const rawBenefits = Array.isArray(right.benefits) ? right.benefits : [];
  return {
    leftPanel: {
      heading: left.heading != null ? String(left.heading) : '',
      subtitle: left.subtitle != null ? String(left.subtitle) : '',
      heroImageUrl: normalizeAssetUrl(left.heroImageUrl || ''),
      questions: rawQuestions.slice(0, 4).map((row) => ({
        id: row?.id != null ? String(row.id) : '',
        icon: row?.icon != null ? String(row.icon) : 'solar:user-bold-duotone',
        iconColor: String(row?.iconColor || '').toLowerCase() === 'red' ? 'red' : 'blue',
        text: row?.text != null ? String(row.text) : '',
      })),
      ctaLabel: left.ctaLabel != null ? String(left.ctaLabel) : '',
      ctaHref: left.ctaHref != null ? String(left.ctaHref) : '',
    },
    rightPanel: {
      eyebrow: right.eyebrow != null ? String(right.eyebrow) : '',
      heading: right.heading != null ? String(right.heading) : '',
      benefits: rawBenefits.slice(0, 4).map((row) => ({
        id: row?.id != null ? String(row.id) : '',
        icon: row?.icon != null ? String(row.icon) : 'solar:star-bold-duotone',
        label: row?.label != null ? String(row.label) : '',
      })),
      primaryCtaLabel: right.primaryCtaLabel != null ? String(right.primaryCtaLabel) : '',
      primaryCtaHref: right.primaryCtaHref != null ? String(right.primaryCtaHref) : '',
      secondaryCtaLabel: right.secondaryCtaLabel != null ? String(right.secondaryCtaLabel) : '',
      secondaryCtaHref: right.secondaryCtaHref != null ? String(right.secondaryCtaHref) : '',
    },
  };
}

function transformPartnerWithIscaContent(source) {
  if (!source || typeof source !== 'object') return null;
  const normalized = normalizePartnerWithIscaContent(source);
  return {
    ...normalized,
    hero: {
      ...normalized.hero,
      heroImageUrl: normalizeAssetUrl(normalized.hero?.heroImageUrl || ''),
    },
    dashboard: {
      ...normalized.dashboard,
      mockupImageUrl: normalizeAssetUrl(normalized.dashboard?.mockupImageUrl || ''),
    },
  };
}

function transformEmployerContent(source) {
  if (!source || typeof source !== 'object') return null;
  const rawBenefits = Array.isArray(source.benefits) ? source.benefits : [];
  const rawLogos = Array.isArray(source.logos) ? source.logos : [];
  return {
    heading: source.heading != null ? String(source.heading) : '',
    subtitle: source.subtitle != null ? String(source.subtitle) : '',
    heroImageUrl: normalizeAssetUrl(source.heroImageUrl || ''),
    benefits: rawBenefits.slice(0, 6).map((row) => ({
      icon: row?.icon != null ? String(row.icon) : '',
      title: row?.title != null ? String(row.title) : '',
    })),
    logos: rawLogos.slice(0, 50).map((row) => ({
      name: row?.name != null ? String(row.name) : '',
      logoUrl: normalizeAssetUrl(row?.logoUrl || ''),
    })),
    partnersHeading: source.partnersHeading != null ? String(source.partnersHeading) : '',
    ctaLabel: source.ctaLabel != null ? String(source.ctaLabel) : '',
    ctaHref: source.ctaHref != null ? String(source.ctaHref) : '',
  };
}

function transformEmployeeContent(source) {
  if (!source || typeof source !== 'object') return null;
  const rawBenefits = Array.isArray(source.benefits) ? source.benefits : [];
  const rawLogos = Array.isArray(source.logos) ? source.logos : [];
  return {
    eyebrow: source.eyebrow != null ? String(source.eyebrow) : '',
    heading: source.heading != null ? String(source.heading) : '',
    headingAccent: source.headingAccent != null ? String(source.headingAccent) : '',
    subtitle: source.subtitle != null ? String(source.subtitle) : '',
    heroImageUrl: normalizeAssetUrl(source.heroImageUrl || ''),
    heroPanelTitle: source.heroPanelTitle != null ? String(source.heroPanelTitle) : '',
    heroPanelSubtitle: source.heroPanelSubtitle != null ? String(source.heroPanelSubtitle) : '',
    benefitsLabel: source.benefitsLabel != null ? String(source.benefitsLabel) : '',
    partnersHeading: source.partnersHeading != null ? String(source.partnersHeading) : '',
    logos: rawLogos.slice(0, 100).map((row) => ({
      name: row?.name != null ? String(row.name) : '',
      logoUrl: normalizeAssetUrl(row?.logoUrl || ''),
    })),
    benefits: rawBenefits.slice(0, 6).map((row) => ({
      icon: row?.icon != null ? String(row.icon) : '',
      iconColor: row?.iconColor != null ? String(row.iconColor) : '',
      title: row?.title != null ? String(row.title) : '',
    })),
    primaryCtaLabel: source.primaryCtaLabel != null ? String(source.primaryCtaLabel) : '',
    primaryCtaHref: source.primaryCtaHref != null ? String(source.primaryCtaHref) : '',
    secondaryCtaLabel: source.secondaryCtaLabel != null ? String(source.secondaryCtaLabel) : '',
    secondaryCtaHref: source.secondaryCtaHref != null ? String(source.secondaryCtaHref) : '',
  };
}

function transformFaqContent(sourceFaq) {
  if (!sourceFaq || typeof sourceFaq !== 'object') {
    return null;
  }
  return {
    pageHeading: sourceFaq?.pageHeading != null ? String(sourceFaq.pageHeading) : '',
    items: Array.isArray(sourceFaq?.items)
      ? sourceFaq.items.slice(0, 50).map((item) => ({
          question: item?.question != null ? String(item.question) : '',
          answer: item?.answer != null ? String(item.answer) : '',
        }))
      : [],
  };
}

function transformHomeHeroContent(sourceContent) {
  if (!sourceContent || typeof sourceContent !== 'object') {
    return null;
  }

  const secondaryCtas = Array.isArray(sourceContent.secondaryCtas)
    ? sourceContent.secondaryCtas.slice(0, 5).map((item) => ({
        label: item?.label != null ? String(item.label) : '',
        href: item?.href != null ? String(item.href) : '',
        icon: normalizeMaybeAssetIcon(item?.icon),
        variant: item?.variant != null ? String(item.variant) : '',
        buttonColor: item?.buttonColor != null ? String(item.buttonColor) : '',
        buttonTextColor: item?.buttonTextColor != null ? String(item.buttonTextColor) : '',
      }))
    : [];

  const stats = Array.isArray(sourceContent.stats)
    ? sourceContent.stats.slice(0, 4).map((item) => ({
        value: item?.value != null ? String(item.value) : '',
        label: item?.label != null ? String(item.label) : '',
        icon: normalizeMaybeAssetIcon(item?.icon),
      }))
    : [];

  return {
    badgeLogoUrl: normalizeAssetUrl(sourceContent.badgeLogoUrl || ''),
    headline: sourceContent.headline != null ? String(sourceContent.headline) : '',
    headlineAccent: sourceContent.headlineAccent != null ? String(sourceContent.headlineAccent) : '',
    headlineColor: sourceContent.headlineColor != null ? String(sourceContent.headlineColor) : '',
    headlineAccentColor:
      sourceContent.headlineAccentColor != null ? String(sourceContent.headlineAccentColor) : '',
    description: sourceContent.description != null ? String(sourceContent.description) : '',
    cta: {
      label: sourceContent?.cta?.label != null ? String(sourceContent.cta.label) : '',
      href: sourceContent?.cta?.href != null ? String(sourceContent.cta.href) : '',
      icon: normalizeMaybeAssetIcon(sourceContent?.cta?.icon),
      buttonColor:
        sourceContent?.cta?.buttonColor != null ? String(sourceContent.cta.buttonColor) : '',
      buttonTextColor:
        sourceContent?.cta?.buttonTextColor != null ? String(sourceContent.cta.buttonTextColor) : '',
    },
    secondaryCtas,
    statIconSize: Number.isFinite(Number(sourceContent?.statIconSize))
      ? Number(sourceContent.statIconSize)
      : 26,
    event: {
      startDateLabel:
        sourceContent?.event?.startDateLabel != null ? String(sourceContent.event.startDateLabel) : '',
      startDate: sourceContent?.event?.startDate != null ? String(sourceContent.event.startDate) : '',
      startTimeLabel:
        sourceContent?.event?.startTimeLabel != null ? String(sourceContent.event.startTimeLabel) : '',
      startTime: sourceContent?.event?.startTime != null ? String(sourceContent.event.startTime) : '',
    },
    stats,
  };
}

function transformFooterContent(source) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const rawStats = Array.isArray(source.stats) ? source.stats : [];
  const rawLinks = Array.isArray(source.links) ? source.links : [];

  return {
    domainLine: source.domainLine != null ? String(source.domainLine) : '',
    copyrightText: source.copyrightText != null ? String(source.copyrightText) : '',
    stats: rawStats.slice(0, 4).map((row) => ({
      value: row?.value != null ? String(row.value) : '',
      label: row?.label != null ? String(row.label) : '',
      icon: row?.icon != null ? String(row.icon) : '',
      useLiveEnrollment: Boolean(row?.useLiveEnrollment),
    })),
    links: rawLinks.slice(0, 8).map((row) => ({
      label: row?.label != null ? String(row.label) : '',
      path: row?.path != null ? String(row.path) : '',
      external: Boolean(row?.external),
      icon: row?.icon != null ? String(row.icon) : '',
    })),
  };
}

function transformMembershipPaymentSettings(source) {
  if (!source || typeof source !== 'object') return null;
  return {
    currency: source.currency != null ? String(source.currency) : 'SGD',
    baseAmount: source.baseAmount != null ? Number(source.baseAmount) : 0,
    verifiedBaseAmount: source.verifiedBaseAmount != null ? Number(source.verifiedBaseAmount) : 0,
    gstRatePercent: source.gstRatePercent != null ? Number(source.gstRatePercent) : 0,
    voucherDiscountAmount:
      source.voucherDiscountAmount != null ? Number(source.voucherDiscountAmount) : 0,
    referralCode: source.referralCode != null ? String(source.referralCode).toUpperCase() : '',
    referralLinkPath:
      source.referralLinkPath != null
        ? String(source.referralLinkPath)
        : '/auth/sign-up?membershipOutcome=paid-signup&ref=',
    websiteBaseUrl:
      source.websiteBaseUrl != null ? String(source.websiteBaseUrl).replace(/\/$/, '') : '',
    exampleReferralLink:
      source.exampleReferralLink != null ? String(source.exampleReferralLink) : '',
    fullReferralLink: source.fullReferralLink != null ? String(source.fullReferralLink) : '',
    gstAmount: source.gstAmount != null ? Number(source.gstAmount) : 0,
    totalAmount: source.totalAmount != null ? Number(source.totalAmount) : 0,
    verifiedGstAmount: source.verifiedGstAmount != null ? Number(source.verifiedGstAmount) : 0,
    verifiedTotalAmount: source.verifiedTotalAmount != null ? Number(source.verifiedTotalAmount) : 0,
  };
}

function transformSettings(settings) {
  const sourceContent = settings?.homeHeroContent;
  const sourceCards = settings?.homeCardsContent;
  const sourceJoin = settings?.homeJoinContent;
  const sourceContactHero = settings?.contactHeroContent;
  const sourcePitch = settings?.workflowTemplatesPitchContent;
  const sourceFaq = settings?.faqContent;
  const sourceFees = settings?.programmeFeesContent;
  const sourceCurriculum = settings?.curriculumContent;
  const normalizedPitchFeatures = [0, 1, 2].map((i) => {
    const rows = Array.isArray(sourcePitch?.features) ? sourcePitch.features : [];
    const f = rows[i] && typeof rows[i] === 'object' ? rows[i] : {};
    return {
      iconUrl: normalizeAssetUrl(f?.iconUrl || ''),
      title: f?.title != null ? String(f.title) : '',
      description: f?.description != null ? String(f.description) : '',
    };
  });
  const hasPitchContent =
    Boolean(String(sourcePitch?.heading || '').trim()) ||
    normalizedPitchFeatures.some((row) => row.title || row.description || row.iconUrl);

  return {
    logoUrl: normalizeAssetUrl(settings?.logoUrl || ''),
    homeHeroImageUrl: normalizeAssetUrl(settings?.homeHeroImageUrl || ''),
    contactHeroImageUrl: normalizeAssetUrl(settings?.contactHeroImageUrl || ''),
    courseDefaultImageUrl: normalizeAssetUrl(settings?.courseDefaultImageUrl || ''),
    digitalBadgeImageUrl: normalizeAssetUrl(settings?.digitalBadgeImageUrl || ''),
    digitalBadgeIssuer:
      settings?.digitalBadgeIssuer != null ? String(settings.digitalBadgeIssuer) : '',
    hideAllCertificates: Boolean(settings?.hideAllCertificates),
    hideAllBadges: Boolean(settings?.hideAllBadges),
    homeHeroContent: transformHomeHeroContent(sourceContent),
    homeCardsContent:
      sourceCards && typeof sourceCards === 'object'
        ? {
            heading: sourceCards?.heading != null ? String(sourceCards.heading) : '',
            headingAccent: sourceCards?.headingAccent != null ? String(sourceCards.headingAccent) : '',
            headingColor: sourceCards?.headingColor != null ? String(sourceCards.headingColor) : '',
            headingAccentColor:
              sourceCards?.headingAccentColor != null ? String(sourceCards.headingAccentColor) : '',
            subtitle: sourceCards?.subtitle != null ? String(sourceCards.subtitle) : '',
            cards: Array.isArray(sourceCards?.cards)
              ? sourceCards.cards.slice(0, 12).map((card) => ({
                  icon: card?.icon != null ? String(card.icon) : '',
                  title: card?.title != null ? String(card.title) : '',
                  description: card?.description != null ? String(card.description) : '',
                }))
              : [],
          }
        : null,
    homeJoinContent:
      sourceJoin && typeof sourceJoin === 'object'
        ? {
            heading: sourceJoin?.heading != null ? String(sourceJoin.heading) : '',
            subtitle: sourceJoin?.subtitle != null ? String(sourceJoin.subtitle) : '',
            ctaLabel: sourceJoin?.ctaLabel != null ? String(sourceJoin.ctaLabel) : '',
            ctaHref: sourceJoin?.ctaHref != null ? String(sourceJoin.ctaHref) : '',
            ctaIcon: sourceJoin?.ctaIcon != null ? String(sourceJoin.ctaIcon) : '',
          }
        : null,
    contactHeroContent:
      sourceContactHero && typeof sourceContactHero === 'object'
        ? {
            headingLine1:
              sourceContactHero?.headingLine1 != null ? String(sourceContactHero.headingLine1) : '',
            headingLine2:
              sourceContactHero?.headingLine2 != null ? String(sourceContactHero.headingLine2) : '',
            infoTitle: sourceContactHero?.infoTitle != null ? String(sourceContactHero.infoTitle) : '',
            infoSubtitle:
              sourceContactHero?.infoSubtitle != null ? String(sourceContactHero.infoSubtitle) : '',
            contacts: Array.isArray(sourceContactHero?.contacts)
              ? sourceContactHero.contacts.slice(0, 12).map((row) => ({
                  details: row?.details != null ? String(row.details) : '',
                  address: row?.address != null ? String(row.address) : '',
                  phone: row?.phone != null ? String(row.phone) : '',
                  email: row?.email != null ? String(row.email) : '',
                  whatsapp: row?.whatsapp != null ? String(row.whatsapp) : '',
                  whatsappLink: row?.whatsappLink != null ? String(row.whatsappLink) : '',
                  website: row?.website != null ? String(row.website) : '',
                  addressIcon: row?.addressIcon != null ? String(row.addressIcon) : '',
                  phoneIcon: row?.phoneIcon != null ? String(row.phoneIcon) : '',
                  emailIcon: row?.emailIcon != null ? String(row.emailIcon) : '',
                  whatsappIcon: row?.whatsappIcon != null ? String(row.whatsappIcon) : '',
                  websiteIcon: row?.websiteIcon != null ? String(row.websiteIcon) : '',
                  lat: row?.lat != null ? Number(row.lat) : '',
                  lng: row?.lng != null ? Number(row.lng) : '',
                }))
              : [],
          }
        : null,
    workflowTemplatesPitchContent: hasPitchContent
      ? {
          heading: sourcePitch?.heading != null ? String(sourcePitch.heading) : '',
          features: normalizedPitchFeatures,
        }
      : null,
    faqContent: transformFaqContent(sourceFaq),
    programmeFeesContent: transformProgrammeFeesContent(sourceFees),
    curriculumContent: transformCurriculumStored(sourceCurriculum),
    homeTestimonialsContent: transformTestimonialsContent(settings?.homeTestimonialsContent),
    homeEmployerContent: transformEmployerContent(settings?.homeEmployerContent),
    homeEmployeeContent: transformEmployeeContent(settings?.homeEmployeeContent),
    homeProgrammeStructureContent: transformProgrammeStructureContent(
      settings?.homeProgrammeStructureContent
    ),
    homeFundingEligibilityContent: transformFundingEligibilityContent(
      settings?.homeFundingEligibilityContent
    ),
    homeEnrolOptionsContent: transformEnrolOptionsContent(settings?.homeEnrolOptionsContent),
    homeEligibilityMembershipContent: transformEligibilityMembershipContent(
      settings?.homeEligibilityMembershipContent
    ),
    homeCeoLaunchContent: transformCeoLaunchContent(settings?.homeCeoLaunchContent),
    partnerWithIscaContent: transformPartnerWithIscaContent(settings?.partnerWithIscaContent),
    footerContent: transformFooterContent(settings?.footerContent),
    membershipPaymentSettings: transformMembershipPaymentSettings(
      settings?.membershipPaymentSettings
    ),
    totalCourseEnrollments:
      typeof settings?.totalCourseEnrollments === 'number' && Number.isFinite(settings.totalCourseEnrollments)
        ? settings.totalCourseEnrollments
        : null,
  };
}

export const appSettingsService = {
  async getPublic() {
    const response = await axios.get('/app-settings');
    const data = response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await axios.post('/app-settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeLogo() {
    const response = await axios.delete('/app-settings/logo');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeHero(file) {
    const formData = new FormData();
    formData.append('hero', file);

    const response = await axios.post('/app-settings/home-hero', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeHero() {
    const response = await axios.delete('/app-settings/home-hero');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadContactHero(file) {
    const formData = new FormData();
    formData.append('hero', file);

    const response = await axios.post('/app-settings/contact-hero', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeContactHero() {
    const response = await axios.delete('/app-settings/contact-hero');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadCourseDefaultImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.post('/app-settings/course-default-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeCourseDefaultImage() {
    const response = await axios.delete('/app-settings/course-default-image');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadDigitalBadgeImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.post('/app-settings/digital-badge-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeDigitalBadgeImage() {
    const response = await axios.delete('/app-settings/digital-badge-image');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateDigitalBadgeSettings(payload) {
    const response = await axios.put('/app-settings/digital-badge-settings', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async getCredentialVisibility() {
    const response = await axios.get('/app-settings/credential-visibility');
    const data = response.data?.data || response.data || {};
    return {
      hideAllCertificates: Boolean(data.hideAllCertificates),
      hideAllBadges: Boolean(data.hideAllBadges),
    };
  },

  async updateCredentialVisibility(payload = {}) {
    const response = await axios.put('/app-settings/credential-visibility', payload);
    const data = response.data?.data || response.data || {};
    return {
      hideAllCertificates: Boolean(data.hideAllCertificates),
      hideAllBadges: Boolean(data.hideAllBadges),
    };
  },

  async updateHomeHeroContent(payload) {
    const response = await axios.put('/app-settings/home-hero-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeHeroStatIcon(index, file) {
    const formData = new FormData();
    formData.append('icon', file);
    const response = await axios.post(`/app-settings/home-hero-stat-icon/${index}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeHeroBadgeLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await axios.post('/app-settings/home-hero-badge-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeHeroBadgeLogo() {
    const response = await axios.delete('/app-settings/home-hero-badge-logo');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeCardsContent(payload) {
    const response = await axios.put('/app-settings/home-cards-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeJoinContent(payload) {
    const response = await axios.put('/app-settings/home-join-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateContactHeroContent(payload) {
    const response = await axios.put('/app-settings/contact-hero-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async getFaqContent() {
    const response = await axios.get('/app-settings/faq-content');
    const data = response.data?.data ?? response.data ?? null;
    return transformFaqContent(data);
  },

  async updateFaqContent(payload) {
    const response = await axios.put('/app-settings/faq-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async getCurriculumContent() {
    const response = await axios.get('/app-settings/curriculum-content');
    const data = response.data?.data ?? response.data ?? null;
    return transformCurriculumContent(data);
  },

  async updateCurriculumContent(payload) {
    const response = await axios.put('/app-settings/curriculum-content', payload || {});
    const body = response.data || {};
    const settings = body.settings || body.data || body;
    const curriculum = transformCurriculumContent(body.curriculum);
    return {
      settings: transformSettings(settings),
      curriculum,
    };
  },

  async getProgrammeFeesContent() {
    const response = await axios.get('/app-settings/programme-fees-content');
    const data = response.data?.data ?? response.data ?? null;
    return transformProgrammeFeesContent(data);
  },

  async updateProgrammeFeesContent(payload) {
    const response = await axios.put('/app-settings/programme-fees-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async getMembershipPaymentSettings() {
    const response = await axios.get('/app-settings/membership-payment-settings');
    const data = response.data?.data ?? response.data ?? null;
    return transformMembershipPaymentSettings(data);
  },

  async updateMembershipPaymentSettings(payload) {
    const response = await axios.put('/app-settings/membership-payment-settings', payload || {});
    const data = response.data?.data ?? response.data?.settings?.membershipPaymentSettings ?? response.data ?? null;
    return transformMembershipPaymentSettings(data);
  },

  async updateHomeTestimonialsContent(payload) {
    const response = await axios.put('/app-settings/home-testimonials-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeTestimonialsAvatar(id, file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await axios.post(`/app-settings/home-testimonials-avatar/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeTestimonialsAvatar(id) {
    const response = await axios.delete(`/app-settings/home-testimonials-avatar/${id}`);
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeTestimonialsIndustryLogo(id, file) {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await axios.post(
      `/app-settings/home-testimonials-industry-logo/${id}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeTestimonialsIndustryLogo(id) {
    const response = await axios.delete(`/app-settings/home-testimonials-industry-logo/${id}`);
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeProgrammeStructureContent(payload) {
    const response = await axios.put('/app-settings/home-programme-structure-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeProgrammeStructurePhaseIcon(phaseId, file) {
    const formData = new FormData();
    formData.append('icon', file);
    const response = await axios.post(
      `/app-settings/home-programme-structure-phase-icon/${phaseId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeFundingEligibilityContent(payload) {
    const response = await axios.put('/app-settings/home-funding-eligibility-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeEnrolOptionsContent(payload) {
    const response = await axios.put('/app-settings/home-enrol-options-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeEligibilityMembershipContent(payload) {
    const response = await axios.put('/app-settings/home-eligibility-membership-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeEligibilityMembershipHero(file) {
    const formData = new FormData();
    formData.append('hero', file);
    const response = await axios.post('/app-settings/home-eligibility-membership-hero', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeEligibilityMembershipHero() {
    const response = await axios.delete('/app-settings/home-eligibility-membership-hero');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeCeoLaunchContent(payload) {
    const response = await axios.put('/app-settings/home-ceo-launch-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeCeoLaunchPoster(file) {
    const formData = new FormData();
    formData.append('poster', file);
    const response = await axios.post('/app-settings/home-ceo-launch-poster', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeCeoLaunchPoster() {
    const response = await axios.delete('/app-settings/home-ceo-launch-poster');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeCeoLaunchVideo(file) {
    const formData = new FormData();
    formData.append('video', file);
    const response = await axios.post('/app-settings/home-ceo-launch-video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeCeoLaunchVideo() {
    const response = await axios.delete('/app-settings/home-ceo-launch-video');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeCeoLaunchStatIcon(index, file) {
    const formData = new FormData();
    formData.append('icon', file);
    const response = await axios.post(`/app-settings/home-ceo-launch-stat-icon/${index}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeCeoLaunchStatIcon(index) {
    const response = await axios.delete(`/app-settings/home-ceo-launch-stat-icon/${index}`);
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeEmployerContent(payload) {
    const response = await axios.put('/app-settings/home-employer-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeEmployerHero(file) {
    const formData = new FormData();
    formData.append('hero', file);
    const response = await axios.post('/app-settings/home-employer-hero', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeEmployerHero() {
    const response = await axios.delete('/app-settings/home-employer-hero');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeEmployerLogo(index, file) {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await axios.post(`/app-settings/home-employer-logo/${index}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeEmployerLogo(index) {
    const response = await axios.delete(`/app-settings/home-employer-logo/${index}`);
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateHomeEmployeeContent(payload) {
    const response = await axios.put('/app-settings/home-employee-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeEmployeeHero(file) {
    const formData = new FormData();
    formData.append('hero', file);
    const response = await axios.post('/app-settings/home-employee-hero', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeEmployeeHero() {
    const response = await axios.delete('/app-settings/home-employee-hero');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadHomeEmployeePartnerLogo(index, file) {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await axios.post(`/app-settings/home-employee-partner-logo/${index}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeHomeEmployeePartnerLogo(index) {
    const response = await axios.delete(`/app-settings/home-employee-partner-logo/${index}`);
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadProgrammeFeesAgencyLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await axios.post('/app-settings/programme-fees-agency-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeProgrammeFeesAgencyLogo() {
    const response = await axios.delete('/app-settings/programme-fees-agency-logo');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateWorkflowTemplatesPitchContent(payload) {
    const response = await axios.put('/app-settings/workflow-templates-pitch-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadWorkflowTemplatesPitchIcon(slot, file) {
    const formData = new FormData();
    formData.append('icon', file);
    const response = await axios.post(`/app-settings/workflow-templates-pitch-icon/${slot}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removeWorkflowTemplatesPitchIcon(slot) {
    const response = await axios.delete(`/app-settings/workflow-templates-pitch-icon/${slot}`);
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updatePartnerWithIscaContent(payload) {
    const response = await axios.put('/app-settings/partner-with-isca-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async updateFooterContent(payload) {
    const response = await axios.put('/app-settings/footer-content', payload || {});
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadPartnerWithIscaHero(file) {
    const formData = new FormData();
    formData.append('hero', file);
    const response = await axios.post('/app-settings/partner-with-isca-hero', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removePartnerWithIscaHero() {
    const response = await axios.delete('/app-settings/partner-with-isca-hero');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async uploadPartnerWithIscaMockupImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.post('/app-settings/partner-with-isca-mockup-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async removePartnerWithIscaMockupImage() {
    const response = await axios.delete('/app-settings/partner-with-isca-mockup-image');
    const data = response.data?.settings || response.data?.data || response.data || {};
    return transformSettings(data);
  },

  async getMyRecommendations() {
    const response = await axios.get('/app-settings/recommendations/me');
    const data = response.data?.data || {};
    return {
      persona: data?.persona ? String(data.persona) : null,
      courseIds: Array.isArray(data?.courseIds) ? data.courseIds : [],
    };
  },
};
