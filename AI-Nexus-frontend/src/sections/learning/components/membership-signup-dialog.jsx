import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const ELIGIBILITY_OPTIONS = [
  { value: 'recognition', label: 'Chartered Accountant of a recognized professional body' },
  { value: 'enhanced', label: 'ACCA member or affiliate (enhanced pathway)' },
  { value: 'cima', label: 'Hold CIMA - CGMA professional qualification' },
  { value: 'direct-degree', label: 'Hold direct entry degree recognized by ISCA' },
  { value: 'student', label: 'Current tertiary student' },
  { value: 'experienced', label: '5+ years managerial accounting/finance experience' },
  { value: 'scaq-candidate', label: 'Existing candidate of SCAQ programme' },
  { value: 'other', label: 'Other / not sure' },
];

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
  scaqCandidateVerified: null,
  associateMemberAlready: null,
};

function getFlowStep(state) {
  if (state.isSingaporePr === null) return 'residency';
  if (state.isIscaMember === null) return 'member';
  if (state.isIscaMember === true) return 'result';
  if (state.isSingaporePr === true && !state.nricUploadAcknowledged) return 'nric';
  if (state.isSingaporePr === true && state.spPrVerified === null) return 'sppr-verify';
  if (state.isSingaporePr === true && state.spPrVerified === true) return 'result';
  if (state.wantsIscaMembership === null) return 'membership-choice';
  if (state.wantsIscaMembership === false) return 'result';
  if (!state.membershipFeeReviewed) return 'membership-fee';
  if (!state.membershipApplicationAgreed) return 'membership-agreement';
  if (!state.eligibilityType) return 'eligibility';
  if (!state.eligibilityRequirementsAcknowledged) return 'requirements';
  if (state.eligibilityVerified === null) return 'eligibility-verify';
  if (state.eligibilityVerified === true && state.eligibilityType === 'direct-degree' && state.directDegreeRecognised === null) {
    return 'direct-degree-check';
  }
  if (state.eligibilityVerified === true && state.eligibilityType === 'scaq-candidate' && state.scaqCandidateVerified === null) {
    return 'scaq-candidate-verify';
  }
  if (
    state.eligibilityVerified === true
    && state.eligibilityType === 'scaq-candidate'
    && state.scaqCandidateVerified === true
    && state.associateMemberAlready === null
  ) {
    return 'associate-member-check';
  }
  if (state.eligibilityVerified === true && state.eligibilityType === 'student' && state.studentMembershipOptIn === null) {
    return 'student-membership-check';
  }
  if (state.retryDecision === 'scaq' && state.scaqInterested === null) return 'scaq-interest';
  if (state.eligibilityVerified === false && state.retryDecision !== 'scaq') return 'retry-eligibility';
  return 'result';
}

function getOutcome(state) {
  if (state.isIscaMember === true) {
    return {
      outcome: 'isca-login',
      title: 'ISCA member route',
      summary: 'Sign in with your Salesforce-linked member account.',
      ctaLabel: 'Login with Salesforce',
      actionTarget: 'signIn',
    };
  }
  if (state.isSingaporePr === true && state.spPrVerified === true) {
    return {
      outcome: 'sp-pr-verified-login',
      title: 'SP/PR verified route',
      summary: 'Your SP/PR status is verified. Continue to platform login.',
      ctaLabel: 'Login to platform',
      actionTarget: 'signIn',
    };
  }
  if (state.eligibilityVerified === true && state.eligibilityType === 'student' && state.studentMembershipOptIn === true) {
    return {
      outcome: 'student-member-login',
      title: 'Student member route',
      summary: 'Student membership confirmed. Continue with Salesforce login.',
      ctaLabel: 'Login with Salesforce',
      actionTarget: 'signIn',
    };
  }
  if (state.eligibilityVerified === true && state.eligibilityType === 'student' && state.studentMembershipOptIn === false) {
    return {
      outcome: 'create-membership-account',
      title: 'Create membership account',
      summary: 'Student membership not selected. Create membership account in Salesforce.',
      ctaLabel: 'Create account in Salesforce',
      actionTarget: 'signIn',
    };
  }
  if (state.eligibilityVerified === true && state.eligibilityType === 'scaq-candidate' && state.scaqCandidateVerified === true) {
    if (state.associateMemberAlready === false) {
      return {
        outcome: 'update-associate-and-login',
        title: 'Associate status update',
        summary: 'Update Salesforce membership status to Associate, then login to platform.',
        ctaLabel: 'Login with Salesforce',
        actionTarget: 'signIn',
      };
    }
    return {
      outcome: 'associate-login',
      title: 'Associate member login',
      summary: 'Login to platform using Salesforce account.',
      ctaLabel: 'Login with Salesforce',
      actionTarget: 'signIn',
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
      actionTarget: 'signIn',
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
  if (state.isIscaMember === false && step !== 'member') {
    return 'Are you already an ISCA member? No';
  }

  const labelsByStep = {
    residency: 'Required before course access',
    member: 'Are you already an ISCA member?',
    nric: 'NRIC upload required for SP/PR verification',
    'sppr-verify': 'SP/PR status verification',
    'membership-choice': 'Choose membership preference',
    'membership-fee': 'Membership fee and benefits information',
    'membership-agreement': 'Membership application consent',
    eligibility: 'Select your eligibility pathway',
    requirements: 'Review required supporting documents',
    'eligibility-verify': 'Eligibility verification result',
    'retry-eligibility': 'Choose next step after ineligible result',
    'student-membership-check': 'Student membership decision',
    'scaq-interest': 'SCAQ programme interest',
    'direct-degree-check': 'Direct entry degree recognition check',
    'scaq-candidate-verify': 'SCAQ candidate verification',
    'associate-member-check': 'Associate member status check',
    result: 'Review and continue',
  };

  return labelsByStep[step] || 'Required before course access';
}

function getProgressMeta(state, step) {
  const steps = ['residency', 'member'];

  if (state.isIscaMember === true) {
    steps.push('result');
  } else {
    if (state.isSingaporePr === true) {
      steps.push('nric', 'sppr-verify');
      if (state.spPrVerified === true) {
        steps.push('result');
      }
    }

    if (state.spPrVerified !== true) {
      steps.push('membership-choice');
      if (state.wantsIscaMembership === false) {
        steps.push('result');
      } else {
        steps.push('membership-fee', 'membership-agreement');
        steps.push('eligibility');
        if (state.eligibilityType) {
          steps.push('requirements', 'eligibility-verify');
          if (state.eligibilityVerified === false) {
            steps.push('retry-eligibility');
            if (state.retryDecision === 'scaq') {
              steps.push('scaq-interest');
              if (state.scaqInterested !== null) steps.push('result');
            }
          }
          if (state.eligibilityVerified === true) {
            if (state.eligibilityType === 'student') {
              steps.push('student-membership-check');
              if (state.studentMembershipOptIn !== null) steps.push('result');
            } else if (state.eligibilityType === 'direct-degree') {
              steps.push('direct-degree-check');
              if (state.directDegreeRecognised !== null) steps.push('result');
            } else if (state.eligibilityType === 'scaq-candidate') {
              steps.push('scaq-candidate-verify');
              if (state.scaqCandidateVerified === true) {
                steps.push('associate-member-check');
                if (state.associateMemberAlready !== null) steps.push('result');
              }
              if (state.scaqCandidateVerified === false) steps.push('result');
            } else {
              steps.push('result');
            }
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

export function MembershipSignupDialog({ open, onClose, onContinue }) {
  const [flowState, setFlowState] = useState(INITIAL_STATE);

  useEffect(() => {
    if (!open) setFlowState(INITIAL_STATE);
  }, [open]);

  const step = getFlowStep(flowState);
  const result = getOutcome(flowState);
  const requirementLabel = getRequirementLabel(flowState, step);
  const { currentStep, totalSteps } = getProgressMeta(flowState, step);
  const progressValue = Math.round((currentStep / totalSteps) * 100);

  const selectResidency = (value) => {
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
      scaqCandidateVerified: null,
      associateMemberAlready: null,
    }));
  };

  const selectMember = (value) => {
    setFlowState((prev) => ({
      ...prev,
      isIscaMember: value,
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
      scaqCandidateVerified: null,
      associateMemberAlready: null,
    }));
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
      scaqCandidateVerified: null,
      associateMemberAlready: null,
    }));
  };

  const acknowledgeNricStep = () => {
    setFlowState((prev) => ({ ...prev, nricUploadAcknowledged: true, spPrVerified: null }));
  };

  const selectSpPrVerified = (value) => {
    setFlowState((prev) => ({
      ...prev,
      spPrVerified: value,
      eligibilityRequirementsAcknowledged: false,
      eligibilityVerified: null,
      retryDecision: '',
      studentMembershipOptIn: null,
      scaqInterested: null,
      wantsIscaMembership: value ? null : prev.wantsIscaMembership,
      eligibilityType: value ? '' : prev.eligibilityType,
      membershipFeeReviewed: false,
      membershipApplicationAgreed: false,
      directDegreeRecognised: null,
      scaqCandidateVerified: null,
      associateMemberAlready: null,
    }));
  };

  const selectEligibilityType = (value) => {
    setFlowState((prev) => ({
      ...prev,
      eligibilityType: value,
      eligibilityRequirementsAcknowledged: false,
      eligibilityVerified: null,
      retryDecision: '',
      studentMembershipOptIn: null,
      scaqInterested: null,
      directDegreeRecognised: null,
      scaqCandidateVerified: null,
      associateMemberAlready: null,
    }));
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
        scaqCandidateVerified: null,
        associateMemberAlready: null,
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
        scaqCandidateVerified: null,
        associateMemberAlready: null,
      }));
      return;
    }
    if (value === 'scaq') {
      setFlowState((prev) => ({ ...prev, retryDecision: 'scaq', scaqInterested: null }));
    }
  };

  const selectStudentMembershipOptIn = (value) => {
    setFlowState((prev) => ({ ...prev, studentMembershipOptIn: value }));
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

  const selectAssociateMemberAlready = (value) => {
    setFlowState((prev) => ({ ...prev, associateMemberAlready: value }));
  };

  const ELIGIBILITY_REQUIREMENTS = {
    student: ['School name', 'Graduation date', 'School email ending with .edu (verification pin required)'],
    recognition: ['Passport/ID copy', 'Professional full transcript', 'Signed character references form (2 referees)', 'Letter of good standing (within 3 months)'],
    enhanced: ['Passport/ID copy', 'ACCA certificate', 'ACCA transcript', 'Letter of good standing', 'Signed character references form', 'Resume/CV'],
    cima: ['Passport/ID copy', 'Professional qualification certificate and transcript', 'Letter of good standing (within 3 months)'],
    'direct-degree': ['Direct entry degree certificate', 'Transcript', 'Passport/ID copy'],
    experienced: ['Latest resume/CV', 'Identity document', 'Supporting employment/role evidence'],
    'scaq-candidate': ['SCAQ candidate details', 'Candidate verification in Salesforce'],
    other: ['Check SCAQ pathway eligibility or select another eligibility route'],
  };

  const goBack = () => {
    if (step === 'member') {
      setFlowState(INITIAL_STATE);
      return;
    }
    if (step === 'membership-choice') {
      if (flowState.isSingaporePr === true) {
        setFlowState((prev) => ({ ...prev, spPrVerified: null, wantsIscaMembership: null, eligibilityType: '' }));
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
      setFlowState((prev) => ({ ...prev, isIscaMember: null }));
      return;
    }
    if (step === 'sppr-verify') {
      setFlowState((prev) => ({ ...prev, nricUploadAcknowledged: false, spPrVerified: null }));
      return;
    }
    if (step === 'nric') {
      setFlowState((prev) => ({ ...prev, isIscaMember: null, nricUploadAcknowledged: false }));
      return;
    }
    if (step === 'eligibility') {
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
      setFlowState((prev) => ({ ...prev, directDegreeRecognised: null, eligibilityVerified: true }));
      return;
    }
    if (step === 'scaq-candidate-verify') {
      setFlowState((prev) => ({ ...prev, scaqCandidateVerified: null, eligibilityVerified: true }));
      return;
    }
    if (step === 'associate-member-check') {
      setFlowState((prev) => ({ ...prev, associateMemberAlready: null }));
      return;
    }
    if (step === 'student-membership-check') {
      setFlowState((prev) => ({ ...prev, studentMembershipOptIn: null, eligibilityVerified: null }));
      return;
    }
    if (step === 'scaq-interest') {
      setFlowState((prev) => ({ ...prev, scaqInterested: null, retryDecision: '' }));
      return;
    }
    if (step === 'retry-eligibility') {
      setFlowState((prev) => ({ ...prev, eligibilityVerified: null, retryDecision: '' }));
      return;
    }
    if (step === 'result') {
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
      if (flowState.retryDecision === 'scaq') {
        setFlowState((prev) => ({ ...prev, retryDecision: '', scaqInterested: null }));
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

  return (
    <Dialog
      open={open}
      disableScrollLock
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        onClose();
      }}
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
      <DialogTitle sx={{ pr: 3, pl: 3, pt: 2.5, pb: 1.25 }}>
        <Button
          variant="text"
          color="inherit"
          size="small"
          onClick={onClose}
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
          Close
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          Membership eligibility check
        </Typography>
        <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', display: 'block' }}>
          Step {currentStep} of {totalSteps}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
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
      <DialogContent sx={{ pt: 0.25, px: 3, pb: 1.5 }}>
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
              Apply for ISCA membership to access the platform for free?
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
              Please provide NRIC image (front and back). AI verification is required before SP/PR status check.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={acknowledgeNricStep}>
                Continue to SP/PR verification
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'sppr-verify' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              SP/PR Status Verified?
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'flex-end' }}
            >
              <Button variant="contained" onClick={() => selectSpPrVerified(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectSpPrVerified(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'eligibility' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Which eligibility option best matches your profile?
            </Typography>
            <Stack spacing={1}>
              {ELIGIBILITY_OPTIONS.map((option) => (
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
        {step === 'student-membership-check' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Student Membership?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectStudentMembershipOptIn(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectStudentMembershipOptIn(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'retry-eligibility' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Eligibility not verified
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose what you want to do next.
            </Typography>
            <Stack spacing={1}>
              <Button variant="outlined" onClick={() => selectRetryDecision('check-other')}>
                Check other eligibility
              </Button>
              <Button variant="outlined" onClick={() => selectRetryDecision('skip-membership')}>
                Skip ISCA membership
              </Button>
              <Button variant="outlined" onClick={() => selectRetryDecision('scaq')}>
                Interested in SCAQ programme
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'scaq-interest' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Interested in SCAQ programme?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We can provide SCAQ/Foundation information and direct you to SCAQ portal.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => selectScaqInterested(true)}>
                Yes
              </Button>
              <Button variant="outlined" onClick={() => selectScaqInterested(false)}>
                No
              </Button>
            </Stack>
          </Stack>
        )}
        {step === 'result' && (
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {result.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
              {result.summary}
            </Typography>
            <Divider />
            <Typography variant="caption" color="text.secondary">Review complete. Continue to authentication.</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, justifyContent: 'space-between', gap: 1 }}>
        {step !== 'residency' && (
          <Button
            variant="outlined"
            color="inherit"
            onClick={goBack}
            sx={{ textTransform: 'none', borderColor: 'divider' }}
          >
            Back
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => onContinue?.({ flow: flowState, result })}
          autoFocus
          disabled={step !== 'result'}
          sx={{ minHeight: 46, textTransform: 'none', fontWeight: 700, ml: step === 'residency' ? 'auto' : 0 }}
        >
          <Stack direction="row" alignItems="center" justifyContent="center" component="span" sx={{ width: 1 }}>
            {step === 'result' ? result.ctaLabel : 'Complete steps to continue'}
            <Iconify icon="solar:arrow-right-bold" width={20} sx={{ ml: 1 }} />
          </Stack>
        </Button>
      </DialogActions>
    </Dialog>
  );
}
