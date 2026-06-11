import { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import {
  sendStudentVerificationPin as sendStudentVerificationPinRequest,
  verifyStudentEligibility as verifyStudentEligibilityRequest,
  verifyExperiencedResume as verifyExperiencedResumeRequest,
  verifyNricImages,
  verifyStudentVerificationPin as verifyStudentVerificationPinRequest,
} from 'src/auth/context/jwt';
import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import {
  readMembershipSalesforceSession,
  buildMembershipApplicationOAuthStartUrl,
  buildMembershipSalesforceCreateUrl,
  openRecognitionMembershipApplicationPage,
  MEMBERSHIP_SALESFORCE_SESSION_READY,
  MEMBERSHIP_SALESFORCE_SESSION_KEY,
  clearMembershipApplicationPending,
  saveMembershipApplicationCourseReturn,
} from 'src/utils/membership-salesforce-session';
import { POST_OAUTH_RETURN_TO_KEY } from 'src/utils/membership-eligibility-sso';
import {
  SalesforceMembershipCreateStep,
  isSalesforceMembershipCreateOutcomeKey,
  shouldUseSalesforceMembershipCreateStep,
} from './salesforce-membership-create-step';
import { HomePathwayCard } from './home-pathway-card';
import {
  HOME_STUDENT_PATHWAY_CONTENT,
  getHomePathwayContent,
  getHomePathwayExploreUrl,
  getHomePathwayUrls,
  getHomeStudentPathwayUrls,
  isHomeSpecialisationPathwayFlow,
  openHomePathwayExternalUrl,
} from './home-pathway-content';
import {
  HOME_FINAL_YEAR_ACCOUNTANCY_INSTITUTIONS,
  HOME_FLUENCY_BACKGROUND,
  HOME_FLUENCY_INITIAL_FIELDS,
  HOME_FLUENCY_PATHWAY,
  HOME_FLUENCY_USER_TYPE,
  getHomeFluencyExperiencedMemberOptions,
  getHomeFluencyFlowStep,
  getHomeFluencyOutcome,
  getHomeFluencyPathwayDisplay,
  getHomeFluencyPathwayOptions,
  getHomeFluencyProgressMeta,
  isHomeCaDirectSalesforceFlow,
} from './home-fluency-flow';

/** Home “Get Started Now” only; other entry points use default Salesforce associate opt-in. */
export const MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED = 'home-get-started';

// ----------------------------------------------------------------------

function isRecognitionMembershipFlow(state) {
  return state?.eligibilityType === 'recognition';
}

function shouldOpenRecognitionApplicationPage(state) {
  if (isHomeGetStartedFlow(state)) {
    return false;
  }
  return (
    state?.eligibilityType === 'recognition'
    && getFlowStep(state) === 'salesforce-account-choice'
    && state.salesforceSessionReady
  );
}

const ELIGIBILITY_OPTIONS = [
  { value: 'scaq-candidate', label: 'An existing candidate of SCAQ Programme' },
  { value: 'student', label: 'Currently a student pursuing your tertiary education' },
  { value: 'experienced', label: 'An individual with minimum 5 years of relevant managerial experience in accounting and finance related roles' },
  { value: 'recognition', label: 'A Chartered Accountant of a different professional body' },
  { value: 'other', label: 'Others' },
];

const CHARTERED_PATHWAY_OPTIONS = [
  {
    value: 'recognition-arrangement',
    title: 'Recognition Arrangement',
    subtitle: 'Full members of CA ANZ, CAI, CPA Australia, ICAEW and ICAS',
  },
  {
    value: 'enhanced-pathway',
    title: 'Enhanced Pathway',
    subtitle: 'ACCA members and affiliates',
  },
];

const CHARTERED_PATHWAY_OPTION_OTHERS = {
  value: 'others',
  title: 'Others',
  subtitle: 'If none of the above pathways apply',
};

function getCharteredPathwayOptionsForFlow(state) {
  if (isHomeGetStartedFlow(state)) {
    return CHARTERED_PATHWAY_OPTIONS;
  }
  return [...CHARTERED_PATHWAY_OPTIONS, CHARTERED_PATHWAY_OPTION_OTHERS];
}

const INITIAL_STATE = {
  isSingaporePr: null,
  isIscaMember: null,
  nricUploadAcknowledged: false,
  spPrVerified: null,
  wantsIscaMembership: null,
  eligibilityType: '',
  eligibilityRequirementsAcknowledged: false,
  eligibilityVerified: null,
  retryDecision: '',
  studentMembershipOptIn: null,
  scaqInterested: null,
  membershipFeeReviewed: false,
  membershipApplicationAgreed: false,
  directDegreeRecognised: null,
  scaqAssociateOptIn: null,
  scaqCandidateVerified: null,
  associateMemberAlready: null,
  studentFeePaymentCompleted: false,
  studentMembershipApplicationAgreed: false,
  studentMembershipApplicationDeclined: false,
  studentSchoolName: '',
  studentGraduationDate: '',
  studentSchoolEmail: '',
  studentEmailPinSent: false,
  studentEmailPinVerified: false,
  studentVerificationFailed: false,
  studentFailureAcknowledged: false,
  experiencedMembershipApplicationAgreed: false,
  experiencedMembershipApplicationDeclined: false,
  experiencedResumeUploaded: false,
  experiencedResumeFileName: '',
  experiencedVerificationStatus: null,
  experiencedVerificationAcknowledged: false,
  experiencedFailureAcknowledged: false,
  charteredAccountantPathway: '',
  charteredMembershipApplicationAgreed: false,
  charteredMembershipApplicationDeclined: false,
  charteredDocumentsIntroCompleted: false,
  charteredDocumentsSubmitted: false,
  charteredIdDocumentFileName: '',
  charteredTranscriptFileName: '',
  charteredCharacterReferenceFileName: '',
  charteredFirstRefereeFileName: '',
  charteredSecondRefereeFileName: '',
  charteredGoodStandingLetterFileName: '',
  charteredAccaMembershipFileName: '',
  charteredAccaTranscriptFileName: '',
  charteredAccaResumeFileName: '',
  charteredVerificationStatus: null,
  charteredVerificationAcknowledged: false,
  otherCimaQualified: null,
  otherMembershipApplicationAgreed: false,
  otherMembershipApplicationDeclined: false,
  otherScaqInterested: null,
  otherDegreeType: '',
  otherDegreeRecognised: null,
  otherCimaDocumentsAcknowledged: false,
  otherCimaIdPassportFileName: '',
  otherCimaCertificateTranscriptFileName: '',
  otherCimaGoodStandingFileName: '',
  otherPortalIdFileName: '',
  otherPortalDegreeCertificateFileName: '',
  otherPortalDegreeTranscriptFileName: '',
  otherPortalDocumentsSubmitted: false,
  otherPortalVerificationStatus: null,
  otherPortalVerificationAcknowledged: false,
  otherAiEligibility: null,
  salesforceMembershipAccountCreated: false,
  salesforceAccountChoice: '',
  salesforceSessionReady: false,
  membershipApplicationCompleted: false,
  homePostOptInFlow: false,
  homeIscaSpecialisationAnswer: null,
  homeStudentPathwayPending: false,
  homeGetStartedFlow: false,
  ...HOME_FLUENCY_INITIAL_FIELDS,
};

function isHomeGetStartedFlow(state) {
  return Boolean(state?.homeGetStartedFlow);
}

/** Prevent home-page flow flags from affecting course / learning eligibility. */
function stripHomeOnlyFlowState(flow) {
  const wasHome =
    Boolean(flow.homeGetStartedFlow)
    || Boolean(flow.homeStudentPathwayPending)
    || Boolean(flow.homePostOptInFlow);

  const next = {
    ...flow,
    homeGetStartedFlow: false,
    homePostOptInFlow: false,
    homeIscaSpecialisationAnswer: null,
    homeStudentPathwayPending: false,
    ...HOME_FLUENCY_INITIAL_FIELDS,
  };

  if (!wasHome) {
    return next;
  }

  // Home auto-skips agreement screens — restore course steps when home state leaked in.
  if (
    next.eligibilityType === 'student'
    && next.studentMembershipApplicationAgreed
    && next.studentMembershipOptIn === null
  ) {
    next.studentMembershipApplicationAgreed = false;
    next.studentMembershipApplicationDeclined = false;
  }
  if (
    next.eligibilityType === 'experienced'
    && next.experiencedMembershipApplicationAgreed
    && !next.experiencedResumeUploaded
  ) {
    next.experiencedMembershipApplicationAgreed = false;
    next.experiencedMembershipApplicationDeclined = false;
  }

  return next;
}

function resolveFlowStateOnOpen(storedFlow, fromHomeGetStarted) {
  const merged = {
    ...INITIAL_STATE,
    ...(storedFlow && typeof storedFlow === 'object' ? storedFlow : {}),
  };
  if (fromHomeGetStarted) {
    return { ...merged, homeGetStartedFlow: true, ...HOME_FLUENCY_INITIAL_FIELDS };
  }
  return stripHomeOnlyFlowState(merged);
}

function getEligibilityOptionsForFlow(state) {
  if (!isHomeGetStartedFlow(state)) {
    return ELIGIBILITY_OPTIONS;
  }
  return ELIGIBILITY_OPTIONS.filter(
    (option) => option.value !== 'scaq-candidate' && option.value !== 'other'
  );
}

function cloneFlowState(state) {
  return JSON.parse(JSON.stringify(state));
}

const HOME_ISCA_SPECIALISATION_OPTIONS = [
  { value: 'yes-experience', label: 'Yes, with the required relevant work experience' },
  { value: 'no', label: 'No' },
];

function getFlowStep(state) {
  if (isHomeGetStartedFlow(state)) {
    return getHomeFluencyFlowStep(state);
  }

  if (state.isSingaporePr === null) return 'residency';
  if (state.isIscaMember === null) return 'member';
  if (state.isIscaMember === true) return 'result';

  if (state.isSingaporePr === true && !state.nricUploadAcknowledged) return 'nric';
  if (state.isSingaporePr === true && state.spPrVerified === true) return 'result';
  if (state.wantsIscaMembership === null) return 'membership-choice';
  if (state.isSingaporePr === true && state.spPrVerified === false && state.wantsIscaMembership === null) {
    return 'membership-choice';
  }
  if (state.wantsIscaMembership === false) return 'result';

  if (!state.eligibilityType) return 'eligibility';
  if (
    state.eligibilityType === 'recognition'
    && !state.charteredAccountantPathway
    && isHomeGetStartedFlow(state)
  ) {
    return 'chartered-accountant-pathway';
  }
  if (isHomeSpecialisationPathwayFlow(state)) {
    if (state.homeIscaSpecialisationAnswer === null) {
      return 'home-isca-specialisation';
    }
    return 'home-associate-pathway';
  }
  if (state.eligibilityType === 'recognition' && !isHomeGetStartedFlow(state)) {
    return 'salesforce-account-choice';
  }
  if (
    state.eligibilityType === 'recognition'
    && !state.charteredMembershipApplicationAgreed
    && isHomeGetStartedFlow(state)
  ) {
    if (state.charteredMembershipApplicationDeclined) return 'retry-eligibility';
    return 'chartered-membership-agreement';
  }
  if (state.eligibilityType === 'recognition' && !state.charteredDocumentsIntroCompleted) {
    return 'chartered-documents';
  }
  if (state.eligibilityType === 'recognition' && !state.charteredDocumentsSubmitted) {
    return 'chartered-documents-upload';
  }
  if (
    state.eligibilityType === 'recognition'
    && state.charteredVerificationStatus !== null
    && !state.charteredVerificationAcknowledged
  ) {
    return 'chartered-verification';
  }
  if (state.eligibilityType === 'recognition' && state.charteredVerificationStatus !== true) {
    if (state.charteredVerificationStatus === false && state.charteredVerificationAcknowledged) {
      return 'retry-eligibility';
    }
    return 'chartered-verification';
  }
  if (state.eligibilityType === 'recognition') {
    return 'salesforce-account-choice';
  }
  if (state.eligibilityType === 'other' && state.otherCimaQualified === null) {
    return 'other-cima-check';
  }
  if (state.eligibilityType === 'other' && state.otherCimaQualified === true && !state.otherMembershipApplicationAgreed) {
    if (state.otherMembershipApplicationDeclined) return 'retry-eligibility';
    return 'other-membership-agreement';
  }
  if (state.eligibilityType === 'other' && state.otherCimaQualified === false && !state.otherDegreeType) {
    return 'other-degree-type';
  }
  if (state.eligibilityType === 'other' && state.otherDegreeType === 'other-accounting' && state.otherDegreeRecognised === null) {
    return 'other-degree-recognised';
  }
  if (
    state.eligibilityType === 'other'
    && (
      state.otherCimaQualified === true
      || state.otherDegreeType === 'direct-entry'
      || (state.otherDegreeType === 'other-accounting' && state.otherDegreeRecognised === true)
    )
    && state.otherCimaQualified === true
    && !state.otherCimaDocumentsAcknowledged
  ) {
    return 'other-cima-documents';
  }
  if (
    state.eligibilityType === 'other'
    && state.otherCimaQualified === true
    && (
      state.otherPortalVerificationStatus === null
      || !state.otherPortalVerificationAcknowledged
    )
  ) {
    return 'other-cima-documents';
  }
  if (
    state.eligibilityType === 'other'
    && (
      state.otherCimaQualified === true
      || state.otherDegreeType === 'direct-entry'
      || (state.otherDegreeType === 'other-accounting' && state.otherDegreeRecognised === true)
    )
    && state.otherCimaQualified !== true
    && !state.otherPortalDocumentsSubmitted
  ) {
    return 'other-scaq-portal';
  }
  if (
    state.eligibilityType === 'other'
    && (
      state.otherCimaQualified === true
      || state.otherScaqInterested === true
      || state.otherDegreeType === 'direct-entry'
      || (state.otherDegreeType === 'other-accounting' && state.otherDegreeRecognised === true)
    )
    && state.otherCimaQualified !== true
    && (
      state.otherPortalVerificationStatus === null
      || !state.otherPortalVerificationAcknowledged
    )
  ) {
    return 'other-scaq-portal';
  }
  if (state.eligibilityType === 'other' && state.otherPortalVerificationStatus === false && state.otherPortalVerificationAcknowledged) {
    return 'retry-eligibility';
  }
  if (state.eligibilityType === 'scaq-candidate' && state.scaqAssociateOptIn === null) {
    return 'scaq-associate-optin';
  }
  if (isHomeSpecialisationPathwayFlow(state)) {
    if (state.homeIscaSpecialisationAnswer === null) {
      return 'home-isca-specialisation';
    }
    return 'home-associate-pathway';
  }
  if (state.eligibilityType === 'direct-degree' && state.directDegreeRecognised === null) {
    return 'direct-degree-check';
  }
  if (state.eligibilityType === 'scaq-candidate' && state.scaqAssociateOptIn === true && state.scaqCandidateVerified === null) {
    return 'scaq-candidate-verify';
  }
  if (
    state.eligibilityType === 'scaq-candidate'
    && state.scaqAssociateOptIn === true
    && state.scaqCandidateVerified === true
    && state.associateMemberAlready === null
  ) {
    return 'associate-member-check';
  }
  if (state.eligibilityType === 'student' && state.studentMembershipOptIn === null) {
    if (state.studentMembershipApplicationDeclined) return 'retry-eligibility';
    if (!state.studentMembershipApplicationAgreed && !isHomeGetStartedFlow(state)) {
      return 'student-membership-agreement';
    }
    if (isHomeGetStartedFlow(state)) return 'home-student-pathway';
    if (state.studentVerificationFailed && state.studentFailureAcknowledged) return 'retry-eligibility';
    return 'student-membership-check';
  }
  if (state.eligibilityType === 'student' && state.studentMembershipOptIn === false && !state.studentFeePaymentCompleted) {
    return 'student-fee-payment';
  }
  if (state.eligibilityType === 'experienced' && !state.experiencedMembershipApplicationAgreed) {
    if (state.experiencedMembershipApplicationDeclined) return 'retry-eligibility';
    if (!isHomeGetStartedFlow(state)) return 'experienced-membership-agreement';
  }
  if (
    state.eligibilityType === 'experienced'
    && isHomeGetStartedFlow(state)
    && state.homePostOptInFlow
  ) {
    if (state.homeIscaSpecialisationAnswer === null) return 'home-isca-specialisation';
    return 'home-associate-pathway';
  }
  if (state.eligibilityType === 'experienced' && !state.experiencedResumeUploaded) {
    return 'experienced-documents';
  }
  if (state.eligibilityType === 'experienced' && state.experiencedVerificationStatus !== null && !state.experiencedVerificationAcknowledged) {
    return 'experienced-documents';
  }
  if (state.eligibilityType === 'experienced' && state.experiencedVerificationStatus !== true) {
    if (state.experiencedVerificationStatus === false && state.experiencedVerificationAcknowledged) return 'retry-eligibility';
    return 'experienced-documents';
  }
  if (state.eligibilityType === 'scaq-candidate' && state.scaqAssociateOptIn === false) {
    return 'retry-eligibility';
  }
  if (shouldUseSalesforceMembershipCreateStep(state)) {
    return 'salesforce-membership-create';
  }
  return 'result';
}

function getOutcome(state) {
  if (isHomeGetStartedFlow(state)) {
    const fluencyOutcome = getHomeFluencyOutcome(state);
    if (fluencyOutcome) return fluencyOutcome;
  }

  if (state.isIscaMember === true) {
    return {
      outcome: 'isca-login',
      title: 'ISCA member route',
      summary: 'Sign in with your Salesforce-linked member account.',
      ctaLabel: 'Login with Eservices',
      actionTarget: 'salesforce',
    };
  }
  if (state.isSingaporePr === true && state.spPrVerified === true) {
    return {
      outcome: 'sp-pr-verified-login',
      title: 'SP/PR Verified',
      summary: 'Verification successful.',
      ctaLabel: 'Login to platform',
      actionTarget: 'signIn',
    };
  }
  if (state.eligibilityVerified === true && state.eligibilityType === 'student' && state.studentMembershipOptIn === true) {
    return {
      outcome: 'student-create-membership-account',
      title: 'Create membership account',
      summary: 'Student membership confirmed. Create your membership account in Salesforce, then login to platform.',
      ctaLabel: 'Create account in Salesforce',
      actionTarget: 'salesforce',
    };
  }
  if (state.eligibilityVerified === true && state.eligibilityType === 'student' && state.studentMembershipOptIn === false) {
    return {
      outcome: 'student-fee-paid-create-account',
      title: 'Create membership account',
      summary: 'Membership fee step completed. Create your membership account in Salesforce, then login to platform.',
      ctaLabel: 'Create account in Salesforce',
      actionTarget: 'salesforce',
    };
  }
  if (state.eligibilityVerified === true && state.eligibilityType === 'scaq-candidate' && state.scaqCandidateVerified === false) {
    return {
      outcome: 'scaq-candidate-not-confirmed',
      title: 'SCAQ candidate not confirmed',
      summary:
        'Your Salesforce profile does not show you as an SCAQ Programme candidate. Choose another eligibility path or continue without this membership route.',
      ctaLabel: 'Continue',
      actionTarget: 'signIn',
    };
  }
  if (state.eligibilityVerified === true && state.eligibilityType === 'scaq-candidate' && state.scaqCandidateVerified === true) {
    if (state.associateMemberAlready === false) {
      return {
        outcome: 'update-associate-and-login',
        title: 'Associate status update',
        summary: 'Update Salesforce membership status to Associate, then login to platform.',
        ctaLabel: 'Login with Eservices',
        actionTarget: 'salesforce',
      };
    }
    return {
      outcome: 'associate-login',
      title: 'Associate member login',
      summary: 'Login to platform using Salesforce account.',
      ctaLabel: 'Login with Eservices',
      actionTarget: 'salesforce',
    };
  }
  if (state.eligibilityVerified === true && state.eligibilityType === 'direct-degree' && state.directDegreeRecognised === false) {
    return {
      outcome: 'direct-degree-not-recognised',
      title: 'Direct degree not recognised',
      summary: 'Check other eligibility options, SCAQ pathway, or continue as paid user.',
      ctaLabel: 'Continue',
      actionTarget: 'signIn',
    };
  }
  if (state.eligibilityVerified === true) {
    return {
      outcome: 'membership-account-create',
      title: 'Membership account route',
      summary: 'Eligibility verified. Create membership account in Salesforce, then continue login.',
      ctaLabel: 'Create account in Salesforce',
      actionTarget: 'salesforce',
    };
  }
  if (state.retryDecision === 'scaq' && state.scaqInterested === true) {
    return {
      outcome: 'scaq-portal',
      title: 'SCAQ pathway',
      summary: 'Proceed to SCAQ portal to sign up and submit required identity and qualification documents.',
      ctaLabel: 'Go to SCAQ flow',
      actionTarget: 'scaq',
    };
  }
  if (state.retryDecision === 'scaq' && state.scaqInterested === false) {
    return {
      outcome: 'login-platform',
      title: 'Continue to platform login',
      summary: 'You can continue to platform login without joining SCAQ at this step.',
      ctaLabel: 'Login to platform',
      actionTarget: 'signIn',
    };
  }
  if (state.wantsIscaMembership === false || state.isSingaporePr === false) {
    return {
      outcome: 'paid-signup',
      title: 'Paid access route',
      summary: 'Continue with account signup at SGD 900 (excluding GST).',
      ctaLabel: 'Continue to paid signup',
      actionTarget: 'signUp',
    };
  }

  return {
    outcome: 'scaq-or-skip',
    title: 'Alternative route',
    summary: 'Check SCAQ eligibility or continue as a paid user without membership.',
    ctaLabel: 'Continue',
    actionTarget: 'signIn',
  };
}

function getRequirementLabel(state, step) {
  const labelsByStep = {
    residency: 'Required before course access',
    member: 'Are you already an ISCA member?',
    nric: 'NRIC upload required for SP/PR verification',
    'membership-choice': 'Choose membership preference',
    'membership-fee': 'Membership fee and benefits information',
    'membership-agreement': 'Membership application consent',
    eligibility: 'Select your eligibility pathway',
    requirements: 'Review required supporting documents',
    'eligibility-verify': 'Eligibility verification result',
    'chartered-accountant-pathway': 'Select chartered accountant pathway',
    'chartered-membership-agreement': 'Chartered accountant application agreement',
    'chartered-documents': 'Chartered accountant supporting documents',
    'chartered-documents-upload': 'Upload chartered accountant documents',
    'chartered-verification': 'Chartered accountant verification',
    'other-cima-check': 'CIMA-CGMA qualification check',
    'other-membership-agreement': 'Other pathway membership application agreement',
    'other-scaq-interest': 'SCAQ programme interest',
    'other-degree-type': 'Other qualification type',
    'other-degree-recognised': 'ISCA recognition check',
    'other-cima-documents': 'Associate member (PBA via CIMA) documents',
    'other-scaq-portal': 'Direct to SCAQ portal route',
    'scaq-associate-optin': 'Associate member opt-in for SCAQ candidates',
    'home-isca-specialisation': 'ISCA specialisation qualification',
    'home-associate-pathway': 'About this pathway',
    'home-student-pathway': 'About this pathway',
    'home-user-type': 'Which best describes you?',
    'home-student-final-year': 'Final-year Accountancy student check',
    'home-student-isca-membership': 'ISCA Student or Associate Member check',
    'home-professional-isca-member': 'ISCA member check',
    'home-educational-background': 'Educational background',
    'home-pathway-selection': 'Select your membership pathway',
    'home-experienced-member-type': 'Experienced professional member type',
    'home-fluency-pathway-info': 'Membership pathway details',
    'home-fluency-student-pathway': 'ISCA Student Membership',
    'retry-eligibility': 'Choose next step after ineligible result',
    'student-membership-agreement': 'Student membership application agreement',
    'student-membership-check': 'Student membership decision',
    'student-fee-payment': 'Membership fee payment',
    'experienced-membership-agreement': 'Experienced pathway application agreement',
    'experienced-documents': 'Experienced pathway supporting documents',
    'direct-degree-check': 'Direct entry degree recognition check',
    'scaq-candidate-verify': 'SCAQ candidate verification',
    'associate-member-check': 'Associate member status check',
    'salesforce-account-choice': 'Create or login Salesforce account',
    'salesforce-membership-create': 'Salesforce membership registration',
    'membership-application': 'Membership application form',
    result: 'Review and continue',
  };

  if (isHomeGetStartedFlow(state)) {
    if (
      state.homeSelectedPathway === HOME_FLUENCY_PATHWAY.CA
      && step === 'salesforce-account-choice'
    ) {
      return 'Chartered Accountant (CA) Pathway';
    }
    return labelsByStep[step] || 'AI Fluency eligibility check';
  }

  if (state.isIscaMember === false && step !== 'member') {
    return 'Are you already an ISCA member? No';
  }

  return labelsByStep[step] || 'Required before course access';
}

function pushMembershipFinalStep(steps, state) {
  if (shouldUseSalesforceMembershipCreateStep(state)) {
    steps.push('salesforce-membership-create');
  } else {
    steps.push('result');
  }
}

function appendHomeEligibilityProgressSteps(steps, state) {
  if (!state.eligibilityType) return;

  if (state.eligibilityType === 'student') {
    if (state.homeStudentPathwayPending) {
      steps.push('home-student-pathway');
    } else {
      steps.push('student-membership-agreement');
      if (state.studentMembershipApplicationAgreed) {
        steps.push('student-membership-check');
        if (state.studentMembershipOptIn === false) steps.push('student-fee-payment');
        if (
          state.studentMembershipOptIn !== null
          && (state.studentMembershipOptIn === true || state.studentFeePaymentCompleted)
        ) {
          pushMembershipFinalStep(steps, state);
        }
      }
    }
  } else if (state.eligibilityType === 'experienced') {
    if (state.homePostOptInFlow) {
      steps.push('home-isca-specialisation');
      if (state.homeIscaSpecialisationAnswer !== null) {
        steps.push('home-associate-pathway');
      }
    } else if (state.experiencedMembershipApplicationAgreed) {
      steps.push('experienced-documents');
      if (
        state.experiencedResumeUploaded
        && state.experiencedVerificationStatus === true
        && state.experiencedVerificationAcknowledged
      ) {
        pushMembershipFinalStep(steps, state);
      }
      if (state.experiencedVerificationStatus === false && state.experiencedVerificationAcknowledged) {
        steps.push('retry-eligibility');
      }
    }
  } else if (state.eligibilityType === 'recognition') {
    steps.push('chartered-accountant-pathway');
    if (state.charteredAccountantPathway && state.homePostOptInFlow) {
      steps.push('home-isca-specialisation');
      if (state.homeIscaSpecialisationAnswer !== null) {
        steps.push('home-associate-pathway');
      }
    }
  }
}

function getProgressMeta(state, step) {
  const home = isHomeGetStartedFlow(state);

  if (home) {
    return getHomeFluencyProgressMeta(state, step);
  }

  const steps = ['residency', 'member'];

  if (state.isIscaMember === true) {
    steps.push('result');
  } else {
    if (state.isSingaporePr === true) {
      steps.push('nric');
      if (state.spPrVerified === true) {
        steps.push('result');
      } else if (state.spPrVerified === false) {
        steps.push('membership-choice');
      }
    }

    if (state.spPrVerified !== true) {
      steps.push('membership-choice');
      if (state.wantsIscaMembership === false) {
        steps.push('result');
      } else {
        steps.push('eligibility');
        if (state.eligibilityType) {
          if (state.eligibilityType === 'scaq-candidate' && state.scaqAssociateOptIn === false) {
            steps.push('retry-eligibility');
          }
          if (state.eligibilityType === 'scaq-candidate') {
            steps.push('scaq-associate-optin');
            if (state.scaqAssociateOptIn === true) {
              if (state.homePostOptInFlow) {
                steps.push('home-isca-specialisation');
                if (state.homeIscaSpecialisationAnswer !== null) {
                  steps.push('home-associate-pathway');
                }
              } else {
                steps.push('scaq-candidate-verify');
              }
              if (state.scaqCandidateVerified === true) {
                steps.push('associate-member-check');
                if (state.associateMemberAlready !== null) steps.push('result');
              }
              if (state.scaqCandidateVerified === false) steps.push('result');
            }
          } else if (state.eligibilityType === 'student') {
            steps.push('student-membership-agreement');
            if (state.studentMembershipApplicationAgreed) {
              if (state.homeStudentPathwayPending) {
                steps.push('home-student-pathway');
              } else {
                steps.push('student-membership-check');
                if (state.studentMembershipOptIn === false) steps.push('student-fee-payment');
                if (
                  state.studentMembershipOptIn !== null
                  && (state.studentMembershipOptIn === true || state.studentFeePaymentCompleted)
                ) {
                  pushMembershipFinalStep(steps, state);
                }
              }
            }
          } else if (state.eligibilityType === 'direct-degree') {
            steps.push('direct-degree-check');
            if (state.directDegreeRecognised !== null) pushMembershipFinalStep(steps, state);
          } else if (state.eligibilityType === 'experienced') {
            steps.push('experienced-membership-agreement');
            if (state.experiencedMembershipApplicationAgreed && state.homePostOptInFlow) {
              steps.push('home-isca-specialisation');
              if (state.homeIscaSpecialisationAnswer !== null) {
                steps.push('home-associate-pathway');
              }
            } else if (state.experiencedMembershipApplicationAgreed) {
              steps.push('experienced-documents');
              if (
                state.experiencedResumeUploaded
                && state.experiencedVerificationStatus === true
                && state.experiencedVerificationAcknowledged
              ) {
                pushMembershipFinalStep(steps, state);
              }
              if (state.experiencedVerificationStatus === false && state.experiencedVerificationAcknowledged) {
                steps.push('retry-eligibility');
              }
            }
          } else if (state.eligibilityType === 'recognition') {
            steps.push('salesforce-account-choice');
          } else if (state.eligibilityType === 'other') {
            steps.push('other-cima-check');
            if (state.otherCimaQualified === true) {
              steps.push('other-membership-agreement');
            }
            if (state.otherCimaQualified === false) {
              steps.push('other-degree-type');
              if (state.otherDegreeType === 'other-accounting') {
                steps.push('other-degree-recognised');
              }
              if (state.otherDegreeType === 'direct-entry') {
                steps.push('other-scaq-portal');
              }
              if (state.otherDegreeType === 'other-accounting' && state.otherDegreeRecognised === true) {
                steps.push('other-scaq-portal');
              }
            }
            if (
              state.otherCimaQualified === true
              || state.otherDegreeType === 'direct-entry'
              || (state.otherDegreeType === 'other-accounting' && state.otherDegreeRecognised === true)
            ) {
              if (state.otherCimaQualified === true) {
                steps.push('other-cima-documents');
              } else {
                steps.push('other-scaq-portal');
              }
            }
            if (state.otherPortalVerificationStatus === false && state.otherPortalVerificationAcknowledged) steps.push('retry-eligibility');
            if (state.otherPortalVerificationStatus === true && state.otherPortalVerificationAcknowledged) {
              pushMembershipFinalStep(steps, state);
            }
          } else {
            pushMembershipFinalStep(steps, state);
          }
        }
      }
    }
  }

  const uniqueSteps = [...new Set(steps)];
  const currentIndex = uniqueSteps.indexOf(step);
  return {
    currentStep: currentIndex >= 0 ? currentIndex + 1 : 1,
    totalSteps: uniqueSteps.length || 1,
  };
}

export function MembershipSignupDialog({ open, onClose, onContinue, entrySource }) {
  const [flowState, setFlowState] = useState(INITIAL_STATE);
  const [charteredUploadedFiles, setCharteredUploadedFiles] = useState({});
  const [nricFrontImage, setNricFrontImage] = useState(null);
  const [nricBackImage, setNricBackImage] = useState(null);
  const [nricAiChecking, setNricAiChecking] = useState(false);
  const [nricAiVerified, setNricAiVerified] = useState(false);
  const [nricAiError, setNricAiError] = useState('');
  const [nricAiFailureReason, setNricAiFailureReason] = useState('');
  const [nricAiFailureMode, setNricAiFailureMode] = useState('default');
  const [nricSignupAccessToken, setNricSignupAccessToken] = useState('');
  const [nricVerifiedJson, setNricVerifiedJson] = useState(null);
  const [studentVerificationToken, setStudentVerificationToken] = useState('');
  const [studentPinInput, setStudentPinInput] = useState('');
  const [studentPinError, setStudentPinError] = useState('');
  const [studentPinDisplay, setStudentPinDisplay] = useState('');
  const [studentPinSending, setStudentPinSending] = useState(false);
  const [studentPinVerifying, setStudentPinVerifying] = useState(false);
  const [studentEligibilityChecking, setStudentEligibilityChecking] = useState(false);
  const [studentEligibilityAssessment, setStudentEligibilityAssessment] = useState(null);
  const [experiencedResumeVerifying, setExperiencedResumeVerifying] = useState(false);
  const [experiencedResumeVerificationError, setExperiencedResumeVerificationError] = useState('');
  const [experiencedResumeAssessment, setExperiencedResumeAssessment] = useState(null);
  const resetExperiencedResumeLocalState = () => {
    setExperiencedResumeVerifying(false);
    setExperiencedResumeVerificationError('');
    setExperiencedResumeAssessment(null);
  };

  const resetNricCheckState = () => {
    setNricFrontImage(null);
    setNricBackImage(null);
    setNricAiChecking(false);
    setNricAiVerified(false);
    setNricAiError('');
    setNricAiFailureReason('');
    setNricAiFailureMode('default');
    setNricSignupAccessToken('');
    setNricVerifiedJson(null);
  };

  const resetStudentVerificationState = () => {
    setStudentVerificationToken('');
    setStudentPinInput('');
    setStudentPinError('');
    setStudentPinDisplay('');
    setStudentPinSending(false);
    setStudentPinVerifying(false);
    setStudentEligibilityChecking(false);
    setStudentEligibilityAssessment(null);
  };

  const applySalesforceSessionFromStorage = () => {
    const session = readMembershipSalesforceSession();
    if (!session?.accountId) return;

    setFlowState((prev) => {
      if (isHomeGetStartedFlow(prev)) {
        return prev;
      }

      const next = {
        ...prev,
        salesforceSessionReady: true,
        salesforceMembershipAccountCreated: true,
        salesforceAccountChoice: prev.salesforceAccountChoice || 'create',
      };

      if (shouldOpenRecognitionApplicationPage(next)) {
        queueMicrotask(() => {
          openRecognitionMembershipApplicationPage(paths.auth.membership.application);
        });
      }

      return next;
    });
  };

  useEffect(() => {
    if (!open || entrySource === MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED) {
      return undefined;
    }

    applySalesforceSessionFromStorage();

    const onStorage = (event) => {
      if (event.key === MEMBERSHIP_SALESFORCE_SESSION_KEY) {
        applySalesforceSessionFromStorage();
      }
    };

    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === MEMBERSHIP_SALESFORCE_SESSION_READY) {
        applySalesforceSessionFromStorage();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('message', onMessage);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      clearMembershipApplicationPending();
      setFlowState(INITIAL_STATE);
      setCharteredUploadedFiles({});
      resetNricCheckState();
      resetStudentVerificationState();
      resetExperiencedResumeLocalState();
      return;
    }

    const fromHomeGetStarted = entrySource === MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED;
    let nextState = resolveFlowStateOnOpen(null, fromHomeGetStarted);

    try {
      const raw = sessionStorage.getItem('membershipEligibilityFlow');
      if (raw) {
        const parsed = JSON.parse(raw);
        const storedFlow = parsed?.flow;
        if (storedFlow && typeof storedFlow === 'object') {
          nextState = resolveFlowStateOnOpen(storedFlow, fromHomeGetStarted);
        }
      }
    } catch {
      // ignore invalid draft
    }

    setFlowState(nextState);
  }, [open, entrySource]);

  const flowHistoryRef = useRef([]);
  const skipFlowHistoryRef = useRef(false);
  const lastFlowSnapshotRef = useRef(null);

  useEffect(() => {
    if (!open) {
      flowHistoryRef.current = [];
      lastFlowSnapshotRef.current = null;
      skipFlowHistoryRef.current = false;
      return;
    }

    if (skipFlowHistoryRef.current) {
      skipFlowHistoryRef.current = false;
      lastFlowSnapshotRef.current = cloneFlowState(flowState);
      return;
    }

    const snapshot = cloneFlowState(flowState);
    const currentStep = getFlowStep(flowState);
    if (lastFlowSnapshotRef.current) {
      const previousStep = getFlowStep(lastFlowSnapshotRef.current);
      if (previousStep !== currentStep) {
        flowHistoryRef.current.push(lastFlowSnapshotRef.current);
      }
    }
    lastFlowSnapshotRef.current = snapshot;
  }, [flowState, open]);

  const step = getFlowStep(flowState);
  const result = getOutcome(flowState);
  const requirementLabel = getRequirementLabel(flowState, step);
  const progressMeta = getProgressMeta(flowState, step);
  const { currentStep, totalSteps } = progressMeta;
  const progressValue = progressMeta.progressValue ?? Math.round((currentStep / totalSteps) * 100);
  const isSalesforceCreateOutcome = isSalesforceMembershipCreateOutcomeKey(result?.outcome);
  const salesforceAccountReady =
    flowState.salesforceMembershipAccountCreated && isSalesforceCreateOutcome;

  const markSalesforceMembershipAccountCreated = () => {
    setFlowState((prev) => ({ ...prev, salesforceMembershipAccountCreated: true }));
  };

  const handleResultAction = () => {
    onContinue?.({ flow: flowState, result });
  };

  const handleSalesforceLogin = () => {
    clearMembershipApplicationPending();
    onContinue?.({
      flow: flowState,
      result: {
        ...result,
        actionTarget: 'salesforce',
        ctaLabel: 'Login with Eservices',
      },
    });
  };

  const openSalesforceMembershipTab = (choice) => {
    const courseReturn =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search || ''}`
        : paths.learning;

    try {
      sessionStorage.setItem(POST_OAUTH_RETURN_TO_KEY, courseReturn);
      saveMembershipApplicationCourseReturn(courseReturn);
    } catch {
      // ignore
    }

    const url =
      choice === 'create'
        ? buildMembershipSalesforceCreateUrl(paths.auth.membership.salesforceCreate)
        : buildMembershipApplicationOAuthStartUrl(
            paths.auth.oauth.start,
            paths.auth.membership.salesforceBridge
          );

    setFlowState((prev) => ({
      ...prev,
      salesforceAccountChoice: choice === 'create' ? 'create' : 'login',
    }));

    window.location.assign(url);
  };

  const selectSalesforceAccountChoice = (choice) => {
    if (flowState.eligibilityType === 'recognition' || isHomeCaDirectSalesforceFlow(flowState)) {
      openSalesforceMembershipTab(choice);
      return;
    }
    if (choice === 'login') {
      handleSalesforceLogin();
      return;
    }
    setFlowState((prev) => ({ ...prev, salesforceAccountChoice: 'create' }));
  };

  const resultCtaLabel = salesforceAccountReady ? 'Login with Eservices' : result.ctaLabel;

  const openMembershipApplicationPage = () => {
    openRecognitionMembershipApplicationPage(paths.auth.membership.application);
  };

  const selectResidency = (value) => {
    resetNricCheckState();
    setFlowState((prev) => ({
      ...prev,
      isSingaporePr: value,
      isIscaMember: null,
      nricUploadAcknowledged: false,
      spPrVerified: null,
      wantsIscaMembership: null,
      eligibilityType: '',
      eligibilityRequirementsAcknowledged: false,
      eligibilityVerified: null,
      retryDecision: '',
      studentMembershipOptIn: null,
      scaqInterested: null,
      membershipFeeReviewed: false,
      membershipApplicationAgreed: false,
      directDegreeRecognised: null,
      scaqAssociateOptIn: null,
      scaqCandidateVerified: null,
      associateMemberAlready: null,
      studentFeePaymentCompleted: false,
      studentMembershipApplicationAgreed: false,
    }));
  };

  const selectMember = (value) => {
    resetNricCheckState();
    const fromHomeGetStarted = entrySource === MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED;
    setFlowState((prev) => ({
      ...prev,
      isIscaMember: value,
      ...(fromHomeGetStarted && value === false ? { wantsIscaMembership: true } : {}),
      nricUploadAcknowledged: false,
      spPrVerified: null,
      ...(fromHomeGetStarted ? {} : { wantsIscaMembership: null }),
      eligibilityType: '',
      eligibilityRequirementsAcknowledged: false,
      eligibilityVerified: null,
      retryDecision: '',
      studentMembershipOptIn: null,
      scaqInterested: null,
      membershipFeeReviewed: false,
      membershipApplicationAgreed: false,
      directDegreeRecognised: null,
      scaqAssociateOptIn: null,
      scaqCandidateVerified: null,
      associateMemberAlready: null,
      studentFeePaymentCompleted: false,
      studentMembershipApplicationAgreed: false,
    }));
  };

  const selectHomeFluencyUserType = (value) => {
    setFlowState((prev) => ({
      ...prev,
      homeFluencyUserType: value,
      homeFinalYearAccountancyStudent: null,
      homeStudentOrAssociateMember: null,
      homeEducationalBackground: '',
      homeSelectedPathway: '',
      homeExperiencedMemberType: '',
      homeFluencyPathwayAcknowledged: false,
      homeFluencyEligible: false,
      isIscaMember: null,
    }));
  };

  const selectHomeFinalYearAccountancy = (value) => {
    setFlowState((prev) => ({
      ...prev,
      homeFinalYearAccountancyStudent: value,
      homeFluencyEligible: value === true,
      homeStudentOrAssociateMember: null,
      homeFluencyPathwayAcknowledged: false,
    }));
  };

  const selectHomeStudentOrAssociateMember = (value) => {
    if (value === false) {
      resetStudentVerificationState();
    }
    setFlowState((prev) => ({
      ...prev,
      homeStudentOrAssociateMember: value,
      homeFluencyEligible: value === true,
      homeFluencyPathwayAcknowledged: false,
      ...(value === false
        ? {
            eligibilityVerified: null,
            studentSchoolName: '',
            studentGraduationDate: '',
            studentSchoolEmail: '',
            studentEmailPinSent: false,
            studentEmailPinVerified: false,
            studentVerificationFailed: false,
            studentFailureAcknowledged: false,
          }
        : {}),
    }));
  };

  const selectHomeProfessionalIscaMember = (value) => {
    setFlowState((prev) => ({
      ...prev,
      isIscaMember: value,
      homeFluencyEligible: value === true,
      homeEducationalBackground: '',
      homeSelectedPathway: '',
      homeExperiencedMemberType: '',
      homeFluencyPathwayAcknowledged: false,
    }));
  };

  const selectHomeEducationalBackground = (value) => {
    setFlowState((prev) => ({
      ...prev,
      homeEducationalBackground: value,
      homeSelectedPathway: '',
      homeExperiencedMemberType: '',
      homeFluencyPathwayAcknowledged: false,
    }));
  };

  const selectHomeFluencyPathway = (value) => {
    setFlowState((prev) => ({
      ...prev,
      homeSelectedPathway: value,
      homeExperiencedMemberType: value === HOME_FLUENCY_PATHWAY.EXPERIENCED ? '' : prev.homeExperiencedMemberType,
      homeFluencyPathwayAcknowledged: false,
    }));
  };

  const selectHomeExperiencedMemberType = (value) => {
    setFlowState((prev) => ({
      ...prev,
      homeExperiencedMemberType: value,
      homeFluencyPathwayAcknowledged: false,
    }));
  };

  const acknowledgeHomeFluencyPathway = () => {
    setFlowState((prev) => ({ ...prev, homeFluencyPathwayAcknowledged: true }));
  };

  const selectWantsMembership = (value) => {
    setFlowState((prev) => ({
      ...prev,
      wantsIscaMembership: value,
      eligibilityType: '',
      eligibilityRequirementsAcknowledged: false,
      eligibilityVerified: null,
      retryDecision: '',
      studentMembershipOptIn: null,
      scaqInterested: null,
      membershipFeeReviewed: false,
      membershipApplicationAgreed: false,
      directDegreeRecognised: null,
      scaqAssociateOptIn: null,
      scaqCandidateVerified: null,
      associateMemberAlready: null,
      studentFeePaymentCompleted: false,
      studentMembershipApplicationAgreed: false,
    }));
  };

  const continueAfterNricAiVerified = () => {
    onContinue?.({
      flow: flowState,
      signupAccessToken: nricSignupAccessToken || undefined,
      result: {
        outcome: 'verified-nric-signup',
        title: 'Verified signup route',
        summary: 'NRIC verified successfully. Continue to the secure signup page.',
        ctaLabel: 'Continue to sign up',
        actionTarget: 'signUp',
      },
    });
  };

  const continueAfterNricOtherOptions = () => {
    setFlowState((prev) => ({ ...prev, nricUploadAcknowledged: true, spPrVerified: false }));
  };

  const continueToPaidSignupAfterNricFailure = () => {
    onContinue?.({
      flow: flowState,
      result: {
        outcome: 'paid-signup',
        title: 'Paid access route',
        summary: 'Continue with account signup at SGD 900 (excluding GST).',
        ctaLabel: 'Continue to paid signup',
        actionTarget: 'signUp',
      },
    });
  };

  const continueToSignInAfterNricFailure = () => {
    onContinue?.({
      flow: flowState,
      result: {
        outcome: 'login-platform',
        title: 'Continue to platform login',
        summary: 'Please sign in with your credentials.',
        ctaLabel: 'Go to sign in',
        actionTarget: 'signIn',
      },
    });
  };

  const getNricFailureState = (message) => {
    const fallbackSummary =
      'Verification failed. We could not identify a valid NRIC/FIN from the uploaded images. You can upload clearer images, continue with paid signup at SGD 900, or sign in if you already have an account.';

    const rawMessage = String(message || '').trim();
    const normalized = rawMessage.toLowerCase();

    if (!rawMessage) {
      return {
        summary: fallbackSummary,
        reason: 'AI could not identify a valid NRIC/FIN from the uploaded images.',
        mode: 'default',
      };
    }

    if (
      normalized.includes('could not extract')
      || normalized.includes('could not validate')
      || normalized.includes('failed checksum validation')
      || normalized.includes('not found')
      || normalized.includes('not identify')
    ) {
      return {
        summary: fallbackSummary,
        reason: rawMessage,
        mode: 'default',
      };
    }

    if (
      normalized.includes('manual review is required')
      || normalized.includes('confidence is too low')
      || normalized.includes('could not confirm the full name clearly')
      || normalized.includes('could not confirm the date of birth clearly')
    ) {
      return {
        summary:
          'Verification needs manual review. The uploaded document could not be auto-approved securely. Please upload a clearer NRIC image set, continue with paid signup at SGD 900, or sign in if you already have an account.',
        reason: rawMessage,
        mode: 'default',
      };
    }

    if (
      normalized.includes('insufficient credits')
      || normalized.includes('temporarily unavailable because the document ocr service has insufficient credits')
      || normalized.includes('temporarily busy')
      || normalized.includes('automatic nric verification is temporarily unavailable')
      || normalized.includes('automatic nric verification failed during')
    ) {
      return {
        summary:
          'Verification is temporarily unavailable right now. Please try again later, continue with paid signup at SGD 900, or sign in if you already have an account.',
        reason: rawMessage,
        mode: 'default',
      };
    }

    if (normalized.includes('front and back nric images must be different')) {
      return {
        summary:
          'Verification failed. Front and back uploads must be different images. You can upload the correct images and try again, continue with paid signup at SGD 900, or sign in if you already have an account.',
        reason: 'Front and back uploads must be different image files.',
        mode: 'default',
      };
    }

    if (
      normalized.includes('same nric/fin document')
      || normalized.includes('same document')
      || normalized.includes('different identity details')
    ) {
      return {
        summary:
          'Verification failed. The front and back uploads do not match the same NRIC document. Please upload the correct front and back images of the same document, or continue with paid signup at SGD 900, or sign in if you already have an account.',
        reason: rawMessage,
        mode: 'default',
      };
    }

    if (
      normalized.includes('already verified this document')
      || normalized.includes('already completed signup with this verified document')
      || (normalized.includes('please sign in') && normalized.includes('credentials'))
    ) {
      return {
        summary: 'Verification already exists for this document.',
        reason: 'You have already completed signup with this verified document. Please sign in with your credentials.',
        mode: 'sign-in-only',
      };
    }

    return {
      summary: `Verification failed. ${rawMessage}`,
      reason: rawMessage,
      mode: 'default',
    };
  };

  const handleNricImageSelect = (side, file) => {
    if (!file) return;
    if (side === 'front') setNricFrontImage(file);
    if (side === 'back') setNricBackImage(file);
    setNricAiVerified(false);
    setNricAiError('');
    setNricAiFailureReason('');
    setNricAiFailureMode('default');
    setNricSignupAccessToken('');
    setNricVerifiedJson(null);
  };

  const runNricAiCheck = async () => {
    if (!nricFrontImage || !nricBackImage) {
      setNricAiError('Please upload NRIC front and back images before AI check.');
      setNricAiFailureReason('Both front and back NRIC images are required before verification.');
      setNricAiFailureMode('default');
      return;
    }
    setNricAiError('');
    setNricAiFailureReason('');
    setNricAiFailureMode('default');
    setNricAiChecking(true);
    setNricAiVerified(false);
    setNricVerifiedJson(null);
    try {
      const response = await verifyNricImages({
        frontImage: nricFrontImage,
        backImage: nricBackImage,
      });
      if (!response?.verified) {
        const failureState = getNricFailureState(response?.message);
        setNricAiError(failureState.summary);
        setNricAiFailureReason(failureState.reason);
        setNricAiFailureMode(failureState.mode);
        return;
      }
      setNricSignupAccessToken(response?.signupAccessToken || '');
      setNricVerifiedJson(response);
      setNricAiVerified(true);
    } catch (error) {
      const failureState = getNricFailureState(error?.message);
      setNricAiError(failureState.summary);
      setNricAiFailureReason(failureState.reason);
      setNricAiFailureMode(failureState.mode);
    } finally {
      setNricAiChecking(false);
    }
  };

  const selectEligibilityType = (value) => {
    resetStudentVerificationState();
    setFlowState((prev) => {
      const home = isHomeGetStartedFlow(prev);
      return {
        ...prev,
        eligibilityType: value,
      eligibilityRequirementsAcknowledged: true,
      eligibilityVerified: value === 'student' || value === 'experienced' ? null : true,
      retryDecision: '',
      studentMembershipOptIn: null,
      scaqInterested: null,
      directDegreeRecognised: null,
      scaqAssociateOptIn: null,
      scaqCandidateVerified: null,
      associateMemberAlready: null,
      homePostOptInFlow: home && value === 'experienced',
      homeIscaSpecialisationAnswer: null,
      homeStudentPathwayPending: home && value === 'student',
      studentFeePaymentCompleted: false,
      studentMembershipApplicationAgreed: home && value === 'student',
      studentMembershipApplicationDeclined: false,
      studentSchoolName: '',
      studentGraduationDate: '',
      studentSchoolEmail: '',
      studentEmailPinSent: false,
      studentEmailPinVerified: false,
      studentVerificationFailed: false,
      experiencedMembershipApplicationAgreed: home && value === 'experienced',
      experiencedMembershipApplicationDeclined: false,
      experiencedResumeUploaded: false,
      experiencedResumeFileName: '',
      experiencedVerificationStatus: null,
      experiencedVerificationAcknowledged: false,
      experiencedFailureAcknowledged: false,
      charteredAccountantPathway: '',
      charteredMembershipApplicationAgreed: false,
      charteredMembershipApplicationDeclined: false,
      charteredDocumentsIntroCompleted: false,
      charteredDocumentsSubmitted: false,
      charteredIdDocumentFileName: '',
      charteredTranscriptFileName: '',
      charteredCharacterReferenceFileName: '',
      charteredFirstRefereeFileName: '',
      charteredSecondRefereeFileName: '',
      charteredGoodStandingLetterFileName: '',
      charteredAccaMembershipFileName: '',
      charteredAccaTranscriptFileName: '',
      charteredAccaResumeFileName: '',
      charteredVerificationStatus: null,
      charteredVerificationAcknowledged: false,
      otherCimaQualified: null,
      otherMembershipApplicationAgreed: false,
      otherMembershipApplicationDeclined: false,
      otherScaqInterested: null,
      otherDegreeType: '',
      otherDegreeRecognised: null,
      otherCimaDocumentsAcknowledged: false,
      otherCimaIdPassportFileName: '',
      otherCimaCertificateTranscriptFileName: '',
      otherCimaGoodStandingFileName: '',
      otherPortalIdFileName: '',
      otherPortalDegreeCertificateFileName: '',
      otherPortalDegreeTranscriptFileName: '',
      otherPortalDocumentsSubmitted: false,
      otherPortalVerificationStatus: null,
      otherPortalVerificationAcknowledged: false,
      otherAiEligibility: null,
        salesforceAccountChoice: '',
        salesforceMembershipAccountCreated: false,
      };
    });
  };

  const acknowledgeEligibilityRequirements = () => {
    setFlowState((prev) => ({
      ...prev,
      eligibilityRequirementsAcknowledged: true,
      eligibilityVerified: null,
      retryDecision: '',
      studentMembershipOptIn: null,
      scaqInterested: null,
      directDegreeRecognised: null,
      scaqAssociateOptIn: null,
      scaqCandidateVerified: null,
      associateMemberAlready: null,
    }));
  };

  const selectEligibilityVerified = (value) => {
    setFlowState((prev) => ({
      ...prev,
      eligibilityVerified: value,
      retryDecision: '',
      studentMembershipOptIn: null,
      scaqInterested: null,
    }));
  };

  const selectRetryDecision = (value) => {
    if (value === 'check-other') {
      setFlowState((prev) => ({
        ...prev,
        eligibilityType: '',
        eligibilityRequirementsAcknowledged: false,
        eligibilityVerified: null,
        retryDecision: '',
        studentMembershipOptIn: null,
        scaqInterested: null,
        directDegreeRecognised: null,
        scaqAssociateOptIn: null,
        scaqCandidateVerified: null,
        associateMemberAlready: null,
        studentFeePaymentCompleted: false,
        studentMembershipApplicationAgreed: false,
        studentMembershipApplicationDeclined: false,
        experiencedMembershipApplicationAgreed: false,
        experiencedMembershipApplicationDeclined: false,
        experiencedResumeUploaded: false,
        experiencedResumeFileName: '',
        experiencedVerificationStatus: null,
        experiencedVerificationAcknowledged: false,
        experiencedFailureAcknowledged: false,
        charteredAccountantPathway: '',
        charteredMembershipApplicationAgreed: false,
        charteredMembershipApplicationDeclined: false,
        charteredDocumentsIntroCompleted: false,
        charteredDocumentsSubmitted: false,
        charteredIdDocumentFileName: '',
        charteredTranscriptFileName: '',
        charteredCharacterReferenceFileName: '',
        charteredFirstRefereeFileName: '',
        charteredSecondRefereeFileName: '',
        charteredGoodStandingLetterFileName: '',
        charteredAccaMembershipFileName: '',
        charteredAccaTranscriptFileName: '',
        charteredAccaResumeFileName: '',
        charteredVerificationStatus: null,
        charteredVerificationAcknowledged: false,
        otherCimaQualified: null,
        otherMembershipApplicationAgreed: false,
        otherMembershipApplicationDeclined: false,
        otherScaqInterested: null,
        otherDegreeType: '',
        otherDegreeRecognised: null,
        otherCimaDocumentsAcknowledged: false,
        otherCimaIdPassportFileName: '',
        otherCimaCertificateTranscriptFileName: '',
        otherCimaGoodStandingFileName: '',
        otherPortalIdFileName: '',
        otherPortalDegreeCertificateFileName: '',
        otherPortalDegreeTranscriptFileName: '',
        otherPortalDocumentsSubmitted: false,
        otherPortalVerificationStatus: null,
        otherPortalVerificationAcknowledged: false,
        otherAiEligibility: null,
      }));
      return;
    }
    if (value === 'skip-membership') {
      setFlowState((prev) => ({
        ...prev,
        wantsIscaMembership: false,
        eligibilityRequirementsAcknowledged: false,
        eligibilityVerified: null,
        retryDecision: '',
        studentMembershipOptIn: null,
        scaqInterested: null,
        directDegreeRecognised: null,
        scaqAssociateOptIn: null,
        scaqCandidateVerified: null,
        associateMemberAlready: null,
        studentFeePaymentCompleted: false,
        studentMembershipApplicationAgreed: false,
        studentMembershipApplicationDeclined: false,
        experiencedMembershipApplicationAgreed: false,
        experiencedMembershipApplicationDeclined: false,
        experiencedResumeUploaded: false,
        experiencedResumeFileName: '',
        experiencedVerificationStatus: null,
        experiencedVerificationAcknowledged: false,
        experiencedFailureAcknowledged: false,
        charteredAccountantPathway: '',
        charteredMembershipApplicationAgreed: false,
        charteredMembershipApplicationDeclined: false,
        charteredDocumentsIntroCompleted: false,
        charteredDocumentsSubmitted: false,
        charteredIdDocumentFileName: '',
        charteredTranscriptFileName: '',
        charteredCharacterReferenceFileName: '',
        charteredFirstRefereeFileName: '',
        charteredSecondRefereeFileName: '',
        charteredGoodStandingLetterFileName: '',
        charteredAccaMembershipFileName: '',
        charteredAccaTranscriptFileName: '',
        charteredAccaResumeFileName: '',
        charteredVerificationStatus: null,
        charteredVerificationAcknowledged: false,
        otherCimaQualified: null,
        otherMembershipApplicationAgreed: false,
        otherMembershipApplicationDeclined: false,
        otherScaqInterested: null,
        otherDegreeType: '',
        otherDegreeRecognised: null,
        otherCimaDocumentsAcknowledged: false,
        otherCimaIdPassportFileName: '',
        otherCimaCertificateTranscriptFileName: '',
        otherCimaGoodStandingFileName: '',
        otherPortalIdFileName: '',
        otherPortalDegreeCertificateFileName: '',
        otherPortalDegreeTranscriptFileName: '',
        otherPortalDocumentsSubmitted: false,
        otherPortalVerificationStatus: null,
        otherPortalVerificationAcknowledged: false,
        otherAiEligibility: null,
      }));
      return;
    }
    if (value === 'scaq') return;
  };

  const selectStudentMembershipOptIn = (value) => {
    setFlowState((prev) => ({ ...prev, studentMembershipOptIn: value, studentFeePaymentCompleted: false }));
  };

  const agreeStudentMembershipApplication = () => {
    const fromHomeGetStarted = entrySource === MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED;
    setFlowState((prev) => ({
      ...prev,
      studentMembershipApplicationAgreed: true,
      studentMembershipApplicationDeclined: false,
      ...(fromHomeGetStarted ? { homeStudentPathwayPending: true } : {}),
    }));
  };

  const declineStudentMembershipApplication = () => {
    setFlowState((prev) => ({
      ...prev,
      studentMembershipApplicationAgreed: false,
      studentMembershipApplicationDeclined: true,
    }));
  };

  const agreeExperiencedMembershipApplication = () => {
    const fromHomeGetStarted = entrySource === MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED;
    resetExperiencedResumeLocalState();
    setFlowState((prev) => ({
      ...prev,
      experiencedMembershipApplicationAgreed: true,
      experiencedMembershipApplicationDeclined: false,
      experiencedResumeUploaded: false,
      experiencedResumeFileName: '',
      experiencedVerificationStatus: null,
      experiencedVerificationAcknowledged: false,
      experiencedFailureAcknowledged: false,
      ...(fromHomeGetStarted ? { homePostOptInFlow: true, homeIscaSpecialisationAnswer: null } : {}),
    }));
  };

  const declineExperiencedMembershipApplication = () => {
    setFlowState((prev) => ({
      ...prev,
      experiencedMembershipApplicationAgreed: false,
      experiencedMembershipApplicationDeclined: true,
    }));
  };

  const handleExperiencedResumeUpload = async (event) => {
    const file = event?.target?.files?.[0];
    const inputEl = event?.target;
    if (!file) return;

    setExperiencedResumeVerificationError('');
    setExperiencedResumeAssessment(null);
    setFlowState((prev) => ({
      ...prev,
      experiencedResumeUploaded: true,
      experiencedResumeFileName: file.name,
      experiencedVerificationStatus: null,
      experiencedVerificationAcknowledged: false,
      experiencedFailureAcknowledged: false,
      eligibilityVerified: null,
    }));

    try {
      setExperiencedResumeVerifying(true);
      const assessment = await verifyExperiencedResumeRequest({ resume: file });
      setExperiencedResumeAssessment(assessment || null);
      const passed = assessment?.verified === true;
      setFlowState((prev) => ({
        ...prev,
        experiencedVerificationStatus: passed,
        eligibilityVerified: passed ? true : null,
      }));
    } catch (error) {
      setExperiencedResumeVerificationError(error?.message || 'Could not verify resume. Please try again.');
      setExperiencedResumeAssessment(null);
      setFlowState((prev) => ({
        ...prev,
        experiencedVerificationStatus: null,
        eligibilityVerified: null,
      }));
    } finally {
      setExperiencedResumeVerifying(false);
      if (inputEl) inputEl.value = '';
    }
  };

  const continueAfterExperiencedVerification = () => {
    setFlowState((prev) => ({
      ...prev,
      experiencedVerificationAcknowledged: true,
      experiencedFailureAcknowledged: prev.experiencedVerificationStatus === false ? true : prev.experiencedFailureAcknowledged,
    }));
  };

  const completeStudentFeePayment = () => {
    setFlowState((prev) => ({ ...prev, studentFeePaymentCompleted: true }));
  };

  const selectCharteredAccountantPathway = (value) => {
    const fromHomeGetStarted = entrySource === MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED;
    if (value === 'others') {
      setFlowState((prev) => ({
        ...prev,
        eligibilityType: 'other',
        charteredAccountantPathway: '',
        homePostOptInFlow: false,
        homeIscaSpecialisationAnswer: null,
        charteredMembershipApplicationAgreed: false,
        charteredMembershipApplicationDeclined: false,
        charteredDocumentsIntroCompleted: false,
        charteredDocumentsSubmitted: false,
        charteredIdDocumentFileName: '',
        charteredTranscriptFileName: '',
        charteredCharacterReferenceFileName: '',
        charteredFirstRefereeFileName: '',
        charteredSecondRefereeFileName: '',
        charteredGoodStandingLetterFileName: '',
        charteredAccaMembershipFileName: '',
        charteredAccaTranscriptFileName: '',
        charteredAccaResumeFileName: '',
        charteredVerificationStatus: null,
        charteredVerificationAcknowledged: false,
      }));
      return;
    }
    setFlowState((prev) => ({
      ...prev,
      charteredAccountantPathway: value,
      ...(fromHomeGetStarted && ['recognition-arrangement', 'enhanced-pathway'].includes(value)
        ? { homePostOptInFlow: true, homeIscaSpecialisationAnswer: null }
        : { homePostOptInFlow: false, homeIscaSpecialisationAnswer: null }),
      charteredMembershipApplicationAgreed: false,
      charteredMembershipApplicationDeclined: false,
      charteredDocumentsIntroCompleted: false,
      charteredDocumentsSubmitted: false,
      charteredIdDocumentFileName: '',
      charteredTranscriptFileName: '',
      charteredCharacterReferenceFileName: '',
      charteredFirstRefereeFileName: '',
      charteredSecondRefereeFileName: '',
      charteredGoodStandingLetterFileName: '',
      charteredAccaMembershipFileName: '',
      charteredAccaTranscriptFileName: '',
      charteredAccaResumeFileName: '',
      charteredVerificationStatus: null,
      charteredVerificationAcknowledged: false,
    }));
  };

  const agreeCharteredMembershipApplication = () => {
    setFlowState((prev) => ({
      ...prev,
      charteredMembershipApplicationAgreed: true,
      charteredMembershipApplicationDeclined: false,
    }));
  };

  const declineCharteredMembershipApplication = () => {
    setFlowState((prev) => ({
      ...prev,
      charteredMembershipApplicationAgreed: false,
      charteredMembershipApplicationDeclined: true,
    }));
  };

  const proceedToCharteredDocumentsUpload = () => {
    setFlowState((prev) => ({ ...prev, charteredDocumentsIntroCompleted: true }));
  };

  const handleCharteredDocumentUpload = (field, file) => {
    if (!file) return;
    setCharteredUploadedFiles((prev) => ({ ...prev, [field]: file }));
    setFlowState((prev) => ({
      ...prev,
      [field]: file.name,
      charteredDocumentsSubmitted: false,
      charteredVerificationStatus: null,
      charteredVerificationAcknowledged: false,
    }));
  };

  const viewCharteredDocument = (field) => {
    const file = charteredUploadedFiles[field];
    if (!file) return;
    window.open(URL.createObjectURL(file), '_blank', 'noopener,noreferrer');
  };

  const markCharteredDocumentsSubmitted = () => {
    setFlowState((prev) => {
      const recognitionReady = Boolean(
        prev.charteredIdDocumentFileName
          && prev.charteredTranscriptFileName
          && prev.charteredCharacterReferenceFileName
          && prev.charteredFirstRefereeFileName
          && prev.charteredSecondRefereeFileName
          && prev.charteredGoodStandingLetterFileName
      );
      const enhancedReady = Boolean(prev.charteredAccaMembershipFileName && prev.charteredAccaTranscriptFileName);
      const enhancedWithRequiredDocsReady = Boolean(
        prev.charteredIdDocumentFileName
          && prev.charteredAccaMembershipFileName
          && prev.charteredAccaTranscriptFileName
          && prev.charteredGoodStandingLetterFileName
          && prev.charteredCharacterReferenceFileName
          && prev.charteredAccaResumeFileName
      );
      const isReady = prev.charteredAccountantPathway === 'recognition-arrangement' ? recognitionReady : enhancedReady;
      const isEnhancedPathway = prev.charteredAccountantPathway !== 'recognition-arrangement';
      const pathwayReady = isEnhancedPathway ? enhancedWithRequiredDocsReady : isReady;
      if (!pathwayReady) return prev;
      return { ...prev, charteredDocumentsSubmitted: true };
    });
  };

  const runCharteredDummyVerification = () => {
    setFlowState((prev) => {
      const recognitionFiles = [
        prev.charteredIdDocumentFileName,
        prev.charteredTranscriptFileName,
        prev.charteredCharacterReferenceFileName,
        prev.charteredFirstRefereeFileName,
        prev.charteredSecondRefereeFileName,
        prev.charteredGoodStandingLetterFileName,
      ];
      const enhancedFiles = [
        prev.charteredIdDocumentFileName,
        prev.charteredAccaMembershipFileName,
        prev.charteredAccaTranscriptFileName,
        prev.charteredGoodStandingLetterFileName,
        prev.charteredCharacterReferenceFileName,
        prev.charteredAccaResumeFileName,
      ];
      const relevantFiles =
        prev.charteredAccountantPathway === 'recognition-arrangement'
          ? recognitionFiles
          : enhancedFiles;
      const shouldFail = relevantFiles.some((name) => {
        const normalized = String(name || '').toLowerCase();
        return normalized.includes('fail') || normalized.includes('invalid');
      });
      return {
        ...prev,
        charteredVerificationStatus: shouldFail ? false : true,
        charteredVerificationAcknowledged: false,
      };
    });
  };

  const continueAfterCharteredVerification = () => {
    setFlowState((prev) => ({ ...prev, charteredVerificationAcknowledged: true }));
  };

  const updateStudentVerificationField = (field, value) => {
    setFlowState((prev) => ({
      ...prev,
      [field]: value,
      eligibilityVerified: null,
      studentEmailPinSent: false,
      studentEmailPinVerified: false,
      studentVerificationFailed: false,
      studentFailureAcknowledged: false,
    }));
    setStudentVerificationToken('');
    setStudentPinInput('');
    setStudentPinError('');
    setStudentEligibilityAssessment(null);
  };

  const sendStudentVerificationPin = async () => {
    try {
      setStudentPinSending(true);
      setStudentPinError('');
      setStudentPinDisplay('');
      setStudentEligibilityAssessment(null);

      const response = await sendStudentVerificationPinRequest({
        schoolName: flowState.studentSchoolName,
        graduationDate: flowState.studentGraduationDate,
        schoolEmail: flowState.studentSchoolEmail,
      });

      setStudentVerificationToken(response?.verificationToken || '');
      setStudentPinDisplay(String(response?.debugPin || '').trim());
      setStudentPinInput('');
      setFlowState((prev) => ({
        ...prev,
        eligibilityVerified: null,
        studentEmailPinSent: true,
        studentEmailPinVerified: false,
        studentVerificationFailed: false,
        studentFailureAcknowledged: false,
      }));
    } catch (error) {
      setStudentVerificationToken('');
      setStudentEligibilityAssessment(null);
      setFlowState((prev) => ({
        ...prev,
        eligibilityVerified: null,
        studentEmailPinSent: false,
        studentEmailPinVerified: false,
        studentVerificationFailed: false,
        studentFailureAcknowledged: false,
      }));
      setStudentPinDisplay('');
      setStudentPinError(error?.message || 'Failed to send verification PIN. Please try again.');
    } finally {
      setStudentPinSending(false);
    }
  };

  const applyStudentDummyData = () => {
    resetStudentVerificationState();
    setFlowState((prev) => ({
      ...prev,
      eligibilityVerified: null,
      studentSchoolName: 'Nanyang Technological University',
      studentGraduationDate: '2027-05-31',
      studentSchoolEmail: 'student.demo@ntu.edu',
      studentEmailPinSent: false,
      studentEmailPinVerified: false,
      studentVerificationFailed: false,
      studentFailureAcknowledged: false,
    }));
  };

  const verifyStudentPin = async () => {
    if (!flowState.studentEmailPinSent || !studentVerificationToken) {
      setStudentPinError('Please send verification PIN first.');
      return;
    }

    try {
      setStudentPinVerifying(true);
      setStudentPinError('');
      setStudentEligibilityAssessment(null);

      await verifyStudentVerificationPinRequest({
        verificationToken: studentVerificationToken,
        pin: studentPinInput,
        schoolEmail: flowState.studentSchoolEmail,
      });

      setFlowState((prev) => ({
        ...prev,
        studentEmailPinVerified: true,
        eligibilityVerified: null,
        studentVerificationFailed: false,
        studentFailureAcknowledged: false,
      }));
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      setFlowState((prev) => ({
        ...prev,
        studentEmailPinVerified: false,
        studentVerificationFailed:
          message.includes('expired')
          || message.includes('too many')
          || message.includes('changed')
          || message.includes('request a new'),
        studentFailureAcknowledged: false,
      }));
      setStudentPinError(error?.message || 'Failed to verify PIN. Please try again.');
    } finally {
      setStudentPinVerifying(false);
    }
  };

  const continueAfterStudentVerificationFailure = () => {
    setFlowState((prev) => ({ ...prev, studentFailureAcknowledged: true }));
  };

  const runStudentAiEligibilityVerification = async () => {
    if (!flowState.studentEmailPinVerified) return;

    try {
      setStudentEligibilityChecking(true);
      setStudentPinError('');

      const assessment = await verifyStudentEligibilityRequest({
        schoolName: flowState.studentSchoolName,
        graduationDate: flowState.studentGraduationDate,
        schoolEmail: flowState.studentSchoolEmail,
      });

      setStudentEligibilityAssessment(assessment || null);
      setFlowState((prev) => ({
        ...prev,
        eligibilityVerified: assessment?.verified === true,
        studentVerificationFailed: assessment?.verified !== true,
        studentFailureAcknowledged: false,
        studentMembershipOptIn: assessment?.verified === true ? prev.studentMembershipOptIn : null,
      }));
    } catch (error) {
      setStudentEligibilityAssessment(null);
      setFlowState((prev) => ({
        ...prev,
        eligibilityVerified: false,
        studentVerificationFailed: true,
        studentFailureAcknowledged: false,
        studentMembershipOptIn: null,
      }));
      setStudentPinError(error?.message || 'Failed to verify student eligibility. Please try again.');
    } finally {
      setStudentEligibilityChecking(false);
    }
  };

  const selectScaqInterested = (value) => {
    setFlowState((prev) => ({ ...prev, scaqInterested: value }));
  };

  const acknowledgeMembershipFeeInfo = () => {
    setFlowState((prev) => ({ ...prev, membershipFeeReviewed: true }));
  };

  const agreeMembershipApplication = () => {
    setFlowState((prev) => ({ ...prev, membershipApplicationAgreed: true }));
  };

  const selectDirectDegreeRecognised = (value) => {
    if (value === false) {
      setFlowState((prev) => ({
        ...prev,
        directDegreeRecognised: false,
        eligibilityVerified: false,
      }));
      return;
    }
    setFlowState((prev) => ({ ...prev, directDegreeRecognised: true }));
  };

  const selectScaqCandidateVerified = (value) => {
    if (value === false) {
      setFlowState((prev) => ({
        ...prev,
        scaqCandidateVerified: false,
        eligibilityVerified: false,
      }));
      return;
    }
    setFlowState((prev) => ({ ...prev, scaqCandidateVerified: true }));
  };

  const selectScaqAssociateOptIn = (value) => {
    if (value === false) {
      setFlowState((prev) => ({
        ...prev,
        scaqAssociateOptIn: false,
        eligibilityVerified: true,
        scaqCandidateVerified: null,
        associateMemberAlready: null,
      }));
      return;
    }
    const fromHomeGetStarted = entrySource === MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED;
    setFlowState((prev) => {
      const next = {
        ...prev,
        scaqAssociateOptIn: true,
        scaqCandidateVerified: null,
        associateMemberAlready: null,
        eligibilityRequirementsAcknowledged: true,
        eligibilityVerified: true,
      };
      if (fromHomeGetStarted) {
        return { ...next, homePostOptInFlow: true, homeIscaSpecialisationAnswer: null };
      }
      queueMicrotask(() => {
        onContinue?.({
          flow: next,
          result: {
            outcome: 'scaq-sso-verify',
            actionTarget: 'scaq-salesforce-auto',
            title: 'Sign in with Salesforce',
            summary: 'Verify your SCAQ candidate and Associate member status with Salesforce.',
            ctaLabel: 'Continue to Salesforce',
          },
        });
      });
      return next;
    });
  };

  const selectAssociateMemberAlready = (value) => {
    setFlowState((prev) => ({ ...prev, associateMemberAlready: value }));
  };

  const selectHomeIscaSpecialisation = (value) => {
    setFlowState((prev) => ({ ...prev, homeIscaSpecialisationAnswer: value }));
  };

  const handleHomePathwayExternalLink = (url) => {
    openHomePathwayExternalUrl(url);
  };

  const selectOtherCimaQualified = (value) => {
    setFlowState((prev) => ({
      ...prev,
      otherCimaQualified: value,
      otherMembershipApplicationAgreed: false,
      otherMembershipApplicationDeclined: false,
      otherScaqInterested: null,
      otherDegreeType: '',
      otherDegreeRecognised: null,
      otherCimaDocumentsAcknowledged: false,
      otherCimaIdPassportFileName: '',
      otherCimaCertificateTranscriptFileName: '',
      otherCimaGoodStandingFileName: '',
      otherPortalIdFileName: '',
      otherPortalDegreeCertificateFileName: '',
      otherPortalDegreeTranscriptFileName: '',
      otherPortalDocumentsSubmitted: false,
      otherPortalVerificationStatus: null,
      otherPortalVerificationAcknowledged: false,
      otherAiEligibility: null,
      eligibilityVerified: null,
    }));
  };

  const selectOtherScaqInterested = (value) => {
    setFlowState((prev) => ({
      ...prev,
      otherScaqInterested: value,
      otherMembershipApplicationAgreed: false,
      otherMembershipApplicationDeclined: false,
      otherDegreeType: value === true ? '' : prev.otherDegreeType,
      otherDegreeRecognised: value === true ? null : prev.otherDegreeRecognised,
      otherCimaDocumentsAcknowledged: false,
      otherCimaIdPassportFileName: '',
      otherCimaCertificateTranscriptFileName: '',
      otherCimaGoodStandingFileName: '',
      otherPortalIdFileName: '',
      otherPortalDegreeCertificateFileName: '',
      otherPortalDegreeTranscriptFileName: '',
      otherPortalDocumentsSubmitted: false,
      otherPortalVerificationStatus: null,
      otherPortalVerificationAcknowledged: false,
      otherAiEligibility: null,
      eligibilityVerified: null,
    }));
  };

  const selectOtherDegreeType = (value) => {
    setFlowState((prev) => ({
      ...prev,
      otherDegreeType: value,
      otherMembershipApplicationAgreed: false,
      otherMembershipApplicationDeclined: false,
      otherDegreeRecognised: value === 'direct-entry' ? true : null,
      otherCimaDocumentsAcknowledged: false,
      otherCimaIdPassportFileName: '',
      otherCimaCertificateTranscriptFileName: '',
      otherCimaGoodStandingFileName: '',
      otherPortalIdFileName: '',
      otherPortalDegreeCertificateFileName: '',
      otherPortalDegreeTranscriptFileName: '',
      otherPortalDocumentsSubmitted: false,
      otherPortalVerificationStatus: null,
      otherPortalVerificationAcknowledged: false,
      otherAiEligibility: null,
      eligibilityVerified: null,
    }));
  };

  const selectOtherDegreeRecognised = (value) => {
    setFlowState((prev) => ({
      ...prev,
      otherDegreeRecognised: value,
      otherMembershipApplicationAgreed: false,
      otherMembershipApplicationDeclined: false,
      otherCimaDocumentsAcknowledged: false,
      otherCimaIdPassportFileName: '',
      otherCimaCertificateTranscriptFileName: '',
      otherCimaGoodStandingFileName: '',
      otherPortalIdFileName: '',
      otherPortalDegreeCertificateFileName: '',
      otherPortalDegreeTranscriptFileName: '',
      otherPortalDocumentsSubmitted: false,
      otherPortalVerificationStatus: null,
      otherPortalVerificationAcknowledged: false,
      otherAiEligibility: null,
      eligibilityVerified: null,
    }));
  };

  const agreeOtherMembershipApplication = () => {
    setFlowState((prev) => ({
      ...prev,
      otherMembershipApplicationAgreed: true,
      otherMembershipApplicationDeclined: false,
    }));
  };

  const declineOtherMembershipApplication = () => {
    setFlowState((prev) => ({
      ...prev,
      otherMembershipApplicationAgreed: false,
      otherMembershipApplicationDeclined: true,
    }));
  };

  const handleOtherCimaDocumentUpload = (field, file) => {
    if (!file) return;
    setCharteredUploadedFiles((prev) => ({ ...prev, [field]: file }));
    setFlowState((prev) => ({
      ...prev,
      [field]: file.name,
      otherCimaDocumentsAcknowledged: false,
    }));
  };

  const viewOtherCimaDocument = (field) => {
    const file = charteredUploadedFiles[field];
    if (!file) return;
    window.open(URL.createObjectURL(file), '_blank', 'noopener,noreferrer');
  };

  const continueOtherCimaDocuments = () => {
    setFlowState((prev) => {
      const ready = Boolean(
        prev.otherCimaIdPassportFileName
          && prev.otherCimaCertificateTranscriptFileName
          && prev.otherCimaGoodStandingFileName
      );
      if (!ready) return prev;
      return {
        ...prev,
        otherCimaDocumentsAcknowledged: true,
        otherPortalDocumentsSubmitted: true,
        otherPortalVerificationStatus: null,
        otherPortalVerificationAcknowledged: false,
      };
    });
  };

  const handleOtherPortalDocumentUpload = (field, file) => {
    if (!file) return;
    setCharteredUploadedFiles((prev) => ({ ...prev, [field]: file }));
    setFlowState((prev) => ({
      ...prev,
      [field]: file.name,
      otherPortalDocumentsSubmitted: false,
      otherPortalVerificationStatus: null,
      otherPortalVerificationAcknowledged: false,
      eligibilityVerified: null,
      otherAiEligibility: null,
    }));
  };

  const viewOtherPortalDocument = (field) => {
    const file = charteredUploadedFiles[field];
    if (!file) return;
    window.open(URL.createObjectURL(file), '_blank', 'noopener,noreferrer');
  };

  const markOtherPortalDocumentsSubmitted = () => {
    setFlowState((prev) => {
      if (prev.otherCimaQualified === true) {
        return {
          ...prev,
          otherPortalDocumentsSubmitted: true,
          otherPortalVerificationStatus: null,
          otherPortalVerificationAcknowledged: false,
        };
      }
      const isReady = Boolean(
        prev.otherPortalIdFileName
          && prev.otherPortalDegreeCertificateFileName
          && prev.otherPortalDegreeTranscriptFileName
      );
      if (!isReady) return prev;
      return {
        ...prev,
        otherPortalDocumentsSubmitted: true,
        otherPortalVerificationStatus: null,
        otherPortalVerificationAcknowledged: false,
      };
    });
  };

  const runOtherPortalDummyVerification = () => {
    setFlowState((prev) => {
      if (!prev.otherPortalDocumentsSubmitted) return prev;
      const files = prev.otherCimaQualified === true
        ? [
            prev.otherCimaIdPassportFileName,
            prev.otherCimaCertificateTranscriptFileName,
            prev.otherCimaGoodStandingFileName,
          ]
        : [
            prev.otherPortalIdFileName,
            prev.otherPortalDegreeCertificateFileName,
            prev.otherPortalDegreeTranscriptFileName,
          ];
      const shouldFail = files.some((name) => {
        const normalized = String(name || '').toLowerCase();
        return normalized.includes('fail') || normalized.includes('invalid');
      });
      return {
        ...prev,
        otherPortalVerificationStatus: shouldFail ? false : true,
        otherPortalVerificationAcknowledged: false,
      };
    });
  };

  const continueAfterOtherPortalVerification = () => {
    setFlowState((prev) => ({
      ...prev,
      otherPortalVerificationAcknowledged: true,
      otherAiEligibility: prev.otherPortalVerificationStatus === true,
      eligibilityVerified: prev.otherPortalVerificationStatus === true,
    }));
  };

  const ELIGIBILITY_REQUIREMENTS = {
    student: ['School name', 'Graduation date', 'School email ending with .edu or @yopmail.com (verification PIN required)'],
    recognition: ['Passport/ID copy', 'Professional full transcript', 'Signed character references form (2 referees)', 'Letter of good standing (within 3 months)'],
    enhanced: ['Passport/ID copy', 'ACCA certificate', 'ACCA transcript', 'Letter of good standing', 'Signed character references form', 'Resume/CV'],
    cima: ['Passport/ID copy', 'Professional qualification certificate and transcript', 'Letter of good standing (within 3 months)'],
    'direct-degree': ['Direct entry degree certificate', 'Transcript', 'Passport/ID copy'],
    experienced: ['Latest resume/CV', 'Identity document', 'Supporting employment/role evidence'],
    'scaq-candidate': ['SCAQ candidate details', 'Candidate verification in Salesforce'],
    other: ['Check SCAQ pathway eligibility or select another eligibility route'],
  };

  const rewindEphemeralUiForStep = (targetStep) => {
    if (targetStep === 'nric') {
      resetNricCheckState();
    }
    if (targetStep === 'student-membership-check' || targetStep === 'student-fee-payment') {
      resetStudentVerificationState();
    }
    if (targetStep === 'experienced-documents') {
      resetExperiencedResumeLocalState();
    }
  };

  const goBack = () => {
    const previousSnapshot = flowHistoryRef.current.pop();
    if (previousSnapshot) {
      skipFlowHistoryRef.current = true;
      const previousStep = getFlowStep(previousSnapshot);
      rewindEphemeralUiForStep(previousStep);
      setFlowState(previousSnapshot);
      lastFlowSnapshotRef.current = cloneFlowState(previousSnapshot);
      return;
    }

    if (step === 'member') {
      setFlowState(
        flowState.homeGetStartedFlow
          ? { ...INITIAL_STATE, homeGetStartedFlow: true, ...HOME_FLUENCY_INITIAL_FIELDS }
          : INITIAL_STATE
      );
      return;
    }
    if (step === 'home-user-type') {
      setFlowState({ ...INITIAL_STATE, homeGetStartedFlow: true, ...HOME_FLUENCY_INITIAL_FIELDS });
      return;
    }
    if (step === 'home-student-final-year') {
      setFlowState((prev) => ({
        ...prev,
        homeFluencyUserType: '',
        homeFinalYearAccountancyStudent: null,
        homeFluencyEligible: false,
      }));
      return;
    }
    if (step === 'home-student-isca-membership') {
      setFlowState((prev) => ({
        ...prev,
        homeFinalYearAccountancyStudent: null,
        homeStudentOrAssociateMember: null,
        homeFluencyEligible: false,
        homeFluencyPathwayAcknowledged: false,
      }));
      return;
    }
    if (step === 'home-fluency-student-pathway') {
      resetStudentVerificationState();
      setFlowState((prev) => ({
        ...prev,
        homeStudentOrAssociateMember: null,
        homeFluencyPathwayAcknowledged: false,
        eligibilityVerified: null,
        studentSchoolName: '',
        studentGraduationDate: '',
        studentSchoolEmail: '',
        studentEmailPinSent: false,
        studentEmailPinVerified: false,
        studentVerificationFailed: false,
        studentFailureAcknowledged: false,
      }));
      return;
    }
    if (step === 'home-professional-isca-member') {
      setFlowState((prev) => ({
        ...prev,
        homeFluencyUserType: '',
        isIscaMember: null,
        homeFluencyEligible: false,
        homeEducationalBackground: '',
        homeSelectedPathway: '',
        homeExperiencedMemberType: '',
        homeFluencyPathwayAcknowledged: false,
      }));
      return;
    }
    if (step === 'home-educational-background') {
      setFlowState((prev) => ({
        ...prev,
        isIscaMember: null,
        homeEducationalBackground: '',
        homeSelectedPathway: '',
        homeExperiencedMemberType: '',
        homeFluencyPathwayAcknowledged: false,
      }));
      return;
    }
    if (step === 'home-pathway-selection') {
      setFlowState((prev) => ({
        ...prev,
        homeSelectedPathway: '',
        homeExperiencedMemberType: '',
        homeFluencyPathwayAcknowledged: false,
      }));
      return;
    }
    if (step === 'home-experienced-member-type') {
      setFlowState((prev) => ({
        ...prev,
        homeExperiencedMemberType: '',
        homeFluencyPathwayAcknowledged: false,
      }));
      return;
    }
    if (step === 'home-fluency-pathway-info') {
      setFlowState((prev) => ({ ...prev, homeFluencyPathwayAcknowledged: false }));
      return;
    }
    if (step === 'membership-choice') {
      if (flowState.isSingaporePr === true) {
        resetNricCheckState();
        setFlowState((prev) => ({
          ...prev,
          nricUploadAcknowledged: false,
          spPrVerified: null,
          wantsIscaMembership: null,
          eligibilityType: '',
        }));
        return;
      }
      setFlowState((prev) => ({ ...prev, isIscaMember: null }));
      return;
    }
    if (step === 'membership-agreement') {
      setFlowState((prev) => ({ ...prev, membershipApplicationAgreed: false, membershipFeeReviewed: false }));
      return;
    }
    if (step === 'membership-fee') {
      setFlowState((prev) => ({ ...prev, membershipFeeReviewed: false, wantsIscaMembership: null }));
      return;
    }
    if (step === 'nric') {
      setFlowState((prev) => ({ ...prev, isIscaMember: null, nricUploadAcknowledged: false }));
      return;
    }
    if (step === 'eligibility') {
      if (flowState.homeGetStartedFlow) {
        setFlowState((prev) => ({ ...prev, isIscaMember: null, eligibilityType: '' }));
        return;
      }
      setFlowState((prev) => ({ ...prev, wantsIscaMembership: null, eligibilityType: '' }));
      return;
    }
    if (step === 'requirements') {
      setFlowState((prev) => ({ ...prev, eligibilityRequirementsAcknowledged: false, eligibilityType: '' }));
      return;
    }
    if (step === 'eligibility-verify') {
      setFlowState((prev) => ({ ...prev, eligibilityVerified: null, retryDecision: '', eligibilityRequirementsAcknowledged: false }));
      return;
    }
    if (step === 'direct-degree-check') {
      setFlowState((prev) => ({
        ...prev,
        eligibilityType: '',
        eligibilityRequirementsAcknowledged: false,
        directDegreeRecognised: null,
        eligibilityVerified: null,
      }));
      return;
    }
    if (step === 'other-cima-check') {
      setFlowState((prev) => ({
        ...prev,
        eligibilityType: '',
        otherCimaQualified: null,
        otherMembershipApplicationAgreed: false,
        otherMembershipApplicationDeclined: false,
        otherScaqInterested: null,
        otherDegreeType: '',
        otherDegreeRecognised: null,
        otherCimaIdPassportFileName: '',
        otherCimaCertificateTranscriptFileName: '',
        otherCimaGoodStandingFileName: '',
        otherPortalIdFileName: '',
        otherPortalDegreeCertificateFileName: '',
        otherPortalDegreeTranscriptFileName: '',
        otherPortalDocumentsSubmitted: false,
        otherPortalVerificationStatus: null,
        otherPortalVerificationAcknowledged: false,
        otherAiEligibility: null,
      }));
      return;
    }
    if (step === 'other-membership-agreement') {
      setFlowState((prev) => ({
        ...prev,
        otherMembershipApplicationAgreed: false,
        otherMembershipApplicationDeclined: false,
        otherCimaQualified: null,
        otherCimaIdPassportFileName: '',
        otherCimaCertificateTranscriptFileName: '',
        otherCimaGoodStandingFileName: '',
      }));
      return;
    }
    if (step === 'other-scaq-interest') {
      setFlowState((prev) => ({ ...prev, otherCimaQualified: null, otherScaqInterested: null }));
      return;
    }
    if (step === 'other-degree-type') {
      setFlowState((prev) => ({
        ...prev,
        otherCimaQualified: null,
        otherDegreeType: '',
      }));
      return;
    }
    if (step === 'other-degree-recognised') {
      setFlowState((prev) => ({
        ...prev,
        otherDegreeRecognised: null,
        otherCimaDocumentsAcknowledged: false,
        otherCimaIdPassportFileName: '',
        otherCimaCertificateTranscriptFileName: '',
        otherCimaGoodStandingFileName: '',
        otherPortalIdFileName: '',
        otherPortalDegreeCertificateFileName: '',
        otherPortalDegreeTranscriptFileName: '',
        otherPortalDocumentsSubmitted: false,
        otherPortalVerificationStatus: null,
        otherPortalVerificationAcknowledged: false,
        otherAiEligibility: null,
      }));
      return;
    }
    if (step === 'other-cima-documents') {
      setFlowState((prev) => ({
        ...prev,
        otherCimaDocumentsAcknowledged: false,
        otherCimaIdPassportFileName: '',
        otherCimaCertificateTranscriptFileName: '',
        otherCimaGoodStandingFileName: '',
        otherPortalIdFileName: '',
        otherPortalDegreeCertificateFileName: '',
        otherPortalDegreeTranscriptFileName: '',
        otherPortalDocumentsSubmitted: false,
        otherPortalVerificationStatus: null,
        otherPortalVerificationAcknowledged: false,
        otherMembershipApplicationAgreed: false,
        otherMembershipApplicationDeclined: false,
      }));
      return;
    }
    if (step === 'other-scaq-portal') {
      setFlowState((prev) => {
        if (prev.otherCimaQualified === true) {
          return {
            ...prev,
            otherCimaDocumentsAcknowledged: false,
            otherPortalDocumentsSubmitted: false,
            otherPortalVerificationStatus: null,
            otherPortalVerificationAcknowledged: false,
            otherAiEligibility: null,
            eligibilityVerified: null,
          };
        }
        if (prev.otherDegreeType === 'other-accounting') {
          return {
            ...prev,
            otherDegreeRecognised: null,
            otherPortalDocumentsSubmitted: false,
            otherPortalVerificationStatus: null,
            otherPortalVerificationAcknowledged: false,
            otherAiEligibility: null,
            eligibilityVerified: null,
          };
        }
        return {
          ...prev,
          otherDegreeType: '',
          otherPortalDocumentsSubmitted: false,
          otherPortalVerificationStatus: null,
          otherPortalVerificationAcknowledged: false,
          otherAiEligibility: null,
          eligibilityVerified: null,
        };
      });
      return;
    }
    if (step === 'chartered-accountant-pathway') {
      setFlowState((prev) => ({ ...prev, charteredAccountantPathway: '', eligibilityType: '' }));
      return;
    }
    if (step === 'chartered-membership-agreement') {
      setFlowState((prev) => ({
        ...prev,
        charteredMembershipApplicationAgreed: false,
        charteredMembershipApplicationDeclined: false,
        charteredAccountantPathway: '',
      }));
      return;
    }
    if (step === 'chartered-documents') {
      setFlowState((prev) => ({
        ...prev,
        charteredDocumentsIntroCompleted: false,
        charteredDocumentsSubmitted: false,
        charteredIdDocumentFileName: '',
        charteredTranscriptFileName: '',
        charteredCharacterReferenceFileName: '',
        charteredFirstRefereeFileName: '',
        charteredSecondRefereeFileName: '',
        charteredGoodStandingLetterFileName: '',
        charteredAccaMembershipFileName: '',
        charteredAccaTranscriptFileName: '',
        charteredAccaResumeFileName: '',
        charteredMembershipApplicationAgreed: false,
      }));
      return;
    }
    if (step === 'chartered-documents-upload') {
      setFlowState((prev) => ({
        ...prev,
        charteredDocumentsIntroCompleted: false,
        charteredDocumentsSubmitted: false,
        charteredIdDocumentFileName: '',
        charteredTranscriptFileName: '',
        charteredCharacterReferenceFileName: '',
        charteredFirstRefereeFileName: '',
        charteredSecondRefereeFileName: '',
        charteredGoodStandingLetterFileName: '',
        charteredAccaMembershipFileName: '',
        charteredAccaTranscriptFileName: '',
        charteredAccaResumeFileName: '',
      }));
      return;
    }
    if (step === 'chartered-verification') {
      setFlowState((prev) => ({
        ...prev,
        charteredVerificationStatus: null,
        charteredVerificationAcknowledged: false,
        charteredDocumentsSubmitted: false,
      }));
      return;
    }
    if (step === 'scaq-associate-optin') {
      setFlowState((prev) => ({
        ...prev,
        eligibilityType: '',
        eligibilityRequirementsAcknowledged: false,
        eligibilityVerified: null,
        scaqAssociateOptIn: null,
        scaqCandidateVerified: null,
        associateMemberAlready: null,
        homePostOptInFlow: false,
        homeIscaSpecialisationAnswer: null,
      }));
      return;
    }
    if (step === 'home-associate-pathway') {
      setFlowState((prev) => ({ ...prev, homeIscaSpecialisationAnswer: null }));
      return;
    }
    if (step === 'home-isca-specialisation') {
      setFlowState((prev) => {
        const base = {
          ...prev,
          homePostOptInFlow: false,
          homeIscaSpecialisationAnswer: null,
        };
        if (prev.eligibilityType === 'scaq-candidate') {
          return {
            ...base,
            scaqAssociateOptIn: null,
            eligibilityVerified: null,
            eligibilityType: '',
            eligibilityRequirementsAcknowledged: false,
          };
        }
        if (prev.eligibilityType === 'experienced') {
          if (prev.homeGetStartedFlow) {
            return {
              ...base,
              eligibilityType: '',
              experiencedMembershipApplicationAgreed: false,
              experiencedMembershipApplicationDeclined: false,
            };
          }
          return {
            ...base,
            experiencedMembershipApplicationAgreed: false,
            experiencedMembershipApplicationDeclined: false,
          };
        }
        if (prev.eligibilityType === 'recognition') {
          return {
            ...base,
            charteredAccountantPathway: '',
          };
        }
        return base;
      });
      return;
    }
    if (step === 'scaq-candidate-verify') {
      setFlowState((prev) => ({
        ...prev,
        scaqCandidateVerified: null,
        associateMemberAlready: null,
        eligibilityVerified: true,
      }));
      return;
    }
    if (step === 'associate-member-check') {
      setFlowState((prev) => ({
        ...prev,
        associateMemberAlready: null,
        scaqCandidateVerified: null,
      }));
      return;
    }
    if (step === 'home-student-pathway') {
      setFlowState((prev) => {
        if (prev.homeGetStartedFlow) {
          return {
            ...prev,
            eligibilityType: '',
            homeStudentPathwayPending: false,
            studentMembershipApplicationAgreed: false,
          };
        }
        return {
          ...prev,
          homeStudentPathwayPending: false,
          studentMembershipApplicationAgreed: false,
        };
      });
      return;
    }
    if (step === 'student-membership-check') {
      resetStudentVerificationState();
      setFlowState((prev) => ({
        ...prev,
        eligibilityVerified: null,
        studentMembershipOptIn: null,
        studentFeePaymentCompleted: false,
        studentMembershipApplicationAgreed: false,
        studentSchoolName: '',
        studentGraduationDate: '',
        studentSchoolEmail: '',
        studentEmailPinSent: false,
        studentEmailPinVerified: false,
        studentVerificationFailed: false,
        studentFailureAcknowledged: false,
      }));
      return;
    }
    if (step === 'student-membership-agreement') {
      setFlowState((prev) => ({
        ...prev,
        studentMembershipApplicationAgreed: false,
        studentMembershipApplicationDeclined: false,
        eligibilityType: '',
      }));
      return;
    }
    if (step === 'student-fee-payment') {
      setFlowState((prev) => ({ ...prev, studentMembershipOptIn: null, studentFeePaymentCompleted: false }));
      return;
    }
    if (step === 'experienced-membership-agreement') {
      setFlowState((prev) => ({
        ...prev,
        experiencedMembershipApplicationAgreed: false,
        experiencedMembershipApplicationDeclined: false,
        eligibilityType: '',
      }));
      return;
    }
    if (step === 'experienced-documents') {
      resetExperiencedResumeLocalState();
      setFlowState((prev) => ({
        ...prev,
        experiencedResumeUploaded: false,
        experiencedResumeFileName: '',
        experiencedVerificationStatus: null,
        experiencedVerificationAcknowledged: false,
        experiencedFailureAcknowledged: false,
        eligibilityVerified: null,
      }));
      return;
    }
    if (step === 'salesforce-membership-create') {
      setFlowState((prev) => ({
        ...prev,
        salesforceAccountChoice: '',
        salesforceMembershipAccountCreated: false,
        salesforceSessionReady: false,
        eligibilityVerified: null,
        eligibilityRequirementsAcknowledged: false,
      }));
      return;
    }
    if (step === 'membership-application') {
      setFlowState((prev) => ({
        ...prev,
        salesforceSessionReady: false,
        salesforceAccountChoice: '',
        salesforceMembershipAccountCreated: false,
        membershipApplicationCompleted: false,
      }));
      return;
    }
    if (step === 'salesforce-account-choice') {
      setFlowState((prev) => ({
        ...prev,
        ...(prev.homeGetStartedFlow && prev.homeSelectedPathway === HOME_FLUENCY_PATHWAY.CA
          ? { homeSelectedPathway: '' }
          : { eligibilityType: '', eligibilityVerified: null }),
        salesforceAccountChoice: '',
        salesforceSessionReady: false,
      }));
      return;
    }
    if (step === 'retry-eligibility') {
      setFlowState((prev) => ({
        ...prev,
        eligibilityType: '',
        eligibilityRequirementsAcknowledged: false,
        eligibilityVerified: null,
        retryDecision: '',
        scaqAssociateOptIn: null,
        scaqCandidateVerified: null,
        associateMemberAlready: null,
        directDegreeRecognised: null,
        studentMembershipOptIn: null,
        studentMembershipApplicationAgreed: false,
        studentMembershipApplicationDeclined: false,
        experiencedMembershipApplicationAgreed: false,
        experiencedMembershipApplicationDeclined: false,
        homePostOptInFlow: false,
        homeIscaSpecialisationAnswer: null,
      }));
      return;
    }
    if (step === 'result') {
      if (flowState.homeGetStartedFlow) {
        if (flowState.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.STUDENT) {
          if (flowState.homeFinalYearAccountancyStudent === true) {
            setFlowState((prev) => ({
              ...prev,
              homeFinalYearAccountancyStudent: null,
              homeFluencyEligible: false,
            }));
            return;
          }
          if (flowState.homeStudentOrAssociateMember === true) {
            setFlowState((prev) => ({
              ...prev,
              homeStudentOrAssociateMember: null,
              homeFluencyEligible: false,
            }));
            return;
          }
          if (flowState.homeFluencyPathwayAcknowledged) {
            setFlowState((prev) => ({ ...prev, homeFluencyPathwayAcknowledged: false }));
            return;
          }
        }
        if (flowState.homeFluencyUserType === HOME_FLUENCY_USER_TYPE.PROFESSIONAL) {
          if (flowState.isIscaMember === true) {
            setFlowState((prev) => ({
              ...prev,
              isIscaMember: null,
              homeFluencyEligible: false,
            }));
            return;
          }
          if (flowState.homeFluencyPathwayAcknowledged) {
            setFlowState((prev) => ({ ...prev, homeFluencyPathwayAcknowledged: false }));
            return;
          }
        }
      }
      if (flowState.isSingaporePr === false) {
        if (flowState.wantsIscaMembership === false) {
          setFlowState((prev) => ({ ...prev, wantsIscaMembership: null }));
          return;
        }
        setFlowState((prev) => ({ ...prev, isIscaMember: null, wantsIscaMembership: null, eligibilityType: '' }));
        return;
      }
      if (flowState.isIscaMember === true) {
        setFlowState((prev) => ({ ...prev, isIscaMember: null }));
        return;
      }
      if (flowState.spPrVerified === true) {
        setFlowState((prev) => ({ ...prev, spPrVerified: null }));
        return;
      }
      if (flowState.studentMembershipOptIn !== null) {
        setFlowState((prev) => ({ ...prev, studentMembershipOptIn: null }));
        return;
      }
      if (flowState.eligibilityVerified === true) {
        setFlowState((prev) => ({ ...prev, eligibilityVerified: null, eligibilityRequirementsAcknowledged: false }));
        return;
      }
      if (flowState.wantsIscaMembership === false) {
        setFlowState((prev) => ({ ...prev, wantsIscaMembership: null }));
        return;
      }
      setFlowState((prev) => ({ ...prev, eligibilityType: '' }));
    }
  };

  const handleDismiss = () => {
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      disableScrollLock
      onClose={handleDismiss}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: (theme) => alpha(theme.palette.common.black, 0.5),
          },
        },
      }}
      PaperProps={{
        sx: (theme) => ({
          width: '100%',
          maxWidth: 560,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[8],
        }),
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 2, pb: 1.25 }}>
        {step !== 'residency' && step !== 'home-user-type' && !(flowState.homeGetStartedFlow && step === 'member') && (
          <IconButton
            size="small"
            onClick={goBack}
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              color: 'text.secondary',
              border: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Iconify icon="solar:arrow-left-linear" width={20} />
          </IconButton>
        )}
        <Button
          variant="text"
          color="inherit"
          size="small"
          type="button"
          onClick={handleDismiss}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontWeight: 600,
            opacity: 0.72,
            textTransform: 'none',
            '&:hover': { opacity: 1, bgcolor: 'action.hover' },
          }}
        >
          Skip
        </Button>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            lineHeight: 1.2,
            pl: step !== 'residency' && step !== 'home-user-type' && !(flowState.homeGetStartedFlow && step === 'member') ? 5 : 0,
            pr: 5,
          }}
        >
          Membership eligibility check
        </Typography>
        <Typography
          variant="caption"
          sx={{
            mt: 0.75,
            color: 'text.secondary',
            display: 'block',
            pl: step !== 'residency' && step !== 'home-user-type' && !(flowState.homeGetStartedFlow && step === 'member') ? 5 : 0,
            pr: 5,
          }}
        >
          Step {currentStep} of {totalSteps}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.18),
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 36, textAlign: 'right' }}>
            {progressValue}%
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 0.5, px: 3, pb: 1.5 }}>
        <Box
          sx={(theme) => ({
            mb: 1.5,
            px: 1.25,
            py: 0.75,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            bgcolor: alpha(theme.palette.info.main, 0.08),
            border: `1px solid ${alpha(theme.palette.info.main, 0.24)}`,
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: 13,
          })}
        >
          <Iconify icon="solar:info-circle-bold" width={16} />
          {requirementLabel}
        </Box>
        {step === 'residency' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Are you a Singapore Citizen or Permanent Resident?
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'flex-end' }}
            >
              <Button variant="contained" onClick={() => selectResidency(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectResidency(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'home-user-type' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Which best describes you?
            </Typography>
            <Stack spacing={1}>
              <Paper
                variant="outlined"
                onClick={() => selectHomeFluencyUserType(HOME_FLUENCY_USER_TYPE.STUDENT)}
                sx={(theme) => ({
                  p: 1.25,
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  '&:hover': { borderColor: theme.palette.text.primary },
                })}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Student
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                onClick={() => selectHomeFluencyUserType(HOME_FLUENCY_USER_TYPE.PROFESSIONAL)}
                sx={(theme) => ({
                  p: 1.25,
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  '&:hover': { borderColor: theme.palette.text.primary },
                })}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Working Professional
                </Typography>
              </Paper>
            </Stack>
          </Stack>
        )}
        {step === 'home-student-final-year' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Are you a final-year Accountancy student from one of the following Singapore local
              universities or polytechnics?
            </Typography>
            <Box
              sx={(theme) => ({
                px: 1.75,
                py: 1.25,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                bgcolor: alpha(theme.palette.grey[500], 0.06),
              })}
            >
              <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 0.5, listStyle: 'none' }}>
                {HOME_FINAL_YEAR_ACCOUNTANCY_INSTITUTIONS.map((institution) => (
                  <Box
                    key={institution}
                    component="li"
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.25,
                      pl: 0.5,
                    }}
                  >
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        width: 6,
                        height: 6,
                        mt: '0.55em',
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, lineHeight: 1.65 }}>
                      {institution}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectHomeFinalYearAccountancy(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectHomeFinalYearAccountancy(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'home-student-isca-membership' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Are you currently an ISCA Student Member or Associate Member?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectHomeStudentOrAssociateMember(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectHomeStudentOrAssociateMember(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'home-professional-isca-member' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Are you an ISCA member?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectHomeProfessionalIscaMember(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectHomeProfessionalIscaMember(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'home-educational-background' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              What is your educational background?
            </Typography>
            <Stack spacing={1}>
              <Paper
                variant="outlined"
                onClick={() => selectHomeEducationalBackground(HOME_FLUENCY_BACKGROUND.ACCOUNTING)}
                sx={(theme) => ({
                  p: 1.25,
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  '&:hover': { borderColor: theme.palette.text.primary },
                })}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Accounting Graduate
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                onClick={() => selectHomeEducationalBackground(HOME_FLUENCY_BACKGROUND.NON_ACCOUNTING)}
                sx={(theme) => ({
                  p: 1.25,
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  '&:hover': { borderColor: theme.palette.text.primary },
                })}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Non-Accounting Graduate
                </Typography>
              </Paper>
            </Stack>
          </Stack>
        )}
        {step === 'home-pathway-selection' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Select your pathway
            </Typography>
            <Stack spacing={1}>
              {getHomeFluencyPathwayOptions(flowState.homeEducationalBackground).map((option) => (
                <Paper
                  key={option.value}
                  variant="outlined"
                  onClick={() => selectHomeFluencyPathway(option.value)}
                  sx={(theme) => ({
                    p: 1.25,
                    cursor: 'pointer',
                    borderRadius: 1.5,
                    borderColor:
                      flowState.homeSelectedPathway === option.value
                        ? theme.palette.text.primary
                        : theme.palette.divider,
                    bgcolor:
                      flowState.homeSelectedPathway === option.value
                        ? alpha(theme.palette.text.primary, 0.05)
                        : 'background.paper',
                  })}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: flowState.homeSelectedPathway === option.value ? 700 : 500 }}
                  >
                    {option.label}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Stack>
        )}
        {step === 'home-experienced-member-type' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Select your experienced professional member type
            </Typography>
            <Stack spacing={1}>
              {getHomeFluencyExperiencedMemberOptions().map((option) => (
                <Paper
                  key={option.value}
                  variant="outlined"
                  onClick={() => selectHomeExperiencedMemberType(option.value)}
                  sx={(theme) => ({
                    p: 1.25,
                    cursor: 'pointer',
                    borderRadius: 1.5,
                    borderColor:
                      flowState.homeExperiencedMemberType === option.value
                        ? theme.palette.text.primary
                        : theme.palette.divider,
                  })}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {option.label}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Stack>
        )}
        {step === 'home-fluency-pathway-info' && (() => {
          const pathwayDisplay = getHomeFluencyPathwayDisplay(flowState);
          return (
            <Stack spacing={1.25}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {pathwayDisplay?.title || 'Membership pathway'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                {pathwayDisplay?.description}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                {pathwayDisplay?.footerNote}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={acknowledgeHomeFluencyPathway}>
                  Continue
                </Button>
              </Stack>
            </Stack>
          );
        })()}
        {step === 'member' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Are you already an ISCA member?
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'flex-end' }}
            >
              <Button variant="contained" onClick={() => selectMember(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectMember(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'membership-choice' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Apply for ISCA Membership Now!
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'flex-end' }}
            >
              <Button variant="contained" onClick={() => selectWantsMembership(true)}>
                Yes, apply
              </Button>
              <Button variant="outlined" onClick={() => selectWantsMembership(false)}>
                No, skip membership
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'membership-fee' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Membership fee and benefits
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review membership benefits, admission fee, annual fee, and applicable requirements before application.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={acknowledgeMembershipFeeInfo}>
                I have reviewed
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'membership-agreement' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Proceed with membership application?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={agreeMembershipApplication}>
                Agree and proceed
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'nric' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Sign up account with NRIC verification
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please upload NRIC images (front and back), then run AI verification.
            </Typography>
            {nricAiVerified && (
              <Box
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  px: 1.25,
                  py: 1,
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                })}
              >
                <Iconify icon="solar:verified-check-bold" width={18} style={{ marginTop: 2 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark', lineHeight: 1.35 }}>
                    AI verification successful
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    NRIC front and back images are verified. You can now continue to login or choose other options.
                  </Typography>
                </Box>
              </Box>
            )}
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="outlined" component="label" sx={{ justifyContent: 'space-between', flex: 1 }}>
                  Upload NRIC front image
                  <input
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={(event) => handleNricImageSelect('front', event.target.files?.[0])}
                  />
                </Button>
                {nricFrontImage && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => window.open(URL.createObjectURL(nricFrontImage), '_blank', 'noopener,noreferrer')}
                    sx={{ minWidth: 40, px: 1 }}
                  >
                    <Iconify icon="solar:eye-bold" width={16} />
                  </Button>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {nricFrontImage ? `Front image: ${nricFrontImage.name}` : 'Front image not uploaded'}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="outlined" component="label" sx={{ justifyContent: 'space-between', flex: 1 }}>
                  Upload NRIC back image
                  <input
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={(event) => handleNricImageSelect('back', event.target.files?.[0])}
                  />
                </Button>
                {nricBackImage && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => window.open(URL.createObjectURL(nricBackImage), '_blank', 'noopener,noreferrer')}
                    sx={{ minWidth: 40, px: 1 }}
                  >
                    <Iconify icon="solar:eye-bold" width={16} />
                  </Button>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {nricBackImage ? `Back image: ${nricBackImage.name}` : 'Back image not uploaded'}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={runNricAiCheck}
                  disabled={nricAiChecking || nricAiVerified || Boolean(nricAiError)}
                >
                  {nricAiVerified ? 'AI check completed' : nricAiChecking ? 'AI checking...' : 'Run AI NRIC check'}
                </Button>
                {nricAiVerified ? null : nricAiFailureMode !== 'sign-in-only' ? (
                  <Button variant="contained" color="inherit" onClick={continueAfterNricOtherOptions}>
                    Continue with other options
                  </Button>
                ) : null}
              </Stack>

              {nricAiVerified && nricVerifiedJson && (
                <Box
                  sx={(theme) => ({
                    p: 1.5,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
                    bgcolor: alpha(theme.palette.info.main, 0.08),
                  })}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Verified JSON data
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 1.25,
                      overflowX: 'auto',
                      borderRadius: 1,
                      bgcolor: 'grey.900',
                      color: 'grey.100',
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    {JSON.stringify(nricVerifiedJson, null, 2)}
                  </Box>
                </Box>
              )}

              {!!nricAiError && (
                <Box
                  sx={(theme) => ({
                    p: 1.5,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
                    bgcolor: alpha(theme.palette.error.main, 0.08),
                  })}
                >
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Box
                        sx={(theme) => ({
                          mt: 0.2,
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: theme.palette.error.main,
                          bgcolor: alpha(theme.palette.error.main, 0.16),
                          flexShrink: 0,
                        })}
                      >
                        <Iconify icon="solar:close-circle-bold" width={18} />
                      </Box>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Verification failed
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {nricAiError}
                        </Typography>
                        {!!nricAiFailureReason && (
                          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                            Reason: {nricAiFailureReason}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>

                    {nricAiFailureMode === 'sign-in-only' ? (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button variant="contained" onClick={continueToSignInAfterNricFailure}>
                          Sign in
                        </Button>
                      </Stack>
                    ) : (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button variant="contained" onClick={continueToPaidSignupAfterNricFailure}>
                          Use SGD 900 paid signup
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Stack>
        )}
        {step === 'eligibility' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Which eligibility option best matches your profile?
            </Typography>
            <Stack spacing={1}>
              {getEligibilityOptionsForFlow(flowState).map((option) => (
                <Paper
                  key={option.value}
                  variant="outlined"
                  onClick={() => selectEligibilityType(option.value)}
                  sx={(theme) => ({
                    p: 1.25,
                    cursor: 'pointer',
                    borderRadius: 1.5,
                    borderColor:
                      flowState.eligibilityType === option.value
                        ? theme.palette.text.primary
                        : theme.palette.divider,
                    bgcolor:
                      flowState.eligibilityType === option.value
                        ? alpha(theme.palette.text.primary, 0.05)
                        : 'background.paper',
                  })}
                >
                  <Typography variant="body2" sx={{ fontWeight: flowState.eligibilityType === option.value ? 700 : 500 }}>
                    {option.label}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Stack>
        )}
        {step === 'requirements' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Submit supporting documents
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please submit the following documents for the selected pathway:
            </Typography>
            <Stack spacing={0.75}>
              {(ELIGIBILITY_REQUIREMENTS[flowState.eligibilityType] || []).map((item) => (
                <Typography key={item} variant="body2" sx={{ color: 'text.secondary' }}>
                  • {item}
                </Typography>
              ))}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={acknowledgeEligibilityRequirements}>
                Documents ready
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'eligibility-verify' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Eligibility verified?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectEligibilityVerified(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectEligibilityVerified(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'direct-degree-check' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Direct entry degree recognized by ISCA?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectDirectDegreeRecognised(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectDirectDegreeRecognised(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'other-cima-check' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Hold CIMA - CGMA professional qualification?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectOtherCimaQualified(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectOtherCimaQualified(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'other-membership-agreement' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Membership application information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Provide information on membership benefits, admission fee, annual fee, and applicable requirements.
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Agree to proceed with membership application?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={agreeOtherMembershipApplication}>
                Agree and continue
              </Button>
              <Button variant="outlined" onClick={declineOtherMembershipApplication}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'other-scaq-interest' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Interested in SCAQ programme?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Provide information on SCAQ and Foundation Programme options.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectOtherScaqInterested(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectOtherScaqInterested(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'other-degree-type' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Interested in SCAQ programme?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select the appropriate qualification path to continue.
            </Typography>
            <Stack spacing={1}>
              <Button variant="outlined" onClick={() => selectOtherDegreeType('direct-entry')}>
                Holds direct entry degree
              </Button>
              <Button variant="outlined" onClick={() => selectOtherDegreeType('other-accounting')}>
                Other accounting degrees
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'other-degree-recognised' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Recognised by ISCA?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectOtherDegreeRecognised(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectOtherDegreeRecognised(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'other-cima-documents' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Associate Member (PBA via CIMA)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload all required documents to continue.
            </Typography>
            <Stack spacing={1}>
              <Stack spacing={0.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                    Upload ID / Passport
                    <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleOtherCimaDocumentUpload('otherCimaIdPassportFileName', event.target.files?.[0])} />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {flowState.otherCimaIdPassportFileName || 'Document source: Personal records'}
                  </Typography>
                  {flowState.otherCimaIdPassportFileName && (
                    <Button size="small" variant="outlined" onClick={() => viewOtherCimaDocument('otherCimaIdPassportFileName')}>
                      View
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Note: Ensure the scan is high-resolution and valid.
                </Typography>
              </Stack>

              <Stack spacing={0.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                    Upload Certificate & Transcript
                    <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleOtherCimaDocumentUpload('otherCimaCertificateTranscriptFileName', event.target.files?.[0])} />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {flowState.otherCimaCertificateTranscriptFileName || 'Document source: CIMA / Education provider'}
                  </Typography>
                  {flowState.otherCimaCertificateTranscriptFileName && (
                    <Button size="small" variant="outlined" onClick={() => viewOtherCimaDocument('otherCimaCertificateTranscriptFileName')}>
                      View
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Note: Upload certificate and transcript together as one qualification proof.
                </Typography>
              </Stack>

              <Stack spacing={0.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                    Upload Letter of Good Standing
                    <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleOtherCimaDocumentUpload('otherCimaGoodStandingFileName', event.target.files?.[0])} />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {flowState.otherCimaGoodStandingFileName || 'Document source: CIMA / Local accounting body'}
                  </Typography>
                  {flowState.otherCimaGoodStandingFileName && (
                    <Button size="small" variant="outlined" onClick={() => viewOtherCimaDocument('otherCimaGoodStandingFileName')}>
                      View
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Note: Request this last so the letter stays within the 3-month validity window.
                </Typography>
              </Stack>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={continueOtherCimaDocuments}
                disabled={
                  !(
                    flowState.otherCimaIdPassportFileName
                    && flowState.otherCimaCertificateTranscriptFileName
                    && flowState.otherCimaGoodStandingFileName
                  )
                }
              >
                Documents uploaded
              </Button>
            </Stack>
            {flowState.otherCimaDocumentsAcknowledged && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  AI tool to verify eligibility
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={runOtherPortalDummyVerification}>
                    Verify uploaded files
                  </Button>
                </Stack>
                {flowState.otherPortalVerificationStatus === true && (
                  <Box
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                      bgcolor: alpha(theme.palette.success.main, 0.08),
                    })}
                  >
                    <Iconify icon="solar:verified-check-bold" width={18} style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark', lineHeight: 1.35 }}>
                        Verification successful
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Eligible. Continue to create membership account in Salesforce.
                      </Typography>
                      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                        <Button size="small" variant="contained" color="inherit" onClick={continueAfterOtherPortalVerification}>
                          Continue
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                )}
                {flowState.otherPortalVerificationStatus === false && (
                  <Box
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
                      bgcolor: alpha(theme.palette.error.main, 0.08),
                    })}
                  >
                    <Iconify icon="solar:danger-triangle-bold" width={18} style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main', lineHeight: 1.35 }}>
                        Verification failed
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Not eligible. Continue to check other eligibility options or skip membership.
                      </Typography>
                      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                        <Button size="small" variant="contained" color="inherit" onClick={continueAfterOtherPortalVerification}>
                          Continue
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  Tip: Use file name containing "fail" or "invalid" to test failed verification.
                </Typography>
              </>
            )}
          </Stack>
        )}
        {step === 'other-scaq-portal' && (
          <Stack spacing={1.25}>
            <Box
              sx={(theme) => ({
                px: 1.25,
                py: 1,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
                bgcolor: alpha(theme.palette.error.main, 0.08),
              })}
            >
              <Typography variant="body2" sx={{ color: 'error.dark', fontWeight: 700 }}>
                Direct to SCAQ Portal to sign up as candidate, submit Passport/identification card, accounting degree certificate and transcript.
              </Typography>
            </Box>
            {flowState.otherCimaQualified === true ? (
              <Typography variant="body2" color="text.secondary">
                Using the CIMA documents already uploaded in the previous step.
              </Typography>
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Submit supporting documents
                </Typography>
                <Stack spacing={1}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload passport / ID
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleOtherPortalDocumentUpload('otherPortalIdFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.otherPortalIdFileName || 'Passport / identification card'}
                    </Typography>
                    {flowState.otherPortalIdFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewOtherPortalDocument('otherPortalIdFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload degree certificate
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleOtherPortalDocumentUpload('otherPortalDegreeCertificateFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.otherPortalDegreeCertificateFileName || 'Accounting degree certificate'}
                    </Typography>
                    {flowState.otherPortalDegreeCertificateFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewOtherPortalDocument('otherPortalDegreeCertificateFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload degree transcript
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleOtherPortalDocumentUpload('otherPortalDegreeTranscriptFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.otherPortalDegreeTranscriptFileName || 'Accounting degree transcript'}
                    </Typography>
                    {flowState.otherPortalDegreeTranscriptFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewOtherPortalDocument('otherPortalDegreeTranscriptFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={markOtherPortalDocumentsSubmitted}
                    disabled={
                      !(
                        flowState.otherPortalIdFileName
                        && flowState.otherPortalDegreeCertificateFileName
                        && flowState.otherPortalDegreeTranscriptFileName
                      )
                    }
                  >
                    Documents uploaded
                  </Button>
                </Stack>
              </>
            )}
            {flowState.otherPortalDocumentsSubmitted && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  AI tool to verify eligibility
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={runOtherPortalDummyVerification}>
                    Verify uploaded files
                  </Button>
                </Stack>
                {flowState.otherPortalVerificationStatus === true && (
                  <Box
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                      bgcolor: alpha(theme.palette.success.main, 0.08),
                    })}
                  >
                    <Iconify icon="solar:verified-check-bold" width={18} style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark', lineHeight: 1.35 }}>
                        Verification successful
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Eligible. Continue to create membership account in Salesforce.
                      </Typography>
                      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                        <Button size="small" variant="contained" color="inherit" onClick={continueAfterOtherPortalVerification}>
                          Continue
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                )}
                {flowState.otherPortalVerificationStatus === false && (
                  <Box
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
                      bgcolor: alpha(theme.palette.error.main, 0.08),
                    })}
                  >
                    <Iconify icon="solar:danger-triangle-bold" width={18} style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main', lineHeight: 1.35 }}>
                        Verification failed
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Not eligible. Continue to check other eligibility options or skip membership.
                      </Typography>
                      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                        <Button size="small" variant="contained" color="inherit" onClick={continueAfterOtherPortalVerification}>
                          Continue
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  Tip: Use file name containing "fail" or "invalid" to test failed verification.
                </Typography>
              </>
            )}
          </Stack>
        )}
        {step === 'chartered-accountant-pathway' && flowState.homeGetStartedFlow && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Select chartered accountant pathway
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose the pathway that applies to your professional membership.
            </Typography>
            <Stack spacing={1}>
              {getCharteredPathwayOptionsForFlow(flowState).map((option) => (
                <Paper
                  key={option.value}
                  variant="outlined"
                  onClick={() => selectCharteredAccountantPathway(option.value)}
                  sx={(theme) => ({
                    p: 1.5,
                    cursor: 'pointer',
                    borderRadius: 1.5,
                    borderColor:
                      flowState.charteredAccountantPathway === option.value
                        ? theme.palette.text.primary
                        : theme.palette.divider,
                    bgcolor:
                      flowState.charteredAccountantPathway === option.value
                        ? alpha(theme.palette.text.primary, 0.05)
                        : 'background.paper',
                  })}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {option.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.subtitle}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Stack>
        )}
        {step === 'chartered-membership-agreement' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Chartered accountant pathway information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review pathway requirements, membership benefits, and applicable admission or annual fees.
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Agree to proceed with membership application?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={agreeCharteredMembershipApplication}>
                Agree and continue
              </Button>
              <Button variant="outlined" onClick={declineCharteredMembershipApplication}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'chartered-documents' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Chartered Accountants (Recognition Pathway)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review the required documents, then continue to upload all files in the next step.
            </Typography>
            <Stack spacing={0.9} sx={{ pl: 0.5 }}>
              {flowState.charteredAccountantPathway === 'recognition-arrangement' ? (
                <>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>Identification:</strong> Copy of passport or national identification card
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>Academic Transcript:</strong> Full professional certification transcript
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>Character References:</strong> Signed character reference form
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                    - First referee: CA (Singapore) or a full member of a recognised accountancy body
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                    - Second referee: Present employer (HR or reporting officer)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>Letter of Good Standing:</strong> Issued within the last 3 months
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                    - Issued by the accounting body (local office or home body)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                    - Confirms full membership via the standard training and education route
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                    - Confirms good standing with no outstanding disciplinary complaints
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>Passport / Identification Card:</strong> Copy of passport or identification card
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>ACCA Certification:</strong> ACCA certificate
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>ACCA Transcript:</strong> Detailed transcript (all completed modules)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>Letter of Good Standing:</strong> From ACCA verifying applicant&apos;s full membership status
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>Character References:</strong> Signed character references form
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>Character Reference Form:</strong> Form with 2 signatures
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>Resume / CV:</strong> Detailing past and current employments
                  </Typography>
                </>
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={proceedToCharteredDocumentsUpload}>
                Next
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'chartered-documents-upload' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Upload supporting documents
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload all required files to continue.
            </Typography>
            <Stack spacing={1}>
              {flowState.charteredAccountantPathway === 'recognition-arrangement' ? (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload ID document
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredIdDocumentFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredIdDocumentFileName || 'Passport / identification card'}
                    </Typography>
                    {flowState.charteredIdDocumentFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredIdDocumentFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload academic transcript
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredTranscriptFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredTranscriptFileName || 'Professional certification full transcript'}
                    </Typography>
                    {flowState.charteredTranscriptFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredTranscriptFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload character reference form
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredCharacterReferenceFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredCharacterReferenceFileName || 'Signed character reference form'}
                    </Typography>
                    {flowState.charteredCharacterReferenceFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredCharacterReferenceFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload first referee proof
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredFirstRefereeFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredFirstRefereeFileName || 'CA (Singapore) / recognized body member referee'}
                    </Typography>
                    {flowState.charteredFirstRefereeFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredFirstRefereeFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload second referee proof
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredSecondRefereeFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredSecondRefereeFileName || 'Present employer (HR / reporting officer) referee'}
                    </Typography>
                    {flowState.charteredSecondRefereeFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredSecondRefereeFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload good standing letter
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredGoodStandingLetterFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredGoodStandingLetterFileName || 'Letter issued within 3 months'}
                    </Typography>
                    {flowState.charteredGoodStandingLetterFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredGoodStandingLetterFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                </>
              ) : (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload passport / ID copy
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredIdDocumentFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredIdDocumentFileName || 'Copy of passport or identification card'}
                    </Typography>
                    {flowState.charteredIdDocumentFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredIdDocumentFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload ACCA certificate
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredAccaMembershipFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredAccaMembershipFileName || 'ACCA certification'}
                    </Typography>
                    {flowState.charteredAccaMembershipFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredAccaMembershipFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload ACCA transcript
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredAccaTranscriptFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredAccaTranscriptFileName || 'ACCA transcript (all completed modules)'}
                    </Typography>
                    {flowState.charteredAccaTranscriptFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredAccaTranscriptFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload ACCA good standing letter
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredGoodStandingLetterFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredGoodStandingLetterFileName || 'Good standing letter from ACCA'}
                    </Typography>
                    {flowState.charteredGoodStandingLetterFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredGoodStandingLetterFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload character reference form
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredCharacterReferenceFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredCharacterReferenceFileName || 'Character Reference Form (with 2 signatures)'}
                    </Typography>
                    {flowState.charteredCharacterReferenceFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredCharacterReferenceFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                      Upload resume / CV
                      <input hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleCharteredDocumentUpload('charteredAccaResumeFileName', event.target.files?.[0])} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {flowState.charteredAccaResumeFileName || 'Resume / CV (past and current employments)'}
                    </Typography>
                    {flowState.charteredAccaResumeFileName && (
                      <Button size="small" variant="outlined" onClick={() => viewCharteredDocument('charteredAccaResumeFileName')}>
                        View
                      </Button>
                    )}
                  </Stack>
                </>
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={markCharteredDocumentsSubmitted}
                disabled={
                  flowState.charteredAccountantPathway === 'recognition-arrangement'
                    ? !(
                        flowState.charteredIdDocumentFileName
                        && flowState.charteredTranscriptFileName
                        && flowState.charteredCharacterReferenceFileName
                        && flowState.charteredFirstRefereeFileName
                        && flowState.charteredSecondRefereeFileName
                        && flowState.charteredGoodStandingLetterFileName
                      )
                    : !(
                        flowState.charteredIdDocumentFileName
                        && flowState.charteredAccaMembershipFileName
                        && flowState.charteredAccaTranscriptFileName
                        && flowState.charteredGoodStandingLetterFileName
                        && flowState.charteredCharacterReferenceFileName
                        && flowState.charteredAccaResumeFileName
                      )
                }
              >
                Documents uploaded
              </Button>
            </Stack>
            {flowState.charteredDocumentsSubmitted && (
              <Stack spacing={1.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Verify chartered accountant pathway
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Run dummy verification for uploaded documents before membership account setup.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={runCharteredDummyVerification}>
                    Verify uploaded files
                  </Button>
                </Stack>

                {flowState.charteredVerificationStatus === true && (
                  <Box
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                      bgcolor: alpha(theme.palette.success.main, 0.08),
                    })}
                  >
                    <Iconify icon="solar:verified-check-bold" width={18} style={{ marginTop: 2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark', lineHeight: 1.35 }}>
                        Document verification successful
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Verification complete. Continue to create membership account in Salesforce.
                      </Typography>
                      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                        <Button size="small" variant="contained" color="inherit" onClick={continueAfterCharteredVerification}>
                          Continue
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                )}
                {flowState.charteredVerificationStatus === false && (
                  <Box
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
                      bgcolor: alpha(theme.palette.error.main, 0.08),
                    })}
                  >
                    <Iconify icon="solar:danger-triangle-bold" width={18} style={{ marginTop: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main', lineHeight: 1.35 }}>
                        Verification failed
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Verification failed. Continue to check other eligibility or skip membership.
                      </Typography>
                      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                        <Button size="small" variant="contained" color="inherit" onClick={continueAfterCharteredVerification}>
                          Continue
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  Tip: Use file name containing "fail" or "invalid" to test failed verification.
                </Typography>
              </Stack>
            )}
          </Stack>
        )}
        {step === 'scaq-associate-optin' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Opt in to be Associate member for free?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {entrySource === MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED
                ? 'Choosing Yes will ask about your ISCA specialisation qualification, then show pathway details.'
                : 'Choosing Yes will sign you in with your Salesforce account to verify SCAQ candidate status automatically.'}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectScaqAssociateOptIn(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectScaqAssociateOptIn(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'home-isca-specialisation' && (
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
              Have you completed an ISCA specialisation qualification?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Examples include the ISCA Financial Forensic Professional (FFP) qualification.
            </Typography>
            <Stack spacing={1.25}>
              {HOME_ISCA_SPECIALISATION_OPTIONS.map((option) => {
                const selected = flowState.homeIscaSpecialisationAnswer === option.value;
                return (
                  <Paper
                    key={option.value}
                    variant="outlined"
                    onClick={() => selectHomeIscaSpecialisation(option.value)}
                    sx={(theme) => ({
                      p: 1.5,
                      cursor: 'pointer',
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.25,
                      borderColor: selected ? theme.palette.text.primary : theme.palette.divider,
                      bgcolor: selected ? alpha(theme.palette.text.primary, 0.05) : 'background.paper',
                    })}
                  >
                    <Iconify
                      icon={selected ? 'solar:record-circle-bold' : 'solar:record-bold'}
                      width={22}
                      sx={{
                        mt: 0.15,
                        color: selected ? 'text.primary' : 'text.disabled',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 500, lineHeight: 1.5 }}>
                      {option.label}
                    </Typography>
                  </Paper>
                );
              })}
            </Stack>
          </Stack>
        )}
        {step === 'home-associate-pathway' && (() => {
          const pathwayUrls = getHomePathwayUrls(
            flowState.eligibilityType,
            flowState.homeIscaSpecialisationAnswer
          );
          return (
            <HomePathwayCard
              content={getHomePathwayContent(
                flowState.eligibilityType,
                flowState.homeIscaSpecialisationAnswer
              )}
              applicationPortalUrl={pathwayUrls.applicationPortal}
              readPathwayPageUrl={pathwayUrls.readPathwayPage}
              exploreUrl={pathwayUrls.explore}
              resolveExploreUrl={(link) =>
                getHomePathwayExploreUrl(
                  flowState.eligibilityType,
                  flowState.homeIscaSpecialisationAnswer,
                  link?.key || ''
                )}
              onOpenLink={handleHomePathwayExternalLink}
            />
          );
        })()}
        {step === 'scaq-candidate-verify' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Verified as SCAQ candidate?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectScaqCandidateVerified(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectScaqCandidateVerified(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'associate-member-check' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Already an Associate member?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectAssociateMemberAlready(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectAssociateMemberAlready(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'student-membership-agreement' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Student membership information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {entrySource === MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED
                ? 'Review student membership benefits, then confirm to see your pathway details.'
                : 'Provide information on student membership, benefits, and applicable admission or annual fees.'}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Agree to proceed with membership application?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={agreeStudentMembershipApplication}>
                Agree and continue
              </Button>
              <Button variant="outlined" onClick={declineStudentMembershipApplication}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'home-student-pathway' && (() => {
          const studentPathwayUrls = getHomeStudentPathwayUrls();
          return (
            <HomePathwayCard
              content={HOME_STUDENT_PATHWAY_CONTENT}
              applicationPortalUrl={studentPathwayUrls.applicationPortal}
              readPathwayPageUrl={studentPathwayUrls.readPathwayPage}
              onOpenLink={handleHomePathwayExternalLink}
            />
          );
        })()}
        {(step === 'student-membership-check' || step === 'home-fluency-student-pathway') && (
          <Stack spacing={1.5}>
            {step === 'home-fluency-student-pathway' && (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                Sign up for ISCA Student Membership. Once membership is approved, you may register for the ISCA AI Fluency programme.
              </Typography>
            )}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Student member verification details
              </Typography>
              <Button variant="text" size="small" onClick={applyStudentDummyData} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Use dummy data
              </Button>
            </Stack>

            <Box
              sx={(theme) => ({
                p: 1.5,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              })}
            >
              <Stack spacing={2}>
                <Stack spacing={0.75}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    School name
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Enter school name"
                    value={flowState.studentSchoolName}
                    onChange={(event) => updateStudentVerificationField('studentSchoolName', event.target.value)}
                  />
                </Stack>
                <Stack spacing={0.75}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    Graduation date
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={flowState.studentGraduationDate}
                    onChange={(event) => updateStudentVerificationField('studentGraduationDate', event.target.value)}
                  />
                </Stack>
                <Stack spacing={0.75}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    School email address (.edu or @yopmail.com)
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Enter school email"
                    value={flowState.studentSchoolEmail}
                    onChange={(event) => updateStudentVerificationField('studentSchoolEmail', event.target.value)}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={sendStudentVerificationPin}
                    startIcon={<Iconify icon="solar:letter-bold" width={16} />}
                    disabled={studentPinSending}
                  >
                    {studentPinSending ? 'Sending PIN...' : 'Send verification PIN'}
                  </Button>
                </Stack>
              </Stack>
            </Box>

            {flowState.studentEmailPinSent && !!studentPinDisplay && (
              <Alert severity="info" sx={{ py: 0.75 }}>
                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                  Dev only — OTP sent (remove before production):
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 800, letterSpacing: 6, mt: 0.5, fontFamily: 'monospace' }}
                >
                  {studentPinDisplay}
                </Typography>
              </Alert>
            )}

            {flowState.studentEmailPinSent && (
              <Box
                sx={(theme) => ({
                  p: 1.25,
                  borderRadius: 1.5,
                  border: `1px dashed ${alpha(theme.palette.info.main, 0.4)}`,
                  bgcolor: alpha(theme.palette.info.main, 0.05),
                })}
              >
                <Stack spacing={1.25}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Verify Email PIN
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Enter the 6-digit PIN sent to your school email address.
                    </Typography>
                  </Box>
                  <Stack spacing={0.75}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                      Verification PIN
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Enter 6-digit PIN"
                      value={studentPinInput}
                      onChange={(event) => setStudentPinInput(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputProps={{
                        inputMode: 'numeric',
                        maxLength: 6,
                      }}
                    />
                  </Stack>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    sx={{ justifyContent: 'flex-end', alignItems: { sm: 'flex-end' } }}
                  >
                    <Button
                      variant="contained"
                      onClick={verifyStudentPin}
                      disabled={studentPinVerifying}
                      sx={{ minWidth: { sm: 132 } }}
                    >
                      {studentPinVerifying ? 'Verifying...' : 'Verify PIN'}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}

            {!!studentPinError && (
              <Typography variant="caption" color="error.main">
                {studentPinError}
              </Typography>
            )}

            {flowState.studentVerificationFailed && (
              <Box
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  px: 1.25,
                  py: 1,
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                })}
              >
                <Iconify icon="solar:danger-triangle-bold" width={18} style={{ marginTop: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main', lineHeight: 1.35 }}>
                    Verification failed
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {studentEligibilityAssessment?.score >= 0
                      ? `Student eligibility verification did not pass. ATS score: ${studentEligibilityAssessment.score}/100.`
                      : 'Student eligibility verification failed. Click continue to check other eligibility options.'}
                  </Typography>
                  {!!studentEligibilityAssessment?.status && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary' }}>
                      Status: {String(studentEligibilityAssessment.status).replace('_', ' ')}
                    </Typography>
                  )}
                  {!!studentEligibilityAssessment?.reasons?.length && (
                    <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                      {studentEligibilityAssessment.reasons.map((reason) => (
                        <Typography key={reason} variant="caption" sx={{ color: 'text.secondary' }}>
                          • {reason}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                    <Button size="small" variant="contained" color="inherit" onClick={continueAfterStudentVerificationFailure}>
                      Continue
                    </Button>
                  </Stack>
                </Box>
              </Box>
            )}

            {flowState.studentEmailPinVerified && (
              <Box
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  px: 1.25,
                  py: 1,
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                })}
              >
                <Iconify icon="solar:verified-check-bold" width={18} style={{ marginTop: 2 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark', lineHeight: 1.35 }}>
                    Student email verification successful
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Email verification is complete. Next, run the AI eligibility check.
                  </Typography>
                </Box>
              </Box>
            )}

            {flowState.studentEmailPinVerified && flowState.eligibilityVerified !== true && (
              <Box>
                <Divider sx={{ mb: 1.25 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Verify eligibility with AI tool
                </Typography>
                {studentEligibilityChecking && <LinearProgress sx={{ mb: 1.25, borderRadius: 999 }} />}
                {!!studentEligibilityAssessment && !flowState.studentVerificationFailed && (
                  <Box
                    sx={(theme) => ({
                      mb: 1.25,
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
                      bgcolor: alpha(theme.palette.info.main, 0.08),
                    })}
                  >
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.primary' }}>
                      Latest ATS result: {studentEligibilityAssessment.score}/100
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                      Status: {String(studentEligibilityAssessment.status || '').replace('_', ' ')}
                    </Typography>
                    {!!studentEligibilityAssessment?.reasons?.length && (
                      <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                        {studentEligibilityAssessment.reasons.map((reason) => (
                          <Typography key={reason} variant="caption" sx={{ color: 'text.secondary' }}>
                            • {reason}
                          </Typography>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={runStudentAiEligibilityVerification} disabled={studentEligibilityChecking}>
                    {studentEligibilityChecking ? 'Checking...' : 'Run AI eligibility check'}
                  </Button>
                </Stack>
              </Box>
            )}

            {flowState.studentEmailPinVerified && flowState.eligibilityVerified === true && (
              <Box
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  px: 1.25,
                  py: 1,
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                })}
              >
                <Iconify icon="solar:verified-check-bold" width={18} style={{ marginTop: 2 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark', lineHeight: 1.35 }}>
                    AI eligibility verification successful
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Eligibility is verified. ATS score: {studentEligibilityAssessment?.score ?? 0}/100. You can now proceed with the student membership decision.
                  </Typography>
                  {!!studentEligibilityAssessment?.reasons?.length && (
                    <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                      {studentEligibilityAssessment.reasons.map((reason) => (
                        <Typography key={reason} variant="caption" sx={{ color: 'text.secondary' }}>
                          • {reason}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Box>
            )}

            {step === 'student-membership-check' && flowState.studentEmailPinVerified && flowState.eligibilityVerified === true && (
              <Box>
                <Divider sx={{ mb: 1.25 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Continue as Student Member?
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  <Button variant="contained" onClick={() => selectStudentMembershipOptIn(true)}>
                    Yes
                  </Button>
                  <Button variant="outlined" onClick={() => selectStudentMembershipOptIn(false)}>
                    No
                  </Button>
                </Stack>
              </Box>
            )}

            {step === 'home-fluency-student-pathway'
              && flowState.studentEmailPinVerified
              && flowState.eligibilityVerified === true && (() => {
                const studentPathwayUrls = getHomeStudentPathwayUrls();
                return (
                  <Stack spacing={2}>
                    <Divider />
                    <HomePathwayCard
                      content={HOME_STUDENT_PATHWAY_CONTENT}
                      applicationPortalUrl={studentPathwayUrls.applicationPortal}
                      readPathwayPageUrl={studentPathwayUrls.readPathwayPage}
                      onOpenLink={handleHomePathwayExternalLink}
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
                      <Button variant="contained" onClick={acknowledgeHomeFluencyPathway}>
                        Continue
                      </Button>
                    </Stack>
                  </Stack>
                );
              })()}
          </Stack>
        )}
        {step === 'student-fee-payment' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Make membership fee payment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Student membership is not selected. Complete membership fee payment to continue.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={completeStudentFeePayment}>
                Fee payment completed
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'experienced-membership-agreement' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Experienced pathway information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {entrySource === MEMBERSHIP_SIGNUP_ENTRY_HOME_GET_STARTED
                ? 'Review experienced pathway details, then confirm to answer a short qualification question.'
                : 'Provide membership details, benefits, and applicable costs before proceeding.'}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Agree to proceed with membership application?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={agreeExperiencedMembershipApplication}>
                Agree and continue
              </Button>
              <Button variant="outlined" onClick={declineExperiencedMembershipApplication}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'experienced-documents' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Resume / CV
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Experienced pathway requires your latest resume/CV. Upload a PDF or Word file (.pdf, .doc, .docx). After upload we
              run an AI check and show an ATS-style score.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <Button variant="outlined" component="label" sx={{ textTransform: 'none' }} disabled={experiencedResumeVerifying}>
                Upload resume/CV
                <input
                  hidden
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleExperiencedResumeUpload}
                />
              </Button>
              {flowState.experiencedResumeFileName && (
                <Typography variant="caption" color="text.secondary">
                  {flowState.experiencedResumeFileName}
                </Typography>
              )}
            </Stack>
            {experiencedResumeVerifying && <LinearProgress />}
            {experiencedResumeVerificationError && (
              <Typography variant="body2" color="error">
                {experiencedResumeVerificationError}
              </Typography>
            )}
            {flowState.experiencedVerificationStatus === true && experiencedResumeAssessment && (
              <Box
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  px: 1.25,
                  py: 1,
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                })}
              >
                <Iconify icon="solar:verified-check-bold" width={18} style={{ marginTop: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark', lineHeight: 1.35 }}>
                    Resume verified for this pathway
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
                    ATS-style score: {experiencedResumeAssessment.score ?? '—'}/100
                  </Typography>
                  {Array.isArray(experiencedResumeAssessment.reasons) && experiencedResumeAssessment.reasons.length > 0 && (
                    <Stack component="ul" sx={{ m: 0, pl: 2.5, mt: 0.75 }} spacing={0.25}>
                      {experiencedResumeAssessment.reasons.map((reason, idx) => (
                        <Typography key={`${idx}-${reason}`} component="li" variant="caption" sx={{ color: 'text.secondary' }}>
                          {reason}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
                    Continue to create your membership account in Salesforce.
                  </Typography>
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                    <Button size="small" variant="contained" color="inherit" onClick={continueAfterExperiencedVerification}>
                      Continue
                    </Button>
                  </Stack>
                </Box>
              </Box>
            )}
            {flowState.experiencedVerificationStatus === false && experiencedResumeAssessment && (
              <Box
                sx={(theme) => {
                  const manual = experiencedResumeAssessment.status === 'manual_review';
                  const main = manual ? theme.palette.warning : theme.palette.error;
                  return {
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    px: 1.25,
                    py: 1,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(main.main, 0.45)}`,
                    bgcolor: alpha(main.main, 0.08),
                  };
                }}
              >
                <Iconify icon="solar:danger-triangle-bold" width={18} style={{ marginTop: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={(theme) => ({
                      fontWeight: 700,
                      lineHeight: 1.35,
                      color:
                        experiencedResumeAssessment.status === 'manual_review'
                          ? theme.palette.warning.dark
                          : theme.palette.error.main,
                    })}
                  >
                    {experiencedResumeAssessment.status === 'manual_review'
                      ? 'Manual review recommended'
                      : 'Did not meet automatic pathway check'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
                    ATS-style score: {experiencedResumeAssessment.score ?? '—'}/100
                  </Typography>
                  {Array.isArray(experiencedResumeAssessment.reasons) && experiencedResumeAssessment.reasons.length > 0 && (
                    <Stack component="ul" sx={{ m: 0, pl: 2.5, mt: 0.75 }} spacing={0.25}>
                      {experiencedResumeAssessment.reasons.map((reason, idx) => (
                        <Typography key={`${idx}-${reason}`} component="li" variant="caption" sx={{ color: 'text.secondary' }}>
                          {reason}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
                    Continue to check other eligibility options or skip membership.
                  </Typography>
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                    <Button size="small" variant="contained" color="inherit" onClick={continueAfterExperiencedVerification}>
                      Continue
                    </Button>
                  </Stack>
                </Box>
              </Box>
            )}
          </Stack>
        )}
        {step === 'retry-eligibility' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Check other eligibility or skip ISCA membership?
            </Typography>
            <Stack spacing={1}>
              <Button variant="outlined" onClick={() => selectRetryDecision('check-other')}>
                Check other eligibility
              </Button>
              <Button variant="outlined" onClick={() => selectRetryDecision('skip-membership')}>
                Skip ISCA membership
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'salesforce-account-choice' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {isHomeCaDirectSalesforceFlow(flowState)
                ? 'Chartered Accountant (CA) Pathway'
                : 'Salesforce membership account'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              {isHomeCaDirectSalesforceFlow(flowState)
                ? 'Create a new ISCA Salesforce membership account, or sign in if you already have one to continue your CA membership application.'
                : 'Create a new ISCA Salesforce membership account, or sign in if you already have one.'}
            </Typography>
            {flowState.salesforceSessionReady && (
              <Alert severity="success">
                Salesforce account linked. Continue to the membership application using the button below.
              </Alert>
            )}
          </Stack>
        )}
        {step === 'salesforce-membership-create' && (
          <SalesforceMembershipCreateStep
            title={result.title}
            summary={result.summary}
            defaultEmail={flowState.studentSchoolEmail}
            flowState={flowState}
            membershipOutcome={result.outcome}
            draftUserId={
              typeof window !== 'undefined'
                ? sessionStorage.getItem('membershipDraftUserId') || ''
                : ''
            }
            onAccountCreated={markSalesforceMembershipAccountCreated}
            onLoginWithSalesforce={handleSalesforceLogin}
          />
        )}
        {step === 'result' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {(result.outcome === 'sp-pr-verified-login'
                || result.outcome === 'ai-fluency-eligible'
                || salesforceAccountReady) && (
                <Iconify icon="solar:verified-check-bold" width={20} style={{ color: '#16a34a' }} />
              )}
              {result.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              {salesforceAccountReady
                ? 'Your Salesforce membership account has been created. Sign in with Salesforce to access the platform.'
                : result.summary}
            </Typography>
            {salesforceAccountReady && (
              <Typography variant="body2" color="success.dark" sx={{ fontWeight: 600 }}>
                Account created successfully.
              </Typography>
            )}
            <Divider />
            <Typography variant="caption" color="text.secondary">
              Review complete. Continue to authentication.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, justifyContent: 'flex-end', gap: 1 }}>
        {step === 'salesforce-account-choice' && !flowState.salesforceSessionReady && (
          <>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => selectSalesforceAccountChoice('create')}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Create Salesforce account
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              size="large"
              onClick={() => selectSalesforceAccountChoice('login')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Login with Eservices
            </Button>
          </>
        )}
        {step === 'salesforce-account-choice' && flowState.salesforceSessionReady && (
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={openMembershipApplicationPage}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Open membership application
          </Button>
        )}
        {step === 'result' && (
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleResultAction}
            autoFocus
            sx={{ minHeight: 46, textTransform: 'none', fontWeight: 700, minWidth: 210 }}
          >
            <Stack direction="row" alignItems="center" justifyContent="center" component="span" sx={{ width: 1 }}>
              {resultCtaLabel}
              <Iconify icon="solar:arrow-right-bold" width={20} sx={{ ml: 1 }} />
            </Stack>
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
