import { useCallback, useEffect, useMemo, useState } from 'react';

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
  submitCharacterReference,
  submitDeclaration,
  submitMembershipDocumentUpload,
  submitResidentialDeclaration,
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
  validatePersonalFormBeforeSubmit,
} from 'src/utils/membership-application-personal';
import {
  EMPTY_WORK_EXPERIENCE_FORM,
  EMPTY_WORK_EXPERIENCE_ENTRY,
  buildEmploymentDetailsApiPayload,
  validateWorkExperienceBeforeSubmit,
} from 'src/utils/membership-application-employment';
import {
  EMPTY_QUALIFICATION_FORM,
  EMPTY_ACADEMIC_ENTRY,
  EMPTY_PROFESSIONAL_ENTRY,
  EMPTY_ATO_ENTRY,
  validateAcademicQualificationBeforeSubmit,
  validateProfessionalQualificationBeforeSubmit,
  validateAtoMembershipBeforeSubmit,
  isQualificationTabComplete,
  getQualificationSubmitPlan,
  QUALIFICATION_SUBMIT_KEYS,
} from 'src/utils/membership-application-qualification';
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
  buildCreateApplicationApiPayload,
  validateApplicationBeforeSubmit,
} from 'src/utils/membership-application-create';
import {
  EMPTY_DOCUMENT_UPLOAD_FORM,
  buildDocumentUploadApiPayload,
  fileToBase64,
  getDocumentsToUpload,
  validateDocumentUploadBeforeSubmit,
} from 'src/utils/membership-application-document';
import { EMPTY_BILLING_FORM } from 'src/utils/membership-application-billing';
import {
  DEFAULT_MEMBERSHIP_COUNTRY,
  DEFAULT_MEMBERSHIP_DIAL_CODE,
  getMembershipFormFooterSx,
  getMembershipFormPaperSx,
  getMembershipFormSubmitButtonSx,
  getMembershipFormTabsSx,
} from 'src/utils/membership-form-ui';

// ----------------------------------------------------------------------

const TABS = [
  { id: 'application', label: 'Application', icon: 'solar:document-add-bold' },
  { id: 'personal', label: 'Personal', icon: 'solar:user-bold' },
  { id: 'work-experience', label: 'Work Experience', icon: 'solar:case-minimalistic-bold' },
  { id: 'qualification', label: 'Qualification', icon: 'solar:diploma-verified-bold' },
  { id: 'character-reference', label: 'Character Reference', icon: 'solar:users-group-two-rounded-bold' },
  { id: 'declaration', label: 'Declaration', icon: 'solar:document-text-bold' },
  { id: 'document-upload', label: 'Document Upload', icon: 'solar:upload-bold' },
  { id: 'residential-declaration', label: 'Residential Declaration', icon: 'solar:home-2-bold' },
  { id: 'billing', label: 'Billing', icon: 'solar:wallet-money-bold' },
];

const EMPTY_DRAFT = {
  application: { ...EMPTY_APPLICATION_FORM },
  personal: { salutation: 'Mr.', ...EMPTY_PERSONAL_FORM },
  workExperience: { ...EMPTY_WORK_EXPERIENCE_FORM },
  qualification: {
    ...EMPTY_QUALIFICATION_FORM,
    professional: [{ ...EMPTY_PROFESSIONAL_ENTRY }],
    ato: [{ ...EMPTY_ATO_ENTRY }],
  },
  characterReference: { ...EMPTY_CHARACTER_REFERENCE_FORM },
  declaration: { ...EMPTY_DECLARATION_FORM },
  documentUpload: { ...EMPTY_DOCUMENT_UPLOAD_FORM },
  residentialDeclaration: { ...EMPTY_RESIDENTIAL_DECLARATION_FORM },
  billing: { ...EMPTY_BILLING_FORM },
};

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

function loadDraft() {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_APPLICATION_FORM_DRAFT_KEY);
    if (!raw) return { ...EMPTY_DRAFT, submittedTabs: {} };
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_DRAFT,
      ...parsed,
      application: { ...EMPTY_DRAFT.application, ...parsed.application },
      personal: applyPersonalSingaporeDefaults({
        ...EMPTY_DRAFT.personal,
        ...parsed.personal,
      }),
      workExperience: {
        ...EMPTY_DRAFT.workExperience,
        ...parsed.workExperience,
        experiences: Array.isArray(parsed.workExperience?.experiences)
          ? parsed.workExperience.experiences.map((row) => ({
              ...EMPTY_WORK_EXPERIENCE_ENTRY,
              ...row,
            }))
          : EMPTY_WORK_EXPERIENCE_FORM.experiences,
      },
      qualification: {
        ...EMPTY_DRAFT.qualification,
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
          : [{ ...EMPTY_ATO_ENTRY }],
      },
      characterReference: applyCharacterReferenceDialDefaults({
        ...EMPTY_DRAFT.characterReference,
        ...parsed.characterReference,
      }),
      declaration: { ...EMPTY_DRAFT.declaration, ...parsed.declaration },
      documentUpload: {
        ...EMPTY_DRAFT.documentUpload,
        ...parsed.documentUpload,
        entries: {
          ...EMPTY_DOCUMENT_UPLOAD_FORM.entries,
          ...(parsed.documentUpload?.entries || {}),
        },
      },
      residentialDeclaration: {
        ...EMPTY_DRAFT.residentialDeclaration,
        ...parsed.residentialDeclaration,
      },
      billing: { ...EMPTY_BILLING_FORM, ...parsed.billing },
      submittedTabs: parsed.submittedTabs || {},
    };
  } catch {
    return { ...EMPTY_DRAFT, submittedTabs: {} };
  }
}

function saveDraft(draft) {
  try {
    localStorage.setItem(MEMBERSHIP_APPLICATION_FORM_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

const fieldSize = 'medium';

// ----------------------------------------------------------------------

export function MembershipApplicationForm({ onAllTabsSubmitted, fullPage = false }) {
  const theme = useTheme();
  const { primary, secondary } = theme.palette;
  const salesforceSession = readMembershipSalesforceSession();
  const [activeTab, setActiveTab] = useState(0);
  const [draft, setDraft] = useState(loadDraft);
  const [submittingTab, setSubmittingTab] = useState('');
  const [tabMessage, setTabMessage] = useState('');
  const [tabMessageSeverity, setTabMessageSeverity] = useState('info');
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentFiles, setDocumentFiles] = useState({});
  const [paymentReturnNotice, setPaymentReturnNotice] = useState(null);

  const currentTabId = TABS[activeTab]?.id || 'personal';
  const documentsSubmitted = Boolean(draft.submittedTabs['document-upload']);
  const residentialDeclarationSubmitted = Boolean(draft.submittedTabs['residential-declaration']);

  useEffect(() => {
    const session = readMembershipSalesforceSession();
    setDraft((prev) => {
      let personal = prev.personal;
      let changed = false;

      if (session?.applicationId && !personal.applicationId) {
        personal = { ...personal, applicationId: session.applicationId };
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

      const next = { ...prev, personal };
      saveDraft(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const openBilling = params.get('billing') === '1';
    const paymentCanceled = params.get('payment') === 'canceled';

    if (openBilling || paymentCanceled) {
      const billingIndex = TABS.findIndex((t) => t.id === 'billing');
      if (billingIndex >= 0) setActiveTab(billingIndex);
    }

    const paymentError = params.get('paymentError');

    if (paymentCanceled) {
      setPaymentReturnNotice({
        severity: 'warning',
        message: 'Payment was canceled. You can try again when ready.',
      });
    } else if (paymentError) {
      setPaymentReturnNotice({
        severity: 'error',
        message: decodeURIComponent(paymentError),
      });
    }

    if (openBilling || paymentCanceled || paymentError) {
      ['billing', 'payment', 'ref', 'paymentError'].forEach((key) => params.delete(key));
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, []);

  const completedCount = useMemo(
    () => TABS.filter((t) => draft.submittedTabs[t.id]).length,
    [draft.submittedTabs]
  );

  const progressValue = Math.round((completedCount / TABS.length) * 100);

  const resolveApplicationId = useCallback(() => {
    const session = readMembershipSalesforceSession();
    return draft.personal.applicationId?.trim() || session?.applicationId || '';
  }, [draft.personal.applicationId]);

  const updateSection = useCallback((section, field, value) => {
    setDraft((prev) => {
      const next = {
        ...prev,
        [section]: { ...prev[section], [field]: value },
      };
      saveDraft(next);
      return next;
    });
  }, []);

  const updateWorkExperienceEntry = useCallback((index, field, value) => {
    setDraft((prev) => {
      const experiences = [...(prev.workExperience.experiences || [])];
      experiences[index] = { ...experiences[index], [field]: value };
      const next = {
        ...prev,
        workExperience: { ...prev.workExperience, experiences },
      };
      saveDraft(next);
      return next;
    });
  }, []);

  const addWorkExperienceEntry = () => {
    setDraft((prev) => {
      const next = {
        ...prev,
        workExperience: {
          ...prev.workExperience,
          experiences: [...(prev.workExperience.experiences || []), { ...EMPTY_WORK_EXPERIENCE_ENTRY }],
        },
      };
      saveDraft(next);
      return next;
    });
  };

  const updateQualificationList = (listKey, index, field, value) => {
    setDraft((prev) => {
      const list = [...(prev.qualification[listKey] || [])];
      list[index] = { ...list[index], [field]: value };
      const next = {
        ...prev,
        qualification: { ...prev.qualification, [listKey]: list },
      };
      saveDraft(next);
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
      saveDraft(next);
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
      saveDraft(next);
      return next;
    });
  };

  const removeWorkExperienceEntry = (index) => {
    setDraft((prev) => {
      const experiences = (prev.workExperience.experiences || []).filter((_, i) => i !== index);
      const next = {
        ...prev,
        workExperience: {
          ...prev.workExperience,
          experiences: experiences.length ? experiences : [{ ...EMPTY_WORK_EXPERIENCE_ENTRY }],
        },
      };
      saveDraft(next);
      return next;
    });
  };

  const handleDocumentFileSelect = (documentType, file) => {
    if (!file) return;
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
      saveDraft(next);
      return next;
    });
  };

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
      saveDraft(next);
      return next;
    });
  };

  const advanceAfterTabSuccess = (tabId) => {
    setDraft((prev) => {
      const nextSubmitted = { ...prev.submittedTabs, [tabId]: new Date().toISOString() };
      const next = { ...prev, submittedTabs: nextSubmitted };
      saveDraft(next);

      const allDone = TABS.every((t) => nextSubmitted[t.id]);
      queueMicrotask(() => {
        if (allDone) {
          onAllTabsSubmitted?.();
        } else {
          const nextIndex = TABS.findIndex((t) => t.id === tabId);
          if (nextIndex >= 0 && nextIndex < TABS.length - 1) {
            setActiveTab(nextIndex + 1);
          }
        }
      });
      return next;
    });
  };

  const submitApplicationTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const existingId = resolveApplicationId();
    const validationError = validateApplicationBeforeSubmit(
      draft.application,
      session.accountId,
      existingId
    );
    if (validationError) {
      throw new Error(validationError);
    }

    const body = buildCreateApplicationApiPayload(draft.application, session.accountId);
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
      throw new Error(validationError);
    }

    const applicationId = resolveApplicationId();
    if (!applicationId) {
      throw new Error('Application ID is required. Submit the Application tab first.');
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
      if (isQualificationTabComplete(nextSubmitted)) {
        nextSubmitted.qualification = new Date().toISOString();
      }
      const next = { ...prev, submittedTabs: nextSubmitted };
      saveDraft(next);

      const allDone = TABS.every((t) => {
        if (t.id === 'qualification') {
          return isQualificationTabComplete(nextSubmitted);
        }
        return Boolean(nextSubmitted[t.id]);
      });
      if (allDone) {
        queueMicrotask(() => onAllTabsSubmitted?.());
      }

      return next;
    });
  };

  const runQualificationSectionSubmit = async (sectionKey, validate, submitRows, emptySuccessMessage) => {
    setSubmittingTab(sectionKey);
    setTabMessage('');
    setTabMessageSeverity('info');
    try {
      const session = ensureMembershipSalesforceSession();

      const applicationId = resolveApplicationId();
      const validationError = validate(draft.qualification, applicationId);
      if (validationError) {
        throw new Error(validationError);
      }

      const token = session.socialToken;
      const count = await submitRows(token, applicationId);

      markQualificationSubsectionSubmitted(sectionKey);
      setTabMessageSeverity('success');
      setTabMessage(
        count > 0
          ? `${count} record(s) submitted to Salesforce successfully.`
          : emptySuccessMessage
      );
    } catch (err) {
      if (err?.code === 'SALESFORCE_SOCIAL_TOKEN_EXPIRED') {
        return;
      }
      setTabMessageSeverity('error');
      setTabMessage(err instanceof Error ? err.message : 'Failed to submit section.');
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
      'No academic qualifications to submit (optional section skipped).'
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
      throw new Error(validationError);
    }

    const body = buildCharacterReferenceApiPayload(draft.characterReference, applicationId);
    await submitCharacterReference({ socialAccessToken: session.socialToken, ...body });
  };

  const submitDocumentUploadTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const applicationId = resolveApplicationId();
    if (!applicationId) {
      throw new Error('Application ID is missing. Submit the Application tab first.');
    }

    const validationError = validateDocumentUploadBeforeSubmit(documentTypes, documentFiles);
    if (validationError) {
      throw new Error(validationError);
    }

    const toUpload = getDocumentsToUpload(documentTypes, documentFiles);
    let uploadedCount = 0;

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

      await submitMembershipDocumentUpload({
        socialAccessToken: session.socialToken,
        ...payload,
      });
      uploadedCount += 1;
    }

    return uploadedCount;
  };

  const submitResidentialDeclarationTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const applicationId = resolveApplicationId();
    const validationError = validateResidentialDeclarationBeforeSubmit(
      draft.residentialDeclaration,
      applicationId
    );
    if (validationError) {
      throw new Error(validationError);
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
    const validationError = validateDeclarationBeforeSubmit(draft.declaration, applicationId);
    if (validationError) {
      throw new Error(validationError);
    }

    const body = buildDeclarationApiPayload(draft.declaration, applicationId);
    await submitDeclaration({ socialAccessToken: session.socialToken, ...body });
  };

  const submitWorkExperienceTab = async () => {
    const session = ensureMembershipSalesforceSession();

    const applicationId = resolveApplicationId();
    const validationError = validateWorkExperienceBeforeSubmit(draft.workExperience, applicationId);
    if (validationError) {
      throw new Error(validationError);
    }

    const body = buildEmploymentDetailsApiPayload(draft.workExperience, applicationId);

    await submitMembershipApplicationEmploymentDetails({
      socialAccessToken: session.socialToken,
      ...body,
    });
  };

  const handleTabSubmit = async (tabId) => {
    setSubmittingTab(tabId);
    setTabMessage('');
    setTabMessageSeverity('info');
    try {
      if (tabId === 'application') {
        await submitApplicationTab();
        setTabMessageSeverity('success');
        setTabMessage('Application created in Salesforce successfully.');
      } else if (tabId === 'personal') {
        await submitPersonalTab();
        setTabMessageSeverity('success');
        setTabMessage('Personal details submitted to Salesforce successfully.');
      } else if (tabId === 'work-experience') {
        await submitWorkExperienceTab();
        setTabMessageSeverity('success');
        setTabMessage('Work experience submitted to Salesforce successfully.');
      } else if (tabId === 'qualification') {
        throw new Error(
          'Use the Submit button under each qualification section (Academic, Professional, Other Professional Bodies).'
        );
      } else if (tabId === 'character-reference') {
        await submitCharacterReferenceTab();
        setTabMessageSeverity('success');
        setTabMessage('Character references submitted to Salesforce successfully.');
      } else if (tabId === 'declaration') {
        await submitDeclarationTab();
        setTabMessageSeverity('success');
        setTabMessage('Declaration submitted to Salesforce successfully.');
      } else if (tabId === 'document-upload') {
        const count = await submitDocumentUploadTab();
        setTabMessageSeverity('success');
        setTabMessage(
          count === 1
            ? '1 document uploaded to Salesforce successfully.'
            : `${count} documents uploaded to Salesforce successfully.`
        );
      } else if (tabId === 'residential-declaration') {
        await submitResidentialDeclarationTab();
        setTabMessageSeverity('success');
        setTabMessage('Residential declaration submitted to Salesforce successfully.');
      } else if (tabId === 'billing') {
        throw new Error('Use the Pay button on this tab to complete payment.');
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 400));
        setTabMessage(`${TABS.find((t) => t.id === tabId)?.label || 'Section'} saved.`);
      }
      advanceAfterTabSuccess(tabId);
    } catch (err) {
      if (err?.code === 'SALESFORCE_SOCIAL_TOKEN_EXPIRED') {
        return;
      }
      setTabMessageSeverity('error');
      setTabMessage(err instanceof Error ? err.message : 'Failed to submit section.');
    } finally {
      setSubmittingTab('');
    }
  };

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
        onUpdate={(field, value) => updateSection('application', field, value)}
      />
    );
  };

  const renderPersonal = () => (
    <Grid container spacing={2.5}>
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
          value={draft.personal.salutation}
          onChange={(e) => updateSection('personal', 'salutation', e.target.value)}
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
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MembershipFormTextField
          select
          label="Gender"
          size={fieldSize}
          fullWidth
          value={draft.personal.gender}
          onChange={(e) => updateSection('personal', 'gender', e.target.value)}
        >
          {['Male', 'Female'].map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </MembershipFormTextField>
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
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <MembershipFormTextField
          select
          label="Marital status"
          size={fieldSize}
          fullWidth
          value={draft.personal.maritalStatus}
          onChange={(e) => updateSection('personal', 'maritalStatus', e.target.value)}
        >
          {['Single', 'Married', 'Divorced', 'Widowed'].map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </MembershipFormTextField>
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MembershipFormTextField
          label="Nationality"
          required
          size={fieldSize}
          fullWidth
          value={draft.personal.nationality}
          onChange={(e) => updateSection('personal', 'nationality', e.target.value)}
          placeholder="Enter nationality"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MembershipFormTextField
          label="Citizenship"
          size={fieldSize}
          fullWidth
          value={draft.personal.citizenship}
          onChange={(e) => updateSection('personal', 'citizenship', e.target.value)}
          placeholder="Enter citizenship"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MembershipFormTextField
          label="ID type"
          size={fieldSize}
          fullWidth
          value={draft.personal.idType}
          onChange={(e) => updateSection('personal', 'idType', e.target.value)}
          placeholder="e.g. Pink NRIC"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6} lg={3}>
        <MembershipFormPhoneField
          label="Mobile number"
          size={fieldSize}
          lockDialCode
          countryCode={draft.personal.mobileCountryCode || DEFAULT_MEMBERSHIP_DIAL_CODE}
          number={draft.personal.telMobile}
          onCountryCodeChange={(e) =>
            updateSection('personal', 'mobileCountryCode', e.target.value)
          }
          onNumberChange={(e) => updateSection('personal', 'telMobile', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6} lg={3}>
        <MembershipFormPhoneField
          label="Other number"
          size={fieldSize}
          lockDialCode
          countryCode={draft.personal.otherCountryCode || DEFAULT_MEMBERSHIP_DIAL_CODE}
          number={draft.personal.otherNumber}
          onCountryCodeChange={(e) =>
            updateSection('personal', 'otherCountryCode', e.target.value)
          }
          onNumberChange={(e) => updateSection('personal', 'otherNumber', e.target.value)}
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
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={4}>
        <MembershipFormTextField
          label="Email friendly name"
          size={fieldSize}
          fullWidth
          value={draft.personal.emailFriendlyName}
          onChange={(e) => updateSection('personal', 'emailFriendlyName', e.target.value)}
          placeholder="Display name for correspondence"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={4}>
        <MembershipFormTextField
          label="Alternate email"
          type="email"
          size={fieldSize}
          fullWidth
          value={draft.personal.alternateEmailAddress}
          onChange={(e) => updateSection('personal', 'alternateEmailAddress', e.target.value)}
        />
      </Grid>

      {renderSectionTitle('Residential address')}
      <Grid item xs={12} md={6}>
        <MembershipFormTextField
          label="Address line 1"
          size={fieldSize}
          fullWidth
          value={draft.personal.addressLine1}
          onChange={(e) => updateSection('personal', 'addressLine1', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <MembershipFormTextField
          label="Address line 2"
          size={fieldSize}
          fullWidth
          value={draft.personal.addressLine2}
          onChange={(e) => updateSection('personal', 'addressLine2', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MembershipFormTextField
          label="City"
          size={fieldSize}
          fullWidth
          value={draft.personal.city}
          onChange={(e) => updateSection('personal', 'city', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MembershipFormTextField
          label="State"
          size={fieldSize}
          fullWidth
          value={draft.personal.state}
          onChange={(e) => updateSection('personal', 'state', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MembershipFormCountrySelect
          label="Country"
          size={fieldSize}
          disabled
          value={draft.personal.country || DEFAULT_MEMBERSHIP_COUNTRY}
          onChange={(e) => updateSection('personal', 'country', e.target.value)}
          placeholder={DEFAULT_MEMBERSHIP_COUNTRY}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MembershipFormTextField
          label="Postal code"
          size={fieldSize}
          fullWidth
          value={draft.personal.postalCode}
          onChange={(e) => updateSection('personal', 'postalCode', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <MembershipFormTextField
          label="Unit number"
          size={fieldSize}
          fullWidth
          value={draft.personal.unitNumber}
          onChange={(e) => updateSection('personal', 'unitNumber', e.target.value)}
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
              value={draft.personal.mailingaddressLine1}
              onChange={(e) => updateSection('personal', 'mailingaddressLine1', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <MembershipFormTextField
              label="Mailing address line 2"
              size={fieldSize}
              fullWidth
              value={draft.personal.mailingaddressLine2}
              onChange={(e) => updateSection('personal', 'mailingaddressLine2', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MembershipFormTextField
              label="Mailing city"
              size={fieldSize}
              fullWidth
              value={draft.personal.mailingcity}
              onChange={(e) => updateSection('personal', 'mailingcity', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MembershipFormTextField
              label="Mailing state"
              size={fieldSize}
              fullWidth
              value={draft.personal.mailingstate}
              onChange={(e) => updateSection('personal', 'mailingstate', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MembershipFormCountrySelect
              label="Mailing country"
              size={fieldSize}
              disabled
              value={draft.personal.mailingcountry || DEFAULT_MEMBERSHIP_COUNTRY}
              onChange={(e) => updateSection('personal', 'mailingcountry', e.target.value)}
              placeholder={DEFAULT_MEMBERSHIP_COUNTRY}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MembershipFormTextField
              label="Mailing postal code"
              size={fieldSize}
              fullWidth
              value={draft.personal.mailingpostalCode}
              onChange={(e) => updateSection('personal', 'mailingpostalCode', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <MembershipFormTextField
              label="Mailing unit number"
              size={fieldSize}
              fullWidth
              value={draft.personal.mailingunitNumber}
              onChange={(e) => updateSection('personal', 'mailingunitNumber', e.target.value)}
            />
          </Grid>
        </>
      )}

      {renderSectionTitle('Preferences')}
      <Grid item xs={12} md={6}>
        <MembershipFormTextField
          label="Subscription preference"
          size={fieldSize}
          fullWidth
          value={draft.personal.subscriptionPreference}
          onChange={(e) => updateSection('personal', 'subscriptionPreference', e.target.value)}
          placeholder="Monthly Chartered Accountants Lab;ISCAccountify Bulletin"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <MembershipFormTextField
          label="Communication preference"
          size={fieldSize}
          fullWidth
          value={draft.personal.communicationPreference}
          onChange={(e) => updateSection('personal', 'communicationPreference', e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <MembershipFormTextField
          label="Professional interest"
          size={fieldSize}
          fullWidth
          value={draft.personal.professionalInterest}
          onChange={(e) => updateSection('personal', 'professionalInterest', e.target.value)}
          placeholder="Risk Management;Taxation"
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <MembershipFormTextField
          select
          label="Voice calls"
          size={fieldSize}
          fullWidth
          value={draft.personal.voiceCalls}
          onChange={(e) => updateSection('personal', 'voiceCalls', e.target.value)}
        >
          {['Yes', 'No'].map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </MembershipFormTextField>
      </Grid>
      <Grid item xs={12} sm={4}>
        <MembershipFormTextField
          select
          label="Text messages"
          size={fieldSize}
          fullWidth
          value={draft.personal.textMessages}
          onChange={(e) => updateSection('personal', 'textMessages', e.target.value)}
        >
          {['Yes', 'No'].map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </MembershipFormTextField>
      </Grid>
      <Grid item xs={12} sm={4}>
        <MembershipFormTextField
          select
          label="Fax messages"
          size={fieldSize}
          fullWidth
          value={draft.personal.faxMessages}
          onChange={(e) => updateSection('personal', 'faxMessages', e.target.value)}
        >
          {['Yes', 'No'].map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </MembershipFormTextField>
      </Grid>
    </Grid>
  );

  const renderWorkExperience = () => {
    const experiences = draft.workExperience.experiences || [];

    return (
      <Stack spacing={3.5}>
        <Alert severity="info" sx={{ py: 0.5 }}>
          Application ID: {resolveApplicationId() || '— submit Application tab first'}
        </Alert>

        <MembershipFormSectionTitleBlock title="Current employment" firstSection sx={{ mt: 0 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <MembershipFormTextField
              select
              label="Current employment status"
              size={fieldSize}
              fullWidth
              required
              value={draft.workExperience.currentEmploymentStatus}
              onChange={(e) =>
                updateSection('workExperience', 'currentEmploymentStatus', e.target.value)
              }
            >
              {['Student', 'Employed', 'Self-employed', 'Unemployed', 'Retired'].map((o) => (
                <MenuItem key={o} value={o}>
                  {o}
                </MenuItem>
              ))}
            </MembershipFormTextField>
          </Grid>
        </Grid>

        {experiences.map((row, index) => (
          <Paper
            key={`work-exp-${index}`}
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
                  title={`Work experience ${index + 1}`}
                  firstSection
                  sx={{ mt: 0 }}
                />
              </Box>
              {experiences.length > 1 && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeWorkExperienceEntry(index)}
                  aria-label="Remove experience"
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
                <MembershipFormTextField
                  label="Organisation name"
                  size={fieldSize}
                  fullWidth
                  required
                  value={row.organisationName}
                  onChange={(e) =>
                    updateWorkExperienceEntry(index, 'organisationName', e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <MembershipFormTextField
                  label="Organisation type"
                  size={fieldSize}
                  fullWidth
                  value={row.organisationType}
                  onChange={(e) =>
                    updateWorkExperienceEntry(index, 'organisationType', e.target.value)
                  }
                  placeholder="Public Accounting Firms (EY / Deloitte / KPMG / PwC)"
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <MembershipFormTextField
                  label="Industry"
                  size={fieldSize}
                  fullWidth
                  value={row.industry}
                  onChange={(e) => updateWorkExperienceEntry(index, 'industry', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <MembershipFormTextField
                  label="Job position"
                  size={fieldSize}
                  fullWidth
                  value={row.jobPosition}
                  onChange={(e) => updateWorkExperienceEntry(index, 'jobPosition', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <MembershipFormTextField
                  label="Job level"
                  size={fieldSize}
                  fullWidth
                  value={row.jobLevel}
                  onChange={(e) => updateWorkExperienceEntry(index, 'jobLevel', e.target.value)}
                  placeholder="Middle Management"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <MembershipFormTextField
                  label="Job function"
                  size={fieldSize}
                  fullWidth
                  value={row.jobFunction}
                  onChange={(e) => updateWorkExperienceEntry(index, 'jobFunction', e.target.value)}
                  placeholder="Investment Analysis"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MembershipFormTextField
                  label="Period from"
                  type="date"
                  size={fieldSize}
                  fullWidth
                  value={row.periodFrom}
                  onChange={(e) => updateWorkExperienceEntry(index, 'periodFrom', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MembershipFormTextField
                  label="Period to"
                  type="date"
                  size={fieldSize}
                  fullWidth
                  value={row.periodTo}
                  onChange={(e) => updateWorkExperienceEntry(index, 'periodTo', e.target.value)}
                  disabled={row.isCurrentEmployment}
                />
              </Grid>
              <Grid item xs={12} sx={{ pt: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(row.isCurrentEmployment)}
                      onChange={(e) =>
                        updateWorkExperienceEntry(index, 'isCurrentEmployment', e.target.checked)
                      }
                    />
                  }
                  label="This is my current employment"
                  sx={{ ml: 0.25 }}
                />
              </Grid>
              <Grid item xs={12}>
                <MembershipFormTextField
                  label="Job responsibilities"
                  size={fieldSize}
                  fullWidth
                  multiline
                  minRows={3}
                  value={row.jobResponsibilities}
                  onChange={(e) =>
                    updateWorkExperienceEntry(index, 'jobResponsibilities', e.target.value)
                  }
                />
              </Grid>
            </Grid>
          </Paper>
        ))}

        <Button
          variant="outlined"
          startIcon={<Iconify icon="mingcute:add-line" width={20} />}
          onClick={addWorkExperienceEntry}
          sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600 }}
        >
          Add another work experience
        </Button>
      </Stack>
    );
  };

  const renderQualification = () => (
    <MembershipApplicationQualificationSection
      qualification={draft.qualification}
      applicationId={resolveApplicationId()}
      submittedTabs={draft.submittedTabs}
      submittingSection={submittingTab}
      onUpdateAcademic={(index, field, value) =>
        updateQualificationList('academic', index, field, value)
      }
      onUpdateProfessional={(index, field, value) =>
        updateQualificationList('professional', index, field, value)
      }
      onUpdateAto={(index, field, value) => updateQualificationList('ato', index, field, value)}
      onAddAcademic={() => addQualificationRow('academic', EMPTY_ACADEMIC_ENTRY)}
      onAddProfessional={() => addQualificationRow('professional', EMPTY_PROFESSIONAL_ENTRY)}
      onAddAto={() => addQualificationRow('ato', EMPTY_ATO_ENTRY)}
      onRemoveAcademic={(index) =>
        removeQualificationRow('academic', index, EMPTY_ACADEMIC_ENTRY, 0)
      }
      onRemoveProfessional={(index) =>
        removeQualificationRow('professional', index, EMPTY_PROFESSIONAL_ENTRY, 1)
      }
      onRemoveAto={(index) => removeQualificationRow('ato', index, EMPTY_ATO_ENTRY, 1)}
      onSubmitAcademic={submitAcademicQualificationSection}
      onSubmitProfessional={submitProfessionalQualificationSection}
      onSubmitAto={submitAtoMembershipSection}
    />
  );

  const renderCharacterReference = () => (
    <MembershipApplicationCharacterReferenceSection
      characterReference={draft.characterReference}
      applicationId={resolveApplicationId()}
      onUpdate={(field, value) => updateSection('characterReference', field, value)}
    />
  );

  const renderDeclaration = () => (
    <MembershipApplicationDeclarationSection
      declaration={draft.declaration}
      applicationId={resolveApplicationId()}
      onUpdate={(field, value) => updateSection('declaration', field, value)}
    />
  );

  const renderDocumentUpload = () => (
    <MembershipApplicationDocumentSection
      applicationId={resolveApplicationId()}
      documentUpload={draft.documentUpload}
      documentFiles={documentFiles}
      onFileSelect={handleDocumentFileSelect}
      onOtherDetailsChange={handleDocumentOtherDetailsChange}
      onDocumentTypesLoaded={setDocumentTypes}
    />
  );

  const renderResidentialDeclaration = () => (
    <MembershipApplicationResidentialDeclarationSection
      residentialDeclaration={draft.residentialDeclaration}
      applicationId={resolveApplicationId()}
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
      onClearPaymentReturnNotice={() => setPaymentReturnNotice(null)}
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
              {completedCount} of {TABS.length} sections completed
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
        onChange={(_, v) => setActiveTab(v)}
        variant={fullPage ? 'scrollable' : 'scrollable'}
        scrollButtons={fullPage ? 'auto' : 'auto'}
        allowScrollButtonsMobile
        sx={tabsSx}
      >
        {TABS.map((tab, index) => {
          const done = Boolean(draft.submittedTabs[tab.id]);
          return (
            <Tab
              key={tab.id}
              icon={
                fullPage ? (
                  <Iconify
                    icon={done ? 'solar:check-circle-bold' : tab.icon}
                    width={22}
                    sx={{ color: done ? 'success.main' : 'text.secondary', mb: -0.5 }}
                  />
                ) : undefined
              }
              iconPosition={fullPage ? 'start' : undefined}
              label={done && !fullPage ? `${tab.label} ✓` : tab.label}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                minHeight: fullPage ? 56 : 48,
                color: done ? 'success.dark' : undefined,
              }}
            />
          );
        })}
      </Tabs>

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
                    icon={TABS[activeTab]?.icon || 'solar:document-bold'}
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
                      {TABS[activeTab]?.label}
                    </Box>
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.75, lineHeight: 1.65, color: 'text.primary' }}>
                    Section {activeTab + 1} of {TABS.length} — fill in the details below, then submit.
                    Fields marked with{' '}
                    <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      *
                    </Box>{' '}
                    are required.
                  </Typography>
                </Box>
              </Stack>

              {sectionRenderers[currentTabId]?.()}

              {tabMessage && (
                <Alert
                  severity={tabMessageSeverity}
                  onClose={() => setTabMessage('')}
                  sx={{ mt: 3, borderRadius: 2 }}
                >
                  {tabMessage}
                </Alert>
              )}
            </Paper>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                {TABS[activeTab]?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                Step {activeTab + 1} of {TABS.length} — fill in the details below, then submit this section.
              </Typography>
              {sectionRenderers[currentTabId]?.()}
              {tabMessage && (
                <Alert
                  severity={tabMessageSeverity}
                  onClose={() => setTabMessage('')}
                  sx={{ mt: 3 }}
                >
                  {tabMessage}
                </Alert>
              )}
            </>
          )}
        </Box>
      </Box>

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
          disabled={activeTab === 0}
          onClick={() => setActiveTab((v) => Math.max(0, v - 1))}
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          sx={{ textTransform: 'none', fontWeight: 600, borderWidth: 1.5 }}
        >
          Previous
        </Button>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {activeTab < TABS.length - 1 && (
            <Button
              variant="text"
              color="primary"
              onClick={() => setActiveTab((v) => Math.min(TABS.length - 1, v + 1))}
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Next section
            </Button>
          )}
          {currentTabId === 'qualification' ? (
            <Typography variant="body2" sx={{ maxWidth: 360, textAlign: 'right', color: 'text.primary' }}>
              Submit each section above using its own button. Professional and Other Professional
              Bodies are required.
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
              Submit {TABS[activeTab]?.label}
            </LoadingButton>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
