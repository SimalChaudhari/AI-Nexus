import { validateApplicationBeforeSubmit } from 'src/utils/membership-application-create';
import {
  getPersonalRequiredFieldKeys,
  isPersonalFieldMissing,
  validatePersonalFormBeforeSubmit,
} from 'src/utils/membership-application-personal';
import {
  isWorkExperienceRowComplete,
  isWorkExperienceRowStarted,
  validateWorkExperienceBeforeSubmit,
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

function buildApplicationFieldErrors(application, accountId, applicationId) {
  const fields = {};
  if (!applicationId?.trim()) {
    if (!accountId?.trim()) {
      fields._form = 'Salesforce account is not linked. Please sign in with Eservices again.';
    } else if (!application.accountingQualification?.trim()) {
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

function buildWorkExperienceFieldErrors(workExperience, applicationId) {
  const fields = {};
  if (!applicationId?.trim()) {
    fields._form = 'Application ID is required. Submit the Application tab first.';
    return fields;
  }
  fields.currentEmploymentStatus = req(workExperience.currentEmploymentStatus);
  const experiences = Array.isArray(workExperience?.experiences) ? workExperience.experiences : [];
  let hasCompleteEntry = false;
  experiences.forEach((row, index) => {
    const mustValidate = index === 0 || isWorkExperienceRowStarted(row);
    if (!mustValidate) {
      return;
    }
    const orgName = String(row?.organisationName ?? '').trim();
    const industry = String(row?.industry ?? '').trim();
    const jobPos = String(row?.jobPosition ?? '').trim();
    const jobLevel = String(row?.jobLevel ?? '').trim();
    const jobFunction = String(row?.jobFunction ?? '').trim();
    if (!orgName) {
      fields[`experience_${index}_organisationName`] = REQUIRED_FIELD_MESSAGE;
    }
    if (!industry) {
      fields[`experience_${index}_industry`] = REQUIRED_FIELD_MESSAGE;
    }
    if (!jobPos) {
      fields[`experience_${index}_jobPosition`] = REQUIRED_FIELD_MESSAGE;
    }
    if (!jobLevel) {
      fields[`experience_${index}_jobLevel`] = REQUIRED_FIELD_MESSAGE;
    }
    if (!jobFunction) {
      fields[`experience_${index}_jobFunction`] = REQUIRED_FIELD_MESSAGE;
    }
    if (!String(row?.jobResponsibilities ?? '').trim()) {
      fields[`experience_${index}_jobResponsibilities`] = REQUIRED_FIELD_MESSAGE;
    }
    if (!String(row?.periodFrom ?? '').trim()) {
      fields[`experience_${index}_periodFrom`] = REQUIRED_FIELD_MESSAGE;
    }
    if (!row?.isCurrentEmployment && !String(row?.periodTo ?? '').trim()) {
      fields[`experience_${index}_periodTo`] = REQUIRED_FIELD_MESSAGE;
    }
    if (isWorkExperienceRowComplete(row)) {
      hasCompleteEntry = true;
    }
  });
  if (!hasCompleteEntry && experiences.length) {
    fields._form = 'Add at least one complete work experience entry with all required fields.';
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

function buildDeclarationFieldErrors(form, applicationId) {
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
  if (form.cpeComplianceDeclaration === 'No') {
    fields.reasonForNonComplianceOther = req(form.reasonForNonComplianceOther);
  }
  if (!form.pdpaPolicy) fields.pdpaPolicy = 'You must agree to continue.';
  if (!form.infoIsTrueAndComplete) fields.infoIsTrueAndComplete = 'You must confirm to continue.';
  if (!form.acknowledgeNonRefundableAdmissionFee) {
    fields.acknowledgeNonRefundableAdmissionFee = 'You must acknowledge to continue.';
  }
  if (!form.transitionalArrangements) {
    fields.transitionalArrangements = 'You must confirm to continue.';
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
    applicationId = '',
    accountId = '',
    documentTypes = [],
    documentFiles = {},
  } = ctx;

  let fields = {};
  let message = '';

  switch (tabId) {
    case 'application':
      fields = buildApplicationFieldErrors(draft.application, accountId, applicationId);
      message = validateApplicationBeforeSubmit(draft.application, accountId, applicationId);
      break;
    case 'personal':
      fields = buildPersonalFieldErrors(draft.personal, applicationId);
      message = validatePersonalFormBeforeSubmit(draft.personal, applicationId);
      break;
    case 'work-experience':
      fields = buildWorkExperienceFieldErrors(draft.workExperience, applicationId);
      message = validateWorkExperienceBeforeSubmit(draft.workExperience, applicationId);
      break;
    case 'character-reference':
      fields = buildCharacterReferenceFieldErrors(draft.characterReference, applicationId);
      message = validateCharacterReferenceBeforeSubmit(draft.characterReference, applicationId);
      break;
    case 'declaration':
      fields = buildDeclarationFieldErrors(draft.declaration, applicationId);
      message = validateDeclarationBeforeSubmit(draft.declaration, applicationId);
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
      message =
        'Use the Submit button under each qualification section (Academic, Professional, Other Professional Bodies).';
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
