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
    if (state.homeStudentOrAssociateMember === true) return 'result';
    if (state.studentVerificationFailed && state.studentFailureAcknowledged) return 'result';
    if (!state.homeFluencyPathwayAcknowledged) return 'home-fluency-student-pathway';
    return 'result';
  }

  if (state.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.PROFESSIONAL) {
    if (state.isIscaMember === null) return 'home-professional-isca-member';
    if (state.isIscaMember === true) return 'result';
    if (!state.homeEducationalBackground) return 'home-educational-background';
    if (!state.homeSelectedPathway) return 'home-pathway-selection';
    if (state.homeSelectedPathway === HOME_FLUENCY_PATHWAY.EXPERIENCED && !state.homeExperiencedMemberType) {
      return 'home-experienced-member-type';
    }
    if (!state.homeFluencyPathwayAcknowledged) return 'home-fluency-pathway-info';
    return 'result';
  }

  return 'home-user-type';
}

export function getHomeFluencyProgressSteps(state) {
  const steps = ['home-user-type'];

  if (state.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.STUDENT) {
    steps.push('home-student-final-year');
    if (state.homeFinalYearAccountancyStudent === false) {
      steps.push('home-student-isca-membership');
      if (state.homeStudentOrAssociateMember === false) {
        steps.push('home-fluency-student-pathway');
      }
    }
    steps.push('result');
    return [...new Set(steps)];
  }

  if (state.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.PROFESSIONAL) {
    steps.push('home-professional-isca-member');
    if (state.isIscaMember === false) {
      steps.push('home-educational-background');
      if (state.homeEducationalBackground) {
        steps.push('home-pathway-selection');
        if (state.homeSelectedPathway === HOME_FLUENCY_PATHWAY.EXPERIENCED) {
          steps.push('home-experienced-member-type');
        }
        if (
          state.homeSelectedPathway
          && (
            state.homeSelectedPathway !== HOME_FLUENCY_PATHWAY.EXPERIENCED
            || state.homeExperiencedMemberType
          )
        ) {
          steps.push('home-fluency-pathway-info');
        }
      }
    }
    steps.push('result');
    return [...new Set(steps)];
  }

  return steps;
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

  if (
    state.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.STUDENT
    && state.homeStudentOrAssociateMember === false
    && state.homeFluencyPathwayAcknowledged
  ) {
    return {
      outcome: 'student-membership-signup',
      title: 'Sign up for ISCA Student Membership',
      summary:
        'Apply for ISCA Student Membership. Once membership is approved, you may register for the ISCA AI Fluency programme.',
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
