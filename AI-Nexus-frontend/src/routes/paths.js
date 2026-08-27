import { paramCase } from 'src/utils/change-case';

import { _id, _postTitles } from 'src/_mock/assets';

// ----------------------------------------------------------------------

const MOCK_ID = _id[1];

const MOCK_TITLE = _postTitles[2];

const ROOTS = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
  USER: '/user',
  CORPORATE: '/corporate',
};

// ----------------------------------------------------------------------

export const paths = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  pricing: '/pricing',
  payment: '/payment',
  about: '/about-us',
  contact: '/contact-us',
  categories: '/categories',
  announcements: '/announcements',
  announcement: {
    root: '/announcements',
  },
  aiForum: {
    root: '/ai-forum',
    details: (id) => `/ai-forum/${id}`,
  },
  home: '/home',
  international: '/international',
  internationalAiFluency: '/international/ai-fluency',
  learning: '/learning',
  learningCourse: {
    root: '/learning/course',
    details: (id) => `/learning/course/${id}`,
    learn: (id, sectionId) => sectionId ? `/learning/course/${id}/learn?section=${sectionId}` : `/learning/course/${id}/learn`,
  },
  speaker: {
    root: '/speaker',
    details: (id) => `/speaker/${id}`,
  },
  flowiseBridge: '/flowise-bridge',
  affiliate: {
    dashboard: '/affiliate/dashboard',
  },
  workflows: '/ai-resources',
  aiAuditFutures: '/ai-audit-futures',
  partnerWithIsca: '/partner-with-isca',
  agentFlowCreate: '/ai-resources/agent-flow',
  workflowsDetails: (id) => `/ai-resources/${id}`,
  workflowsPrompt: {
    root: '/ai-resources/prompt',
    details: (provider) => `/ai-resources/prompt/${provider}`,
  },
  workflowsSkill: {
    root: '/ai-resources/skill',
    details: (id) => `/ai-resources/skill/${id}`,
  },
  workflowsNewsletter: {
    root: '/ai-resources/newsletter',
    details: (id) => `/ai-resources/newsletter/${id}`,
  },
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  changelog: 'https://www.ai-nexus.io/',
  zoneStore: 'https://www.ai-nexus.io/',
  minimalStore: 'https://www.ai-nexus.io/',
  freeUI: 'https://www.ai-nexus.io/',
  figma: 'https://www.ai-nexus.io/',
  product: {
    root: `/product`,
    checkout: `/product/checkout`,
    details: (id) => `/product/${id}`,
    demo: { details: `/product/${MOCK_ID}` },
  },
  post: {
    root: `/post`,
    details: (title) => `/post/${paramCase(title)}`,
    demo: { details: `/post/${paramCase(MOCK_TITLE)}` },
  },
  // AUTH
  auth: {
    simple: {
      signIn: `${ROOTS.AUTH}/sign-in`,
      signUp: `${ROOTS.AUTH}/sign-up`,
      corporateSignUp: `${ROOTS.AUTH}/corporate-sign-up`,
      forgotPassword: `${ROOTS.AUTH}/forgot-password`,
      resetPassword: `${ROOTS.AUTH}/reset-password`,
      verify: `${ROOTS.AUTH}/verify`,
      feeWaiverHrVerify: `${ROOTS.AUTH}/fee-waiver-audit/hr-verify`,
      studentAcademicVerify: `${ROOTS.AUTH}/student-verification/confirm`,
    },
    oauth: {
      start: `${ROOTS.AUTH}/oauth/start`,
      callback: `${ROOTS.AUTH}/oauth/callback`,
    },
    membership: {
      salesforceCreate: `${ROOTS.AUTH}/membership/salesforce-create`,
      salesforceBridge: `${ROOTS.AUTH}/membership/salesforce-bridge`,
      application: `${ROOTS.AUTH}/membership/application`,
      studentApplication: `${ROOTS.AUTH}/membership/student-application`,
    },
    affiliate: {
      signUp: `${ROOTS.AUTH}/affiliate/sign-up`,
    },
  },
  // DASHBOARD (now under /admin)
  dashboard: {
    root: `${ROOTS.ADMIN}/dashboard`,
    mail: `${ROOTS.DASHBOARD}/mail`,
    chat: `${ROOTS.DASHBOARD}/chat`,
    blank: `${ROOTS.DASHBOARD}/blank`,
    kanban: `${ROOTS.DASHBOARD}/kanban`,
    calendar: `${ROOTS.DASHBOARD}/calendar`,
    fileManager: `${ROOTS.DASHBOARD}/file-manager`,
    permission: `${ROOTS.DASHBOARD}/permission`,
    general: {
      app: `${ROOTS.DASHBOARD}/app`,
      ecommerce: `${ROOTS.DASHBOARD}/ecommerce`,
      analytics: `${ROOTS.DASHBOARD}/analytics`,
      banking: `${ROOTS.DASHBOARD}/banking`,
      booking: `${ROOTS.DASHBOARD}/booking`,
      file: `${ROOTS.DASHBOARD}/file`,
      course: `${ROOTS.DASHBOARD}/course`,
    },
    user: {
      root: `${ROOTS.ADMIN}/user`,
      new: `${ROOTS.ADMIN}/user/new`,
      list: `${ROOTS.ADMIN}/user/list`,
      cards: `${ROOTS.DASHBOARD}/user/cards`,
      profile: `${ROOTS.DASHBOARD}/user/profile`, // Legacy route
      account: `${ROOTS.DASHBOARD}/user/account`,
      details: (id) => `${ROOTS.ADMIN}/user/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/user/${id}/edit`,
      demo: {
        edit: `${ROOTS.DASHBOARD}/user/${MOCK_ID}/edit`,
      },
    },
    product: {
      root: `${ROOTS.DASHBOARD}/product`,
      new: `${ROOTS.DASHBOARD}/product/new`,
      details: (id) => `${ROOTS.DASHBOARD}/product/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/product/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/product/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/product/${MOCK_ID}/edit`,
      },
    },
    invoice: {
      root: `${ROOTS.DASHBOARD}/invoice`,
      new: `${ROOTS.DASHBOARD}/invoice/new`,
      details: (id) => `${ROOTS.DASHBOARD}/invoice/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/invoice/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/invoice/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/invoice/${MOCK_ID}/edit`,
      },
    },
    post: {
      root: `${ROOTS.DASHBOARD}/post`,
      new: `${ROOTS.DASHBOARD}/post/new`,
      details: (title) => `${ROOTS.DASHBOARD}/post/${paramCase(title)}`,
      edit: (title) => `${ROOTS.DASHBOARD}/post/${paramCase(title)}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/post/${paramCase(MOCK_TITLE)}`,
        edit: `${ROOTS.DASHBOARD}/post/${paramCase(MOCK_TITLE)}/edit`,
      },
    },
    order: {
      root: `${ROOTS.DASHBOARD}/order`,
      details: (id) => `${ROOTS.DASHBOARD}/order/${id}`,
      demo: {
        details: `${ROOTS.DASHBOARD}/order/${MOCK_ID}`,
      },
    },
    job: {
      root: `${ROOTS.DASHBOARD}/job`,
      new: `${ROOTS.DASHBOARD}/job/new`,
      details: (id) => `${ROOTS.DASHBOARD}/job/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/job/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/job/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/job/${MOCK_ID}/edit`,
      },
    },
    tour: {
      root: `${ROOTS.DASHBOARD}/tour`,
      new: `${ROOTS.DASHBOARD}/tour/new`,
      details: (id) => `${ROOTS.DASHBOARD}/tour/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/tour/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/tour/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/tour/${MOCK_ID}/edit`,
      },
    },
  },
  // USER (for regular users - User role)
  user: {
    root: ROOTS.USER,
    profile: `${ROOTS.USER}/profile`,
  },
  // COMMON PROFILE (works for both User and Admin)
  profile: {
    root: '/profile',
    /** Learning persona & preferences (same editor as onboarding, dismissible) */
    persona: '/profile/persona',
  },
  // CORPORATE HR PORTAL (Salesforce corporate register → SSO)
  corporate: {
    root: ROOTS.CORPORATE,
    overview: `${ROOTS.CORPORATE}/overview`,
    profile: `${ROOTS.CORPORATE}/profile`,
    progress: `${ROOTS.CORPORATE}/progress`,
    learner: (userId) => `${ROOTS.CORPORATE}/progress/${userId}`,
    enrol: `${ROOTS.CORPORATE}/enrol`,
    bulkUploads: `${ROOTS.CORPORATE}/enrol/uploads`,
    enrolTrack: `${ROOTS.CORPORATE}/enrol/track`,
    enrolTrackBatch: (batchId) => `${ROOTS.CORPORATE}/enrol/track/${batchId}`,
    reports: `${ROOTS.CORPORATE}/reports`,
    nudgeTrack: `${ROOTS.CORPORATE}/nudge-track`,
  },
  // ADMIN
  admin: {
    root: ROOTS.ADMIN,
    profile: `${ROOTS.ADMIN}/profile`, // Admin profile route
    user: {
      root: `${ROOTS.ADMIN}/user`,
      new: `${ROOTS.ADMIN}/user/new`,
      list: `${ROOTS.ADMIN}/user/list`,
      bulkEnrolment: `${ROOTS.ADMIN}/user/bulk-enrolment`,
      profile: `${ROOTS.ADMIN}/user/profile`, // Legacy admin profile route
      details: (id) => `${ROOTS.ADMIN}/user/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/user/${id}/edit`,
    },
    /** Course categories (nested under Course in admin nav) */
    category: {
      root: `${ROOTS.ADMIN}/course/category`,
      new: `${ROOTS.ADMIN}/course/category/new`,
      list: `${ROOTS.ADMIN}/course/category/list`,
      details: (id) => `${ROOTS.ADMIN}/course/category/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/course/category/${id}/edit`,
    },
    program: {
      root: `${ROOTS.ADMIN}/course/program`,
      new: `${ROOTS.ADMIN}/course/program/new`,
      list: `${ROOTS.ADMIN}/course/program/list`,
      details: (id) => `${ROOTS.ADMIN}/course/program/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/course/program/${id}/edit`,
    },
    announcement: {
      root: `${ROOTS.ADMIN}/announcement`,
      new: `${ROOTS.ADMIN}/announcement/new`,
      list: `${ROOTS.ADMIN}/announcement/list`,
      edit: (id) => `${ROOTS.ADMIN}/announcement/${id}/edit`,
    },
    aiForum: {
      root: `${ROOTS.ADMIN}/ai-forum`,
      new: `${ROOTS.ADMIN}/ai-forum/new`,
      list: `${ROOTS.ADMIN}/ai-forum/list`,
      details: (id) => `${ROOTS.ADMIN}/ai-forum/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/ai-forum/${id}/edit`,
    },
    course: {
      root: `${ROOTS.ADMIN}/course`,
      new: `${ROOTS.ADMIN}/course/new`,
      list: `${ROOTS.ADMIN}/course/list`,
      attempts: `${ROOTS.ADMIN}/course/attempts`,
      certificates: `${ROOTS.ADMIN}/course/certificates`,
      details: (id) => `${ROOTS.ADMIN}/course/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/course/${id}/edit`,
      assessments: (id) => `${ROOTS.ADMIN}/course/${id}/assessments`,
    },
    speaker: {
      root: `${ROOTS.ADMIN}/speaker`,
      new: `${ROOTS.ADMIN}/speaker/new`,
      list: `${ROOTS.ADMIN}/speaker/list`,
      details: (id) => `${ROOTS.ADMIN}/speaker/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/speaker/${id}/edit`,
    },
    language: {
      root: `${ROOTS.ADMIN}/language`,
      new: `${ROOTS.ADMIN}/language/new`,
      list: `${ROOTS.ADMIN}/language/list`,
      details: (id) => `${ROOTS.ADMIN}/language/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/language/${id}/edit`,
    },
    international: {
      root: `${ROOTS.ADMIN}/international`,
      landing: `${ROOTS.ADMIN}/international/landing`,
      users: {
        root: `${ROOTS.ADMIN}/international/users`,
        list: `${ROOTS.ADMIN}/international/users/list`,
        details: (id) => `${ROOTS.ADMIN}/international/users/${id}`,
      },
      promoPricing: `${ROOTS.ADMIN}/international/promo-pricing`,
      modules: {
        root: `${ROOTS.ADMIN}/international/modules`,
        list: `${ROOTS.ADMIN}/international/modules/list`,
        new: `${ROOTS.ADMIN}/international/modules/new`,
        edit: (id) => `${ROOTS.ADMIN}/international/modules/${id}/edit`,
      },
      roles: {
        root: `${ROOTS.ADMIN}/international/roles`,
        list: `${ROOTS.ADMIN}/international/roles/list`,
        new: `${ROOTS.ADMIN}/international/roles/new`,
        edit: (id) => `${ROOTS.ADMIN}/international/roles/${id}/edit`,
      },
    },
    label: {
      root: `${ROOTS.ADMIN}/label`,
      new: `${ROOTS.ADMIN}/label/new`,
      list: `${ROOTS.ADMIN}/label/list`,
      details: (id) => `${ROOTS.ADMIN}/label/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/label/${id}/edit`,
    },
    tag: {
      root: `${ROOTS.ADMIN}/tag`,
      new: `${ROOTS.ADMIN}/tag/new`,
      list: `${ROOTS.ADMIN}/tag/list`,
      details: (id) => `${ROOTS.ADMIN}/tag/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/tag/${id}/edit`,
    },
    workflow: {
      root: `${ROOTS.ADMIN}/ai-resources`,
      new: `${ROOTS.ADMIN}/ai-resources/new`,
      list: `${ROOTS.ADMIN}/ai-resources/list`,
      details: (id) => `${ROOTS.ADMIN}/ai-resources/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/ai-resources/${id}/edit`,
    },
    prompt: {
      root: `${ROOTS.ADMIN}/prompt`,
      list: `${ROOTS.ADMIN}/prompt/list`,
      new: `${ROOTS.ADMIN}/prompt/new`,
      newInCategory: (categoryKey, label = '') => {
        const qs = new URLSearchParams({ categoryKey: String(categoryKey || '') });
        if (label) qs.set('label', String(label));
        return `${ROOTS.ADMIN}/prompt/new?${qs.toString()}`;
      },
      /** Category → prompts CRUD (query: categoryKey, page, rowsPerPage, name). */
      items: `${ROOTS.ADMIN}/prompt/items`,
      categoryItems: (categoryKey) =>
        `${ROOTS.ADMIN}/prompt/items?categoryKey=${encodeURIComponent(categoryKey)}`,
      details: (id) => `${ROOTS.ADMIN}/prompt/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/prompt/${id}/edit`,
    },
    skill: {
      root: `${ROOTS.ADMIN}/skill`,
      new: `${ROOTS.ADMIN}/skill/new`,
      list: `${ROOTS.ADMIN}/skill/list`,
      details: (id) => `${ROOTS.ADMIN}/skill/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/skill/${id}/edit`,
    },
    newsletter: {
      root: `${ROOTS.ADMIN}/newsletter`,
      new: `${ROOTS.ADMIN}/newsletter/new`,
      list: `${ROOTS.ADMIN}/newsletter/list`,
      details: (id) => `${ROOTS.ADMIN}/newsletter/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/newsletter/${id}/edit`,
    },
    order: {
      root: `${ROOTS.ADMIN}/order`,
      list: `${ROOTS.ADMIN}/order/list`,
      details: (id) => `${ROOTS.ADMIN}/order/${id}`,
    },
    corporateMember: {
      root: `${ROOTS.ADMIN}/corporate-member`,
      list: `${ROOTS.ADMIN}/corporate-member/list`,
      weeklyMetrics: `${ROOTS.ADMIN}/corporate-member/weekly-metrics`,
      details: (id) => `${ROOTS.ADMIN}/corporate-member/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/corporate-member/${id}/edit`,
    },
    payment: {
      root: `${ROOTS.ADMIN}/payment`,
      settings: `${ROOTS.ADMIN}/payment`,
      companyEnrollment: `${ROOTS.ADMIN}/payment/company-enrollment`,
      history: `${ROOTS.ADMIN}/payment/history`,
      historyDetails: (id) => `${ROOTS.ADMIN}/payment/history/${id}`,
    },
    product: {
      root: `${ROOTS.ADMIN}/product`,
      new: `${ROOTS.ADMIN}/product/new`,
      list: `${ROOTS.ADMIN}/product/list`,
      details: (id) => `${ROOTS.ADMIN}/product/${id}`,
      edit: (id) => `${ROOTS.ADMIN}/product/${id}/edit`,
    },
    settings: `${ROOTS.ADMIN}/settings`,
    settingsSection: (section) => `${ROOTS.ADMIN}/settings/${section}`,
    weeklyMetrics: `${ROOTS.ADMIN}/weekly-metrics`,
  },
};

