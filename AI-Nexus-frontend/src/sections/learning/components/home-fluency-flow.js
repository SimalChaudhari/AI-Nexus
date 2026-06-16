/** AI Fluency Programme — Registration & Eligibility Workflow (home page modal). */

export const HOME_FLUENCY_USER_TYPE = {
  STUDENT: 'student',
  PROFESSIONAL: 'professional',
};

export const HOME_FLUENCY_BACKGROUND = {
  ACCOUNTING: 'accounting',
  NON_ACCOUNTING: 'non-accounting',
};

export const HOME_FLUENCY_PATHWAY = {
  ASSOCIATE: 'associate',
  CA: 'ca',
  EXPERIENCED: 'experienced',
  SPECIALISATION: 'specialisation',
};

export const HOME_EXPERIENCED_MEMBER_TYPE = {
  ACADEMIC: 'academic',
  BUSINESS: 'business',
  PUBLIC_SECTOR: 'public-sector',
};

export const HOME_FINAL_YEAR_ACCOUNTANCY_INSTITUTIONS = [
  'National University of Singapore (NUS)',
  'Nanyang Technological University (NTU)',
  'Singapore Management University (SMU)',
  'Singapore University of Social Sciences (SUSS)',
  'Singapore Institute of Technology (SIT)',
  'Singapore Polytechnic (SP)',
  'Ngee Ann Polytechnic (NP)',
  'Nanyang Polytechnic (NYP)',
  'Temasek Polytechnic (TP)',
  'Republic Polytechnic (RP)',
];

export const HOME_FLUENCY_INITIAL_FIELDS = {
  homeFluencyUserType: '',
  homeFinalYearAccountancyStudent: null,
  homeStudentOrAssociateMember: null,
  homeEducationalBackground: '',
  homeSelectedPathway: '',
  homeExperiencedMemberType: '',
  homeFluencyPathwayAcknowledged: false,
  homeFluencyEligible: false,
};

const EXPERIENCED_MEMBER_COPY = {
  [HOME_EXPERIENCED_MEMBER_TYPE.ACADEMIC]: {
    title: 'ISCA Member (Academic)',
    description:
      'Relevant experience includes teaching, academic leadership or equivalent professional experience in business, accounting, finance or related disciplines.',
  },
  [HOME_EXPERIENCED_MEMBER_TYPE.BUSINESS]: {
    title: 'ISCA Member (Business)',
    description:
      'Relevant experience includes leadership or management experience in businesses, enterprises, organisations or professional practices.',
  },
  [HOME_EXPERIENCED_MEMBER_TYPE.PUBLIC_SECTOR]: {
    title: 'ISCA Member (Public Sector)',
    description:
      'Relevant experience includes leadership, managerial or professional experience in public sector organisations involving finance, accounting, governance, audit, policy, stewardship, public accountability or resource management.',
  },
};

const PATHWAY_COPY = {
  [HOME_FLUENCY_PATHWAY.ASSOCIATE]: {
    title: 'Associate Pathway',
    description:
      'Apply for ISCA Associate Membership. Once membership is approved, you may register for the ISCA AI Fluency programme.',
    accounting: true,
    nonAccounting:
      'Enrol for the SCAQ Foundation Programme and opt-in for ISCA Associate Membership. Once membership is approved, you may register for the ISCA AI Fluency programme.',
  },
  [HOME_FLUENCY_PATHWAY.CA]: {
    title: 'Chartered Accountant (CA) Pathway',
    description:
      'Apply for the relevant CA qualification pathway. Once membership is approved, you may register for the ISCA AI Fluency programme.',
  },
  [HOME_FLUENCY_PATHWAY.EXPERIENCED]: {
    title: 'Experienced Professional Pathway',
    description:
      'Apply as ISCA Member (Academic), ISCA Member (Business) or ISCA Member (Public Sector). Once membership is approved, you may register for the ISCA AI Fluency programme.',
  },
  [HOME_FLUENCY_PATHWAY.SPECIALISATION]: {
    title: 'Specialisation Pathway',
    description:
      'Apply for the Associate (Specialist) with FFP or SRP credentials. Once membership is approved, you may register for the ISCA AI Fluency programme.',
  },
};

/** Home eligibility modal: professional → Experienced → membership application form. */
export function isHomeExperiencedMembershipApplicationFlow(state) {
  return Boolean(
    state?.homeGetStartedFlow
    && state?.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.PROFESSIONAL
    && state?.homeSelectedPathway === HOME_FLUENCY_PATHWAY.EXPERIENCED
    && state?.homeExperiencedMemberType
  );
}

/** Home eligibility modal: professional → CA → direct Salesforce (no chartered sub-flow). */
export function isHomeCaDirectSalesforceFlow(state) {
  return Boolean(
    state?.homeGetStartedFlow
    && state?.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.PROFESSIONAL
    && state?.homeSelectedPathway === HOME_FLUENCY_PATHWAY.CA
  );
}

/** Home eligibility modal: student → not ISCA member → student membership application form. */
export function isHomeStudentMembershipApplicationFlow(state) {
  return Boolean(
    state?.homeGetStartedFlow
    && state?.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.STUDENT
    && state?.homeFinalYearAccountancyStudent === false
    && state?.homeStudentOrAssociateMember === false
  );
}

const HOME_CA_DIRECT_SALESFORCE_PROGRESS_STEPS = [
  'home-user-type',
  'home-professional-isca-member',
  'home-educational-background',
  'home-pathway-selection',
  'salesforce-account-choice',
];

const HOME_EXPERIENCED_SALESFORCE_PROGRESS_STEPS = [
  'home-user-type',
  'home-professional-isca-member',
  'home-educational-background',
  'home-pathway-selection',
  'home-experienced-member-type',
  'home-fluency-pathway-info',
  'salesforce-account-choice',
];

/** Home eligibility modal: professional → Experienced → Salesforce account step. */
export function isHomeExperiencedDirectSalesforceFlow(state) {
  return Boolean(
    isHomeExperiencedMembershipApplicationFlow(state) && state?.homeFluencyPathwayAcknowledged
  );
}

export function isHomeMembershipApplicationSalesforceFlow(state) {
  return (
    isHomeCaDirectSalesforceFlow(state)
    || isHomeExperiencedDirectSalesforceFlow(state)
    || isHomeStudentMembershipApplicationFlow(state)
  );
}

export function getHomeSalesforceAccountChoiceCopy(state) {
  if (isHomeStudentMembershipApplicationFlow(state)) {
    return {
      badge: 'ISCA Student Membership',
      title: 'ISCA Student Membership',
      description:
        'Apply for ISCA Student Membership. Once membership is approved, you may register for the ISCA AI Fluency programme.',
    };
  }

  if (isHomeCaDirectSalesforceFlow(state)) {
    return {
      badge: 'Chartered Accountant (CA) Pathway',
      title: 'Chartered Accountant (CA) Pathway',
      description:
        'Create a new ISCA Salesforce membership account, or sign in if you already have one to continue your CA membership application.',
    };
  }

  if (isHomeExperiencedDirectSalesforceFlow(state)) {
    const display = getHomeFluencyPathwayDisplay(state);
    return {
      badge: 'Experienced Professional Pathway',
      title: display?.title || 'Experienced Professional Pathway',
      description:
        'Create a new ISCA Salesforce membership account, or sign in if you already have one to continue your Experienced Professional membership application.',
    };
  }

  return {
    badge: 'Salesforce membership account',
    title: 'Salesforce membership account',
    description:
      'Create a new ISCA Salesforce membership account, or sign in if you already have one.',
  };
}

export function isHomeFluencyEligible(state) {
  if (!state?.homeGetStartedFlow) return false;
  if (state.homeFluencyEligible) return true;
  if (state.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.STUDENT) {
    return state.homeFinalYearAccountancyStudent === true || state.homeStudentOrAssociateMember === true;
  }
  if (state.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.PROFESSIONAL) {
    return state.isIscaMember === true;
  }
  return false;
}

export function getHomeFluencyPathwayOptions(background) {
  if (background === HOME_FLUENCY_BACKGROUND.ACCOUNTING) {
    return [
      { value: HOME_FLUENCY_PATHWAY.ASSOCIATE, label: 'Associate Pathway' },
      { value: HOME_FLUENCY_PATHWAY.CA, label: 'Chartered Accountant (CA) Pathway' },
      { value: HOME_FLUENCY_PATHWAY.EXPERIENCED, label: 'Experienced Professional Pathway' },
    ];
  }
  if (background === HOME_FLUENCY_BACKGROUND.NON_ACCOUNTING) {
    return [
      { value: HOME_FLUENCY_PATHWAY.EXPERIENCED, label: 'Experienced Professional Pathway' },
      { value: HOME_FLUENCY_PATHWAY.ASSOCIATE, label: 'Associate Pathway' },
      { value: HOME_FLUENCY_PATHWAY.SPECIALISATION, label: 'Specialisation Pathway' },
    ];
  }
  return [];
}

export function getHomeFluencyExperiencedMemberOptions() {
  return [
    {
      value: HOME_EXPERIENCED_MEMBER_TYPE.ACADEMIC,
      label: EXPERIENCED_MEMBER_COPY[HOME_EXPERIENCED_MEMBER_TYPE.ACADEMIC].title,
    },
    {
      value: HOME_EXPERIENCED_MEMBER_TYPE.BUSINESS,
      label: EXPERIENCED_MEMBER_COPY[HOME_EXPERIENCED_MEMBER_TYPE.BUSINESS].title,
    },
    {
      value: HOME_EXPERIENCED_MEMBER_TYPE.PUBLIC_SECTOR,
      label: EXPERIENCED_MEMBER_COPY[HOME_EXPERIENCED_MEMBER_TYPE.PUBLIC_SECTOR].title,
    },
  ];
}

export function getHomeFluencyPathwayDisplay(state) {
  const pathway = state?.homeSelectedPathway;
  if (!pathway) return null;

  const base = PATHWAY_COPY[pathway];
  if (!base) return null;

  let description = base.description;
  if (
    pathway === HOME_FLUENCY_PATHWAY.ASSOCIATE
    && state.homeEducationalBackground === HOME_FLUENCY_BACKGROUND.NON_ACCOUNTING
    && base.nonAccounting
  ) {
    description = base.nonAccounting;
  }

  const experiencedType = state.homeExperiencedMemberType
    ? EXPERIENCED_MEMBER_COPY[state.homeExperiencedMemberType]
    : null;

  return {
    title: experiencedType?.title || base.title,
    description: experiencedType
      ? `${base.description}\n\n${experiencedType.description}`
      : description,
    footerNote:
      'Once membership is approved, you may register for the ISCA AI Fluency programme.',
  };
}

export function getHomeFluencyFlowStep(state) {
  if (!state.homeFluencyUserType) return 'home-user-type';

  if (state.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.STUDENT) {
    if (state.homeFinalYearAccountancyStudent === null) return 'home-student-final-year';
    if (state.homeFinalYearAccountancyStudent === true) return 'result';
    if (state.homeStudentOrAssociateMember === null) return 'home-student-isca-membership';
    return 'result';
  }

  if (state.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.PROFESSIONAL) {
    if (state.isIscaMember === null) return 'home-professional-isca-member';
    if (state.isIscaMember === true) return 'result';
    if (!state.homeEducationalBackground) return 'home-educational-background';
    if (!state.homeSelectedPathway) return 'home-pathway-selection';
    if (state.homeSelectedPathway === HOME_FLUENCY_PATHWAY.CA) {
      return 'salesforce-account-choice';
    }
    if (state.homeSelectedPathway === HOME_FLUENCY_PATHWAY.EXPERIENCED) {
      if (!state.homeExperiencedMemberType) return 'home-experienced-member-type';
      if (!state.homeFluencyPathwayAcknowledged) return 'home-fluency-pathway-info';
      return 'salesforce-account-choice';
    }
    if (!state.homeFluencyPathwayAcknowledged) return 'home-fluency-pathway-info';
    return 'result';
  }

  return 'home-user-type';
}

/** Longest home fluency path (professional → experienced) — used before user type is chosen. */
const HOME_FLUENCY_MAX_PROGRESS_STEPS = [
  'home-user-type',
  'home-professional-isca-member',
  'home-educational-background',
  'home-pathway-selection',
  'home-experienced-member-type',
  'home-fluency-pathway-info',
  'result',
];

function resolveStudentProgressSteps(state) {
  const steps = ['home-user-type', 'home-student-final-year'];

  if (state.homeFinalYearAccountancyStudent === true) {
    return [...steps, 'result'];
  }

  if (state.homeFinalYearAccountancyStudent === null) {
    return [...steps, 'home-student-isca-membership', 'result'];
  }

  steps.push('home-student-isca-membership', 'result');
  return steps;
}

function resolveProfessionalProgressSteps(state) {
  const steps = ['home-user-type', 'home-professional-isca-member'];

  if (state.isIscaMember === true) {
    return [...steps, 'result'];
  }

  if (state.isIscaMember === null) {
    return [
      ...steps,
      'home-educational-background',
      'home-pathway-selection',
      'home-experienced-member-type',
      'home-fluency-pathway-info',
      'result',
    ];
  }

  steps.push('home-educational-background', 'home-pathway-selection');

  const pathway = state.homeSelectedPathway;
  if (!pathway) {
    return [
      ...steps,
      'home-experienced-member-type',
      'home-fluency-pathway-info',
      'result',
    ];
  }

  if (pathway === HOME_FLUENCY_PATHWAY.CA) {
    steps.push('salesforce-account-choice');
    return steps;
  }

  if (pathway === HOME_FLUENCY_PATHWAY.EXPERIENCED) {
    steps.push('home-experienced-member-type', 'home-fluency-pathway-info', 'salesforce-account-choice');
    return steps;
  }

  steps.push('home-fluency-pathway-info');
  return [...steps, 'result'];
}

export function getHomeFluencyProgressSteps(state) {
  if (!state.homeFluencyUserType) {
    return HOME_FLUENCY_MAX_PROGRESS_STEPS;
  }

  if (state.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.STUDENT) {
    return resolveStudentProgressSteps(state);
  }

  if (state.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.PROFESSIONAL) {
    return resolveProfessionalProgressSteps(state);
  }

  return HOME_FLUENCY_MAX_PROGRESS_STEPS;
}

export function getHomeFluencyProgressMeta(state, currentStepId) {
  const steps = isHomeCaDirectSalesforceFlow(state)
    ? HOME_CA_DIRECT_SALESFORCE_PROGRESS_STEPS
    : isHomeExperiencedDirectSalesforceFlow(state)
      ? HOME_EXPERIENCED_SALESFORCE_PROGRESS_STEPS
      : getHomeFluencyProgressSteps(state);
  const currentIndex = steps.indexOf(currentStepId);
  const totalSteps = steps.length || 1;
  const currentStep = currentIndex >= 0 ? currentIndex + 1 : 1;
  const progressValue = totalSteps <= 1
    ? 100
    : Math.round((currentStep / totalSteps) * 100);

  return { currentStep, totalSteps, progressValue };
}

export function getHomeFluencyOutcome(state) {
  if (isHomeFluencyEligible(state)) {
    return {
      outcome: 'ai-fluency-eligible',
      title: 'Eligible for ISCA AI Fluency',
      summary: 'You are eligible to register for the ISCA AI Fluency programme for free.',
      ctaLabel: 'Proceed to registration',
      actionTarget: 'signUp',
    };
  }

  if (isHomeStudentMembershipApplicationFlow(state)) {
    return {
      outcome: 'student-membership-application',
      title: 'Sign up for ISCA Student Membership',
      summary:
        'Apply for ISCA Student Membership. Once membership is approved, you may register for the ISCA AI Fluency programme.',
      ctaLabel: 'Open student membership application',
      actionTarget: 'student-application',
    };
  }

  if (
    state.homeFluencyPathwayAcknowledged
    && state.homeSelectedPathway === HOME_FLUENCY_PATHWAY.CA
  ) {
    return {
      outcome: 'membership-application',
      applicationPathway: 'ca',
      title: getHomeFluencyPathwayDisplay(state)?.title || 'Chartered Accountant (CA) Pathway',
      summary:
        getHomeFluencyPathwayDisplay(state)?.description
        || 'Apply for the CA qualification pathway, then register for ISCA AI Fluency once approved.',
      ctaLabel: 'Proceed to membership application',
      actionTarget: 'salesforce',
    };
  }

  if (
    state.homeFluencyPathwayAcknowledged
    && state.homeSelectedPathway === HOME_FLUENCY_PATHWAY.EXPERIENCED
    && state.homeExperiencedMemberType
  ) {
    return {
      outcome: 'membership-application',
      applicationPathway: 'experienced',
      experiencedMemberType: state.homeExperiencedMemberType,
      title: getHomeFluencyPathwayDisplay(state)?.title || 'Experienced Professional Pathway',
      summary:
        getHomeFluencyPathwayDisplay(state)?.description
        || 'Apply for the Experienced Professional pathway, then register for ISCA AI Fluency once approved.',
      ctaLabel: 'Proceed to membership application',
      actionTarget: 'salesforce',
    };
  }

  if (state.homeFluencyPathwayAcknowledged && state.homeSelectedPathway) {
    return {
      outcome: 'membership-pathway-application',
      title: getHomeFluencyPathwayDisplay(state)?.title || 'Membership pathway',
      summary:
        getHomeFluencyPathwayDisplay(state)?.description
        || 'Apply for the selected ISCA membership pathway, then register for ISCA AI Fluency once approved.',
      ctaLabel: 'Proceed to membership application',
      actionTarget: 'salesforce',
    };
  }

  return null;
}
