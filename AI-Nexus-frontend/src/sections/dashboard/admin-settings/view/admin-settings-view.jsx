import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import { alpha } from '@mui/material/styles';

import { DashboardContent } from 'src/layouts/dashboard';
import { toast } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
import { Editor } from 'src/components/editor';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { paths } from 'src/routes/paths';

import settingsTabSiteLogo from 'src/assets/settings/camera.png';
import settingsTabHero from 'src/assets/settings/hero.png';
import settingsTabHomeCards from 'src/assets/settings/home.png';
import settingsTabJoin from 'src/assets/settings/join.png';
import settingsTabContact from 'src/assets/settings/contact.png';
import settingsTabCourse from 'src/assets/settings/course.png';
import settingsTabHeader from 'src/assets/settings/header.png';

import { useSettingsContext } from 'src/components/settings';
import { appSettingsService } from 'src/services/app-settings.service';
import { categoryIcons } from 'src/_mock/_category-icons';
import { Iconify } from 'src/components/iconify';
import { HeroTextCard } from './components/hero-text-card';
import { HeroImageCard } from './components/hero-image-card';
import { CtaButtonCard } from './components/cta-button-card';
import { EventAndStatsCard } from './components/event-and-stats-card';
import { ColorPaletteField } from './components/color-palette-field';
import { HomeCardItem } from './components/home-card-item';
import { HexColorToolDrawer } from './components/hex-color-tool-drawer';
import { IconPickerDrawer } from './components/icon-picker-drawer';
import { HomeJoinSettingsCard } from './components/home-join-settings-card';
import { FaqSettingsCard } from './components/faq-settings-card';
import { FeesSettingsCard } from './components/fees-settings-card';
import { CurriculumSettingsCard } from './components/curriculum-settings-card';
import { TestimonialsSettingsCard } from './components/testimonials-settings-card';
import { EmployerSettingsCard } from './components/employer-settings-card';
import { PartnerWithIscaSettingsCard } from './components/partner-with-isca-settings-card';
import { FooterSettingsCard } from './components/footer-settings-card';
import { ProgrammeStructureSettingsCard } from './components/programme-structure-settings-card';
import { FundingEligibilitySettingsCard } from './components/funding-eligibility-settings-card';
import { EligibilityMembershipSettingsCard } from './components/eligibility-membership-settings-card';
import { CeoLaunchSettingsCard } from './components/ceo-launch-settings-card';
import {
  normalizeProgrammeFeesContent,
} from 'src/sections/home/programme-fees-defaults';
import {
  resolveTestimonialsContent,
  normalizeTestimonialsContent,
} from 'src/sections/home/testimonials-defaults';
import {
  resolveEmployerContent,
  normalizeEmployerContent,
} from 'src/sections/home/employer-defaults';
import { normalizeEmployeeContent } from 'src/sections/home/employee-defaults';
import { normalizePartnerWithIscaContent } from 'src/sections/partner-with-isca/partner-with-isca-defaults';
import { normalizeFooterContent } from 'src/layouts/main/footer-defaults';
import {
  normalizeCurriculumContent,
} from 'src/sections/home/curriculum-defaults';
import {
  resolveProgrammeStructureContent,
} from 'src/sections/home/programme-structure-defaults';
import {
  resolveFundingEligibilityContent,
} from 'src/sections/home/funding-eligibility-defaults';
import {
  resolveCeoLaunchContent,
} from 'src/sections/home/ceo-launch-defaults';
import {
  resolveEligibilityMembershipContent,
} from 'src/sections/home/eligibility-membership-defaults';

const CONTACT_DETAIL_KEYS = ['address', 'phone', 'email', 'whatsapp', 'website'];
const CONTACT_ICON_KEY_BY_FIELD = {
  address: 'addressIcon',
  phone: 'phoneIcon',
  email: 'emailIcon',
  whatsapp: 'whatsappIcon',
  website: 'websiteIcon',
};
const CONTACT_FIELD_META = [
  { key: 'address', label: 'Address', defaultIcon: 'solar:map-point-bold', color: 'error' },
  { key: 'phone', label: 'Phone', defaultIcon: 'solar:phone-bold', color: 'info' },
  { key: 'email', label: 'Email', defaultIcon: 'solar:letter-bold', color: 'secondary' },
  { key: 'whatsapp', label: 'WhatsApp', defaultIcon: 'ri:whatsapp-fill', color: 'success' },
  { key: 'website', label: 'Website', defaultIcon: 'mdi:web', color: 'warning' },
];

const DEFAULT_WORKFLOW_TEMPLATES_PITCH = {
  heading: 'Why use AI resources?',
  features: [
    {
      iconUrl: '',
      title: 'Save 80% Time',
      description:
        'Automate repetitive tasks and focus on what matters most - building meaningful connections.',
    },
    {
      iconUrl: '',
      title: 'Better Engagement',
      description:
        'Deliver personalized experiences that keep members active and engaged in your community.',
    },
    {
      iconUrl: '',
      title: 'Scale Effortlessly',
      description:
        'Handle thousands of members with the same personal touch as your first ten members.',
    },
  ],
};

const toStoredUploadPath = (url) => {
  if (!url) return '';
  const s = String(url).trim();
  const idx = s.indexOf('/uploads/');
  return idx >= 0 ? s.slice(idx) : s;
};

const parseContactDetailFields = (detailsHtml = '') => {
  const normalizedText = String(detailsHtml || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n+/g, '\n')
    .trim();

  const lines = normalizedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const result = {
    address: '',
    phone: '',
    email: '',
    whatsapp: '',
    whatsappLink: '',
    website: '',
  };
  let activeKey = '';

  lines.forEach((line) => {
    const match = line.match(/^(Address|Phone|Email|WhatsApp|Website)\s*:?\s*(.*)$/i);
    if (match) {
      activeKey = match[1].toLowerCase();
      if (CONTACT_DETAIL_KEYS.includes(activeKey)) {
        result[activeKey] = (match[2] || '').trim();
      }
      return;
    }

    if (activeKey && CONTACT_DETAIL_KEYS.includes(activeKey)) {
      result[activeKey] = result[activeKey] ? `${result[activeKey]} ${line}`.trim() : line;
    }
  });

  return result;
};

const buildContactDetailsHtml = (row = {}) => {
  const sections = [
    ['Address', row?.address],
    ['Phone', row?.phone],
    ['Email', row?.email],
    ['WhatsApp', row?.whatsapp],
    ['Website', row?.website],
  ]
    .map(([label, value]) => [label, String(value || '').trim()])
    .filter(([, value]) => Boolean(value));

  return sections.map(([label, value]) => `${label}: ${value}`).join('<br/>');
};

const getContactFieldIcon = (row, fieldKey) => {
  const iconKey = CONTACT_ICON_KEY_BY_FIELD[fieldKey];
  const fallback = CONTACT_FIELD_META.find((item) => item.key === fieldKey)?.defaultIcon || '';
  return String(row?.[iconKey] || fallback || '').trim();
};

export function AdminSettingsView() {
  const navigate = useNavigate();
  const { section } = useParams();
  const settings = useSettingsContext();
  const [activeSection, setActiveSection] = useState('logo');
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoSubmitting, setLogoSubmitting] = useState(false);

  const [heroFile, setHeroFile] = useState(null);
  const [heroUrl, setHeroUrl] = useState('');
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroSubmitting, setHeroSubmitting] = useState(false);
  const [heroContentSubmitting, setHeroContentSubmitting] = useState(false);
  const [contactHeroFile, setContactHeroFile] = useState(null);
  const [contactHeroUrl, setContactHeroUrl] = useState('');
  const [contactHeroLoading, setContactHeroLoading] = useState(true);
  const [contactHeroSubmitting, setContactHeroSubmitting] = useState(false);
  const [courseDefaultImageFile, setCourseDefaultImageFile] = useState(null);
  const [courseDefaultImageUrl, setCourseDefaultImageUrl] = useState('');
  const [courseDefaultImageLoading, setCourseDefaultImageLoading] = useState(true);
  const [courseDefaultImageSubmitting, setCourseDefaultImageSubmitting] = useState(false);
  const [contactHeroContentSubmitting, setContactHeroContentSubmitting] = useState(false);
  const [workflowPitch, setWorkflowPitch] = useState(() => ({
    heading: DEFAULT_WORKFLOW_TEMPLATES_PITCH.heading,
    features: DEFAULT_WORKFLOW_TEMPLATES_PITCH.features.map((f) => ({ ...f })),
  }));
  const [workflowPitchSubmitting, setWorkflowPitchSubmitting] = useState(false);
  const [workflowPitchIconSlotLoading, setWorkflowPitchIconSlotLoading] = useState(null);
  const emptyHeroStatsRow = () => ({ value: '', label: '', icon: '' });
  const [heroStatIconUploadingIndex, setHeroStatIconUploadingIndex] = useState(null);
  const [heroBadgeLogoFile, setHeroBadgeLogoFile] = useState(null);
  const [heroBadgeLogoSubmitting, setHeroBadgeLogoSubmitting] = useState(false);
  const [visibleStatsCount, setVisibleStatsCount] = useState(0);
  const [cardsContentSubmitting, setCardsContentSubmitting] = useState(false);
  const [faqContentSubmitting, setFaqContentSubmitting] = useState(false);
  const [feesContentSubmitting, setFeesContentSubmitting] = useState(false);
  const [curriculumContentSubmitting, setCurriculumContentSubmitting] = useState(false);
  const [testimonialsContent, setTestimonialsContent] = useState(() =>
    normalizeTestimonialsContent(null)
  );
  const [testimonialsContentSubmitting, setTestimonialsContentSubmitting] = useState(false);
  const [employerContent, setEmployerContent] = useState(() => normalizeEmployerContent(null));
  const [employeeContent, setEmployeeContent] = useState(() => normalizeEmployeeContent(null));
  const [programmeStructureContent, setProgrammeStructureContent] = useState(() =>
    resolveProgrammeStructureContent(null)
  );
  const [programmeStructureContentSubmitting, setProgrammeStructureContentSubmitting] =
    useState(false);
  const [programmeStructurePhaseIconUploadingId, setProgrammeStructurePhaseIconUploadingId] =
    useState(null);
  const [fundingEligibilityContent, setFundingEligibilityContent] = useState(() =>
    resolveFundingEligibilityContent(null)
  );
  const [fundingEligibilityContentSubmitting, setFundingEligibilityContentSubmitting] =
    useState(false);
  const [eligibilityMembershipContent, setEligibilityMembershipContent] = useState(() =>
    resolveEligibilityMembershipContent(null)
  );
  const [eligibilityMembershipContentSubmitting, setEligibilityMembershipContentSubmitting] =
    useState(false);
  const [eligibilityMembershipHeroFile, setEligibilityMembershipHeroFile] = useState(null);
  const [eligibilityMembershipHeroSubmitting, setEligibilityMembershipHeroSubmitting] =
    useState(false);
  const [ceoLaunchContent, setCeoLaunchContent] = useState(() => resolveCeoLaunchContent(null));
  const [ceoLaunchContentSubmitting, setCeoLaunchContentSubmitting] = useState(false);
  const [ceoLaunchPosterFile, setCeoLaunchPosterFile] = useState(null);
  const [ceoLaunchPosterSubmitting, setCeoLaunchPosterSubmitting] = useState(false);
  const [ceoLaunchVideoFile, setCeoLaunchVideoFile] = useState(null);
  const [ceoLaunchVideoSubmitting, setCeoLaunchVideoSubmitting] = useState(false);
  const [ceoLaunchStatIconUploadingIndex, setCeoLaunchStatIconUploadingIndex] = useState(null);
  const [employerContentSubmitting, setEmployerContentSubmitting] = useState(false);
  const [employerHeroFile, setEmployerHeroFile] = useState(null);
  const [employerHeroSubmitting, setEmployerHeroSubmitting] = useState(false);
  const [employerLogoUploadingIndex, setEmployerLogoUploadingIndex] = useState(null);
  const [earlyAdopterLogoUploadingIndex, setEarlyAdopterLogoUploadingIndex] = useState(null);
  const [partnerWithIscaContent, setPartnerWithIscaContent] = useState(() =>
    normalizePartnerWithIscaContent(null)
  );
  const [partnerWithIscaContentSubmitting, setPartnerWithIscaContentSubmitting] = useState(false);
  const [partnerWithIscaHeroFile, setPartnerWithIscaHeroFile] = useState(null);
  const [partnerWithIscaHeroSubmitting, setPartnerWithIscaHeroSubmitting] = useState(false);
  const [footerContent, setFooterContent] = useState(() => normalizeFooterContent(null));
  const [footerContentSubmitting, setFooterContentSubmitting] = useState(false);
  const PROGRAMME_FEES_TIERS_MAX = 8;
  const [joinContentSubmitting, setJoinContentSubmitting] = useState(false);
  const [pendingScrollCardIndex, setPendingScrollCardIndex] = useState(null);
  const HOME_CARDS_MAX = 12;
  const FAQ_ITEMS_MAX = 50;
  const DEFAULT_FAQ_CONTENT = {
    pageHeading: '',
    items: [],
  };
  const DEFAULT_JOIN_CONTENT = {
    heading: 'Ready to Join the AI Revolution?',
    subtitle:
      'Connect with the brightest AI minds, learn cutting-edge techniques, and build the future together.',
    ctaLabel: 'Get Started Now',
    ctaHref: '',
    ctaIcon: 'mingcute:arrow-right-line',
  };
  const homeCardRefs = useRef({});
  const [colorToolOpen, setColorToolOpen] = useState(false);
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconToolCardIndex, setIconToolCardIndex] = useState(0);
  const [contactIconToolOpen, setContactIconToolOpen] = useState(false);
  const [contactIconField, setContactIconField] = useState('address');
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [generatorStartColor, setGeneratorStartColor] = useState('#9b2a77');
  const [generatorEndColor, setGeneratorEndColor] = useState('#57c785');
  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () => availableCategoryIcons.filter((iconName) => iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())),
    [availableCategoryIcons, iconSearchQuery]
  );

  const [heroContent, setHeroContent] = useState({
    badgeLogoUrl: '',
    headline: '',
    headlineAccent: '',
    description: '',
    cta: {
      label: '',
      href: '',
      icon: '',
      buttonColor: '',
      buttonTextColor: '',
    },
    secondaryCtas: [
      { label: '', href: '', icon: '', buttonColor: '', buttonTextColor: '' },
      { label: '', href: '', icon: '', buttonColor: '', buttonTextColor: '' },
      { label: '', href: '', icon: '', buttonColor: '', buttonTextColor: '' },
    ],
    statIconSize: 26,
    stats: [emptyHeroStatsRow(), emptyHeroStatsRow(), emptyHeroStatsRow(), emptyHeroStatsRow()],
  });
  const defaultCardIcons = ['mingcute:user-group-line', 'mingcute:flash-line', 'mingcute:git-branch-line'];
  const getDefaultCardIcon = (index) => defaultCardIcons[index] || 'mingcute:apps-line';
  const emptyHomeCard = (icon = '') => ({ icon, title: '', description: '' });
  const [cardsContent, setCardsContent] = useState({
    heading: 'Powered by',
    headingAccent: 'Artificial Intelligence',
    headingColor: '',
    headingAccentColor: '',
    subtitle: 'Experience the future of community learning with AI-driven features that adapt to your needs',
    cards: [
      emptyHomeCard(defaultCardIcons[0]),
      emptyHomeCard(defaultCardIcons[1]),
      emptyHomeCard(defaultCardIcons[2]),
    ],
  });
  const [joinContent, setJoinContent] = useState(DEFAULT_JOIN_CONTENT);
  const [faqContent, setFaqContent] = useState(DEFAULT_FAQ_CONTENT);
  const [feesContent, setFeesContent] = useState(() =>
    normalizeProgrammeFeesContent(null)
  );
  const [curriculumContent, setCurriculumContent] = useState(() =>
    normalizeCurriculumContent(null)
  );
  const emptyContactRow = () => ({
    details: '',
    address: '',
    phone: '',
    email: '',
    whatsapp: '',
    whatsappLink: '',
    website: '',
    addressIcon: 'solar:map-point-bold',
    phoneIcon: 'solar:phone-bold',
    emailIcon: 'solar:letter-bold',
    whatsappIcon: 'ri:whatsapp-fill',
    websiteIcon: 'mdi:web',
    lat: '',
    lng: '',
  });
  const [contactHeroContent, setContactHeroContent] = useState({
    headingLine1: 'Where',
    headingLine2: 'to find us?',
    infoTitle: 'How can we help you?',
    infoSubtitle: 'Fill up the form and our team will get back to you within 24 hours.',
    contacts: [emptyContactRow()],
  });

  const handleToggle = (field) => {
    settings.onUpdateField(field, !settings[field]);
  };

  const applyWorkflowPitchFromSettings = useCallback((appSettings) => {
    const rp = appSettings?.workflowTemplatesPitchContent;
    if (rp && typeof rp === 'object') {
      const feats = Array.isArray(rp.features) ? rp.features : [];
      setWorkflowPitch({
        heading: String(rp.heading || '').trim() || DEFAULT_WORKFLOW_TEMPLATES_PITCH.heading,
        features: [0, 1, 2].map((i) => {
          const row = feats[i] && typeof feats[i] === 'object' ? feats[i] : {};
          return {
            iconUrl: String(row.iconUrl || '').trim(),
            title: String(row.title || '').trim() || DEFAULT_WORKFLOW_TEMPLATES_PITCH.features[i].title,
            description:
              String(row.description || '').trim() || DEFAULT_WORKFLOW_TEMPLATES_PITCH.features[i].description,
          };
        }),
      });
    } else {
      setWorkflowPitch({
        heading: DEFAULT_WORKFLOW_TEMPLATES_PITCH.heading,
        features: DEFAULT_WORKFLOW_TEMPLATES_PITCH.features.map((f) => ({ ...f })),
      });
    }
  }, []);

  const updateWorkflowPitchHeading = (value) => {
    setWorkflowPitch((prev) => ({ ...prev, heading: value }));
  };

  const updateWorkflowPitchFeature = (index, field, value) => {
    setWorkflowPitch((prev) => {
      const features = [...(prev.features || [])];
      while (features.length <= index) features.push({ iconUrl: '', title: '', description: '' });
      features[index] = { ...features[index], [field]: value };
      return { ...prev, features };
    });
  };

  const handleSaveWorkflowPitchContent = async () => {
    try {
      setWorkflowPitchSubmitting(true);
      const payload = {
        heading: workflowPitch.heading || '',
        features: [0, 1, 2].map((i) => {
          const row = workflowPitch.features?.[i] || {};
          return {
            title: row.title || '',
            description: row.description || '',
            iconUrl: toStoredUploadPath(row.iconUrl),
          };
        }),
      };
      const updated = await appSettingsService.updateWorkflowTemplatesPitchContent(payload);
      applyWorkflowPitchFromSettings(updated);
      toast.success('Workflow templates intro updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to save workflow templates intro');
    } finally {
      setWorkflowPitchSubmitting(false);
    }
  };

  const handleDropWorkflowPitchIcon = async (slot, acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (!file) return;
    try {
      setWorkflowPitchIconSlotLoading(slot);
      const updated = await appSettingsService.uploadWorkflowTemplatesPitchIcon(slot, file);
      applyWorkflowPitchFromSettings(updated);
      toast.success(`Column ${slot + 1} icon updated`);
    } catch (error) {
      toast.error(error?.message || 'Failed to upload icon');
    } finally {
      setWorkflowPitchIconSlotLoading(null);
    }
  };

  const handleRemoveWorkflowPitchIcon = async (slot) => {
    try {
      setWorkflowPitchIconSlotLoading(slot);
      const updated = await appSettingsService.removeWorkflowTemplatesPitchIcon(slot);
      applyWorkflowPitchFromSettings(updated);
      toast.success(`Column ${slot + 1} icon removed`);
    } catch (error) {
      toast.error(error?.message || 'Failed to remove icon');
    } finally {
      setWorkflowPitchIconSlotLoading(null);
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      setLogoLoading(true);
      setHeroLoading(true);
      const appSettings = await appSettingsService.getPublic();
      setLogoUrl(appSettings.logoUrl || '');
      setHeroUrl(appSettings.homeHeroImageUrl || '');
      setContactHeroUrl(appSettings.contactHeroImageUrl || '');
      setCourseDefaultImageUrl(appSettings.courseDefaultImageUrl || '');
      const remoteHero = appSettings.homeHeroContent || {};
      const rawStats = Array.isArray(remoteHero.stats) ? remoteHero.stats : [];
      const statsFour = [0, 1, 2, 3].map((i) => ({
        value: rawStats[i]?.value != null ? String(rawStats[i].value) : '',
        label: rawStats[i]?.label != null ? String(rawStats[i].label) : '',
        icon: rawStats[i]?.icon != null ? String(rawStats[i].icon) : '',
      }));
      const statsUsedCount = Math.max(1, statsFour.filter((s) => s.label || s.value || s.icon).length);
      const remoteSecondary = Array.isArray(remoteHero?.secondaryCtas) ? remoteHero.secondaryCtas : [];
      const secondaryCtas = remoteSecondary.slice(0, 5).map((item) => ({
        label: item?.label != null ? String(item.label) : '',
        href: item?.href != null ? String(item.href) : '',
        icon: item?.icon != null ? String(item.icon) : '',
        buttonColor: item?.buttonColor != null ? String(item.buttonColor) : '',
        buttonTextColor: item?.buttonTextColor != null ? String(item.buttonTextColor) : '',
      }));
      setHeroContent({
        badgeLogoUrl: remoteHero?.badgeLogoUrl || '',
        headline: remoteHero?.headline || '',
        headlineAccent: remoteHero?.headlineAccent || '',
        description: remoteHero?.description || '',
        cta: {
          label: remoteHero?.cta?.label || '',
          href: remoteHero?.cta?.href || '',
          icon: remoteHero?.cta?.icon || '',
          buttonColor: remoteHero?.cta?.buttonColor || '',
          buttonTextColor: remoteHero?.cta?.buttonTextColor || '',
        },
        secondaryCtas,
        statIconSize: Number.isFinite(Number(remoteHero?.statIconSize))
          ? Number(remoteHero.statIconSize)
          : 26,
        stats: statsFour,
      });
      setVisibleStatsCount(statsUsedCount);
      const remoteCards = appSettings.homeCardsContent || {};
      const remoteCardsRows = Array.isArray(remoteCards?.cards) ? remoteCards.cards : [];
      const normalizedCards = (
        remoteCardsRows.length
          ? remoteCardsRows
          : [emptyHomeCard(getDefaultCardIcon(0)), emptyHomeCard(getDefaultCardIcon(1)), emptyHomeCard(getDefaultCardIcon(2))]
      )
        .slice(0, HOME_CARDS_MAX)
        .map((card, i) => ({
          icon: String(card?.icon || getDefaultCardIcon(i) || '').trim(),
          title: String(card?.title || '').trim(),
          description: String(card?.description || '').trim(),
        }));
      setCardsContent({
        heading: String(remoteCards?.heading || 'Powered by').trim(),
        headingAccent: String(remoteCards?.headingAccent || 'Artificial Intelligence').trim(),
        headingColor: String(remoteCards?.headingColor || '').trim(),
        headingAccentColor: String(remoteCards?.headingAccentColor || '').trim(),
        subtitle: String(
          remoteCards?.subtitle ||
            'Experience the future of community learning with AI-driven features that adapt to your needs'
        ).trim(),
        cards: normalizedCards,
      });
      const remoteFaq = appSettings.faqContent || {};
      const remoteFaqRows = Array.isArray(remoteFaq?.items) ? remoteFaq.items : [];
      const normalizedFaqItems = remoteFaqRows.slice(0, FAQ_ITEMS_MAX).map((item) => ({
        question: String(item?.question || '').trim(),
        answer: String(item?.answer || '').trim(),
      }));
      setFaqContent({
        pageHeading: String(remoteFaq?.pageHeading || '').trim(),
        items: normalizedFaqItems,
      });
      setFeesContent(
        normalizeProgrammeFeesContent(appSettings.programmeFeesContent)
      );
      setCurriculumContent(
        normalizeCurriculumContent(appSettings.curriculumContent)
      );
      setTestimonialsContent(resolveTestimonialsContent(appSettings.homeTestimonialsContent));
      setProgrammeStructureContent(
        resolveProgrammeStructureContent(appSettings.homeProgrammeStructureContent)
      );
      setFundingEligibilityContent(
        resolveFundingEligibilityContent(appSettings.homeFundingEligibilityContent)
      );
      setEligibilityMembershipContent(
        resolveEligibilityMembershipContent(appSettings.homeEligibilityMembershipContent)
      );
      setCeoLaunchContent(resolveCeoLaunchContent(appSettings.homeCeoLaunchContent));
      setEmployerContent(resolveEmployerContent(appSettings.homeEmployerContent));
      setEmployeeContent(normalizeEmployeeContent(appSettings.homeEmployeeContent));
      setPartnerWithIscaContent(
        normalizePartnerWithIscaContent(appSettings.partnerWithIscaContent)
      );
      setFooterContent(normalizeFooterContent(appSettings.footerContent));
      const remoteJoin = appSettings.homeJoinContent || {};
      setJoinContent({
        heading: String(remoteJoin?.heading || DEFAULT_JOIN_CONTENT.heading).trim(),
        subtitle: String(remoteJoin?.subtitle || DEFAULT_JOIN_CONTENT.subtitle).trim(),
        ctaLabel: String(remoteJoin?.ctaLabel || DEFAULT_JOIN_CONTENT.ctaLabel).trim(),
        ctaHref: String(remoteJoin?.ctaHref || DEFAULT_JOIN_CONTENT.ctaHref).trim(),
        ctaIcon: String(remoteJoin?.ctaIcon || DEFAULT_JOIN_CONTENT.ctaIcon).trim(),
      });
      const remoteContact = appSettings.contactHeroContent || {};
      const remoteContacts = Array.isArray(remoteContact?.contacts) ? remoteContact.contacts : [];
      const normalizedContacts = (remoteContacts.length ? remoteContacts : [emptyContactRow()]).map((row) => {
        const details = String(
          row?.details ||
            [row?.country, row?.address, row?.phoneNumber]
              .map((item) => String(item || '').trim())
              .filter(Boolean)
              .join('<br/>')
        ).trim();
        const parsedFields = parseContactDetailFields(details);

        return {
          details,
          address: String(row?.address || parsedFields.address || '').trim(),
          phone: String(row?.phone || parsedFields.phone || '').trim(),
          email: String(row?.email || parsedFields.email || '').trim(),
          whatsapp: String(row?.whatsapp || parsedFields.whatsapp || '').trim(),
          whatsappLink: String(row?.whatsappLink || '').trim(),
          website: String(row?.website || parsedFields.website || '').trim(),
          addressIcon: String(row?.addressIcon || emptyContactRow().addressIcon || '').trim(),
          phoneIcon: String(row?.phoneIcon || emptyContactRow().phoneIcon || '').trim(),
          emailIcon: String(row?.emailIcon || emptyContactRow().emailIcon || '').trim(),
          whatsappIcon: String(row?.whatsappIcon || emptyContactRow().whatsappIcon || '').trim(),
          websiteIcon: String(row?.websiteIcon || emptyContactRow().websiteIcon || '').trim(),
          lat: row?.lat != null ? String(row.lat).trim() : '',
          lng: row?.lng != null ? String(row.lng).trim() : '',
        };
      });
      setContactHeroContent({
        headingLine1: String(remoteContact?.headingLine1 || 'Where').trim(),
        headingLine2: String(remoteContact?.headingLine2 || 'to find us?').trim(),
        infoTitle: String(remoteContact?.infoTitle || 'How can we help you?').trim(),
        infoSubtitle: String(
          remoteContact?.infoSubtitle || 'Fill up the form and our team will get back to you within 24 hours.'
        ).trim(),
        contacts: normalizedContacts,
      });

      applyWorkflowPitchFromSettings(appSettings);
    } catch (error) {
      toast.error(error?.message || 'Failed to load site settings');
    } finally {
      setLogoLoading(false);
      setHeroLoading(false);
      setContactHeroLoading(false);
      setCourseDefaultImageLoading(false);
    }
  }, [applyWorkflowPitchFromSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleDropLogo = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) {
      setLogoFile(file);
    }
  }, []);

  const handleClearSelection = () => {
    setLogoFile(null);
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      toast.error('Please select a logo first');
      return;
    }

    try {
      setLogoSubmitting(true);
      const updatedSettings = await appSettingsService.uploadLogo(logoFile);
      const nextLogoUrl = updatedSettings.logoUrl || '';
      setLogoUrl(nextLogoUrl);
      if (typeof window !== 'undefined') {
        if (nextLogoUrl) {
          window.localStorage.setItem('site-logo-url', nextLogoUrl);
        } else {
          window.localStorage.removeItem('site-logo-url');
        }
        window.dispatchEvent(new CustomEvent('site-logo-updated', { detail: { logoUrl: nextLogoUrl } }));
      }
      setLogoFile(null);
      toast.success('Site logo updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload site logo');
    } finally {
      setLogoSubmitting(false);
    }
  };

  const handleDropHero = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) {
      setHeroFile(file);
    }
  }, []);

  const handleClearHeroSelection = () => {
    setHeroFile(null);
  };

  const handleDropContactHero = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) {
      setContactHeroFile(file);
    }
  }, []);

  const handleClearContactHeroSelection = () => {
    setContactHeroFile(null);
  };

  const handleUploadHero = async () => {
    if (!heroFile) {
      toast.error('Please select an image first');
      return;
    }

    try {
      setHeroSubmitting(true);
      const updatedSettings = await appSettingsService.uploadHomeHero(heroFile);
      setHeroUrl(updatedSettings.homeHeroImageUrl || '');
      setHeroFile(null);
      toast.success('Home hero background updated');
      if (typeof window !== 'undefined') {
        const next = updatedSettings.homeHeroImageUrl?.trim();
        if (next) {
          window.localStorage.setItem('public-home-hero-bg-url', next);
        } else {
          window.localStorage.removeItem('public-home-hero-bg-url');
        }
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 413) {
        toast.error(
          'Image is too large for the server upload limit. Try a smaller JPG/PNG (under 1 MB) or ask ops to raise client_max_body_size on the API proxy.'
        );
      } else {
        toast.error(error?.message || 'Failed to upload hero image');
      }
    } finally {
      setHeroSubmitting(false);
    }
  };

  const handleRemoveHero = async () => {
    if (heroFile) {
      setHeroFile(null);
      return;
    }

    if (!heroUrl) return;

    try {
      setHeroSubmitting(true);
      const updatedSettings = await appSettingsService.removeHomeHero();
      setHeroUrl(updatedSettings.homeHeroImageUrl || '');
      toast.success('Home hero background removed (default image will show)');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('public-home-hero-bg-url');
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to remove hero image');
    } finally {
      setHeroSubmitting(false);
    }
  };

  const handleUploadContactHero = async () => {
    if (!contactHeroFile) {
      toast.error('Please select an image first');
      return;
    }

    try {
      setContactHeroSubmitting(true);
      const updatedSettings = await appSettingsService.uploadContactHero(contactHeroFile);
      setContactHeroUrl(updatedSettings.contactHeroImageUrl || '');
      setContactHeroFile(null);
      toast.success('Contact hero background updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload contact hero image');
    } finally {
      setContactHeroSubmitting(false);
    }
  };

  const handleRemoveContactHero = async () => {
    if (contactHeroFile) {
      setContactHeroFile(null);
      return;
    }

    if (!contactHeroUrl) return;

    try {
      setContactHeroSubmitting(true);
      const updatedSettings = await appSettingsService.removeContactHero();
      setContactHeroUrl(updatedSettings.contactHeroImageUrl || '');
      toast.success('Contact hero background removed (default image will show)');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove contact hero image');
    } finally {
      setContactHeroSubmitting(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (logoFile) {
      setLogoFile(null);
      return;
    }

    if (!logoUrl) return;

    try {
      setLogoSubmitting(true);
      const updatedSettings = await appSettingsService.removeLogo();
      const nextLogoUrl = updatedSettings.logoUrl || '';
      setLogoUrl(nextLogoUrl);
      if (typeof window !== 'undefined') {
        if (nextLogoUrl) {
          window.localStorage.setItem('site-logo-url', nextLogoUrl);
        } else {
          window.localStorage.removeItem('site-logo-url');
        }
        window.dispatchEvent(new CustomEvent('site-logo-updated', { detail: { logoUrl: nextLogoUrl } }));
      }
      toast.success('Site logo removed successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove site logo');
    } finally {
      setLogoSubmitting(false);
    }
  };

  const handleDropCourseDefaultImage = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) {
      setCourseDefaultImageFile(file);
    }
  }, []);

  const handleClearCourseDefaultImageSelection = () => {
    setCourseDefaultImageFile(null);
  };

  const handleUploadCourseDefaultImage = async () => {
    if (!courseDefaultImageFile) {
      toast.error('Please select an image first');
      return;
    }
    try {
      setCourseDefaultImageSubmitting(true);
      const updatedSettings = await appSettingsService.uploadCourseDefaultImage(courseDefaultImageFile);
      const next = updatedSettings.courseDefaultImageUrl || '';
      setCourseDefaultImageUrl(next);
      setCourseDefaultImageFile(null);
      if (typeof window !== 'undefined') {
        if (next) {
          window.localStorage.setItem('course-default-image-url', next);
        } else {
          window.localStorage.removeItem('course-default-image-url');
        }
      }
      toast.success('Course default image updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload course default image');
    } finally {
      setCourseDefaultImageSubmitting(false);
    }
  };

  const handleRemoveCourseDefaultImage = async () => {
    if (courseDefaultImageFile) {
      setCourseDefaultImageFile(null);
      return;
    }

    if (!courseDefaultImageUrl) return;

    try {
      setCourseDefaultImageSubmitting(true);
      const updatedSettings = await appSettingsService.removeCourseDefaultImage();
      const next = updatedSettings.courseDefaultImageUrl || '';
      setCourseDefaultImageUrl(next);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('course-default-image-url');
      }
      toast.success('Course default image removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove course default image');
    } finally {
      setCourseDefaultImageSubmitting(false);
    }
  };

  const updateHeroField = (field, value) => {
    setHeroContent((prev) => ({ ...prev, [field]: value }));
  };

  const updateHeroStat = (index, key, value) => {
    setHeroContent((prev) => {
      const stats = [...(prev.stats || [])];
      while (stats.length < 4) stats.push(emptyHeroStatsRow());
      stats[index] = { ...stats[index], [key]: value };
      return { ...prev, stats };
    });
  };
  const addVisibleStatRow = () => setVisibleStatsCount((prev) => Math.min(4, prev + 1));
  const removeVisibleStatRow = (index) => {
    setHeroContent((prev) => {
      const stats = [...(prev.stats || [])];
      stats[index] = emptyHeroStatsRow();
      return { ...prev, stats };
    });
    setVisibleStatsCount((prev) => Math.max(1, prev - 1));
  };

  const handleDropHeroBadgeLogo = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) {
      setHeroBadgeLogoFile(file);
    }
  }, []);

  const handleClearHeroBadgeLogoSelection = () => {
    setHeroBadgeLogoFile(null);
  };

  const handleUploadHeroBadgeLogo = async () => {
    if (!heroBadgeLogoFile) {
      toast.error('Please select a logo first');
      return;
    }

    try {
      setHeroBadgeLogoSubmitting(true);
      const updated = await appSettingsService.uploadHomeHeroBadgeLogo(heroBadgeLogoFile);
      const nextUrl = updated?.homeHeroContent?.badgeLogoUrl || '';
      setHeroContent((prev) => ({ ...prev, badgeLogoUrl: nextUrl }));
      setHeroBadgeLogoFile(null);
      toast.success('Hero badge logo updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload hero badge logo');
    } finally {
      setHeroBadgeLogoSubmitting(false);
    }
  };

  const handleRemoveHeroBadgeLogo = async () => {
    if (heroBadgeLogoFile) {
      setHeroBadgeLogoFile(null);
      return;
    }

    try {
      setHeroBadgeLogoSubmitting(true);
      await appSettingsService.removeHomeHeroBadgeLogo();
      setHeroContent((prev) => ({ ...prev, badgeLogoUrl: '' }));
      setHeroBadgeLogoFile(null);
      toast.success('Hero badge logo removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove hero badge logo');
    } finally {
      setHeroBadgeLogoSubmitting(false);
    }
  };

  const handleUploadHeroStatIcon = async (index, file) => {
    try {
      setHeroStatIconUploadingIndex(index);
      const updated = await appSettingsService.uploadHomeHeroStatIcon(index, file);
      const next = updated?.homeHeroContent;
      const nextStatsRaw = Array.isArray(next?.stats) ? next.stats : [];
      const nextStatsFour = [0, 1, 2, 3].map((i) => ({
        value: nextStatsRaw[i]?.value != null ? String(nextStatsRaw[i].value) : '',
        label: nextStatsRaw[i]?.label != null ? String(nextStatsRaw[i].label) : '',
        icon: nextStatsRaw[i]?.icon != null ? String(nextStatsRaw[i].icon) : '',
      }));
      setHeroContent((prev) => ({ ...prev, stats: nextStatsFour }));
      toast.success('Stat icon uploaded');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload stat icon');
    } finally {
      setHeroStatIconUploadingIndex(null);
    }
  };

  const handleSaveHeroContent = async () => {
    try {
      setHeroContentSubmitting(true);
      const payload = {
        badgeLogoUrl: heroContent.badgeLogoUrl || '',
        headline: heroContent.headline,
        headlineAccent: heroContent.headlineAccent || '',
        description: heroContent.description,
        cta: {
          label: heroContent?.cta?.label || '',
          href: heroContent?.cta?.href || '',
          icon: heroContent?.cta?.icon || '',
          buttonColor: heroContent?.cta?.buttonColor || '',
          buttonTextColor: heroContent?.cta?.buttonTextColor || '',
        },
        secondaryCtas: (heroContent.secondaryCtas || []).map((row) => ({
          label: row?.label || '',
          href: row?.href || '',
          icon: row?.icon || '',
          buttonColor: row?.buttonColor || '',
          buttonTextColor: row?.buttonTextColor || '',
        })),
        statIconSize: Number(heroContent?.statIconSize || 26),
        stats: (heroContent.stats || []).map((row) => ({
          value: row?.value || '',
          label: row?.label || '',
          icon: row?.icon || '',
        })),
      };
      const updated = await appSettingsService.updateHomeHeroContent(payload);
      const next = updated?.homeHeroContent;
      if (next && typeof next === 'object') {
        const nextStatsRaw = Array.isArray(next.stats) ? next.stats : [];
        const nextStatsFour = [0, 1, 2, 3].map((i) => ({
          value: nextStatsRaw[i]?.value != null ? String(nextStatsRaw[i].value) : '',
          label: nextStatsRaw[i]?.label != null ? String(nextStatsRaw[i].label) : '',
          icon: nextStatsRaw[i]?.icon != null ? String(nextStatsRaw[i].icon) : '',
        }));
        const nextSecondary = Array.isArray(next.secondaryCtas) ? next.secondaryCtas : [];
        setHeroContent({
          badgeLogoUrl: next.badgeLogoUrl || '',
          headline: next.headline || '',
          headlineAccent: next.headlineAccent || '',
          description: next.description || '',
          cta: {
            label: next?.cta?.label || '',
            href: next?.cta?.href || '',
            icon: next?.cta?.icon || '',
            buttonColor: next?.cta?.buttonColor || '',
            buttonTextColor: next?.cta?.buttonTextColor || '',
          },
          secondaryCtas: nextSecondary.slice(0, 5).map((item) => ({
            label: item?.label != null ? String(item.label) : '',
            href: item?.href != null ? String(item.href) : '',
            icon: item?.icon != null ? String(item.icon) : '',
            buttonColor: item?.buttonColor != null ? String(item.buttonColor) : '',
            buttonTextColor: item?.buttonTextColor != null ? String(item.buttonTextColor) : '',
          })),
          statIconSize: Number.isFinite(Number(next?.statIconSize)) ? Number(next.statIconSize) : 26,
          stats: nextStatsFour,
        });
        setVisibleStatsCount(Math.max(1, nextStatsFour.filter((s) => s.label || s.value || s.icon).length));
      }
      toast.success('Home hero content updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update hero content');
    } finally {
      setHeroContentSubmitting(false);
    }
  };

  const updateHomeCardField = (index, field, value) => {
    setCardsContent((prev) => {
      const nextCards = [...(prev.cards || [])];
      while (nextCards.length <= index && nextCards.length < HOME_CARDS_MAX) {
        nextCards.push(emptyHomeCard(getDefaultCardIcon(nextCards.length)));
      }
      if (!nextCards[index]) return prev;
      nextCards[index] = { ...nextCards[index], [field]: value };
      return { ...prev, cards: nextCards };
    });
  };

  const addHomeCardRow = () => {
    setCardsContent((prev) => {
      const nextCards = [...(prev.cards || [])];
      if (nextCards.length >= HOME_CARDS_MAX) return prev;
      const newCardIndex = nextCards.length;
      nextCards.push(emptyHomeCard(getDefaultCardIcon(nextCards.length)));
      setPendingScrollCardIndex(newCardIndex);
      return { ...prev, cards: nextCards };
    });
  };

  useEffect(() => {
    if (pendingScrollCardIndex == null) return;
    const target = homeCardRefs.current[pendingScrollCardIndex];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPendingScrollCardIndex(null);
  }, [cardsContent.cards, pendingScrollCardIndex]);

  const removeHomeCardRow = (index) => {
    setCardsContent((prev) => {
      const nextCards = [...(prev.cards || [])];
      if (nextCards.length <= 1) return prev;
      nextCards.splice(index, 1);
      return { ...prev, cards: nextCards };
    });
  };

  const openIconPickerForCard = (index) => {
    setIconToolCardIndex(index);
    setIconSearchQuery('');
    setIconToolOpen(true);
  };

  const openIconPickerForContactField = (fieldKey) => {
    setContactIconField(fieldKey);
    setIconSearchQuery('');
    setContactIconToolOpen(true);
  };

  const handleSaveHomeCardsContent = async () => {
    try {
      setCardsContentSubmitting(true);
      const payload = {
        heading: cardsContent.heading || '',
        headingAccent: cardsContent.headingAccent || '',
        headingColor: cardsContent.headingColor || '',
        headingAccentColor: cardsContent.headingAccentColor || '',
        subtitle: cardsContent.subtitle || '',
        cards: (cardsContent.cards || []).slice(0, HOME_CARDS_MAX).map((card) => ({
          icon: card?.icon || '',
          title: card?.title || '',
          description: card?.description || '',
        })),
      };
      const updated = await appSettingsService.updateHomeCardsContent(payload);
      const next = updated?.homeCardsContent || {};
      const nextCardsRows = Array.isArray(next?.cards) ? next.cards : [];
      setCardsContent({
        heading: String(next?.heading || 'Powered by').trim(),
        headingAccent: String(next?.headingAccent || 'Artificial Intelligence').trim(),
        headingColor: String(next?.headingColor || '').trim(),
        headingAccentColor: String(next?.headingAccentColor || '').trim(),
        subtitle: String(
          next?.subtitle || 'Experience the future of community learning with AI-driven features that adapt to your needs'
        ).trim(),
        cards: (nextCardsRows.length
          ? nextCardsRows
          : [emptyHomeCard(getDefaultCardIcon(0)), emptyHomeCard(getDefaultCardIcon(1)), emptyHomeCard(getDefaultCardIcon(2))]
        )
          .slice(0, HOME_CARDS_MAX)
          .map((card, i) => ({
            icon: String(card?.icon || getDefaultCardIcon(i) || '').trim(),
            title: String(card?.title || '').trim(),
            description: String(card?.description || '').trim(),
          })),
      });
      toast.success('Home cards content updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update home cards content');
    } finally {
      setCardsContentSubmitting(false);
    }
  };

  const applyFaqFromSettings = (appSettings) => {
    const remoteFaq = appSettings?.faqContent || {};
    const remoteFaqRows = Array.isArray(remoteFaq?.items) ? remoteFaq.items : [];
    setFaqContent({
      pageHeading: String(remoteFaq?.pageHeading || '').trim(),
      items: remoteFaqRows
        .slice(0, FAQ_ITEMS_MAX)
        .map((item) => ({
          question: String(item?.question || '').trim(),
          answer: String(item?.answer || '').trim(),
        })),
    });
  };

  const applyFeesFromSettings = (appSettings) => {
    setFeesContent(
      normalizeProgrammeFeesContent(appSettings?.programmeFeesContent)
    );
  };

  const applyCurriculumFromSettings = (appSettings) => {
    setCurriculumContent(
      normalizeCurriculumContent(appSettings?.curriculumContent)
    );
  };

  const handleSaveCurriculumContent = async (contentOverride) => {
    const source = contentOverride || curriculumContent;
    try {
      setCurriculumContentSubmitting(true);
      const payload = {
        smallTitle: source?.smallTitle || '',
        subtext: source?.subtext || '',
        categoryIds: Array.isArray(source?.categoryIds) ? source.categoryIds : [],
        courseIds: Array.isArray(source?.courseIds) ? source.courseIds : [],
      };
      const { settings: updated, curriculum } = await appSettingsService.updateCurriculumContent(payload);
      applyCurriculumFromSettings(updated);
      toast.success('Curriculum updated');
      return curriculum;
    } catch (error) {
      toast.error(error?.message || 'Failed to update curriculum');
      throw error;
    } finally {
      setCurriculumContentSubmitting(false);
    }
  };

  const handleSaveTestimonialsContent = async (contentOverride) => {
    const source = contentOverride || testimonialsContent;
    try {
      setTestimonialsContentSubmitting(true);
      const updated = await appSettingsService.updateHomeTestimonialsContent(source);
      setTestimonialsContent(resolveTestimonialsContent(updated?.homeTestimonialsContent));
      if (!contentOverride) {
        toast.success('Testimonials section updated');
      }
      return updated;
    } catch (error) {
      toast.error(error?.message || 'Failed to update testimonials section');
      throw error;
    } finally {
      setTestimonialsContentSubmitting(false);
    }
  };

  const handleSaveProgrammeStructureContent = async (contentOverride) => {
    const source = contentOverride || programmeStructureContent;
    try {
      setProgrammeStructureContentSubmitting(true);
      const updated = await appSettingsService.updateHomeProgrammeStructureContent(source);
      setProgrammeStructureContent(
        resolveProgrammeStructureContent(updated?.homeProgrammeStructureContent)
      );
      if (!contentOverride) {
        toast.success('Programme structure updated');
      }
      return updated;
    } catch (error) {
      toast.error(error?.message || 'Failed to update programme structure');
      throw error;
    } finally {
      setProgrammeStructureContentSubmitting(false);
    }
  };

  const handleUploadProgrammeStructurePhaseIcon = async (phaseId, file) => {
    const id = String(phaseId || '').trim();
    if (!id) {
      toast.error('Save the phase first, then upload an image');
      return null;
    }
    try {
      setProgrammeStructurePhaseIconUploadingId(id);
      const updated = await appSettingsService.uploadHomeProgrammeStructurePhaseIcon(id, file);
      setProgrammeStructureContent(
        resolveProgrammeStructureContent(updated?.homeProgrammeStructureContent)
      );
      toast.success('Phase icon uploaded');
      return updated;
    } catch (error) {
      toast.error(error?.message || 'Failed to upload phase icon');
      throw error;
    } finally {
      setProgrammeStructurePhaseIconUploadingId(null);
    }
  };

  const handleSaveFundingEligibilityContent = async (contentOverride) => {
    const source = contentOverride || fundingEligibilityContent;
    try {
      setFundingEligibilityContentSubmitting(true);
      const updated = await appSettingsService.updateHomeFundingEligibilityContent(source);
      setFundingEligibilityContent(
        resolveFundingEligibilityContent(updated?.homeFundingEligibilityContent)
      );
      if (!contentOverride) {
        toast.success('Funding & eligibility updated');
      }
      return updated;
    } catch (error) {
      toast.error(error?.message || 'Failed to update funding & eligibility');
      throw error;
    } finally {
      setFundingEligibilityContentSubmitting(false);
    }
  };

  const handleSaveEligibilityMembershipContent = async (contentOverride) => {
    const source = contentOverride || eligibilityMembershipContent;
    try {
      setEligibilityMembershipContentSubmitting(true);
      const updated = await appSettingsService.updateHomeEligibilityMembershipContent(source);
      setEligibilityMembershipContent(
        resolveEligibilityMembershipContent(updated?.homeEligibilityMembershipContent)
      );
      if (!contentOverride) {
        toast.success('Eligibility & membership section updated');
      }
      return updated;
    } catch (error) {
      toast.error(error?.message || 'Failed to update eligibility & membership section');
      throw error;
    } finally {
      setEligibilityMembershipContentSubmitting(false);
    }
  };

  const handleDropEligibilityMembershipHero = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) setEligibilityMembershipHeroFile(file);
  }, []);

  const handleClearEligibilityMembershipHeroSelection = () => {
    setEligibilityMembershipHeroFile(null);
  };

  const handleUploadEligibilityMembershipHero = async () => {
    if (!eligibilityMembershipHeroFile) {
      toast.error('Please select an image first');
      return;
    }
    try {
      setEligibilityMembershipHeroSubmitting(true);
      const updated = await appSettingsService.uploadHomeEligibilityMembershipHero(eligibilityMembershipHeroFile);
      setEligibilityMembershipContent(
        resolveEligibilityMembershipContent(updated?.homeEligibilityMembershipContent)
      );
      setEligibilityMembershipHeroFile(null);
      toast.success('Eligibility section photo updated');
    } catch (error) {
      const status = error?.response?.status;
      if (status === 413) {
        toast.error(
          'Image is too large for the server upload limit. Try a smaller JPG/PNG (under 1 MB) or ask ops to raise client_max_body_size on the API proxy.'
        );
      } else {
        toast.error(error?.message || 'Failed to upload eligibility section photo');
      }
    } finally {
      setEligibilityMembershipHeroSubmitting(false);
    }
  };

  const handleRemoveEligibilityMembershipHero = async () => {
    if (eligibilityMembershipHeroFile) {
      setEligibilityMembershipHeroFile(null);
      return;
    }
    if (!String(eligibilityMembershipContent?.leftPanel?.heroImageUrl || '').trim()) return;
    try {
      setEligibilityMembershipHeroSubmitting(true);
      const updated = await appSettingsService.removeHomeEligibilityMembershipHero();
      setEligibilityMembershipContent(
        resolveEligibilityMembershipContent(updated?.homeEligibilityMembershipContent)
      );
      toast.success('Eligibility section photo removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove eligibility section photo');
    } finally {
      setEligibilityMembershipHeroSubmitting(false);
    }
  };

  const handleSaveCeoLaunchContent = async () => {
    const videoUrl = String(ceoLaunchContent?.videoUrl || '').trim();
    const hasUpload = Boolean(String(ceoLaunchContent?.videoFileUrl || '').trim());
    if (videoUrl && hasUpload) {
      toast.error('Remove the uploaded video or clear the video URL — use only one.');
      return;
    }
    try {
      setCeoLaunchContentSubmitting(true);
      const payload = {
        ...ceoLaunchContent,
        ...(videoUrl ? { videoFileUrl: '' } : {}),
      };
      const updated = await appSettingsService.updateHomeCeoLaunchContent(payload);
      setCeoLaunchContent(resolveCeoLaunchContent(updated?.homeCeoLaunchContent));
      toast.success('CEO launch section updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update CEO launch section');
    } finally {
      setCeoLaunchContentSubmitting(false);
    }
  };

  const handleDropCeoLaunchPoster = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) setCeoLaunchPosterFile(file);
  }, []);

  const handleClearCeoLaunchPosterSelection = () => {
    setCeoLaunchPosterFile(null);
  };

  const handleUploadCeoLaunchPoster = async () => {
    if (!ceoLaunchPosterFile) {
      toast.error('Please select an image first');
      return;
    }
    try {
      setCeoLaunchPosterSubmitting(true);
      const updated = await appSettingsService.uploadHomeCeoLaunchPoster(ceoLaunchPosterFile);
      setCeoLaunchContent(resolveCeoLaunchContent(updated?.homeCeoLaunchContent));
      setCeoLaunchPosterFile(null);
      toast.success('CEO launch poster updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload poster');
    } finally {
      setCeoLaunchPosterSubmitting(false);
    }
  };

  const handleRemoveCeoLaunchPoster = async () => {
    if (!String(ceoLaunchContent?.posterImageUrl || '').trim()) return;
    try {
      setCeoLaunchPosterSubmitting(true);
      const updated = await appSettingsService.removeHomeCeoLaunchPoster();
      setCeoLaunchContent(resolveCeoLaunchContent(updated?.homeCeoLaunchContent));
      setCeoLaunchPosterFile(null);
      toast.success('CEO launch poster removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove poster');
    } finally {
      setCeoLaunchPosterSubmitting(false);
    }
  };

  const handleSelectCeoLaunchVideo = useCallback((file) => {
    if (!file) return;
    setCeoLaunchVideoFile(file);
    setCeoLaunchContent((prev) => ({ ...prev, videoUrl: '' }));
  }, []);

  const handleClearCeoLaunchVideoSelection = () => {
    setCeoLaunchVideoFile(null);
  };

  const handleRemoveAllCeoLaunchVideo = async () => {
    const hasUpload = Boolean(String(ceoLaunchContent?.videoFileUrl || '').trim());
    const hasUrl = Boolean(String(ceoLaunchContent?.videoUrl || '').trim());
    if (!hasUpload && !hasUrl && !ceoLaunchVideoFile) return;

    setCeoLaunchVideoFile(null);

    try {
      if (hasUpload) {
        setCeoLaunchVideoSubmitting(true);
        const updated = await appSettingsService.removeHomeCeoLaunchVideo();
        setCeoLaunchContent(resolveCeoLaunchContent(updated?.homeCeoLaunchContent));
      } else if (hasUrl) {
        setCeoLaunchContentSubmitting(true);
        const updated = await appSettingsService.updateHomeCeoLaunchContent({
          ...ceoLaunchContent,
          videoUrl: '',
        });
        setCeoLaunchContent(resolveCeoLaunchContent(updated?.homeCeoLaunchContent));
      } else {
        setCeoLaunchContent((prev) => ({ ...prev, videoUrl: '' }));
      }
      toast.success('CEO launch video removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove video');
    } finally {
      setCeoLaunchVideoSubmitting(false);
      setCeoLaunchContentSubmitting(false);
    }
  };

  const handleUploadCeoLaunchVideo = async () => {
    if (!ceoLaunchVideoFile) {
      toast.error('Please select a video file first');
      return;
    }
    if (String(ceoLaunchContent?.videoUrl || '').trim()) {
      toast.error('Clear the video URL first — use only upload or URL, not both.');
      return;
    }
    try {
      setCeoLaunchVideoSubmitting(true);
      const updated = await appSettingsService.uploadHomeCeoLaunchVideo(ceoLaunchVideoFile);
      setCeoLaunchContent(resolveCeoLaunchContent(updated?.homeCeoLaunchContent));
      setCeoLaunchVideoFile(null);
      toast.success('CEO launch video uploaded');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload video');
    } finally {
      setCeoLaunchVideoSubmitting(false);
    }
  };

  const handleUploadCeoLaunchStatIcon = async (index, file) => {
    if (!file) return;
    try {
      setCeoLaunchStatIconUploadingIndex(index);
      const updated = await appSettingsService.uploadHomeCeoLaunchStatIcon(index, file);
      setCeoLaunchContent(resolveCeoLaunchContent(updated?.homeCeoLaunchContent));
      toast.success('CEO stat icon uploaded');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload CEO stat icon');
    } finally {
      setCeoLaunchStatIconUploadingIndex(null);
    }
  };

  const handleRemoveCeoLaunchStatIcon = async (index) => {
    try {
      setCeoLaunchStatIconUploadingIndex(index);
      const updated = await appSettingsService.removeHomeCeoLaunchStatIcon(index);
      setCeoLaunchContent(resolveCeoLaunchContent(updated?.homeCeoLaunchContent));
      toast.success('CEO stat icon removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove CEO stat icon');
    } finally {
      setCeoLaunchStatIconUploadingIndex(null);
    }
  };

  const handleRemoveCeoLaunchVideo = async () => {
    if (!String(ceoLaunchContent?.videoFileUrl || '').trim()) return;
    try {
      setCeoLaunchVideoSubmitting(true);
      const updated = await appSettingsService.removeHomeCeoLaunchVideo();
      setCeoLaunchContent(resolveCeoLaunchContent(updated?.homeCeoLaunchContent));
      setCeoLaunchVideoFile(null);
      toast.success('CEO launch video removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove video');
    } finally {
      setCeoLaunchVideoSubmitting(false);
    }
  };

  const handleSavePartnerWithIscaContent = async () => {
    try {
      setPartnerWithIscaContentSubmitting(true);
      const updated = await appSettingsService.updatePartnerWithIscaContent(partnerWithIscaContent);
      setPartnerWithIscaContent(
        normalizePartnerWithIscaContent(updated?.partnerWithIscaContent)
      );
      toast.success('Partner with ISCA page updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update Partner with ISCA page');
    } finally {
      setPartnerWithIscaContentSubmitting(false);
    }
  };

  const handleSaveFooterContent = async () => {
    try {
      setFooterContentSubmitting(true);
      const updated = await appSettingsService.updateFooterContent(footerContent);
      setFooterContent(normalizeFooterContent(updated?.footerContent));
      toast.success('Footer updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update footer');
    } finally {
      setFooterContentSubmitting(false);
    }
  };

  const handleDropPartnerWithIscaHero = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) setPartnerWithIscaHeroFile(file);
  }, []);

  const handleClearPartnerWithIscaHeroSelection = () => {
    setPartnerWithIscaHeroFile(null);
  };

  const handleUploadPartnerWithIscaHero = async () => {
    if (!partnerWithIscaHeroFile) {
      toast.error('Please select an image first');
      return;
    }
    try {
      setPartnerWithIscaHeroSubmitting(true);
      const updated = await appSettingsService.uploadPartnerWithIscaHero(partnerWithIscaHeroFile);
      setPartnerWithIscaContent(
        normalizePartnerWithIscaContent(updated?.partnerWithIscaContent)
      );
      setPartnerWithIscaHeroFile(null);
      toast.success('Partner with ISCA hero image updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload hero image');
    } finally {
      setPartnerWithIscaHeroSubmitting(false);
    }
  };

  const handleRemovePartnerWithIscaHero = async () => {
    if (partnerWithIscaHeroFile) {
      setPartnerWithIscaHeroFile(null);
      return;
    }
    if (!String(partnerWithIscaContent?.hero?.heroImageUrl || '').trim()) return;
    try {
      setPartnerWithIscaHeroSubmitting(true);
      const updated = await appSettingsService.removePartnerWithIscaHero();
      setPartnerWithIscaContent(
        normalizePartnerWithIscaContent(updated?.partnerWithIscaContent)
      );
      toast.success('Partner with ISCA hero image removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove hero image');
    } finally {
      setPartnerWithIscaHeroSubmitting(false);
    }
  };

  const handleSaveEmployerContent = async () => {
    try {
      setEmployerContentSubmitting(true);
      const [employerUpdated, employeeUpdated] = await Promise.all([
        appSettingsService.updateHomeEmployerContent(employerContent),
        appSettingsService.updateHomeEmployeeContent(employeeContent),
      ]);
      setEmployerContent(resolveEmployerContent(employerUpdated?.homeEmployerContent));
      setEmployeeContent(normalizeEmployeeContent(employeeUpdated?.homeEmployeeContent));
      toast.success('Employer section updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update employer section');
    } finally {
      setEmployerContentSubmitting(false);
    }
  };

  const handleDropEmployerHero = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) setEmployerHeroFile(file);
  }, []);

  const handleClearEmployerHeroSelection = () => {
    setEmployerHeroFile(null);
  };

  const handleUploadEmployerHero = async () => {
    if (!employerHeroFile) {
      toast.error('Please select an image first');
      return;
    }
    try {
      setEmployerHeroSubmitting(true);
      const updated = await appSettingsService.uploadHomeEmployerHero(employerHeroFile);
      setEmployerContent(resolveEmployerContent(updated?.homeEmployerContent));
      setEmployerHeroFile(null);
      toast.success('Employer section image updated');
    } catch (error) {
      const status = error?.response?.status;
      if (status === 413) {
        toast.error(
          'Image is too large for the server upload limit. Try a smaller JPG/PNG (under 1 MB) or ask ops to raise client_max_body_size on the API proxy.'
        );
      } else {
        toast.error(error?.message || 'Failed to upload employer image');
      }
    } finally {
      setEmployerHeroSubmitting(false);
    }
  };

  const handleRemoveEmployerHero = async () => {
    if (employerHeroFile) {
      setEmployerHeroFile(null);
      return;
    }
    if (!String(employerContent?.heroImageUrl || '').trim()) return;
    try {
      setEmployerHeroSubmitting(true);
      const updated = await appSettingsService.removeHomeEmployerHero();
      setEmployerContent(resolveEmployerContent(updated?.homeEmployerContent));
      toast.success('Employer section image removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove employer image');
    } finally {
      setEmployerHeroSubmitting(false);
    }
  };

  const handleUploadEmployerLogo = async (index, file) => {
    if (!file) return;
    try {
      setEmployerLogoUploadingIndex(index);
      const updated = await appSettingsService.uploadHomeEmployerLogo(index, file);
      setEmployerContent(resolveEmployerContent(updated?.homeEmployerContent));
      toast.success('Employer logo uploaded');
    } catch (error) {
      const status = error?.response?.status;
      if (status === 413) {
        toast.error('Logo file is too large. Try a smaller image (under 500 KB).');
      } else {
        toast.error(error?.message || 'Failed to upload employer logo');
      }
    } finally {
      setEmployerLogoUploadingIndex(null);
    }
  };

  const handleRemoveEmployerLogo = async (index) => {
    try {
      setEmployerLogoUploadingIndex(index);
      const updated = await appSettingsService.removeHomeEmployerLogo(index);
      setEmployerContent(resolveEmployerContent(updated?.homeEmployerContent));
      toast.success('Employer logo removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove employer logo');
    } finally {
      setEmployerLogoUploadingIndex(null);
    }
  };

  const handleUploadEarlyAdopterLogo = async (index, file) => {
    if (!file) return;
    try {
      setEarlyAdopterLogoUploadingIndex(index);
      const updated = await appSettingsService.uploadHomeEmployeePartnerLogo(index, file);
      setEmployeeContent(normalizeEmployeeContent(updated?.homeEmployeeContent));
      toast.success('Early Adopters logo uploaded');
    } catch (error) {
      const status = error?.response?.status;
      if (status === 413) {
        toast.error('Logo file is too large. Try a smaller image (under 500 KB).');
      } else {
        toast.error(error?.message || 'Failed to upload Early Adopters logo');
      }
    } finally {
      setEarlyAdopterLogoUploadingIndex(null);
    }
  };

  const handleRemoveEarlyAdopterLogo = async (index) => {
    try {
      setEarlyAdopterLogoUploadingIndex(index);
      const updated = await appSettingsService.removeHomeEmployeePartnerLogo(index);
      setEmployeeContent(normalizeEmployeeContent(updated?.homeEmployeeContent));
      toast.success('Early Adopters logo removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove Early Adopters logo');
    } finally {
      setEarlyAdopterLogoUploadingIndex(null);
    }
  };

  const handleSaveFeesContent = async (contentOverride) => {
    const source = contentOverride || feesContent;
    try {
      setFeesContentSubmitting(true);
      const payload = {
        heading: source?.heading || '',
        tiers: (source?.tiers || []).slice(0, PROGRAMME_FEES_TIERS_MAX).map((tier) => ({
          title: tier?.title || '',
          description: tier?.description || '',
          linkLabel: tier?.linkLabel || '',
          linkHref: tier?.linkHref || '',
          price: tier?.price || '',
          priceNote: tier?.priceNote || '',
          priceVariant: tier?.priceVariant === 'default' ? 'default' : 'primary',
        })),
        fundingPartnersHeading: source?.fundingPartnersHeading || '',
        fundingPartnersBody: source?.fundingPartnersBody || '',
        agency: {
          logoUrl: source?.agency?.logoUrl || '',
          name: source?.agency?.name || '',
          tagline: source?.agency?.tagline || '',
        },
      };
      const updated = await appSettingsService.updateProgrammeFeesContent(payload);
      applyFeesFromSettings(updated);
      toast.success('Programme fees updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update programme fees');
      throw error;
    } finally {
      setFeesContentSubmitting(false);
    }
  };

  const handleSaveFaqContent = async (contentOverride) => {
    const source = contentOverride || faqContent;
    try {
      setFaqContentSubmitting(true);
      const payload = {
        pageHeading: source?.pageHeading || '',
        items: (source?.items || []).slice(0, FAQ_ITEMS_MAX).map((item) => ({
          question: item?.question || '',
          answer: item?.answer || '',
        })),
      };
      const updated = await appSettingsService.updateFaqContent(payload);
      applyFaqFromSettings(updated);
    } catch (error) {
      toast.error(error?.message || 'Failed to update FAQ content');
      throw error;
    } finally {
      setFaqContentSubmitting(false);
    }
  };

  const handleSaveHomeJoinContent = async () => {
    try {
      setJoinContentSubmitting(true);
      const payload = {
        heading: joinContent.heading || '',
        subtitle: joinContent.subtitle || '',
        ctaLabel: joinContent.ctaLabel || '',
        ctaHref: joinContent.ctaHref || '',
        ctaIcon: joinContent.ctaIcon || '',
      };
      const updated = await appSettingsService.updateHomeJoinContent(payload);
      const next = updated?.homeJoinContent || {};
      setJoinContent({
        heading: String(next?.heading || DEFAULT_JOIN_CONTENT.heading).trim(),
        subtitle: String(next?.subtitle || DEFAULT_JOIN_CONTENT.subtitle).trim(),
        ctaLabel: String(next?.ctaLabel || DEFAULT_JOIN_CONTENT.ctaLabel).trim(),
        ctaHref: String(next?.ctaHref || DEFAULT_JOIN_CONTENT.ctaHref).trim(),
        ctaIcon: String(next?.ctaIcon || DEFAULT_JOIN_CONTENT.ctaIcon).trim(),
      });
      toast.success('Home join section updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update home join section');
    } finally {
      setJoinContentSubmitting(false);
    }
  };

  const updateContactHeroField = (field, value) => {
    setContactHeroContent((prev) => ({ ...prev, [field]: value }));
  };

  const updateContactRowField = (index, field, value) => {
    setContactHeroContent((prev) => {
      const rows = [...(prev.contacts || [])];
      while (rows.length <= index) rows.push(emptyContactRow());
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, contacts: rows };
    });
  };

  const handleSaveContactHeroContent = async () => {
    try {
      setContactHeroContentSubmitting(true);
      const payload = {
        headingLine1: contactHeroContent.headingLine1 || '',
        headingLine2: contactHeroContent.headingLine2 || '',
        infoTitle: contactHeroContent.infoTitle || '',
        infoSubtitle: contactHeroContent.infoSubtitle || '',
        contacts: (contactHeroContent.contacts || []).slice(0, 1).map((row) => ({
          details: buildContactDetailsHtml(row),
          address: row?.address || '',
          phone: row?.phone || '',
          email: row?.email || '',
          whatsapp: row?.whatsapp || '',
          whatsappLink: row?.whatsappLink || '',
          website: row?.website || '',
          addressIcon: row?.addressIcon || emptyContactRow().addressIcon,
          phoneIcon: row?.phoneIcon || emptyContactRow().phoneIcon,
          emailIcon: row?.emailIcon || emptyContactRow().emailIcon,
          whatsappIcon: row?.whatsappIcon || emptyContactRow().whatsappIcon,
          websiteIcon: row?.websiteIcon || emptyContactRow().websiteIcon,
          lat: row?.lat || '',
          lng: row?.lng || '',
        })),
      };
      const updated = await appSettingsService.updateContactHeroContent(payload);
      const next = updated?.contactHeroContent || {};
      const nextContacts = Array.isArray(next?.contacts) ? next.contacts : [];
      setContactHeroContent({
        headingLine1: String(next?.headingLine1 || 'Where').trim(),
        headingLine2: String(next?.headingLine2 || 'to find us?').trim(),
        infoTitle: String(next?.infoTitle || 'How can we help you?').trim(),
        infoSubtitle: String(
          next?.infoSubtitle || 'Fill up the form and our team will get back to you within 24 hours.'
        ).trim(),
        contacts: (nextContacts.length ? nextContacts : [emptyContactRow()]).slice(0, 1).map((row) => {
          const details = String(
            row?.details ||
              [row?.country, row?.address, row?.phoneNumber]
                .map((item) => String(item || '').trim())
                .filter(Boolean)
                .join('<br/>')
          ).trim();
          const parsedFields = parseContactDetailFields(details);

          return {
            details,
            address: String(row?.address || parsedFields.address || '').trim(),
            phone: String(row?.phone || parsedFields.phone || '').trim(),
            email: String(row?.email || parsedFields.email || '').trim(),
            whatsapp: String(row?.whatsapp || parsedFields.whatsapp || '').trim(),
            whatsappLink: String(row?.whatsappLink || '').trim(),
            website: String(row?.website || parsedFields.website || '').trim(),
            addressIcon: String(row?.addressIcon || emptyContactRow().addressIcon || '').trim(),
            phoneIcon: String(row?.phoneIcon || emptyContactRow().phoneIcon || '').trim(),
            emailIcon: String(row?.emailIcon || emptyContactRow().emailIcon || '').trim(),
            whatsappIcon: String(row?.whatsappIcon || emptyContactRow().whatsappIcon || '').trim(),
            websiteIcon: String(row?.websiteIcon || emptyContactRow().websiteIcon || '').trim(),
            lat: row?.lat != null ? String(row.lat).trim() : '',
            lng: row?.lng != null ? String(row.lng).trim() : '',
          };
        }),
      });
      toast.success('Contact hero content updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update contact hero content');
    } finally {
      setContactHeroContentSubmitting(false);
    }
  };

  const headerVisibilityOptions = [
    {
      field: 'headerWorkspaces',
      title: 'Workspaces',
      description: 'Show/hide workspace selector (Team 1, etc.)',
    },
    {
      field: 'headerLocalization',
      title: 'Language Selector',
      description: 'Show/hide language selection icon',
    },
    {
      field: 'headerNotifications',
      title: 'Notifications',
      description: 'Show/hide notifications bell icon',
    },
    {
      field: 'headerContacts',
      title: 'Contacts',
      description: 'Show/hide contacts icon',
    },
    {
      field: 'headerSettings',
      title: 'Settings',
      description: 'Show/hide settings gear icon',
    },
    {
      field: 'headerAccount',
      title: 'Account',
      description: 'Show/hide account/avatar icon',
    },
  ];

  const sectionCards = [
    {
      key: 'logo',
      badge: 'L',
      iconSrc: settingsTabSiteLogo,
      title: 'Site Logo',
      description: 'Manage public header logo image.',
    },
    {
      key: 'hero',
      badge: 'H',
      iconSrc: settingsTabHero,
      title: 'Hero',
      description: 'Manage hero background and content together.',
    },
    {
      key: 'cards',
      badge: 'C',
      iconSrc: settingsTabHomeCards,
      title: 'Home Cards',
      description: 'Manage second home section heading and cards.',
    },
    {
      key: 'join',
      badge: 'J',
      iconSrc: settingsTabJoin,
      title: 'Join Section',
      description: 'Manage call-to-action join section content.',
    },
    {
      key: 'contact',
      badge: 'CT',
      iconSrc: settingsTabContact,
      title: 'Contact Hero',
      description: 'Manage contact page banner, heading, and map points.',
    },
    {
      key: 'course-image',
      badge: 'CI',
      iconSrc: settingsTabCourse,
      title: 'Course Image',
      description: 'Manage default fallback image for course cards.',
    },
    {
      key: 'workflow-templates-pitch',
      badge: 'AI',
      icon: 'solar:clipboard-list-bold-duotone',
      title: 'Workflows intro',
      description: 'Edit the “Why use AI resources?” strip on the workflow templates page.',
    },
    {
      key: 'programme-fees',
      badge: 'F',
      icon: 'solar:wallet-money-bold-duotone',
      title: 'Programme Fees',
      description: 'Configure programme fee tiers and funding information on the home page.',
    },
    {
      key: 'programme-structure',
      badge: 'PS',
      icon: 'solar:map-arrow-right-bold-duotone',
      title: 'Programme Structure',
      description: 'Learning journey timeline — phases with titles and rich descriptions on the home page.',
    },
    {
      key: 'eligibility-membership',
      badge: 'EM',
      icon: 'solar:user-check-rounded-bold-duotone',
      title: 'Eligibility & Membership',
      description:
        'Dual-panel “Am I Eligible?” and ISCA membership promo — questions, benefits, CTAs, and left-panel photo.',
    },
    {
      key: 'funding-eligibility',
      badge: 'FE',
      icon: 'solar:wallet-money-bold-duotone',
      title: 'Funding & Eligibility',
      description: 'Funding & eligibility cards on the home page — icon, title, and description per item.',
    },
    {
      key: 'ceo-launch',
      badge: 'CEO',
      icon: 'solar:videocamera-record-bold-duotone',
      title: 'CEO Launch Video',
      description: 'Why AI Fluency Matters — video, quote, stats, and play CTA on the home page.',
    },
    {
      key: 'testimonials',
      badge: 'T',
      icon: 'solar:chat-round-like-bold-duotone',
      title: 'Testimonials',
      description: 'Learner testimonials and industry quotes on the home page.',
    },
    {
      key: 'employer',
      badge: 'E',
      icon: 'solar:buildings-2-bold-duotone',
      title: 'Employer',
      description: 'Home learners / employer block — hero image, copy, benefits, and CTAs.',
    },
    {
      key: 'partner-with-isca',
      badge: 'PI',
      icon: 'solar:handshake-bold-duotone',
      title: 'Partner with ISCA',
      description: 'Manage the full Partner with ISCA employer landing page.',
    },
    {
      key: 'faq',
      badge: 'FAQ',
      icon: 'solar:question-circle-bold-duotone',
      title: 'FAQs Page',
      description: 'Configure FAQs shown on the home page.',
    },
    {
      key: 'curriculum',
      badge: 'CU',
      icon: 'solar:book-2-bold-duotone',
      title: 'Curriculum',
      description: 'Add courses to the home page curriculum — each course’s modules are shown automatically.',
    },
    {
      key: 'footer',
      badge: 'FT',
      icon: 'solar:layers-minimalistic-bold-duotone',
      title: 'Footer',
      description: 'Manage footer stats, links, domain line, and copyright text.',
    },
    {
      key: 'header-visibility',
      badge: 'V',
      iconSrc: settingsTabHeader,
      title: 'Header Visibility',
      description: 'Toggle top bar icons visibility.',
    },
  ];

  const validSectionKeys = [
    'logo',
    'hero',
    'cards',
    'join',
    'contact',
    'course-image',
    'workflow-templates-pitch',
    'programme-fees',
    'programme-structure',
    'eligibility-membership',
    'funding-eligibility',
    'ceo-launch',
    'testimonials',
    'employer',
    'partner-with-isca',
    'faq',
    'curriculum',
    'footer',
    'header-visibility',
  ];

  useEffect(() => {
    if (!section) {
      setActiveSection('logo');
      return;
    }
    if (section === 'hero-background' || section === 'hero-content') {
      navigate(paths.admin.settingsSection('hero'), { replace: true });
      return;
    }
    if (section === 'employee') {
      navigate(paths.admin.settingsSection('employer'), { replace: true });
      return;
    }
    if (!validSectionKeys.includes(section)) {
      navigate(paths.admin.settingsSection('logo'), { replace: true });
      return;
    }
    setActiveSection(section);
  }, [section, navigate]);

  const renderHeaderVisibility = (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Header Visibility
      </Typography>

      <Grid container spacing={3}>
        {headerVisibilityOptions.map((option) => (
          <Grid key={option.field} item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                height: '100%',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={settings[option.field] ?? false}
                    onChange={() => handleToggle(option.field)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2">{option.title}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {option.description}
                    </Typography>
                  </Box>
                }
                sx={{ width: '100%', m: 0 }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  );

  const renderLogoSettings = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Site Logo
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Upload a logo for the public header. The file is stored in the backend assets folder and
            used dynamically on the frontend.
          </Typography>
        </Box>

        <Upload
          value={logoFile || logoUrl || null}
          onDrop={handleDropLogo}
          onDelete={logoFile || logoUrl ? handleRemoveLogo : undefined}
          sx={{
            '& > .MuiBox-root:first-of-type': {
              minHeight: 180,
              p: 2.5,
            },
          }}
          accept={{
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
          }}
          maxSize={5 * 1024 * 1024}
          disabled={logoLoading || logoSubmitting}
          helperText="Accepted formats: JPG, PNG, GIF, WEBP, SVG. Max size: 5 MB."
        />

        <Stack direction="row" spacing={1.5}>
          <LoadingButton
            variant="contained"
            loading={logoSubmitting}
            onClick={handleUploadLogo}
            disabled={!logoFile}
          >
            Save Logo
          </LoadingButton>

          <Button
            color="inherit"
            variant="outlined"
            onClick={logoFile ? handleClearSelection : handleRemoveLogo}
            disabled={logoSubmitting || (!logoFile && !logoUrl)}
          >
            {logoFile ? 'Clear Selected' : 'Remove Current Logo'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );

  const renderHomeHeroSettings = (
    <HeroImageCard
      heroFile={heroFile}
      heroUrl={heroUrl}
      heroLoading={heroLoading}
      heroSubmitting={heroSubmitting}
      onDrop={handleDropHero}
      onDelete={handleRemoveHero}
      onSave={handleUploadHero}
      onClearOrRemove={heroFile ? handleClearHeroSelection : handleRemoveHero}
    />
  );

  const renderHomeHeroContentSettings = (
    <Stack spacing={3}>
      <HeroTextCard
        heroContent={heroContent}
        onFieldChange={updateHeroField}
        badgeLogoFile={heroBadgeLogoFile}
        badgeLogoSubmitting={heroBadgeLogoSubmitting}
        onDropBadgeLogo={handleDropHeroBadgeLogo}
        onSaveBadgeLogo={handleUploadHeroBadgeLogo}
        onRemoveBadgeLogo={handleRemoveHeroBadgeLogo}
        onClearBadgeLogoSelection={handleClearHeroBadgeLogoSelection}
      />
      <EventAndStatsCard
        heroContent={heroContent}
        updateHeroStat={updateHeroStat}
        onStatIconSizeChange={(value) =>
          setHeroContent((prev) => ({
            ...prev,
            statIconSize: Math.max(16, Math.min(56, Number(value) || 26)),
          }))
        }
        onUploadStatIcon={handleUploadHeroStatIcon}
        uploadingStatIconIndex={heroStatIconUploadingIndex}
        visibleStatsCount={visibleStatsCount}
        addVisibleStatRow={addVisibleStatRow}
        removeVisibleStatRow={removeVisibleStatRow}
      />
      <CtaButtonCard heroContent={heroContent} setHeroContent={setHeroContent} />

      <Box>
        <LoadingButton variant="contained" loading={heroContentSubmitting} onClick={handleSaveHeroContent}>
          Save hero content
        </LoadingButton>
      </Box>
    </Stack>
  );

  const renderHomeCardsSettings = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Home Cards Section
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Configure the second home section heading, subtitle, and multiple cards (up to {HOME_CARDS_MAX}).
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Heading (left)"
              value={cardsContent.heading}
              onChange={(event) => setCardsContent((prev) => ({ ...prev, heading: event.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Heading accent (highlighted)"
              value={cardsContent.headingAccent}
              onChange={(event) => setCardsContent((prev) => ({ ...prev, headingAccent: event.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ColorPaletteField
              label="Heading color"
              value={cardsContent.headingColor}
              onChange={(value) => setCardsContent((prev) => ({ ...prev, headingColor: value }))}
              onOpenGenerator={() => setColorToolOpen(true)}
              presets={[
                '#1e293b',
                '#0f172a',
                '#334155',
                '#0ea5e9',
                '#2563eb',
                '#0f766e',
                '#7c3aed',
                '#be123c',
              ]}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ColorPaletteField
              label="Heading accent color"
              value={cardsContent.headingAccentColor}
              onChange={(value) => setCardsContent((prev) => ({ ...prev, headingAccentColor: value }))}
              onOpenGenerator={() => setColorToolOpen(true)}
              presets={[
                '#ef4444',
                '#f97316',
                '#f59e0b',
                '#84cc16',
                '#22c55e',
                '#06b6d4',
                '#3b82f6',
                '#a855f7',
              ]}
            />
          </Grid>
          <Grid item xs={12}>
            <Stack spacing={0.75}>
              <Typography variant="subtitle2">Subtitle</Typography>
              <Editor
                value={cardsContent.subtitle}
                onChange={(value) => setCardsContent((prev) => ({ ...prev, subtitle: value }))}
                placeholder="Write section subtitle..."
                editable
                slotProps={{
                  wrap: {
                    sx: {
                      minHeight: 150,
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    },
                  },
                }}
              />
            </Stack>
          </Grid>
        </Grid>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Cards
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Limit: up to {HOME_CARDS_MAX} cards
            </Typography>
          </Stack>

          <Button
            variant="outlined"
            onClick={addHomeCardRow}
            disabled={(cardsContent.cards || []).length >= HOME_CARDS_MAX}
          >
            Add card
          </Button>
        </Stack>

        <Grid container spacing={2}>
          {(cardsContent.cards || []).map((cardRow, i) => (
            <Grid
              item
              xs={12}
              md={6}
              key={`home-card-config-${i}`}
              ref={(node) => {
                if (node) {
                  homeCardRefs.current[i] = node;
                } else {
                  delete homeCardRefs.current[i];
                }
              }}
            >
              <HomeCardItem
                index={i}
                cardRow={cardRow}
                canRemove={(cardsContent.cards || []).length > 1}
                onRemove={() => removeHomeCardRow(i)}
                onPickIcon={() => openIconPickerForCard(i)}
                onTitleChange={(event) => updateHomeCardField(i, 'title', event.target.value)}
                onDescriptionChange={(value) => updateHomeCardField(i, 'description', value)}
                getDefaultCardIcon={getDefaultCardIcon}
              />
            </Grid>
          ))}
        </Grid>

        <Stack direction="row" spacing={1.5} sx={{ pt: 0.5 }}>
          <LoadingButton variant="contained" loading={cardsContentSubmitting} onClick={handleSaveHomeCardsContent}>
            Save home cards content
          </LoadingButton>
        </Stack>

        <HexColorToolDrawer
          open={colorToolOpen}
          onClose={() => setColorToolOpen(false)}
          startColor={generatorStartColor}
          endColor={generatorEndColor}
          onStartColorChange={(event) => setGeneratorStartColor(event.target.value)}
          onEndColorChange={(event) => setGeneratorEndColor(event.target.value)}
          onApplyHeadingColor={() => setCardsContent((prev) => ({ ...prev, headingColor: generatorStartColor }))}
          onApplyAccentColor={() => setCardsContent((prev) => ({ ...prev, headingAccentColor: generatorEndColor }))}
          headingColor={cardsContent.headingColor}
          accentColor={cardsContent.headingAccentColor}
        />

        <IconPickerDrawer
          open={iconToolOpen}
          onClose={() => setIconToolOpen(false)}
          contextLabel={iconToolCardIndex >= 0 ? `card ${iconToolCardIndex + 1}` : 'join section button'}
          searchQuery={iconSearchQuery}
          onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
          filteredIcons={filteredCategoryIcons}
          selectedIcon={
            iconToolCardIndex >= 0
              ? cardsContent.cards?.[iconToolCardIndex]?.icon || ''
              : joinContent.ctaIcon || DEFAULT_JOIN_CONTENT.ctaIcon
          }
          onSelectIcon={(iconName) => {
            if (iconToolCardIndex >= 0) {
              updateHomeCardField(iconToolCardIndex, 'icon', iconName);
            } else {
              setJoinContent((prev) => ({ ...prev, ctaIcon: iconName }));
            }
            setIconToolOpen(false);
          }}
        />
      </Stack>
    </Card>
  );

  const renderProgrammeFeesSettings = (
    <FeesSettingsCard
      feesContent={feesContent}
      setFeesContent={setFeesContent}
      feesContentSubmitting={feesContentSubmitting}
      onSave={handleSaveFeesContent}
      maxTiers={PROGRAMME_FEES_TIERS_MAX}
    />
  );

  const renderProgrammeStructureSettings = (
    <ProgrammeStructureSettingsCard
      content={programmeStructureContent}
      setContent={setProgrammeStructureContent}
      submitting={programmeStructureContentSubmitting}
      onSave={handleSaveProgrammeStructureContent}
      onUploadPhaseIcon={handleUploadProgrammeStructurePhaseIcon}
      uploadingPhaseIconId={programmeStructurePhaseIconUploadingId}
    />
  );

  const renderFundingEligibilitySettings = (
    <FundingEligibilitySettingsCard
      content={fundingEligibilityContent}
      setContent={setFundingEligibilityContent}
      submitting={fundingEligibilityContentSubmitting}
      onSave={handleSaveFundingEligibilityContent}
    />
  );

  const renderEligibilityMembershipSettings = (
    <EligibilityMembershipSettingsCard
      content={eligibilityMembershipContent}
      setContent={setEligibilityMembershipContent}
      submitting={eligibilityMembershipContentSubmitting}
      onSave={handleSaveEligibilityMembershipContent}
      heroFile={eligibilityMembershipHeroFile}
      heroUrl={eligibilityMembershipContent?.leftPanel?.heroImageUrl || ''}
      heroSubmitting={eligibilityMembershipHeroSubmitting}
      onHeroDrop={handleDropEligibilityMembershipHero}
      onHeroDelete={handleRemoveEligibilityMembershipHero}
      onHeroSave={handleUploadEligibilityMembershipHero}
      onHeroClearOrRemove={handleRemoveEligibilityMembershipHero}
    />
  );

  const renderCeoLaunchSettings = (
    <CeoLaunchSettingsCard
      content={ceoLaunchContent}
      setContent={setCeoLaunchContent}
      submitting={ceoLaunchContentSubmitting}
      onSave={handleSaveCeoLaunchContent}
      posterFile={ceoLaunchPosterFile}
      posterUrl={ceoLaunchContent?.posterImageUrl || ''}
      posterSubmitting={ceoLaunchPosterSubmitting}
      onPosterDrop={handleDropCeoLaunchPoster}
      onPosterDelete={handleClearCeoLaunchPosterSelection}
      onPosterSave={handleUploadCeoLaunchPoster}
      onPosterClearOrRemove={handleRemoveCeoLaunchPoster}
      videoFile={ceoLaunchVideoFile}
      videoSubmitting={ceoLaunchVideoSubmitting}
      onVideoFileSelect={handleSelectCeoLaunchVideo}
      onVideoClearPending={handleClearCeoLaunchVideoSelection}
      onVideoSave={handleUploadCeoLaunchVideo}
      onVideoRemoveUploaded={handleRemoveCeoLaunchVideo}
      onVideoRemoveAll={handleRemoveAllCeoLaunchVideo}
      onUploadStatIcon={handleUploadCeoLaunchStatIcon}
      onRemoveStatIcon={handleRemoveCeoLaunchStatIcon}
      uploadingStatIconIndex={ceoLaunchStatIconUploadingIndex}
    />
  );

  const renderTestimonialsSettings = (
    <TestimonialsSettingsCard
      content={testimonialsContent}
      setContent={setTestimonialsContent}
      submitting={testimonialsContentSubmitting}
      onSave={handleSaveTestimonialsContent}
    />
  );

  const renderPartnerWithIscaSettings = (
    <PartnerWithIscaSettingsCard
      content={partnerWithIscaContent}
      setContent={setPartnerWithIscaContent}
      submitting={partnerWithIscaContentSubmitting}
      onSave={handleSavePartnerWithIscaContent}
      heroFile={partnerWithIscaHeroFile}
      heroUrl={partnerWithIscaContent?.hero?.heroImageUrl || ''}
      heroSubmitting={partnerWithIscaHeroSubmitting}
      onHeroDrop={handleDropPartnerWithIscaHero}
      onHeroDelete={handleRemovePartnerWithIscaHero}
      onHeroSave={handleUploadPartnerWithIscaHero}
      onHeroClearOrRemove={
        partnerWithIscaHeroFile
          ? handleClearPartnerWithIscaHeroSelection
          : handleRemovePartnerWithIscaHero
      }
    />
  );

  const renderFooterSettings = (
    <FooterSettingsCard
      content={footerContent}
      setContent={setFooterContent}
      submitting={footerContentSubmitting}
      onSave={handleSaveFooterContent}
    />
  );

  const renderEmployerSettings = (
    <EmployerSettingsCard
      content={employerContent}
      setContent={setEmployerContent}
      submitting={employerContentSubmitting}
      onSave={handleSaveEmployerContent}
      heroFile={employerHeroFile}
      heroUrl={employerContent?.heroImageUrl || ''}
      heroSubmitting={employerHeroSubmitting}
      onHeroDrop={handleDropEmployerHero}
      onHeroDelete={handleRemoveEmployerHero}
      onHeroSave={handleUploadEmployerHero}
      onHeroClearOrRemove={
        employerHeroFile ? handleClearEmployerHeroSelection : handleRemoveEmployerHero
      }
      onUploadLogo={handleUploadEmployerLogo}
      onRemoveLogo={handleRemoveEmployerLogo}
      uploadingLogoIndex={employerLogoUploadingIndex}
      earlyAdoptersContent={employeeContent}
      setEarlyAdoptersContent={setEmployeeContent}
      onUploadEarlyAdopterLogo={handleUploadEarlyAdopterLogo}
      onRemoveEarlyAdopterLogo={handleRemoveEarlyAdopterLogo}
      uploadingEarlyAdopterLogoIndex={earlyAdopterLogoUploadingIndex}
    />
  );

  const renderFaqSettings = (
    <FaqSettingsCard
      faqContent={faqContent}
      setFaqContent={setFaqContent}
      faqContentSubmitting={faqContentSubmitting}
      onSave={handleSaveFaqContent}
      maxItems={FAQ_ITEMS_MAX}
    />
  );

  const renderCurriculumSettings = (
    <CurriculumSettingsCard
      curriculumContent={curriculumContent}
      setCurriculumContent={setCurriculumContent}
      curriculumContentSubmitting={curriculumContentSubmitting}
      onSave={handleSaveCurriculumContent}
      maxCourses={20}
    />
  );

  const renderHomeJoinSettings = (
    <HomeJoinSettingsCard
      joinContent={joinContent}
      setJoinContent={setJoinContent}
      joinContentSubmitting={joinContentSubmitting}
      onSave={handleSaveHomeJoinContent}
      defaultJoinIcon={DEFAULT_JOIN_CONTENT.ctaIcon}
    />
  );

  const renderContactHeroSettings = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Contact Hero Section
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Upload dynamic contact banner (.webp supported), update hero text, and manage map points.
          </Typography>
        </Box>

        <Upload
          value={contactHeroFile || contactHeroUrl || null}
          onDrop={handleDropContactHero}
          onDelete={contactHeroFile || contactHeroUrl ? handleRemoveContactHero : undefined}
          sx={{
            '& > .MuiBox-root:first-of-type': {
              minHeight: 180,
              p: 2.5,
            },
          }}
          accept={{
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
          }}
          maxSize={5 * 1024 * 1024}
          disabled={contactHeroLoading || contactHeroSubmitting}
          helperText="Accepted formats: JPG, PNG, GIF, WEBP, SVG. Max size: 5 MB."
        />

        <Stack direction="row" spacing={1.5}>
          <LoadingButton
            variant="contained"
            loading={contactHeroSubmitting}
            onClick={handleUploadContactHero}
            disabled={!contactHeroFile}
          >
            Save Contact Banner
          </LoadingButton>
          <Button
            color="inherit"
            variant="outlined"
            onClick={contactHeroFile ? handleClearContactHeroSelection : handleRemoveContactHero}
            disabled={contactHeroSubmitting || (!contactHeroFile && !contactHeroUrl)}
          >
            {contactHeroFile ? 'Clear Selected' : 'Remove Current Banner'}
          </Button>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Heading line 1"
              value={contactHeroContent.headingLine1}
              onChange={(event) => updateContactHeroField('headingLine1', event.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Heading line 2"
              value={contactHeroContent.headingLine2}
              onChange={(event) => updateContactHeroField('headingLine2', event.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Info card title"
              value={contactHeroContent.infoTitle}
              onChange={(event) => updateContactHeroField('infoTitle', event.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Info card subtitle"
              value={contactHeroContent.infoSubtitle}
              onChange={(event) => updateContactHeroField('infoSubtitle', event.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>

        <Stack spacing={0.25} sx={{ pb: 0.25 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Contact information
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Configure contact fields and choose icons shown on frontend.
          </Typography>
        </Stack>

        {(contactHeroContent.contacts || []).slice(0, 1).map((row, index) => (
          <Grid container spacing={2} key={`contact-point-${index}`}>
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Latitude"
                    value={row?.lat || ''}
                    onChange={(event) => updateContactRowField(index, 'lat', event.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Longitude"
                    value={row?.lng || ''}
                    onChange={(event) => updateContactRowField(index, 'lng', event.target.value)}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={2}>
                {CONTACT_FIELD_META.map((item) => (
                  <Grid item xs={12} md={item.key === 'address' ? 12 : 6} key={`contact-field-${item.key}`}>
                    <Stack
                      spacing={1}
                      sx={(theme) => ({
                        p: 1.5,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.background.neutral,
                      })}
                    >
                      <TextField
                        label={item.label}
                        value={row?.[item.key] || ''}
                        onChange={(event) => updateContactRowField(index, item.key, event.target.value)}
                        fullWidth
                      />
                      {item.key === 'whatsapp' ? (
                        <TextField
                          label="WhatsApp link"
                          value={row?.whatsappLink || ''}
                          onChange={(event) =>
                            updateContactRowField(index, 'whatsappLink', event.target.value)
                          }
                          placeholder="https://wa.me/6591234567"
                          helperText="Full wa.me URL or phone with country code. Used when visitors click WhatsApp or submit the contact form."
                          fullWidth
                        />
                      ) : null}
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="space-between"
                        flexWrap="wrap"
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={(theme) => ({
                              width: 30,
                              height: 30,
                              borderRadius: 1.25,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: theme.palette[item.color || 'primary'].main,
                              bgcolor: theme.palette[item.color || 'primary'].lighter,
                            })}
                          >
                            <Iconify icon={getContactFieldIcon(row, item.key)} width={18} />
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {item.label} icon
                          </Typography>
                        </Stack>
                        <Button
                          size="small"
                          variant="contained"
                          color={item.color || 'primary'}
                          onClick={() => openIconPickerForContactField(item.key)}
                        >
                          Change icon
                        </Button>
                      </Stack>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        ))}

        <IconPickerDrawer
          open={contactIconToolOpen}
          onClose={() => setContactIconToolOpen(false)}
          contextLabel={`${CONTACT_FIELD_META.find((item) => item.key === contactIconField)?.label || 'contact'} field`}
          searchQuery={iconSearchQuery}
          onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
          filteredIcons={filteredCategoryIcons}
          selectedIcon={getContactFieldIcon(contactHeroContent.contacts?.[0], contactIconField)}
          onSelectIcon={(iconName) => {
            const iconKey = CONTACT_ICON_KEY_BY_FIELD[contactIconField];
            if (iconKey) {
              updateContactRowField(0, iconKey, iconName);
            }
            setContactIconToolOpen(false);
          }}
        />

        <Box>
          <LoadingButton
            variant="contained"
            loading={contactHeroContentSubmitting}
            onClick={handleSaveContactHeroContent}
          >
            Save contact hero content
          </LoadingButton>
        </Box>
      </Stack>
    </Card>
  );

  const renderWorkflowTemplatesPitchSettings = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Workflow templates intro
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Controls the gradient card above the template grid (heading + three columns). Upload optional icons for
            each column; if omitted, the page uses default icons.
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="Section heading"
          value={workflowPitch.heading}
          onChange={(e) => updateWorkflowPitchHeading(e.target.value)}
        />

        <Grid container spacing={3}>
          {[0, 1, 2].map((slot) => {
            const row = workflowPitch.features?.[slot] || { iconUrl: '', title: '', description: '' };
            return (
              <Grid key={slot} item xs={12} md={4}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2">Column {slot + 1}</Typography>
                  <Upload
                    value={row.iconUrl || null}
                    onDrop={(acceptedFiles) => handleDropWorkflowPitchIcon(slot, acceptedFiles)}
                    onDelete={row.iconUrl ? () => handleRemoveWorkflowPitchIcon(slot) : undefined}
                    disabled={workflowPitchIconSlotLoading === slot}
                    sx={{
                      '& > .MuiBox-root:first-of-type': {
                        minHeight: 140,
                        p: 2,
                      },
                    }}
                    accept={{
                      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
                    }}
                    maxSize={5 * 1024 * 1024}
                    helperText="Optional. Square-ish icons work best. Max 5 MB."
                  />
                  <TextField
                    fullWidth
                    label="Title"
                    value={row.title}
                    onChange={(e) => updateWorkflowPitchFeature(slot, 'title', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Description"
                    value={row.description}
                    onChange={(e) => updateWorkflowPitchFeature(slot, 'description', e.target.value)}
                  />
                </Stack>
              </Grid>
            );
          })}
        </Grid>

        <Box>
          <LoadingButton
            variant="contained"
            loading={workflowPitchSubmitting}
            onClick={handleSaveWorkflowPitchContent}
          >
            Save intro copy
          </LoadingButton>
        </Box>
      </Stack>
    </Card>
  );

  const renderCourseDefaultImageSettings = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Default Course Image
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Upload a fallback image used when a course has no image. WEBP is supported.
          </Typography>
        </Box>

        <Upload
          coverPreview
          value={courseDefaultImageFile || courseDefaultImageUrl || null}
          onDrop={handleDropCourseDefaultImage}
          onDelete={courseDefaultImageFile || courseDefaultImageUrl ? handleRemoveCourseDefaultImage : undefined}
          accept={{
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
          }}
          maxSize={5 * 1024 * 1024}
          disabled={courseDefaultImageLoading || courseDefaultImageSubmitting}
          helperText="Accepted formats: JPG, PNG, GIF, WEBP, SVG. Max size: 5 MB."
        />

        <Stack direction="row" spacing={1.5}>
          <LoadingButton
            variant="contained"
            loading={courseDefaultImageSubmitting}
            onClick={handleUploadCourseDefaultImage}
            disabled={!courseDefaultImageFile}
          >
            Save default course image
          </LoadingButton>
          <Button
            color="inherit"
            variant="outlined"
            onClick={
              courseDefaultImageFile ? handleClearCourseDefaultImageSelection : handleRemoveCourseDefaultImage
            }
            disabled={courseDefaultImageSubmitting || (!courseDefaultImageFile && !courseDefaultImageUrl)}
          >
            {courseDefaultImageFile ? 'Clear Selected' : 'Remove Current Image'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );

  const settingsTabMid = Math.ceil(sectionCards.length / 2);
  const settingsTabRows = [
    sectionCards.slice(0, settingsTabMid),
    sectionCards.slice(settingsTabMid),
  ];

  const activeSectionItem = sectionCards.find((item) => item.key === activeSection);

  const renderSettingsTabIcon = (sectionItem) =>
    sectionItem.iconSrc ? (
      <Box
        component="img"
        src={sectionItem.iconSrc}
        alt=""
        sx={{
          width: 22,
          height: 22,
          maxWidth: 22,
          maxHeight: 22,
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
    ) : (
      <Iconify icon={sectionItem.icon || 'solar:settings-bold-duotone'} width={20} />
    );

  const renderSettingsTab = (sectionItem) => {
    const selected = activeSection === sectionItem.key;
    return (
      <Button
        key={sectionItem.key}
        color="inherit"
        onClick={() => navigate(paths.admin.settingsSection(sectionItem.key))}
        sx={(theme) => ({
          minHeight: 44,
          minWidth: 0,
          px: { xs: 0.75, sm: 1 },
          py: 0.75,
          justifyContent: 'flex-start',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: { xs: '0.75rem', sm: '0.8125rem' },
          borderRadius: 1,
          color: selected ? 'primary.main' : 'text.secondary',
          bgcolor: selected
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12)
            : 'transparent',
          borderBottom: `3px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
          transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            color: 'primary.main',
            bgcolor: alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.06 : 0.65),
          },
          '& .MuiSvgIcon-root, & svg': { opacity: selected ? 1 : 0.88, flexShrink: 0 },
          '& img': { opacity: selected ? 1 : 0.88 },
        })}
      >
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0, width: 1 }}>
          {renderSettingsTabIcon(sectionItem)}
          <Box
            component="span"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sectionItem.title}
          </Box>
        </Stack>
      </Button>
    );
  };

  const renderSectionSwitcher = (
    <Card
      sx={(theme) => ({
        p: { xs: 0.75, sm: 1 },
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.14)}`,
        background: `linear-gradient(125deg, ${theme.palette.common.white} 0%, ${alpha(
          theme.palette.primary.lighter,
          theme.palette.mode === 'dark' ? 0.2 : 0.38
        )} 55%, ${alpha(theme.palette.primary.lighter, theme.palette.mode === 'dark' ? 0.12 : 0.18)} 100%)`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? `0 6px 28px ${alpha(theme.palette.common.black, 0.28)}`
            : `0 6px 28px ${alpha(theme.palette.secondary.main, 0.1)}`,
      })}
    >
      <Stack
        spacing={0.5}
        sx={(theme) => ({
          '& > :not(:last-child)': {
            pb: 0.5,
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          },
        })}
      >
        {settingsTabRows.map((row, rowIndex) => (
          <Box
            key={`settings-tab-row-${rowIndex}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(4, minmax(0, 1fr))',
                md: 'repeat(7, minmax(0, 1fr))',
              },
              gap: 0.5,
            }}
          >
            {row.map((sectionItem) => renderSettingsTab(sectionItem))}
          </Box>
        ))}
      </Stack>

      {activeSectionItem ? (
        <Typography
          variant="caption"
          sx={(theme) => ({
            display: 'block',
            px: { xs: 1, sm: 1.25 },
            pt: 0.75,
            pb: 0.25,
            lineHeight: 1.45,
            color: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.68) : 'text.secondary',
          })}
        >
          {activeSectionItem.description}
        </Typography>
      ) : null}
    </Card>
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Admin Settings"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Settings' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={2}>
        {renderSectionSwitcher}
        {activeSection === 'logo' && renderLogoSettings}
        {activeSection === 'hero' && (
          <Stack spacing={3}>
            {renderHomeHeroSettings}
            {renderHomeHeroContentSettings}
          </Stack>
        )}
        {activeSection === 'cards' && renderHomeCardsSettings}
        {activeSection === 'join' && renderHomeJoinSettings}
        {activeSection === 'contact' && renderContactHeroSettings}
        {activeSection === 'course-image' && renderCourseDefaultImageSettings}
        {activeSection === 'workflow-templates-pitch' && renderWorkflowTemplatesPitchSettings}
        {activeSection === 'programme-fees' && renderProgrammeFeesSettings}
        {activeSection === 'programme-structure' && renderProgrammeStructureSettings}
        {activeSection === 'eligibility-membership' && renderEligibilityMembershipSettings}
        {activeSection === 'funding-eligibility' && renderFundingEligibilitySettings}
        {activeSection === 'ceo-launch' && renderCeoLaunchSettings}
        {activeSection === 'testimonials' && renderTestimonialsSettings}
        {activeSection === 'employer' && renderEmployerSettings}
        {activeSection === 'partner-with-isca' && renderPartnerWithIscaSettings}
        {activeSection === 'faq' && renderFaqSettings}
        {activeSection === 'curriculum' && renderCurriculumSettings}
        {activeSection === 'footer' && renderFooterSettings}
        {activeSection === 'header-visibility' && renderHeaderVisibility}
      </Stack>
    </DashboardContent>
  );
}

