import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { paths } from 'src/routes/paths';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import { toast } from 'src/components/snackbar';
import { MembershipFormTextField } from 'src/components/membership-form-textfield';
import { MembershipFormPhoneField } from 'src/components/membership-form-phone-field';
import { MembershipFormCountrySelect } from 'src/components/membership-form-country-select';
import {
  MembershipFormSectionTitle,
  MembershipFormSectionTitleBlock,
} from 'src/components/membership-form-section-title';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import {
  submitCreateApplication,
  submitMembershipApplicationPersonalDetails,
  submitMembershipApplicationEmploymentDetails,
  submitAcademicQualification,
  submitProfessionalQualification,
  submitAtoMembership,
  submitOpbMembership,
  submitCharacterReference,
  submitDeclaration,
  submitMembershipDocumentUpload,
  submitResidentialDeclaration,
  fetchMembershipApplicationUserInfo,
} from 'src/api/membership-application';
import { MembershipApplicationDocumentSection } from './membership-application-document-section';
import { MembershipApplicationBillingSection } from './membership-application-billing-section';
import { MembershipApplicationCreateSection } from './membership-application-create-section';
import { MembershipApplicationQualificationSection } from './membership-application-qualification-section';
import { MembershipApplicationCharacterReferenceSection } from './membership-application-character-reference-section';
import { MembershipApplicationDeclarationSection } from './membership-application-declaration-section';
import { MembershipApplicationResidentialDeclarationSection } from './membership-application-residential-declaration-section';
import {
  MEMBERSHIP_APPLICATION_FORM_DRAFT_KEY,
  readMembershipSalesforceSession,
  mergeApplicationIdIntoSession,
} from 'src/utils/membership-salesforce-session';
import { ensureMembershipSalesforceSession } from 'src/utils/membership-salesforce-auth';
import {
  EMPTY_PERSONAL_FORM,
  buildPersonalDetailsApiPayload,
  PERSONAL_MAILING_REQUIRED_KEYS,
  validatePersonalFormBeforeSubmit,
  extractPersonalPrefillFromNexusUser,
  mergePersonalFormWithPrefill,
  readLocalMembershipPersonalPrefill,
} from 'src/utils/membership-application-personal';
import {
  EMPTY_WORK_EXPERIENCE_FORM,
  EMPTY_CURRENT_WORK_ENTRY,
  EMPTY_PREVIOUS_WORK_ENTRY,
  buildEmploymentDetailsApiPayload,
  validateWorkExperienceBeforeSubmit,
  normalizeWorkExperienceForm,
  requiresCurrentWorkExperience,
  seedExperiencedEmployedWorkExperience,
} from 'src/utils/membership-application-employment';
import {
  MEMBERSHIP_PICKLIST_CONFIG,
  MembershipApplicationPicklistField,
  useMembershipPicklist,
  useMembershipOrganisationNames,
} from 'src/sections/learning/membership-application-picklists';
import {
  EMPTY_QUALIFICATION_FORM,
  EMPTY_ACADEMIC_ENTRY,
  EMPTY_PROFESSIONAL_ENTRY,
  EMPTY_ATO_ENTRY,
  validateAcademicQualificationBeforeSubmit,
  validateProfessionalQualificationBeforeSubmit,
  validateAtoMembershipBeforeSubmit,
  EMPTY_OPB_ENTRY,
  isQualificationTabComplete,
  getQualificationSubmitPlan,
  validateOpbMembershipBeforeSubmit,
  QUALIFICATION_SUBMIT_KEYS,
} from 'src/utils/membership-application-qualification';
import {
  getMembershipApplicationTabs,
  getMembershipApplicationDraftKey,
  normalizeMembershipApplicationPathway,
  readMembershipApplicationPathway,
  isExperiencedMembershipApplicationPathway,
} from 'src/utils/membership-application-pathway';
import {
  EMPTY_CHARACTER_REFERENCE_FORM,
  buildCharacterReferenceApiPayload,
  validateCharacterReferenceBeforeSubmit,
} from 'src/utils/membership-application-character-reference';
import {
  EMPTY_DECLARATION_FORM,
  buildDeclarationApiPayload,
  validateDeclarationBeforeSubmit,
} from 'src/utils/membership-application-declaration';
import {
  EMPTY_RESIDENTIAL_DECLARATION_FORM,
  buildResidentialDeclarationApiPayload,
  validateResidentialDeclarationBeforeSubmit,
} from 'src/utils/membership-application-residential-declaration';
import {
  EMPTY_APPLICATION_FORM,
  getEmptyApplicationForm,
  buildCreateApplicationApiPayload,
  validateApplicationBeforeSubmit,
} from 'src/utils/membership-application-create';
import {
  EMPTY_DOCUMENT_UPLOAD_FORM,
  buildDocumentUploadApiPayload,
  buildUploadedDocumentEntry,
  fileToBase64,
  getDocumentsToUpload,
  isDuplicateDocumentUploadError,
  syncUploadedDocumentTypesToEntries,
  validateDocumentUploadBeforeSubmit,
} from 'src/utils/membership-application-document';
import { EMPTY_BILLING_FORM } from 'src/utils/membership-application-billing';
import { collectTabFieldErrors } from 'src/utils/membership-form-tab-field-errors';
import { MEMBERSHIP_ELIGIBILITY_FLOW_KEY } from 'src/utils/membership-eligibility-sso';
import {
  backupMembershipApplicationDraft,
  mergeMembershipApplicationDraftSources,
} from 'src/utils/membership-application-draft-backup';
import {
  readPaymentReturnFromSearch,
  reconcileSubmittedTabsAfterPaymentRecorded,
} from 'src/utils/membership-application-payment-return';
import {
  completeMembershipApplicationPaymentReturn,
  parseMembershipApplicationPaymentReturn,
} from 'src/utils/membership-application-checkout';
import {
  DEFAULT_MEMBERSHIP_COUNTRY,
  DEFAULT_MEMBERSHIP_DIAL_CODE,
  getMembershipFormFooterSx,
  getMembershipFormPaperSx,
  getMembershipFormSubmitButtonSx,
  getMembershipFormTabsSx,
} from 'src/utils/membership-form-ui';

// ----------------------------------------------------------------------

function buildEmptyDraft(pathway) {
  const isExperienced = isExperiencedMembershipApplicationPathway(pathway);
  return {
    application: getEmptyApplicationForm(pathway),
    personal: {
      salutation: 'Mr.',
      ...EMPTY_PERSONAL_FORM,
      voiceCalls: '',
      textMessages: '',
      faxMessages: '',
    },
    workExperience: normalizeWorkExperienceForm(
      isExperienced
        ? seedExperiencedEmployedWorkExperience({
            ...EMPTY_WORK_EXPERIENCE_FORM,
            currentEmploymentStatus: 'Employed',
            accreditedEmployerScheme: 'Yes',
          })
        : { ...EMPTY_WORK_EXPERIENCE_FORM }
    ),
    qualification: {
      ...EMPTY_QUALIFICATION_FORM,
      academic: isExperienced ? [{ ...EMPTY_ACADEMIC_ENTRY }] : [],
      professional: [{ ...EMPTY_PROFESSIONAL_ENTRY }],
      ato: isExperienced ? [] : [{ ...EMPTY_ATO_ENTRY }],
      opb: [{ ...EMPTY_OPB_ENTRY }],
    },
    characterReference: { ...EMPTY_CHARACTER_REFERENCE_FORM },
    declaration: { ...EMPTY_DECLARATION_FORM },
    documentUpload: { ...EMPTY_DOCUMENT_UPLOAD_FORM },
    residentialDeclaration: {
      ...EMPTY_RESIDENTIAL_DECLARATION_FORM,
      ...(isExperienced ? {} : { residentialDeclaration: '' }),
    },
    billing: { ...EMPTY_BILLING_FORM },
  };
}

function applyPersonalSingaporeDefaults(personal) {
  if (!personal) return personal;
  return {
    ...personal,
    country: personal.country || DEFAULT_MEMBERSHIP_COUNTRY,
    mailingcountry: personal.mailingcountry || DEFAULT_MEMBERSHIP_COUNTRY,
    mobileCountryCode: DEFAULT_MEMBERSHIP_DIAL_CODE,
    otherCountryCode: DEFAULT_MEMBERSHIP_DIAL_CODE,
    gender: personal.gender || 'Male',
    maritalStatus: personal.maritalStatus || 'Single',
  };
}

function applyCharacterReferenceDialDefaults(characterReference) {
  if (!characterReference) return characterReference;
  return {
    ...characterReference,
    firstReferenceCountryCode:
      characterReference.firstReferenceCountryCode || DEFAULT_MEMBERSHIP_DIAL_CODE,
    secondReferenceCountryCode:
      characterReference.secondReferenceCountryCode || DEFAULT_MEMBERSHIP_DIAL_CODE,
  };
}

function loadDraft(pathway = readMembershipApplicationPathway()) {
  const emptyDraft = buildEmptyDraft(pathway);
  const draftKey = getMembershipApplicationDraftKey(pathway);
  let parsed = null;
  try {
    const raw = localStorage.getItem(draftKey);
    if (raw) parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  parsed = mergeMembershipApplicationDraftSources(parsed, pathway);

  if (!parsed) return { ...emptyDraft, submittedTabs: {} };

  return {
    ...emptyDraft,
    ...parsed,
    application: {
      ...emptyDraft.application,
      ...parsed.application,
      ...(isExperiencedMembershipApplicationPathway(pathway)
        ? { recordTypeName: emptyDraft.application.recordTypeName }
        : {}),
    },
    personal: applyPersonalSingaporeDefaults({
      ...emptyDraft.personal,
      ...parsed.personal,
    }),
    workExperience: normalizeWorkExperienceForm({
      ...emptyDraft.workExperience,
      ...parsed.workExperience,
    }),
    qualification: {
      ...emptyDraft.qualification,
      ...parsed.qualification,
      academic: Array.isArray(parsed.qualification?.academic)
        ? parsed.qualification.academic.map((row) => ({
            ...EMPTY_ACADEMIC_ENTRY,
            ...row,
            country: row.country || DEFAULT_MEMBERSHIP_COUNTRY,
            institutionName: row.institutionName || row.nameOfInstitution || '',
          }))
        : [],
      professional: Array.isArray(parsed.qualification?.professional)
        ? parsed.qualification.professional.map((row) => ({
            ...EMPTY_PROFESSIONAL_ENTRY,
            ...row,
          }))
        : [{ ...EMPTY_PROFESSIONAL_ENTRY }],
      ato: Array.isArray(parsed.qualification?.ato)
        ? parsed.qualification.ato.map((row) => ({ ...EMPTY_ATO_ENTRY, ...row }))
        : emptyDraft.qualification.ato,
      opb: Array.isArray(parsed.qualification?.opb)
        ? parsed.qualification.opb.map((row) => ({ ...EMPTY_OPB_ENTRY, ...row }))
        : emptyDraft.qualification.opb,
    },
    characterReference: applyCharacterReferenceDialDefaults({
      ...emptyDraft.characterReference,
      ...parsed.characterReference,
    }),
    declaration: { ...emptyDraft.declaration, ...parsed.declaration },                                                                    
    documentUpload: {
      ...emptyDraft.documentUpload,
      ...parsed.documentUpload,
      entries: {
        ...EMPTY_DOCUMENT_UPLOAD_FORM.entries,
        ...(parsed.documentUpload?.entries || {}),
      },
    },
    residentialDeclaration: {
      ...emptyDraft.residentialDeclaration,
      ...parsed.residentialDeclaration,
    },
    billing: { ...EMPTY_BILLING_FORM, ...parsed.billing },
    submittedTabs: parsed.submittedTabs || {},
  };
}

function saveDraft(draft, pathway = readMembershipApplicationPathway()) {
  try {
    localStorage.setItem(getMembershipApplicationDraftKey(pathway), JSON.stringify(draft));
    backupMembershipApplicationDraft(draft, pathway);
  } catch {
    // ignore
  }
}

const fieldSize = 'medium';

const MEMBERSHIP_VALIDATION_ERROR = 'MEMBERSHIP_FORM_VALIDATION';

function createValidationError(message) {
  const err = new Error(message);
  err.code = MEMBERSHIP_VALIDATION_ERROR;
  return err;
}

function areNonBillingTabsComplete(tabs, submittedTabs, pathway) {
  return tabs.every((t) => {
    if (t.id === 'billing') return true;
    if (t.id === 'qualification') {
      return isQualificationTabComplete(submittedTabs, pathway);
    }
    return Boolean(submittedTabs[t.id]);
  });
}

function isApplicationFullyComplete(tabs, submittedTabs, pathway) {
  return areNonBillingTabsComplete(tabs, submittedTabs, pathway) && Boolean(submittedTabs.billing);
}

function isMembershipValidationError(err) {
  return err?.code === MEMBERSHIP_VALIDATION_ERROR;
}

const MEMBERSHIP_TAB_QUERY_KEY = 'tab';

function resolveTabIndexFromQuery(tabId, tabsList) {
  if (!tabId) return null;
  const index = tabsList.findIndex((tab) => tab.id === tabId);
  return index >= 0 ? index : null;
}

// ----------------------------------------------------------------------

export function MembershipApplicationForm({ onAllTabsSubmitted, fullPage = false, pathway: pathwayProp }) {
  const theme = useTheme();
  const { primary, secondary } = theme.palette;
  const pathway = useMemo(
    () => normalizeMembershipApplicationPathway(pathwayProp || readMembershipApplicationPathway()),
    [pathwayProp]
  );
  const tabs = useMemo(() => getMembershipApplicationTabs(pathway), [pathway]);
  const isExperiencedPathway = isExperiencedMembershipApplicationPathway(pathway);
  const companyTypePicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.companyType,
  });
  const industryPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.industry,
  });
  const jobLevelPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.jobLevel,
  });
  const jobFunctionPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.jobFunction,
  });
  const citizenshipPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.citizenship,
  });
  const currentEmploymentStatusPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.currentEmploymentStatus,
  });
  const genderPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.gender,
  });
  const nationalityPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.nationality,
  });
  const maritalStatusPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.maritalStatus,
  });
  const idTypePicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.idType,
  });
  const subscriptionPreferencePicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.subscriptionPreference,
  });
  const communicationPreferencePicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.communicationPreference,
  });
  const professionalInterestPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.professionalInterest,
  });
  const voiceCallsPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.voiceCalls,
  });
  const textMessagesPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.textMessages,
  });
  const faxMessagesPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.faxMessages,
  });
  const qualificationMembershipStatusPicklist = useMembershipPicklist({
    enabled: true,
    ...MEMBERSHIP_PICKLIST_CONFIG.qualificationMembershipStatus,
  });
  const organisationNamesPicklist = useMembershipOrganisationNames({
    enabled: true,
    emptyErrorMessage: 'Organisation name options were not returned from Salesforce.',
  });
  const salesforceSession = readMembershipSalesforceSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(() => {
    if (!fullPage) return 0;
    const tabFromUrl = resolveTabIndexFromQuery(
      new URLSearchParams(window.location.search).get(MEMBERSHIP_TAB_QUERY_KEY),
      getMembershipApplicationTabs(
        normalizeMembershipApplicationPathway(pathwayProp || readMembershipApplicationPathway())
      )
    );
    return tabFromUrl ?? 0;
  });
  const [draft, setDraft] = useState(() => loadDraft(pathway));
  const [submittingTab, setSubmittingTab] = useState('');
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentFiles, setDocumentFiles] = useState({});
  const [paymentReturnNotice, setPaymentReturnNotice] = useState(null);
  const formScrollAnchorRef = useRef(null);
  const formValidationRef = useRef(null);
  const [tabValidationError, setTabValidationError] = useState('');
  const [tabFieldErrors, setTabFieldErrors] = useState({});
  const personalPrefillAppliedRef = useRef(false);
  const paymentReturnLockRef = useRef(false);
  const paymentReturnHandledRef = useRef(false);
  const [paymentReturnMode, setPaymentReturnMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return readPaymentReturnFromSearch(window.location.search).isPaymentReturn;
  });
  const [billingPaymentProcessing, setBillingPaymentProcessing] = useState(false);

  const applyPersonalPrefill = useCallback(
    (prefill) => {
      if (!prefill) return;
      setDraft((prev) => {
        const merged = mergePersonalFormWithPrefill(prev.personal, prefill);
        const normalized = applyPersonalSingaporeDefaults(merged);
        if (
          normalized.firstName === prev.personal.firstName
          && normalized.lastName === prev.personal.lastName
          && normalized.personalEmail === prev.personal.personalEmail
          && normalized.nameAsPerId === prev.personal.nameAsPerId
          && normalized.emailFriendlyName === prev.personal.emailFriendlyName
          && normalized.salutation === prev.personal.salutation
        ) {
          return prev;
        }
        const next = { ...prev, personal: normalized };
        saveDraft(next, pathway);
        return next;
      });
    },
    [pathway]
  );

  const currentTabId = tabs[activeTab]?.id || 'personal';

  const scrollFormToTop = useCallback(() => {
    if (typeof document !== 'undefined') {
      const el = document.activeElement;
      if (el && typeof el.blur === 'function') {
        el.blur();
      }
    }
    queueMicrotask(() => {
      formScrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    });
  }, []);
  const documentsSubmitted = Boolean(draft.submittedTabs['document-upload']);

  const notifyTabSuccess = useCallback((message) => {
    const text = String(message || '').trim();
    if (text) toast.success(text);
  }, []);

  const clearTabValidationError = useCallback(() => {
    setTabValidationError('');
  }, []);

  const clearTabFieldErrors = useCallback(() => {
    setTabFieldErrors({});
  }, []);

  const clearFieldError = useCallback((fieldKey) => {
    if (!fieldKey) return;
    setTabFieldErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }, []);

  const fieldProps = useCallback(
    (fieldKey) => {
      const msg = tabFieldErrors[fieldKey];
      if (!msg) return {};
      return { error: true, helperText: msg };
    },
    [tabFieldErrors]
  );

  const showTabValidationError = useCallback((message) => {
    const text = String(message || '').trim();
    if (!text) return;
    setTabValidationError(text);
    queueMicrotask(() => {
      formValidationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const handleSubmitFailure = useCallback(
    (err) => {
      if (err?.code === 'SALESFORCE_SOCIAL_TOKEN_EXPIRED') {
        return true;
      }
      const message = err instanceof Error ? err.message : 'Failed to submit section.';
      if (isMembershipValidationError(err)) {
        showTabValidationError(message);
        return true;
      }
      toast.error(message);
      return true;
    },
    [showTabValidationError]
  );

  const residentialDeclarationSubmitted = Boolean(draft.submittedTabs['residential-declaration']);

  useEffect(() => {
    clearTabValidationError();
    clearTabFieldErrors();
    scrollFormToTop();
  }, [activeTab, clearTabFieldErrors, clearTabValidationError, scrollFormToTop]);

  useEffect(() => {
    const session = readMembershipSalesforceSession();
    setDraft((prev) => {
      let personal = prev.personal;
      let submittedTabs = prev.submittedTabs || {};
      let changed = false;

      if (session?.applicationId && !personal.applicationId) {
        personal = { ...personal, applicationId: session.applicationId };
        changed = true;
      }

      if (session?.applicationId?.trim() && !submittedTabs.application) {
        submittedTabs = { ...submittedTabs, application: new Date().toISOString() };
        changed = true;
      }

      const normalized = applyPersonalSingaporeDefaults(personal);
      if (
        normalized.mobileCountryCode !== personal.mobileCountryCode ||
        normalized.otherCountryCode !== personal.otherCountryCode ||
        normalized.country !== personal.country ||
        normalized.mailingcountry !== personal.mailingcountry ||
        normalized.gender !== personal.gender ||
        normalized.maritalStatus !== personal.maritalStatus
      ) {
        personal = normalized;
        changed = true;
      }

      if (!changed) return prev;

      const next = { ...prev, personal, submittedTabs };
      saveDraft(next, pathway);
      return next;
    });
  }, [pathway]);

  useEffect(() => {
    if (personalPrefillAppliedRef.current) return undefined;

    const localPrefill = readLocalMembershipPersonalPrefill();
    if (localPrefill) {
      applyPersonalPrefill(localPrefill);
    }

    const session = readMembershipSalesforceSession();
    const socialToken = session?.socialToken?.trim();
    if (!socialToken) {
      personalPrefillAppliedRef.current = true;
      return undefined;
    }

    let cancelled = false;

    const loadSalesforceProfile = async () => {
      try {
        const result = await fetchMembershipApplicationUserInfo({ socialAccessToken: socialToken });
        if (cancelled) return;
        const nexusUser = result?.nexusUser || result?.salesforce || result;
        applyPersonalPrefill(extractPersonalPrefillFromNexusUser(nexusUser));
      } catch {
        // Best-effort — local signup draft may already have filled the form.
      } finally {
        if (!cancelled) {
          personalPrefillAppliedRef.current = true;
        }
      }
    };

    loadSalesforceProfile();

    return () => {
      cancelled = true;
    };
  }, [applyPersonalPrefill]);

  useEffect(() => {
    if (!isExperiencedPathway) return;
    try {
      const raw = sessionStorage.getItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const memberType =
        parsed?.flow?.homeExperiencedMemberType
        || parsed?.flow?.experiencedMemberType
        || '';
      if (!memberType) return;
      setDraft((prev) => {
        if (prev.application?.experiencedMemberType) return prev;
        const next = {
          ...prev,
          application: { ...prev.application, experiencedMemberType: memberType },
        };
        saveDraft(next, pathway);
        return next;
      });
    } catch {
      // ignore
    }
  }, [isExperiencedPathway, pathway]);

  const isTabSubmitted = useCallback(
    (tabId) => {
      if (tabId === 'billing') {
        return Boolean(draft.submittedTabs.billing) || Boolean(draft.billing?.paymentCompleted);
      }
      if (tabId === 'qualification') {
        return isQualificationTabComplete(draft.submittedTabs, pathway);
      }
      return Boolean(draft.submittedTabs[tabId]);
    },
    [draft.billing?.paymentCompleted, draft.submittedTabs, pathway]
  );

  const completedCount = useMemo(
    () => tabs.filter((t) => isTabSubmitted(t.id)).length,
    [isTabSubmitted]
  );

  const progressValue = Math.round((completedCount / tabs.length) * 100);

  /** First tab that still needs a successful submit; all tabs before it must be done first. */
  const firstIncompleteTabIndex = useMemo(() => {
    const idx = tabs.findIndex((t) => !isTabSubmitted(t.id));
    return idx === -1 ? tabs.length : idx;
  }, [isTabSubmitted]);

  const isTabAccessible = useCallback(
    (index) => {
      if (index < 0 || index >= tabs.length) return false;
      const tabId = tabs[index].id;
      if (paymentReturnMode && tabId === 'billing') return true;
      if (isTabSubmitted(tabId)) return true;
      return index === firstIncompleteTabIndex;
    },
    [firstIncompleteTabIndex, isTabSubmitted, paymentReturnMode, tabs]
  );

  const lastSyncedUrlTabRef = useRef(
    fullPage && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get(MEMBERSHIP_TAB_QUERY_KEY) || ''
      : ''
  );

  const readUrlTabId = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get(MEMBERSHIP_TAB_QUERY_KEY) || '';
  }, []);

  const writeTabToUrl = useCallback(
    (tabId) => {
      if (!fullPage || !tabId || typeof window === 'undefined') return;
      if (readUrlTabId() === tabId) {
        lastSyncedUrlTabRef.current = tabId;
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.set(MEMBERSHIP_TAB_QUERY_KEY, tabId);
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
      lastSyncedUrlTabRef.current = tabId;
    },
    [fullPage, readUrlTabId]
  );

  const setActiveTab = useCallback(
    (next) => {
      setActiveTabState((prev) => {
        const index = typeof next === 'function' ? next(prev) : next;
        const tabId = tabs[index]?.id;
        if (tabId) writeTabToUrl(tabId);
        return index;
      });
    },
    [tabs, writeTabToUrl]
  );

  useEffect(() => {
    if (paymentReturnHandledRef.current || typeof window === 'undefined') return;

    const paymentSuccessReturn = parseMembershipApplicationPaymentReturn(window.location.search);
    if (!paymentSuccessReturn.isSuccessReturn) return;

    paymentReturnHandledRef.current = true;
    paymentReturnLockRef.current = true;
    setPaymentReturnMode(true);
    setBillingPaymentProcessing(true);

    const billingIndex = tabs.findIndex((t) => t.id === 'billing');
    if (billingIndex >= 0) {
      setActiveTab(billingIndex);
    }

    const run = async () => {
      try {
        const result = await completeMembershipApplicationPaymentReturn({
          sessionId: paymentSuccessReturn.sessionId,
          applicationId: paymentSuccessReturn.applicationId,
        });

        if (!result?.navigated) {
          window.location.href = result?.redirectTo || paths.auth.membership.application;
          return;
        }
      } catch (err) {
        const message = encodeURIComponent(
          err instanceof Error ? err.message : 'Payment could not be confirmed.'
        );
        window.location.href = `${paths.auth.membership.application}?billing=1&tab=billing&paymentError=${message}`;
      } finally {
        setBillingPaymentProcessing(false);
        paymentReturnLockRef.current = false;
        setPaymentReturnMode(false);
      }
    };

    run();
  }, [setActiveTab, tabs]);

  useEffect(() => {
    if (paymentReturnHandledRef.current || typeof window === 'undefined') return;

    const paymentReturn = readPaymentReturnFromSearch(window.location.search);
    if (!paymentReturn.isPaymentReturn) return;

    paymentReturnHandledRef.current = true;
    paymentReturnLockRef.current = true;
    setPaymentReturnMode(true);

    let restored = loadDraft(pathway);
    const session = readMembershipSalesforceSession();

    if (paymentReturn.paymentRecorded) {
      const submittedTabs = reconcileSubmittedTabsAfterPaymentRecorded(
        restored.submittedTabs,
        tabs,
        pathway
      );
      restored = {
        ...restored,
        billing: { ...restored.billing, paymentCompleted: true },
        submittedTabs: {
          ...submittedTabs,
          billing: submittedTabs.billing || new Date().toISOString(),
        },
      };
    }

    if (session?.applicationId) {
      restored = {
        ...restored,
        personal: {
          ...restored.personal,
          applicationId: restored.personal?.applicationId || session.applicationId,
        },
        submittedTabs: {
          ...restored.submittedTabs,
          application: restored.submittedTabs?.application || new Date().toISOString(),
        },
      };
    }

    setDraft(restored);
    saveDraft(restored, pathway);

    if (paymentReturn.paymentCanceled) {
      setPaymentReturnNotice({
        severity: 'warning',
        message: 'Payment was canceled. You can try again when ready.',
      });
    } else if (paymentReturn.paymentError) {
      let errorMessage = paymentReturn.paymentError;
      try {
        errorMessage = decodeURIComponent(paymentReturn.paymentError);
      } catch {
        // use raw message
      }
      setPaymentReturnNotice({
        severity: 'error',
        message: errorMessage,
      });
    } else if (paymentReturn.billingComplete) {
      let statusMessage = 'Payment received successfully.';
      if (paymentReturn.statusMessage) {
        try {
          statusMessage = decodeURIComponent(paymentReturn.statusMessage);
        } catch {
          statusMessage = paymentReturn.statusMessage;
        }
      }
      setPaymentReturnNotice({
        severity: paymentReturn.membershipStatus === 'pending' ? 'info' : 'success',
        message: statusMessage,
      });
    }

    const billingIndex = tabs.findIndex((t) => t.id === 'billing');
    if (billingIndex >= 0) {
      setActiveTab(billingIndex);
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        [
          'billing',
          'payment',
          'ref',
          'paymentError',
          'billingComplete',
          'membershipStatus',
          'statusMessage',
        ].forEach((key) => next.delete(key));
        next.set(MEMBERSHIP_TAB_QUERY_KEY, 'billing');
        return next;
      },
      { replace: true }
    );

    window.setTimeout(() => {
      paymentReturnLockRef.current = false;
      setPaymentReturnMode(false);
    }, 200);
  }, [pathway, setActiveTab, setSearchParams, tabs]);

  const initialUrlSyncedRef = useRef(false);

  useEffect(() => {
    if (!fullPage || initialUrlSyncedRef.current) return;
    initialUrlSyncedRef.current = true;
    if (!readUrlTabId() && tabs[activeTab]?.id) {
      writeTabToUrl(tabs[activeTab].id);
    }
  }, [fullPage, activeTab, readUrlTabId, tabs, writeTabToUrl]);

  useEffect(() => {
    if (!fullPage) return;
    const tabId = readUrlTabId();
    if (!tabId) return;
    const urlIndex = resolveTabIndexFromQuery(tabId, tabs);
    if (urlIndex === null || !isTabAccessible(urlIndex)) return;
    setActiveTabState((current) => {
      if (isTabAccessible(current)) return current;
      return urlIndex;
    });
  }, [fullPage, draft.submittedTabs, isTabAccessible, readUrlTabId, tabs]);

  useEffect(() => {
    if (!fullPage) return undefined;
    const onPopState = () => {
      const tabId = readUrlTabId();
      if (!tabId) return;
      const urlIndex = resolveTabIndexFromQuery(tabId, tabs);
      if (urlIndex === null || !isTabAccessible(urlIndex)) return;
      lastSyncedUrlTabRef.current = tabId;
      setActiveTabState(urlIndex);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [fullPage, isTabAccessible, readUrlTabId, tabs]);

  const handleTabChange = useCallback(
    (_, newIndex) => {
      if (isTabAccessible(newIndex)) {
        setActiveTab(newIndex);
        return;
      }
      showTabValidationError(
        `Submit "${tabs[firstIncompleteTabIndex]?.label || 'the current section'}" before opening another tab.`
      );
    },
    [firstIncompleteTabIndex, isTabAccessible, setActiveTab, showTabValidationError, tabs]
  );

  useEffect(() => {
    if (paymentReturnLockRef.current) return;
    if (!isTabAccessible(activeTab)) {
      setActiveTab(firstIncompleteTabIndex);
    }
  }, [activeTab, draft.submittedTabs, firstIncompleteTabIndex, isTabAccessible, setActiveTab]);

  const resolveApplicationId = useCallback(() => {
    const session = readMembershipSalesforceSession();
    return draft.personal.applicationId?.trim() || session?.applicationId || '';
  }, [draft.personal.applicationId]);

  const updateSection = useCallback((section, field, value) => {
    clearFieldError(field);
    if (section === 'personal' && field === 'copyAddress' && value) {
      PERSONAL_MAILING_REQUIRED_KEYS.forEach((key) => clearFieldError(key));
    }
    setDraft((prev) => {
      const sectionData = { ...prev[section], [field]: value };
      if (section === 'workExperience' && field === 'currentEmploymentStatus') {
        if (requiresCurrentWorkExperience(value)) {
          if (!sectionData.currentWorkExperience?.length) {
            sectionData.currentWorkExperience = [{ ...EMPTY_CURRENT_WORK_ENTRY }];
          }
          if (
            isExperiencedPathway
            && value === 'Employed'
            && !sectionData.previousWorkExperience?.length
          ) {
            sectionData.previousWorkExperience = [{ ...EMPTY_PREVIOUS_WORK_ENTRY }];
          }
        } else {
          sectionData.currentWorkExperience = [];
          if (!sectionData.previousWorkExperience?.length) {
            sectionData.previousWorkExperience = [{ ...EMPTY_PREVIOUS_WORK_ENTRY }];
          }
        }
        if (isExperiencedPathway && value === 'Employed') {
          sectionData.accreditedEmployerScheme = sectionData.accreditedEmployerScheme || 'Yes';
        }
      }
      const next = { ...prev, [section]: sectionData };
      saveDraft(next, pathway);
      return next;
    });
  }, [clearFieldError, isExperiencedPathway, pathway]);

  const updateWorkExperienceList = useCallback((listKey, index, field, value) => {
    const prefix = listKey === 'currentWorkExperience' ? 'current' : 'previous';
    clearFieldError(`${prefix}_${index}_${field}`);
    clearFieldError('currentEmploymentStatus');

    setDraft((prev) => {
      const rows = [...(prev.workExperience[listKey] || [])];
      rows[index] = { ...rows[index], [field]: value };
      const next = {
        ...prev,
        workExperience: { ...prev.workExperience, [listKey]: rows },
      };
      saveDraft(next, pathway);
      return next;
    });
  }, [clearFieldError]);

  const addWorkExperienceRow = useCallback((listKey, emptyEntry) => {
    setDraft((prev) => {
      const next = {
        ...prev,
        workExperience: {
          ...prev.workExperience,
          [listKey]: [...(prev.workExperience[listKey] || []), { ...emptyEntry }],
        },
      };
      saveDraft(next, pathway);
      return next;
    });
  }, []);

  const removeWorkExperienceRow = useCallback((listKey, index, emptyEntry, minRows = 0) => {
    setDraft((prev) => {
      const rows = (prev.workExperience[listKey] || []).filter((_, i) => i !== index);
      const next = {
        ...prev,
        workExperience: {
          ...prev.workExperience,
          [listKey]: rows.length >= minRows ? rows : minRows ? [{ ...emptyEntry }] : [],
        },
      };
      saveDraft(next, pathway);
      return next;
    });
  }, []);

  const applyClientValidation = useCallback(
    (tabId) => {
      const { fields, message } = collectTabFieldErrors(tabId, {
        draft,
        pathway,
        applicationId: resolveApplicationId(),
        accountId: readMembershipSalesforceSession()?.accountId || '',
        documentTypes,
        documentFiles,
      });
      setTabFieldErrors(fields);
      if (message) {
        showTabValidationError(message);
        return false;
      }
      clearTabValidationError();
      return true;
    },
    [
      draft,
      documentFiles,
      documentTypes,
      pathway,
      resolveApplicationId,
      showTabValidationError,
      clearTabValidationError,
    ]
  );

  const updateQualificationList = (listKey, index, field, value) => {
    setDraft((prev) => {
      const list = [...(prev.qualification[listKey] || [])];
      list[index] = { ...list[index], [field]: value };
      const next = {
        ...prev,
        qualification: { ...prev.qualification, [listKey]: list },
      };
      saveDraft(next, pathway);
      return next;
    });
  };

  const addQualificationRow = (listKey, emptyEntry) => {
    setDraft((prev) => {
      const next = {
        ...prev,
        qualification: {
          ...prev.qualification,
          [listKey]: [...(prev.qualification[listKey] || []), { ...emptyEntry }],
        },
      };
      saveDraft(next, pathway);
      return next;
    });
  };

  const removeQualificationRow = (listKey, index, emptyEntry, minRows = 0) => {
    setDraft((prev) => {
      const list = (prev.qualification[listKey] || []).filter((_, i) => i !== index);
      const next = {
        ...prev,
        qualification: {
          ...prev.qualification,
          [listKey]:
            list.length > minRows ? list : minRows > 0 ? [{ ...emptyEntry }] : list,
        },
      };
      saveDraft(next, pathway);
      return next;
    });
  };

  const handleDocumentFileSelect = (documentType, file) => {
    if (!file) return;

    clearFieldError(`document_${documentType}`);

    const typeMeta = documentTypes.find((type) => type.value === documentType);
    const existingEntry = draft.documentUpload?.entries?.[documentType];
    if (typeMeta?.isUploaded || existingEntry?.uploadedToSalesforce) {
      return;
    }

    setDocumentFiles((prev) => ({ ...prev, [documentType]: file }));
    setDraft((prev) => {
      const entries = {
        ...(prev.documentUpload?.entries || {}),
        [documentType]: {
          ...(prev.documentUpload?.entries?.[documentType] || {}),
          fileName: file.name,
        },
      };
      const next = {
        ...prev,
        documentUpload: { ...prev.documentUpload, entries },
      };
      saveDraft(next, pathway);
      return next;
    });
  };

  const handleDocumentFileRemove = (documentType) => {
    setDocumentFiles((prev) => {
      const next = { ...prev };
      delete next[documentType];
      return next;
    });
    setDraft((prev) => {
      const existing = prev.documentUpload?.entries?.[documentType] || {};
      if (existing.uploadedToSalesforce) {
        return prev;
      }
      const entries = {
        ...(prev.documentUpload?.entries || {}),
        [documentType]: {
          otherDetails: existing.otherDetails || '',
          fileName: '',
        },
      };
      const next = {
        ...prev,
        documentUpload: { ...prev.documentUpload, entries },
      };
      saveDraft(next, pathway);
      return next;
    });
  };

  const markDocumentUploadedInDraft = (documentType, fileName) => {
    setDocumentFiles((prev) => {
      const next = { ...prev };
      delete next[documentType];
      return next;
    });
    setDraft((prev) => {
      const existing = prev.documentUpload?.entries?.[documentType] || {};
      const entries = {
        ...(prev.documentUpload?.entries || {}),
        [documentType]: buildUploadedDocumentEntry(fileName, existing),
      };
      const next = {
        ...prev,
        documentUpload: { ...prev.documentUpload, entries },
      };
      saveDraft(next, pathway);
      return next;
    });
    setDocumentTypes((prev) =>
      prev.map((type) =>
        type.value === documentType
          ? { ...type, isUploaded: true, uploadedFileName: fileName || type.uploadedFileName }
          : type
      )
    );
  };

  const handleDocumentTypesLoaded = useCallback((types) => {
    setDocumentTypes(types);
    setDocumentFiles((prev) => {
      const next = { ...prev };
      let changed = false;
      types.forEach((type) => {
        if (type.isUploaded && next[type.value]) {
          delete next[type.value];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setDraft((prev) => {
      const entries = syncUploadedDocumentTypesToEntries(
        types,
        prev.documentUpload?.entries || {}
      );
      if (entries === prev.documentUpload?.entries) {
        return prev;
      }
      const next = {
        ...prev,
        documentUpload: { ...prev.documentUpload, entries },
      };
      saveDraft(next, pathway);
      return next;
    });
  }, []);

  const handleDocumentOtherDetailsChange = (documentType, value) => {
    setDraft((prev) => {
      const entries = {
        ...(prev.documentUpload?.entries || {}),
        [documentType]: {
          ...(prev.documentUpload?.entries?.[documentType] || {}),
          otherDetails: value,
        },
      };
      const next = {
        ...prev,
        documentUpload: { ...prev.documentUpload, entries },
      };
      saveDraft(next, pathway);
      return next;
    });
  };

  const advanceAfterTabSuccess = (tabId) => {
    setDraft((prev) => {
      const nextSubmitted = { ...prev.submittedTabs, [tabId]: new Date().toISOString() };
      const next = { ...prev, submittedTabs: nextSubmitted };
      saveDraft(next, pathway);

      if (isApplicationFullyComplete(tabs, nextSubmitted, pathway)) {
        onAllTabsSubmitted?.();
      }
      return next;
    });

    const nextIndex = tabs.findIndex((t) => t.id === tabId);
    if (nextIndex >= 0 && nextIndex < tabs.length - 1) {
      setActiveTab(nextIndex + 1);
    }
  };

  const submitApplicationTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const existingId = resolveApplicationId();
    if (existingId) {
      if (!draft.personal.applicationId?.trim()) {
        updateSection('personal', 'applicationId', existingId);
      }
      return;
    }

    const validationError = validateApplicationBeforeSubmit(
      draft.application,
      session.accountId,
      existingId,
      pathway
    );
    if (validationError) {
      throw createValidationError(validationError);
    }

    const body = buildCreateApplicationApiPayload(draft.application, session.accountId, pathway);
    const result = await submitCreateApplication({
      socialAccessToken: session.socialToken,
      ...body,
    });

    const returnedAppId =
      result?.applicationId
      || result?.salesforce?.applicationId
      || result?.salesforce?.ApplicationId;

    if (!returnedAppId) {
      throw new Error('Salesforce did not return an application ID.');
    }

    mergeApplicationIdIntoSession(String(returnedAppId));
    updateSection('personal', 'applicationId', String(returnedAppId));
  };

  const submitPersonalTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const validationError = validatePersonalFormBeforeSubmit(draft.personal, resolveApplicationId());
    if (validationError) {
      throw createValidationError(validationError);
    }

    const applicationId = resolveApplicationId();
    if (!applicationId) {
      throw createValidationError('Application ID is required. Submit the Application tab first.');
    }

    const body = buildPersonalDetailsApiPayload(
      draft.personal,
      session.accountId,
      applicationId
    );

    await submitMembershipApplicationPersonalDetails({
      socialAccessToken: session.socialToken,
      ...body,
    });
  };

  const markQualificationSubsectionSubmitted = (sectionKey) => {
    setDraft((prev) => {
      const nextSubmitted = {
        ...prev.submittedTabs,
        [sectionKey]: new Date().toISOString(),
      };
      if (isQualificationTabComplete(nextSubmitted, pathway)) {
        nextSubmitted.qualification = new Date().toISOString();
      }
      const next = { ...prev, submittedTabs: nextSubmitted };
      saveDraft(next, pathway);

      queueMicrotask(() => {
        if (isApplicationFullyComplete(tabs, nextSubmitted, pathway)) {
          onAllTabsSubmitted?.();
        } else if (isQualificationTabComplete(nextSubmitted, pathway)) {
          const qualIndex = tabs.findIndex((t) => t.id === 'qualification');
          if (qualIndex >= 0 && qualIndex < tabs.length - 1) {
            setActiveTab(qualIndex + 1);
          }
        }
      });

      return next;
    });
  };

  const runQualificationSectionSubmit = async (sectionKey, validate, submitRows, emptySuccessMessage) => {
    const applicationId = resolveApplicationId();
    const validationError = validate(draft.qualification, applicationId, pathway);
    if (validationError) {
      setTabFieldErrors({});
      showTabValidationError(validationError);
      return;
    }
    clearTabValidationError();
    clearTabFieldErrors();

    setSubmittingTab(sectionKey);
    try {
      const session = ensureMembershipSalesforceSession();

      const token = session.socialToken;
      const count = await submitRows(token, applicationId);

      markQualificationSubsectionSubmitted(sectionKey);
      notifyTabSuccess(
        count > 0
          ? `${count} record(s) submitted to Salesforce successfully.`
          : emptySuccessMessage
      );
      clearTabValidationError();
      scrollFormToTop();
    } catch (err) {
      handleSubmitFailure(err);
    } finally {
      setSubmittingTab('');
    }
  };

  const submitAcademicQualificationSection = () =>
    runQualificationSectionSubmit(
      QUALIFICATION_SUBMIT_KEYS.academic,
      validateAcademicQualificationBeforeSubmit,
      async (token, applicationId) => {
        const plan = getQualificationSubmitPlan(draft.qualification, applicationId);
        for (const payload of plan.academic) {
          await submitAcademicQualification({ socialAccessToken: token, ...payload });
        }
        return plan.academic.length;
      },
      isExperiencedPathway
        ? 'No academic qualifications to submit.'
        : 'No academic qualifications to submit (optional section skipped).'
    );

  const submitProfessionalQualificationSection = () =>
    runQualificationSectionSubmit(
      QUALIFICATION_SUBMIT_KEYS.professional,
      validateProfessionalQualificationBeforeSubmit,
      async (token, applicationId) => {
        const plan = getQualificationSubmitPlan(draft.qualification, applicationId);
        for (const payload of plan.professional) {
          await submitProfessionalQualification({ socialAccessToken: token, ...payload });
        }
        return plan.professional.length;
      },
      ''
    );

  const submitOpbMembershipSection = () =>
    runQualificationSectionSubmit(
      QUALIFICATION_SUBMIT_KEYS.opb,
      validateOpbMembershipBeforeSubmit,
      async (token, applicationId) => {
        const plan = getQualificationSubmitPlan(draft.qualification, applicationId);
        for (const payload of plan.opb) {
          await submitOpbMembership({ socialAccessToken: token, ...payload });
        }
        return plan.opb.length;
      },
      ''
    );

  const submitAtoMembershipSection = () =>
    runQualificationSectionSubmit(
      QUALIFICATION_SUBMIT_KEYS.ato,
      validateAtoMembershipBeforeSubmit,
      async (token, applicationId) => {
        const plan = getQualificationSubmitPlan(draft.qualification, applicationId);
        for (const payload of plan.ato) {
          await submitAtoMembership({ socialAccessToken: token, ...payload });
        }
        return plan.ato.length;
      },
      ''
    );

  const submitCharacterReferenceTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const applicationId = resolveApplicationId();
    const validationError = validateCharacterReferenceBeforeSubmit(
      draft.characterReference,
      applicationId
    );
    if (validationError) {
      throw createValidationError(validationError);
    }

    const body = buildCharacterReferenceApiPayload(draft.characterReference, applicationId);
    await submitCharacterReference({ socialAccessToken: session.socialToken, ...body });
  };

  const submitDocumentUploadTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const applicationId = resolveApplicationId();
    if (!applicationId) {
      throw createValidationError('Application ID is missing. Submit the Application tab first.');
    }

    const validationError = validateDocumentUploadBeforeSubmit(
      documentTypes,
      documentFiles,
      draft.documentUpload?.entries
    );
    if (validationError) {
      throw createValidationError(validationError);
    }

    const toUpload = getDocumentsToUpload(
      documentTypes,
      documentFiles,
      draft.documentUpload?.entries
    );
    let uploadedCount = 0;
    let skippedDuplicates = 0;

    for (const type of toUpload) {
      const file = documentFiles[type.value];
      const otherDetails = draft.documentUpload?.entries?.[type.value]?.otherDetails || '';
      const fileContent = await fileToBase64(file);
      const payload = buildDocumentUploadApiPayload({
        applicationId,
        documentType: type.value,
        file,
        otherDetails,
        fileContent,
      });

      try {
        await submitMembershipDocumentUpload({
          socialAccessToken: session.socialToken,
          ...payload,
        });
        markDocumentUploadedInDraft(type.value, file.name);
        uploadedCount += 1;
      } catch (err) {
        if (isDuplicateDocumentUploadError(err)) {
          markDocumentUploadedInDraft(
            type.value,
            file.name || draft.documentUpload?.entries?.[type.value]?.uploadedFileName
          );
          skippedDuplicates += 1;
          continue;
        }
        throw err;
      }
    }

    return { uploadedCount, skippedDuplicates };
  };

  const submitResidentialDeclarationTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const applicationId = resolveApplicationId();
    const validationError = validateResidentialDeclarationBeforeSubmit(
      draft.residentialDeclaration,
      applicationId
    );
    if (validationError) {
      throw createValidationError(validationError);
    }

    const body = buildResidentialDeclarationApiPayload(
      draft.residentialDeclaration,
      applicationId
    );
    await submitResidentialDeclaration({ socialAccessToken: session.socialToken, ...body });
  };

  const submitDeclarationTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const applicationId = resolveApplicationId();
    const validationError = validateDeclarationBeforeSubmit(draft.declaration, applicationId, pathway);
    if (validationError) {
      throw createValidationError(validationError);
    }

    const body = buildDeclarationApiPayload(draft.declaration, applicationId, pathway);
    await submitDeclaration({ socialAccessToken: session.socialToken, ...body });
  };

  const submitWorkExperienceTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const applicationId = resolveApplicationId();
    const validationError = validateWorkExperienceBeforeSubmit(
      draft.workExperience,
      applicationId,
      pathway
    );
    if (validationError) {
      throw createValidationError(validationError);
    }

    const body = buildEmploymentDetailsApiPayload(draft.workExperience, applicationId, pathway);

    await submitMembershipApplicationEmploymentDetails({
      socialAccessToken: session.socialToken,
      ...body,
    });
  };

  const handleTabSubmit = async (tabId) => {
    if (!applyClientValidation(tabId)) {
      return;
    }

    setSubmittingTab(tabId);
    try {
      if (tabId === 'application') {
        const alreadyCreated = Boolean(resolveApplicationId());
        await submitApplicationTab();
        notifyTabSuccess(
          alreadyCreated
            ? 'Application already exists in Salesforce. Continue to Personal details.'
            : 'Application created in Salesforce successfully.'
        );
      } else if (tabId === 'personal') {
        await submitPersonalTab();
        notifyTabSuccess('Personal details submitted to Salesforce successfully.');
      } else if (tabId === 'work-experience') {
        await submitWorkExperienceTab();
        notifyTabSuccess('Work experience submitted to Salesforce successfully.');
      } else if (tabId === 'qualification') {
        throw createValidationError(
          isExperiencedPathway
            ? 'Use the Submit button under each qualification section (Academic, Professional, Other Professional Bodies).'
            : 'Use the Submit button under each qualification section (Professional Qualification, ATO, Other Professional Bodies).'
        );
      } else if (tabId === 'character-reference') {
        await submitCharacterReferenceTab();
        notifyTabSuccess('Character references submitted to Salesforce successfully.');
      } else if (tabId === 'declaration') {
        await submitDeclarationTab();
        notifyTabSuccess('Declaration submitted to Salesforce successfully.');
      } else if (tabId === 'document-upload') {
        const { uploadedCount, skippedDuplicates } = await submitDocumentUploadTab();
        let documentMessage;
        if (uploadedCount > 0 && skippedDuplicates > 0) {
          documentMessage = `${uploadedCount} document(s) uploaded. ${skippedDuplicates} document(s) were already on file with ISCA eServices.`;
        } else if (uploadedCount > 0) {
          documentMessage =
            uploadedCount === 1
              ? '1 document uploaded to Salesforce successfully.'
              : `${uploadedCount} documents uploaded to Salesforce successfully.`;
        } else if (skippedDuplicates > 0) {
          documentMessage =
            'All selected documents are already on file with ISCA eServices. You can continue to the next step.';
        } else {
          documentMessage =
            'All required documents are already on file with ISCA eServices. You can continue to the next step.';
        }
        notifyTabSuccess(documentMessage);
      } else if (tabId === 'residential-declaration') {
        await submitResidentialDeclarationTab();
        notifyTabSuccess('Residential declaration submitted to Salesforce successfully.');
      } else if (tabId === 'billing') {
        throw createValidationError('Use the Pay button on this tab to complete payment.');
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 400));
        notifyTabSuccess(`${tabs.find((t) => t.id === tabId)?.label || 'Section'} saved.`);
      }
      clearTabValidationError();
      clearTabFieldErrors();
      scrollFormToTop();
      advanceAfterTabSuccess(tabId);
    } catch (err) {
      handleSubmitFailure(err);
    } finally {
      setSubmittingTab('');
    }
  };

  const renderTabValidationAlert = () =>
    tabValidationError ? (
      <Box
        ref={formValidationRef}
        sx={{
          px: fullPage ? { xs: 2, md: 4 } : 0,
          pb: 1.5,
        }}
      >
        <Alert severity="error" onClose={clearTabValidationError} sx={{ borderRadius: 2 }}>
          {tabValidationError}
        </Alert>
      </Box>
    ) : null;

  const renderSectionTitle = (title, firstSection = false) => (
    <MembershipFormSectionTitle title={title} firstSection={firstSection} />
  );

  const renderApplication = () => {
    const session = readMembershipSalesforceSession();
    return (
      <MembershipApplicationCreateSection
        application={draft.application}
        accountId={session?.accountId || ''}
        applicationId={resolveApplicationId()}
        pathway={pathway}
        fieldErrors={tabFieldErrors}
        onUpdate={(field, value) => updateSection('application', field, value)}
      />
    );
  };

  const renderPersonal = () => {
    const personalPicklistErrors = [
      citizenshipPicklist,
      genderPicklist,
      nationalityPicklist,
      maritalStatusPicklist,
      idTypePicklist,
      subscriptionPreferencePicklist,
      communicationPreferencePicklist,
      professionalInterestPicklist,
      voiceCallsPicklist,
      textMessagesPicklist,
      faxMessagesPicklist,
    ].filter((picklist) => picklist.error);

    return (
    <Grid container spacing={2.5}>
      {personalPicklistErrors.map((picklist) => (
        <Grid item xs={12} key={picklist.error}>
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={picklist.retry}>
                Retry
              </Button>
            }
          >
            {picklist.error}
          </Alert>
        </Grid>
      ))}
      {renderSectionTitle('Application reference', true)}
      <Grid item xs={12} md={6}>
        <MembershipFormTextField
          label="Application ID"
          size={fieldSize}
          fullWidth
          disabled
          value={resolveApplicationId()}
          helperText="Created on the Application tab — submit that tab first if empty."
        />
      </Grid>

      {renderSectionTitle('Basic information')}
      <Grid item xs={12} sm={6} md={2} lg={2}>
        <MembershipFormTextField
          select
          label="Salutation"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.salutation}
          onChange={(e) => updateSection('personal', 'salutation', e.target.value)}
          {...fieldProps('salutation')}
        >
          {['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Mdm.'].map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </MembershipFormTextField>
      </Grid>
      <Grid item xs={12} sm={6} md={3} lg={4}>
        <MembershipFormTextField
          label="First name"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.firstName}
          onChange={(e) => updateSection('personal', 'firstName', e.target.value)}
          {...fieldProps('firstName')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3} lg={4}>
        <MembershipFormTextField
          label="Last name"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.lastName}
          onChange={(e) => updateSection('personal', 'lastName', e.target.value)}
          {...fieldProps('lastName')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MembershipApplicationPicklistField
          label="Gender"
          size={fieldSize}
          required
          value={draft.personal.gender}
          onChange={(e) => updateSection('personal', 'gender', e.target.value)}
          options={genderPicklist.options}
          loading={genderPicklist.loading}
          onOpen={genderPicklist.load}
          fieldProps={fieldProps('gender')}
        />
      </Grid>
      <Grid item xs={12} md={8} lg={6}>
        <MembershipFormTextField
          label="Name as per ID"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.nameAsPerId}
          onChange={(e) => updateSection('personal', 'nameAsPerId', e.target.value)}
          placeholder="e.g. Tan Zhi Wen"
          {...fieldProps('nameAsPerId')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <MembershipFormTextField
          label="Date of birth"
          type="date"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.dateOfBirth}
          onChange={(e) => updateSection('personal', 'dateOfBirth', e.target.value)}
          InputLabelProps={{ shrink: true }}
          {...fieldProps('dateOfBirth')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <MembershipApplicationPicklistField
          label="Marital status"
          size={fieldSize}
          required
          value={draft.personal.maritalStatus}
          onChange={(e) => updateSection('personal', 'maritalStatus', e.target.value)}
          options={maritalStatusPicklist.options}
          loading={maritalStatusPicklist.loading}
          onOpen={maritalStatusPicklist.load}
          fieldProps={fieldProps('maritalStatus')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MembershipApplicationPicklistField
          label="Nationality"
          size={fieldSize}
          required
          value={draft.personal.nationality}
          onChange={(e) => updateSection('personal', 'nationality', e.target.value)}
          options={nationalityPicklist.options}
          loading={nationalityPicklist.loading}
          onOpen={nationalityPicklist.load}
          fieldProps={fieldProps('nationality')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MembershipApplicationPicklistField
          label="Citizenship"
          size={fieldSize}
          required
          value={draft.personal.citizenship}
          onChange={(e) => updateSection('personal', 'citizenship', e.target.value)}
          options={citizenshipPicklist.options}
          loading={citizenshipPicklist.loading}
          onOpen={citizenshipPicklist.load}
          fieldProps={fieldProps('citizenship')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MembershipApplicationPicklistField
          label="ID type"
          size={fieldSize}
          required
          value={draft.personal.idType}
          onChange={(e) => updateSection('personal', 'idType', e.target.value)}
          options={idTypePicklist.options}
          loading={idTypePicklist.loading}
          onOpen={idTypePicklist.load}
          fieldProps={fieldProps('idType')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6} lg={3}>
        <MembershipFormPhoneField
          label="Mobile number"
          size={fieldSize}
          required
          lockDialCode
          countryCode={draft.personal.mobileCountryCode || DEFAULT_MEMBERSHIP_DIAL_CODE}
          number={draft.personal.telMobile}
          onCountryCodeChange={(e) =>
            updateSection('personal', 'mobileCountryCode', e.target.value)
          }
          onNumberChange={(e) => updateSection('personal', 'telMobile', e.target.value)}
          {...fieldProps('telMobile')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6} lg={3}>
        <MembershipFormPhoneField
          label="Other number"
          size={fieldSize}
          required
          lockDialCode
          countryCode={draft.personal.otherCountryCode || DEFAULT_MEMBERSHIP_DIAL_CODE}
          number={draft.personal.otherNumber}
          onCountryCodeChange={(e) =>
            updateSection('personal', 'otherCountryCode', e.target.value)
          }
          onNumberChange={(e) => updateSection('personal', 'otherNumber', e.target.value)}
          {...fieldProps('otherNumber')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={4}>
        <MembershipFormTextField
          label="Personal email"
          type="email"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.personalEmail}
          onChange={(e) => updateSection('personal', 'personalEmail', e.target.value)}
          {...fieldProps('personalEmail')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={4}>
        <MembershipFormTextField
          label="Email friendly name"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.emailFriendlyName}
          onChange={(e) => updateSection('personal', 'emailFriendlyName', e.target.value)}
          placeholder="Display name for correspondence"
          {...fieldProps('emailFriendlyName')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={4}>
        <MembershipFormTextField
          label="Alternate email"
          type="email"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.alternateEmailAddress}
          onChange={(e) => updateSection('personal', 'alternateEmailAddress', e.target.value)}
          {...fieldProps('alternateEmailAddress')}
        />
      </Grid>

      {renderSectionTitle('Residential address')}
      <Grid item xs={12} md={6}>
        <MembershipFormTextField
          label="Address line 1"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.addressLine1}
          onChange={(e) => updateSection('personal', 'addressLine1', e.target.value)}
          {...fieldProps('addressLine1')}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <MembershipFormTextField
          label="Address line 2"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.addressLine2}
          onChange={(e) => updateSection('personal', 'addressLine2', e.target.value)}
          {...fieldProps('addressLine2')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MembershipFormTextField
          label="City"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.city}
          onChange={(e) => updateSection('personal', 'city', e.target.value)}
          {...fieldProps('city')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MembershipFormTextField
          label="State"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.state}
          onChange={(e) => updateSection('personal', 'state', e.target.value)}
          {...fieldProps('state')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MembershipFormCountrySelect
          label="Country"
          size={fieldSize}
          required
          disabled
          value={draft.personal.country || DEFAULT_MEMBERSHIP_COUNTRY}
          onChange={(e) => updateSection('personal', 'country', e.target.value)}
          placeholder={DEFAULT_MEMBERSHIP_COUNTRY}
          {...fieldProps('country')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MembershipFormTextField
          label="Postal code"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.postalCode}
          onChange={(e) => updateSection('personal', 'postalCode', e.target.value)}
          {...fieldProps('postalCode')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <MembershipFormTextField
          label="Unit number"
          size={fieldSize}
          fullWidth
          required
          value={draft.personal.unitNumber}
          onChange={(e) => updateSection('personal', 'unitNumber', e.target.value)}
          {...fieldProps('unitNumber')}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(draft.personal.copyAddress)}
              onChange={(e) => updateSection('personal', 'copyAddress', e.target.checked)}
            />
          }
          label="Mailing address same as residential"
        />
      </Grid>

      {!draft.personal.copyAddress && (
        <>
          {renderSectionTitle('Mailing address')}
          <Grid item xs={12} md={6}>
            <MembershipFormTextField
              label="Mailing address line 1"
              size={fieldSize}
              fullWidth
              required
              value={draft.personal.mailingaddressLine1}
              onChange={(e) => updateSection('personal', 'mailingaddressLine1', e.target.value)}
              {...fieldProps('mailingaddressLine1')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <MembershipFormTextField
              label="Mailing address line 2"
              size={fieldSize}
              fullWidth
              required
              value={draft.personal.mailingaddressLine2}
              onChange={(e) => updateSection('personal', 'mailingaddressLine2', e.target.value)}
              {...fieldProps('mailingaddressLine2')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MembershipFormTextField
              label="Mailing city"
              size={fieldSize}
              fullWidth
              required
              value={draft.personal.mailingcity}
              onChange={(e) => updateSection('personal', 'mailingcity', e.target.value)}
              {...fieldProps('mailingcity')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MembershipFormTextField
              label="Mailing state"
              size={fieldSize}
              fullWidth
              required
              value={draft.personal.mailingstate}
              onChange={(e) => updateSection('personal', 'mailingstate', e.target.value)}
              {...fieldProps('mailingstate')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MembershipFormCountrySelect
              label="Mailing country"
              size={fieldSize}
              required
              disabled
              value={draft.personal.mailingcountry || DEFAULT_MEMBERSHIP_COUNTRY}
              onChange={(e) => updateSection('personal', 'mailingcountry', e.target.value)}
              placeholder={DEFAULT_MEMBERSHIP_COUNTRY}
              {...fieldProps('mailingcountry')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MembershipFormTextField
              label="Mailing postal code"
              size={fieldSize}
              fullWidth
              required
              value={draft.personal.mailingpostalCode}
              onChange={(e) => updateSection('personal', 'mailingpostalCode', e.target.value)}
              {...fieldProps('mailingpostalCode')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <MembershipFormTextField
              label="Mailing unit number"
              size={fieldSize}
              fullWidth
              required
              value={draft.personal.mailingunitNumber}
              onChange={(e) => updateSection('personal', 'mailingunitNumber', e.target.value)}
              {...fieldProps('mailingunitNumber')}
            />
          </Grid>
        </>
      )}

      {renderSectionTitle('Preferences')}
      <Grid item xs={12} md={6}>
        <MembershipApplicationPicklistField
          label="Subscription preference"
          size={fieldSize}
          required
          value={draft.personal.subscriptionPreference}
          onChange={(e) => updateSection('personal', 'subscriptionPreference', e.target.value)}
          options={subscriptionPreferencePicklist.options}
          loading={subscriptionPreferencePicklist.loading}
          onOpen={subscriptionPreferencePicklist.load}
          fieldProps={fieldProps('subscriptionPreference')}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <MembershipApplicationPicklistField
          label="Communication preference"
          size={fieldSize}
          required
          value={draft.personal.communicationPreference}
          onChange={(e) => updateSection('personal', 'communicationPreference', e.target.value)}
          options={communicationPreferencePicklist.options}
          loading={communicationPreferencePicklist.loading}
          onOpen={communicationPreferencePicklist.load}
          fieldProps={fieldProps('communicationPreference')}
        />
      </Grid>
      <Grid item xs={12}>
        <MembershipApplicationPicklistField
          label="Professional interest"
          size={fieldSize}
          required
          value={draft.personal.professionalInterest}
          onChange={(e) => updateSection('personal', 'professionalInterest', e.target.value)}
          options={professionalInterestPicklist.options}
          loading={professionalInterestPicklist.loading}
          onOpen={professionalInterestPicklist.load}
          fieldProps={fieldProps('professionalInterest')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <MembershipApplicationPicklistField
          label="Voice calls"
          size={fieldSize}
          required
          value={draft.personal.voiceCalls}
          onChange={(e) => updateSection('personal', 'voiceCalls', e.target.value)}
          options={voiceCallsPicklist.options}
          loading={voiceCallsPicklist.loading}
          onOpen={voiceCallsPicklist.load}
          fieldProps={fieldProps('voiceCalls')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <MembershipApplicationPicklistField
          label="Text messages"
          size={fieldSize}
          required
          value={draft.personal.textMessages}
          onChange={(e) => updateSection('personal', 'textMessages', e.target.value)}
          options={textMessagesPicklist.options}
          loading={textMessagesPicklist.loading}
          onOpen={textMessagesPicklist.load}
          fieldProps={fieldProps('textMessages')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <MembershipApplicationPicklistField
          label="Fax messages"
          size={fieldSize}
          required
          value={draft.personal.faxMessages}
          onChange={(e) => updateSection('personal', 'faxMessages', e.target.value)}
          options={faxMessagesPicklist.options}
          loading={faxMessagesPicklist.loading}
          onOpen={faxMessagesPicklist.load}
          fieldProps={fieldProps('faxMessages')}
        />
      </Grid>
    </Grid>
    );
  };

  const renderWorkExperience = () => {
    const work = normalizeWorkExperienceForm(draft.workExperience);
    const requiresCurrent = requiresCurrentWorkExperience(draft.workExperience.currentEmploymentStatus);
    const currentRows = work.currentWorkExperience || [];
    const previousRows = work.previousWorkExperience || [];

    const renderExperienceRows = ({
      kind,
      listKey,
      rows,
      emptyEntry,
      rowLabelPrefix,
      minRows,
      showCurrentOnlyFields,
      showPeriodTo,
      periodToRequired = true,
    }) =>
      rows.map((row, index) => {
        const fieldPrefix = `${kind}_${index}`;
        const canRemove = rows.length > minRows;

        return (
          <Paper
            key={`${kind}-work-exp-${index}`}
            variant="outlined"
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: 2.5,
              borderColor: alpha(theme.palette.primary.main, 0.2),
              bgcolor: alpha(theme.palette.primary.main, 0.02),
            }}
          >
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              spacing={2}
              sx={{ mb: 0 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <MembershipFormSectionTitleBlock
                  title={`${rowLabelPrefix} ${index + 1}`}
                  firstSection
                  sx={{ mt: 0 }}
                />
              </Box>
              {canRemove && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeWorkExperienceRow(listKey, index, emptyEntry, minRows)}
                  aria-label={`Remove ${rowLabelPrefix.toLowerCase()}`}
                  sx={{ mt: 0.75, flexShrink: 0 }}
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                </IconButton>
              )}
            </Stack>

            <Grid
              container
              spacing={3}
              sx={{
                mt: 0.5,
                '& .MuiGrid-item': {
                  display: 'flex',
                  flexDirection: 'column',
                },
                '& .MuiFormControl-root': {
                  width: 1,
                },
              }}
            >
              <Grid item xs={12} md={6}>
                <MembershipApplicationPicklistField
                  label="Organisation name"
                  size={fieldSize}
                  required
                  value={row.organisationName}
                  onChange={(e) =>
                    updateWorkExperienceList(listKey, index, 'organisationName', e.target.value)
                  }
                  options={organisationNamesPicklist.options}
                  loading={organisationNamesPicklist.loading}
                  onOpen={organisationNamesPicklist.load}
                  fieldProps={fieldProps(`${fieldPrefix}_organisationName`)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <MembershipApplicationPicklistField
                  label="Organisation type"
                  size={fieldSize}
                  value={row.organisationType}
                  onChange={(e) =>
                    updateWorkExperienceList(listKey, index, 'organisationType', e.target.value)
                  }
                  options={companyTypePicklist.options}
                  loading={companyTypePicklist.loading}
                  onOpen={companyTypePicklist.load}
                  fieldProps={fieldProps(`${fieldPrefix}_organisationType`)}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <MembershipApplicationPicklistField
                  label="Industry"
                  size={fieldSize}
                  required
                  value={row.industry}
                  onChange={(e) =>
                    updateWorkExperienceList(listKey, index, 'industry', e.target.value)
                  }
                  options={industryPicklist.options}
                  loading={industryPicklist.loading}
                  onOpen={industryPicklist.load}
                  fieldProps={fieldProps(`${fieldPrefix}_industry`)}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <MembershipFormTextField
                  label="Job position"
                  size={fieldSize}
                  fullWidth
                  required
                  value={row.jobPosition}
                  onChange={(e) =>
                    updateWorkExperienceList(listKey, index, 'jobPosition', e.target.value)
                  }
                  {...fieldProps(`${fieldPrefix}_jobPosition`)}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <MembershipApplicationPicklistField
                  label="Job level"
                  size={fieldSize}
                  required
                  value={row.jobLevel}
                  onChange={(e) =>
                    updateWorkExperienceList(listKey, index, 'jobLevel', e.target.value)
                  }
                  options={jobLevelPicklist.options}
                  loading={jobLevelPicklist.loading}
                  onOpen={jobLevelPicklist.load}
                  fieldProps={fieldProps(`${fieldPrefix}_jobLevel`)}
                />
              </Grid>
              <Grid item xs={12} sm={showPeriodTo ? 4 : 6} md={showPeriodTo ? 4 : 6}>
                <MembershipApplicationPicklistField
                  label="Job function"
                  size={fieldSize}
                  required
                  value={row.jobFunction}
                  onChange={(e) =>
                    updateWorkExperienceList(listKey, index, 'jobFunction', e.target.value)
                  }
                  options={jobFunctionPicklist.options}
                  loading={jobFunctionPicklist.loading}
                  onOpen={jobFunctionPicklist.load}
                  fieldProps={fieldProps(`${fieldPrefix}_jobFunction`)}
                />
              </Grid>
              <Grid item xs={12} sm={showPeriodTo ? 4 : 6} md={showPeriodTo ? 4 : 6}>
                <MembershipFormTextField
                  label="Period from"
                  type="date"
                  size={fieldSize}
                  fullWidth
                  required
                  value={row.periodFrom}
                  onChange={(e) =>
                    updateWorkExperienceList(listKey, index, 'periodFrom', e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                  {...fieldProps(`${fieldPrefix}_periodFrom`)}
                />
              </Grid>
              {showPeriodTo && (
                <Grid item xs={12} sm={4} md={4}>
                  <MembershipFormTextField
                    label="Period to"
                    type="date"
                    size={fieldSize}
                    fullWidth
                    required={periodToRequired}
                    value={row.periodTo || ''}
                    onChange={(e) =>
                      updateWorkExperienceList(listKey, index, 'periodTo', e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                    {...(periodToRequired ? fieldProps(`${fieldPrefix}_periodTo`) : {})}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <MembershipFormTextField
                  label="Job responsibilities"
                  size={fieldSize}
                  fullWidth
                  required
                  multiline
                  minRows={3}
                  value={row.jobResponsibilities}
                  onChange={(e) =>
                    updateWorkExperienceList(listKey, index, 'jobResponsibilities', e.target.value)
                  }
                  {...fieldProps(`${fieldPrefix}_jobResponsibilities`)}
                />
              </Grid>

              <Grid item xs={12}>
                <MembershipFormSectionTitleBlock
                  title="Employer contact & details"
                  sx={{ mt: 0.5, mb: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MembershipFormTextField
                  label="Business email"
                  size={fieldSize}
                  fullWidth
                  type="email"
                  value={row.businessEmail || ''}
                  onChange={(e) =>
                    updateWorkExperienceList(listKey, index, 'businessEmail', e.target.value)
                  }
                  placeholder="name@company.com"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <MembershipFormTextField
                  label="Business number"
                  size={fieldSize}
                  fullWidth
                  value={row.businessNumber || ''}
                  onChange={(e) =>
                    updateWorkExperienceList(listKey, index, 'businessNumber', e.target.value)
                  }
                  placeholder="12345678"
                />
              </Grid>
              {showCurrentOnlyFields && (
                <>
                  <Grid item xs={12} sm={6} md={4}>
                    <MembershipFormTextField
                      label="Business registration type"
                      size={fieldSize}
                      fullWidth
                      value={row.businessRegistrationType || ''}
                      onChange={(e) =>
                        updateWorkExperienceList(
                          listKey,
                          index,
                          'businessRegistrationType',
                          e.target.value
                        )
                      }
                      placeholder="Partnership"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <MembershipFormTextField
                      label="Staff strength"
                      size={fieldSize}
                      fullWidth
                      value={row.staffStrength || ''}
                      onChange={(e) =>
                        updateWorkExperienceList(listKey, index, 'staffStrength', e.target.value)
                      }
                      placeholder="500"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <MembershipFormTextField
                      label="Turnover"
                      size={fieldSize}
                      fullWidth
                      value={row.turnover || ''}
                      onChange={(e) =>
                        updateWorkExperienceList(listKey, index, 'turnover', e.target.value)
                      }
                      placeholder="SGD 10,000,000"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>
        );
      });

    const periodToRequired = !isExperiencedPathway;

    return (
      <Stack spacing={3.5}>
        <Alert severity="info" sx={{ py: 0.5 }}>
          Application ID: {resolveApplicationId() || '— submit Application tab first'}
        </Alert>

        {companyTypePicklist.error && (
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={companyTypePicklist.retry}>
                Retry
              </Button>
            }
          >
            {companyTypePicklist.error}
          </Alert>
        )}

        {industryPicklist.error && (
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={industryPicklist.retry}>
                Retry
              </Button>
            }
          >
            {industryPicklist.error}
          </Alert>
        )}

        {jobLevelPicklist.error && (
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={jobLevelPicklist.retry}>
                Retry
              </Button>
            }
          >
            {jobLevelPicklist.error}
          </Alert>
        )}

        {jobFunctionPicklist.error && (
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={jobFunctionPicklist.retry}>
                Retry
              </Button>
            }
          >
            {jobFunctionPicklist.error}
          </Alert>
        )}

        {currentEmploymentStatusPicklist.error && (
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={currentEmploymentStatusPicklist.retry}>
                Retry
              </Button>
            }
          >
            {currentEmploymentStatusPicklist.error}
          </Alert>
        )}

        {organisationNamesPicklist.error && (
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={organisationNamesPicklist.retry}>
                Retry
              </Button>
            }
          >
            {organisationNamesPicklist.error}
          </Alert>
        )}

        <MembershipFormSectionTitleBlock
          title={requiresCurrent ? 'Current employment' : 'Employment status'}
          firstSection
          sx={{ mt: 0 }}
        />

        <Grid container spacing={3}>
          <Grid item xs={12} md={requiresCurrent ? 6 : 12}>
            <MembershipApplicationPicklistField
              label="Current employment status"
              size={fieldSize}
              required
              value={draft.workExperience.currentEmploymentStatus}
              onChange={(e) =>
                updateSection('workExperience', 'currentEmploymentStatus', e.target.value)
              }
              options={currentEmploymentStatusPicklist.options}
              loading={currentEmploymentStatusPicklist.loading}
              onOpen={currentEmploymentStatusPicklist.load}
              fieldProps={fieldProps('currentEmploymentStatus')}
            />
          </Grid>
          {requiresCurrent && (
            <Grid item xs={12} md={6}>
              <MembershipFormTextField
                select
                label="Accredited employer scheme"
                size={fieldSize}
                fullWidth
                required={isExperiencedPathway}
                value={
                  draft.workExperience.accreditedEmployerScheme
                  || (isExperiencedPathway ? 'Yes' : 'No')
                }
                onChange={(e) =>
                  updateSection('workExperience', 'accreditedEmployerScheme', e.target.value)
                }
                {...fieldProps('accreditedEmployerScheme')}
              >
                {['Yes', 'No'].map((o) => (
                  <MenuItem key={o} value={o}>
                    {o}
                  </MenuItem>
                ))}
              </MembershipFormTextField>
            </Grid>
          )}
        </Grid>

        {requiresCurrent && (
          <>
            <MembershipFormSectionTitleBlock title="Current work experience" sx={{ mt: 0 }} />

            {renderExperienceRows({
              kind: 'current',
              listKey: 'currentWorkExperience',
              rows: currentRows,
              emptyEntry: EMPTY_CURRENT_WORK_ENTRY,
              rowLabelPrefix: 'Current role',
              minRows: 1,
              showCurrentOnlyFields: true,
              showPeriodTo: false,
              periodToRequired: false,
            })}

            <Button
              variant="outlined"
              startIcon={<Iconify icon="mingcute:add-line" width={20} />}
              onClick={() => addWorkExperienceRow('currentWorkExperience', EMPTY_CURRENT_WORK_ENTRY)}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600 }}
            >
              Add another current role
            </Button>
          </>
        )}

        <MembershipFormSectionTitleBlock title="Previous work experience" sx={{ mt: 0 }} />

        {previousRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Optional — add past roles if applicable.
          </Typography>
        ) : (
          renderExperienceRows({
            kind: 'previous',
            listKey: 'previousWorkExperience',
            rows: previousRows,
            emptyEntry: EMPTY_PREVIOUS_WORK_ENTRY,
            rowLabelPrefix: 'Previous role',
            minRows: requiresCurrent ? 0 : 1,
            showCurrentOnlyFields: false,
            showPeriodTo: true,
            periodToRequired,
          })
        )}

        <Button
          variant="outlined"
          startIcon={<Iconify icon="mingcute:add-line" width={20} />}
          onClick={() => addWorkExperienceRow('previousWorkExperience', EMPTY_PREVIOUS_WORK_ENTRY)}
          sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600 }}
        >
          Add previous work experience
        </Button>
      </Stack>
    );
  };

  const renderQualification = () => (
    <MembershipApplicationQualificationSection
      qualification={draft.qualification}
      applicationId={resolveApplicationId()}
      pathway={pathway}
      submittedTabs={draft.submittedTabs}
      submittingSection={submittingTab}
      membershipStatusPicklist={qualificationMembershipStatusPicklist}
      onUpdateAcademic={(index, field, value) =>
        updateQualificationList('academic', index, field, value)
      }
      onUpdateProfessional={(index, field, value) =>
        updateQualificationList('professional', index, field, value)
      }
      onUpdateAto={(index, field, value) => updateQualificationList('ato', index, field, value)}
      onUpdateOpb={(index, field, value) => updateQualificationList('opb', index, field, value)}
      onAddAcademic={() => addQualificationRow('academic', EMPTY_ACADEMIC_ENTRY)}
      onAddProfessional={() => addQualificationRow('professional', EMPTY_PROFESSIONAL_ENTRY)}
      onAddAto={() => addQualificationRow('ato', EMPTY_ATO_ENTRY)}
      onAddOpb={() => addQualificationRow('opb', EMPTY_OPB_ENTRY)}
      onRemoveAcademic={(index) =>
        removeQualificationRow('academic', index, EMPTY_ACADEMIC_ENTRY, isExperiencedPathway ? 1 : 0)
      }
      onRemoveProfessional={(index) =>
        removeQualificationRow('professional', index, EMPTY_PROFESSIONAL_ENTRY, 1)
      }
      onRemoveAto={(index) => removeQualificationRow('ato', index, EMPTY_ATO_ENTRY, 1)}
      onRemoveOpb={(index) => removeQualificationRow('opb', index, EMPTY_OPB_ENTRY, 1)}
      onSubmitAcademic={submitAcademicQualificationSection}
      onSubmitProfessional={submitProfessionalQualificationSection}
      onSubmitAto={submitAtoMembershipSection}
      onSubmitOpb={submitOpbMembershipSection}
    />
  );

  const renderCharacterReference = () => (
    <MembershipApplicationCharacterReferenceSection
      characterReference={draft.characterReference}
      applicationId={resolveApplicationId()}
      pathway={pathway}
      fieldErrors={tabFieldErrors}
      onUpdate={(field, value) => updateSection('characterReference', field, value)}
    />
  );

  const renderDeclaration = () => (
    <MembershipApplicationDeclarationSection
      declaration={draft.declaration}
      applicationId={resolveApplicationId()}
      pathway={pathway}
      fieldErrors={tabFieldErrors}
      onUpdate={(field, value) => updateSection('declaration', field, value)}
    />
  );

  const renderDocumentUpload = () => (
    <MembershipApplicationDocumentSection
      applicationId={resolveApplicationId()}
      documentUpload={draft.documentUpload}
      documentFiles={documentFiles}
      fieldErrors={tabFieldErrors}
      onFileSelect={handleDocumentFileSelect}
      onFileRemove={handleDocumentFileRemove}
      onOtherDetailsChange={handleDocumentOtherDetailsChange}
      onDocumentTypesLoaded={handleDocumentTypesLoaded}
    />
  );

  const renderResidentialDeclaration = () => (
    <MembershipApplicationResidentialDeclarationSection
      residentialDeclaration={draft.residentialDeclaration}
      applicationId={resolveApplicationId()}
      pathway={pathway}
      fieldErrors={tabFieldErrors}
      onUpdate={(field, value) => updateSection('residentialDeclaration', field, value)}
    />
  );

  const renderBilling = () => (
    <MembershipApplicationBillingSection
      applicationId={resolveApplicationId()}
      accountId={salesforceSession?.accountId || ''}
      socialAccessToken={salesforceSession?.socialToken || ''}
      documentsSubmitted={documentsSubmitted}
      residentialDeclarationSubmitted={residentialDeclarationSubmitted}
      customerEmail={draft.personal?.personalEmail || draft.personal?.email || ''}
      paymentReturnNotice={paymentReturnNotice}
      paymentProcessing={billingPaymentProcessing}
      onClearPaymentReturnNotice={() => setPaymentReturnNotice(null)}
      onBeforePayRedirect={() => {
        backupMembershipApplicationDraft(draft, pathway);
        saveDraft(draft, pathway);
      }}
    />
  );

  const sectionRenderers = {
    application: renderApplication,
    personal: renderPersonal,
    'work-experience': renderWorkExperience,
    qualification: renderQualification,
    'character-reference': renderCharacterReference,
    declaration: renderDeclaration,
    'document-upload': renderDocumentUpload,
    'residential-declaration': renderResidentialDeclaration,
    billing: renderBilling,
  };

  const tabsSx = getMembershipFormTabsSx(theme, fullPage);
  const paperSx = fullPage ? getMembershipFormPaperSx(theme) : undefined;
  const footerSx = getMembershipFormFooterSx(theme, fullPage);
  const submitButtonSx = getMembershipFormSubmitButtonSx(theme);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: 1,
      }}
    >
      {fullPage && (
        <Box
          sx={{
            px: { xs: 2, md: 4 },
            pt: 2,
            pb: 1.5,
            bgcolor: alpha(primary.main, 0.04),
            borderBottom: `1px solid ${alpha(primary.main, 0.1)}`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {completedCount} of {tabs.length} sections completed
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: secondary.main }}>
              {progressValue}%
            </Typography>
          </Stack>
          <Box
            sx={{
              mt: 1.25,
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(primary.main, 0.12),
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: 1,
                width: `${progressValue}%`,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${primary.main} 0%, ${secondary.main} 100%)`,
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
        </Box>
      )}

      {!fullPage && salesforceSession?.accountId && (
        <Alert severity="success" sx={{ py: 0.5, mb: 2 }}>
          Salesforce account linked (ID ending …{salesforceSession.accountId.slice(-6)}).
        </Alert>
      )}

      {!fullPage && !salesforceSession?.socialToken && (
        <Alert severity="warning" sx={{ py: 0.5, mb: 2 }}>
          Salesforce social token was not captured.
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant={fullPage ? 'scrollable' : 'scrollable'}
        scrollButtons={fullPage ? 'auto' : 'auto'}
        allowScrollButtonsMobile
        sx={tabsSx}
      >
        {tabs.map((tab, index) => {
          const done = isTabSubmitted(tab.id);
          const accessible = isTabAccessible(index);
          const isCurrent = index === firstIncompleteTabIndex && !done;
          return (
            <Tab
              key={tab.id}
              disabled={!accessible}
              icon={
                fullPage ? (
                  <Iconify
                    icon={done ? 'solar:check-circle-bold' : tab.icon}
                    width={22}
                    sx={{
                      color: done ? 'success.main' : accessible ? 'text.secondary' : 'action.disabled',
                      mb: -0.5,
                    }}
                  />
                ) : undefined
              }
              iconPosition={fullPage ? 'start' : undefined}
              label={done && !fullPage ? `${tab.label} ✓` : tab.label}
              sx={{
                textTransform: 'none',
                fontWeight: isCurrent ? 700 : 600,
                minHeight: fullPage ? 56 : 48,
                color: done ? 'success.dark' : accessible ? undefined : 'text.disabled',
                opacity: accessible ? 1 : 0.55,
              }}
            />
          );
        })}
      </Tabs>

      <Box
        ref={formScrollAnchorRef}
        sx={{
          scrollMarginTop: { xs: 72, md: 96 },
          height: 0,
          overflow: 'hidden',
        }}
        aria-hidden
      />

      <Box
        sx={{
          px: fullPage ? { xs: 2, md: 4 } : 0,
          py: fullPage ? { xs: 3, md: 4 } : 1,
        }}
      >
        <Box sx={{ width: 1 }}>
          {fullPage ? (
            <Paper variant="outlined" sx={paperSx}>
              <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ mb: 3 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${alpha(primary.main, 0.15)} 0%, ${alpha(secondary.main, 0.12)} 100%)`,
                    border: `1px solid ${alpha(primary.main, 0.22)}`,
                  }}
                >
                  <Iconify
                    icon={tabs[activeTab]?.icon || 'solar:document-bold'}
                    width={28}
                    sx={{ color: 'primary.main' }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
                    <Box component="span" sx={{ color: secondary.main }}>
                      Step {activeTab + 1} —{' '}
                    </Box>
                    <Box component="span" sx={{ color: secondary.main }}>
                      {tabs[activeTab]?.label}
                    </Box>
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.75, lineHeight: 1.65, color: 'text.primary' }}>
                    Section {activeTab + 1} of {tabs.length} — fill in the details below, then submit.
                    Fields marked with{' '}
                    <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      *
                    </Box>{' '}
                    are required.
                  </Typography>
                </Box>
              </Stack>

              {sectionRenderers[currentTabId]?.()}
            </Paper>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                {tabs[activeTab]?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                Step {activeTab + 1} of {tabs.length} — fill in the details below, then submit this section.
              </Typography>
              {sectionRenderers[currentTabId]?.()}
            </>
          )}
        </Box>
      </Box>

      {renderTabValidationAlert()}

      <Box
        sx={{
          ...footerSx,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant="outlined"
          color="secondary"
          disabled={activeTab === 0 || !isTabAccessible(activeTab - 1)}
          onClick={() => {
            const prev = activeTab - 1;
            if (isTabAccessible(prev)) setActiveTab(prev);
          }}
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          sx={{ textTransform: 'none', fontWeight: 600, borderWidth: 1.5 }}
        >
          Previous
        </Button>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {activeTab < tabs.length - 1 && (
            <Button
              variant="text"
              color="primary"
              disabled={!isTabAccessible(activeTab + 1)}
              onClick={() => {
                const next = activeTab + 1;
                if (isTabAccessible(next)) setActiveTab(next);
              }}
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Next section
            </Button>
          )}
          {currentTabId === 'qualification' ? (
            <Typography variant="body2" sx={{ maxWidth: 360, textAlign: 'right', color: 'text.primary' }}>
              {isExperiencedPathway
                ? 'Submit each section above. Academic, Professional and Other Professional Bodies are required.'
                : 'Submit each section above. Professional Qualification, ATO and Other Professional Bodies are required.'}
            </Typography>
          ) : currentTabId === 'billing' ? (
            <Typography variant="body2" sx={{ maxWidth: 360, textAlign: 'right', color: 'text.primary' }}>
              Review the payment summary above, then use Pay to complete your application fee.
            </Typography>
          ) : (
            <LoadingButton
              variant="contained"
              color="primary"
              size="large"
              loading={submittingTab === currentTabId}
              onClick={() => handleTabSubmit(currentTabId)}
              sx={submitButtonSx}
            >
              {currentTabId === 'application' && resolveApplicationId()
                ? 'Continue to Personal'
                : 'Submit'}
            </LoadingButton>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
