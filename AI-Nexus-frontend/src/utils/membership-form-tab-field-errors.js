import { validateApplicationBeforeSubmit } from 'src/utils/membership-application-create';
import { isExperiencedMembershipApplicationPathway } from 'src/utils/membership-application-pathway';
import {
  getPersonalRequiredFieldKeys,
  isPersonalFieldMissing,
  validatePersonalFormBeforeSubmit,
} from 'src/utils/membership-application-personal';
import {
  isWorkExperienceRowStarted,
  validateWorkExperienceBeforeSubmit,
  normalizeWorkExperienceForm,
  requiresCurrentWorkExperience,
  isExperiencedPeriodToOptional,
} from 'src/utils/membership-application-employment';
import {
  CHARACTER_REFERENCE_REQUIRED_KEYS,
  isCharacterReferenceFieldMissing,
  validateCharacterReferenceBeforeSubmit,
} from 'src/utils/membership-application-character-reference';
import { validateDeclarationBeforeSubmit } from 'src/utils/membership-application-declaration';
import {
  RESIDENTIAL_DECLARATION_OPTIONS,
  validateResidentialDeclarationBeforeSubmit,
} from 'src/utils/membership-application-residential-declaration';
import {
  isDocumentTypeFulfilled,
  validateDocumentUploadBeforeSubmit,
} from 'src/utils/membership-application-document';
import {
  getNationalPhoneLimits,
  isValidNationalPhoneNumber,
} from 'src/utils/membership-dial-codes';

// ----------------------------------------------------------------------

export const REQUIRED_FIELD_MESSAGE = 'This field is required.';

function req(value) {
  return String(value ?? '').trim() ? '' : REQUIRED_FIELD_MESSAGE;
}

function hasAnyFieldError(fields) {
  return Object.values(fields).some(Boolean);
}

function buildApplicationFieldErrors(application, accountId, applicationId, pathway) {
  const fields = {};
  if (!applicationId?.trim()) {
    if (!accountId?.trim()) {
      fields._form = 'Salesforce account is not linked. Please sign in with Eservices again.';
    } else if (!isExperiencedMembershipApplicationPathway(pathway) && !application.accountingQualification?.trim()) {
      fields.accountingQualification = REQUIRED_FIELD_MESSAGE;
    }
  }
  return fields;
}

function buildPersonalFieldErrors(personal, applicationId) {
  const fields = {};
  if (!applicationId?.trim() && !personal.applicationId?.trim()) {
    fields.applicationId = 'Submit the Application tab first.';
  }

  getPersonalRequiredFieldKeys(personal).forEach((key) => {
    if (isPersonalFieldMissing(personal, key)) {
      fields[key] = REQUIRED_FIELD_MESSAGE;
    }
  });

  if (!isPersonalFieldMissing(personal, 'telMobile')) {
    if (!isValidNationalPhoneNumber(personal.telMobile, personal.mobileCountryCode)) {
      const { hint } = getNationalPhoneLimits(personal.mobileCountryCode);
      fields.telMobile = `Invalid mobile number. ${hint}.`;
    }
  }

  if (!isPersonalFieldMissing(personal, 'otherNumber')) {
    if (!isValidNationalPhoneNumber(personal.otherNumber, personal.otherCountryCode)) {
      const { hint } = getNationalPhoneLimits(personal.otherCountryCode);
      fields.otherNumber = `Invalid number. ${hint}.`;
    }
  }

  return fields;
}

function applyWorkRowFieldErrors(fields, prefix, row, requirePeriodTo) {
  const orgName = String(row?.organisationName ?? '').trim();
  const industry = String(row?.industry ?? '').trim();
  const jobPos = String(row?.jobPosition ?? '').trim();
  const jobLevel = String(row?.jobLevel ?? '').trim();
  const jobFunction = String(row?.jobFunction ?? '').trim();
  if (!orgName) fields[`${prefix}_organisationName`] = REQUIRED_FIELD_MESSAGE;
  if (!industry) fields[`${prefix}_industry`] = REQUIRED_FIELD_MESSAGE;
  if (!jobPos) fields[`${prefix}_jobPosition`] = REQUIRED_FIELD_MESSAGE;
  if (!jobLevel) fields[`${prefix}_jobLevel`] = REQUIRED_FIELD_MESSAGE;
  if (!jobFunction) fields[`${prefix}_jobFunction`] = REQUIRED_FIELD_MESSAGE;
  if (!String(row?.jobResponsibilities ?? '').trim()) {
    fields[`${prefix}_jobResponsibilities`] = REQUIRED_FIELD_MESSAGE;
  }
  if (!String(row?.periodFrom ?? '').trim()) {
    fields[`${prefix}_periodFrom`] = REQUIRED_FIELD_MESSAGE;
  }
  if (requirePeriodTo && !String(row?.periodTo ?? '').trim()) {
    fields[`${prefix}_periodTo`] = REQUIRED_FIELD_MESSAGE;
  }
}

function buildWorkExperienceFieldErrors(workExperience, applicationId, pathway) {
  const fields = {};
  if (!applicationId?.trim()) {
    fields._form = 'Application ID is required. Submit the Application tab first.';
    return fields;
  }

  const normalized = normalizeWorkExperienceForm(workExperience);
  const periodToOptional = isExperiencedPeriodToOptional(pathway);
  fields.currentEmploymentStatus = req(normalized.currentEmploymentStatus);
  const requiresCurrent = requiresCurrentWorkExperience(normalized.currentEmploymentStatus);

  let hasCompleteCurrent = false;
  (normalized.currentWorkExperience || []).forEach((row, index) => {
    const mustValidate =
      (requiresCurrent && index === 0) || isWorkExperienceRowStarted(row, 'current');
    if (!mustValidate) return;
    applyWorkRowFieldErrors(fields, `current_${index}`, row, false);
    if (
      String(row?.organisationName ?? '').trim() &&
      String(row?.industry ?? '').trim() &&
      String(row?.jobPosition ?? '').trim() &&
      String(row?.jobLevel ?? '').trim() &&
      String(row?.jobFunction ?? '').trim() &&
      String(row?.jobResponsibilities ?? '').trim() &&
      String(row?.periodFrom ?? '').trim()
    ) {
      hasCompleteCurrent = true;
    }
  });

  let hasCompletePrevious = false;
  (normalized.previousWorkExperience || []).forEach((row, index) => {
    if (!isWorkExperienceRowStarted(row, 'previous')) return;
    applyWorkRowFieldErrors(fields, `previous_${index}`, row, !periodToOptional);
    if (
      String(row?.organisationName ?? '').trim() &&
      String(row?.industry ?? '').trim() &&
      String(row?.jobPosition ?? '').trim() &&
      String(row?.jobLevel ?? '').trim() &&
      String(row?.jobFunction ?? '').trim() &&
      String(row?.jobResponsibilities ?? '').trim() &&
      String(row?.periodFrom ?? '').trim() &&
      (periodToOptional || String(row?.periodTo ?? '').trim())
    ) {
      hasCompletePrevious = true;
    }
  });

  if (requiresCurrent && !hasCompleteCurrent) {
    fields._form = 'Add at least one complete current work experience entry.';
  } else if (!hasCompleteCurrent && !hasCompletePrevious) {
    fields._form = 'Add at least one complete work experience entry.';
  }

  return fields;
}

function buildCharacterReferenceFieldErrors(form, applicationId) {
  const fields = {};
  if (!applicationId?.trim()) {
    fields._form = 'Application ID is required. Submit the Application tab first.';
    return fields;
  }
  CHARACTER_REFERENCE_REQUIRED_KEYS.forEach((key) => {
    if (isCharacterReferenceFieldMissing(form, key)) {
      fields[key] = REQUIRED_FIELD_MESSAGE;
    }
  });
  if (form.firstReferenceYearsKnown?.trim() && !Number.isFinite(Number(form.firstReferenceYearsKnown))) {
    fields.firstReferenceYearsKnown = 'Enter a valid number.';
  }
  if (form.secondReferenceYearsKnown?.trim() && !Number.isFinite(Number(form.secondReferenceYearsKnown))) {
    fields.secondReferenceYearsKnown = 'Enter a valid number.';
  }
  if (!isCharacterReferenceFieldMissing(form, 'firstReferenceContactNo')) {
    if (!isValidNationalPhoneNumber(form.firstReferenceContactNo, form.firstReferenceCountryCode)) {
      const { hint } = getNationalPhoneLimits(form.firstReferenceCountryCode);
      fields.firstReferenceContactNo = `Invalid contact number. ${hint}.`;
    }
  }
  if (!isCharacterReferenceFieldMissing(form, 'secondReferenceContactNo')) {
    if (!isValidNationalPhoneNumber(form.secondReferenceContactNo, form.secondReferenceCountryCode)) {
      const { hint } = getNationalPhoneLimits(form.secondReferenceCountryCode);
      fields.secondReferenceContactNo = `Invalid contact number. ${hint}.`;
    }
  }
  return fields;
}

function buildDeclarationFieldErrors(form, applicationId, pathway) {
  const fields = {};
  if (!applicationId?.trim()) {
    fields._form = 'Application ID is required. Submit the Application tab first.';
    return fields;
  }
  if (form.convictedOfAnyCriminalOffence === 'Yes') {
    fields.criminalConvictionDetails = req(form.criminalConvictionDetails);
  }
  if (form.bankruptcy === 'Yes') {
    fields.bankruptcyDetails = req(form.bankruptcyDetails);
  }
  if (form.subjectOfAnyInvestigation === 'Yes') {
    fields.investigationDetails = req(form.investigationDetails);
  }
  if (form.refusedEntryToAnyProfessionalBody === 'Yes') {
    fields.refusedEntryProfessionalBodyDetails = req(form.refusedEntryProfessionalBodyDetails);
  }
  if (form.memberOfISCAPreviously === 'Yes') {
    fields.previousISCAembershipDetails = req(form.previousISCAembershipDetails);
  }
  if (!isExperiencedMembershipApplicationPathway(pathway)) {
    if (form.cpeComplianceDeclaration === 'No') {
      fields.reasonForNonComplianceOther = req(form.reasonForNonComplianceOther);
    }
    if (!form.transitionalArrangements) {
      fields.transitionalArrangements = 'You must confirm to continue.';
    }
  } else if (!form.memberApplicationTandC) {
    fields.memberApplicationTandC = 'You must agree to continue.';
  }
  if (!form.pdpaPolicy) fields.pdpaPolicy = 'You must agree to continue.';
  if (!form.infoIsTrueAndComplete) fields.infoIsTrueAndComplete = 'You must confirm to continue.';
  if (!form.acknowledgeNonRefundableAdmissionFee) {
    fields.acknowledgeNonRefundableAdmissionFee = 'You must acknowledge to continue.';
  }
  return fields;
}

function buildResidentialFieldErrors(form, applicationId) {
  const fields = {};
  if (!applicationId?.trim()) {
    fields._form = 'Application ID is required. Submit the Application tab first.';
    return fields;
  }
  const value = form.residentialDeclaration?.trim();
  if (!value || !RESIDENTIAL_DECLARATION_OPTIONS.some((option) => option.value === value)) {
    fields.residentialDeclaration = REQUIRED_FIELD_MESSAGE;
  }
  return fields;
}

function buildDocumentFieldErrors(documentTypes, documentFiles, documentEntries) {
  const fields = {};
  if (!Array.isArray(documentTypes) || documentTypes.length === 0) {
    fields._form = 'Document types could not be loaded. Please refresh and try again.';
    return fields;
  }
  documentTypes
    .filter((type) => type.isMandatory)
    .filter((type) => !isDocumentTypeFulfilled(type, documentFiles, documentEntries))
    .forEach((type) => {
      fields[`document_${type.value}`] = REQUIRED_FIELD_MESSAGE;
    });
  return fields;
}

/**
 * Client-side field errors for * required fields (no API).
 * @returns {{ fields: Record<string, string>, message: string }}
 */
export function collectTabFieldErrors(tabId, ctx) {
  const {
    draft,
    pathway,
    applicationId = '',
    accountId = '',
    documentTypes = [],
    documentFiles = {},
  } = ctx;

  let fields = {};
  let message = '';

  switch (tabId) {
    case 'application':
      fields = buildApplicationFieldErrors(draft.application, accountId, applicationId, pathway);
      message = validateApplicationBeforeSubmit(draft.application, accountId, applicationId, pathway);
      break;
    case 'personal':
      fields = buildPersonalFieldErrors(draft.personal, applicationId);
      message = validatePersonalFormBeforeSubmit(draft.personal, applicationId);
      break;
    case 'work-experience':
      fields = buildWorkExperienceFieldErrors(draft.workExperience, applicationId, pathway);
      message = validateWorkExperienceBeforeSubmit(draft.workExperience, applicationId, pathway);
      break;
    case 'character-reference':
      fields = buildCharacterReferenceFieldErrors(draft.characterReference, applicationId);
      message = validateCharacterReferenceBeforeSubmit(draft.characterReference, applicationId);
      break;
    case 'declaration':
      fields = buildDeclarationFieldErrors(draft.declaration, applicationId, pathway);
      message = validateDeclarationBeforeSubmit(draft.declaration, applicationId, pathway);
      break;
    case 'document-upload':
      fields = buildDocumentFieldErrors(
        documentTypes,
        documentFiles,
        draft.documentUpload?.entries
      );
      message = validateDocumentUploadBeforeSubmit(
        documentTypes,
        documentFiles,
        draft.documentUpload?.entries
      );
      break;
    case 'residential-declaration':
      fields = buildResidentialFieldErrors(draft.residentialDeclaration, applicationId);
      message = validateResidentialDeclarationBeforeSubmit(
        draft.residentialDeclaration,
        applicationId
      );
      break;
    case 'qualification':
      message = isExperiencedMembershipApplicationPathway(pathway)
        ? 'Use the Submit button under each qualification section (Academic, Professional, Other Professional Bodies).'
        : 'Use the Submit button under each qualification section (Professional Qualification, ATO, Other Professional Bodies).';
      break;
    case 'billing':
      message = 'Use the Pay button on this tab to complete payment.';
      break;
    default:
      break;
  }

  if (!message && hasAnyFieldError(fields)) {
    message = 'Please complete the required fields marked with *.';
  }

  return { fields, message: message || '' };
}
