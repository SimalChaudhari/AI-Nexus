// ----------------------------------------------------------------------

export const YES_NO_OPTIONS = ['Yes', 'No'];

export const EMPTY_DECLARATION_FORM = {
  convictedOfAnyCriminalOffence: 'No',
  criminalConvictionDetails: '',
  bankruptcy: 'No',
  bankruptcyDetails: '',
  subjectOfAnyInvestigation: 'No',
  investigationDetails: '',
  refusedEntryToAnyProfessionalBody: 'No',
  refusedEntryProfessionalBodyDetails: '',
  memberOfISCAPreviously: 'No',
  previousISCAembershipDetails: '',
  cpeComplianceDeclaration: 'Yes',
  reasonForNonComplianceOther: '',
  pdpaPolicy: false,
  infoIsTrueAndComplete: false,
  acknowledgeNonRefundableAdmissionFee: false,
};

export function buildDeclarationApiPayload(form, applicationId) {
  const payload = {
    applicationId: String(applicationId || '').trim(),
    convictedOfAnyCriminalOffence: form.convictedOfAnyCriminalOffence || 'No',
    bankruptcy: form.bankruptcy || 'No',
    subjectOfAnyInvestigation: form.subjectOfAnyInvestigation || 'No',
    refusedEntryToAnyProfessionalBody: form.refusedEntryToAnyProfessionalBody || 'No',
    memberOfISCAPreviously: form.memberOfISCAPreviously || 'No',
    cpeComplianceDeclaration: form.cpeComplianceDeclaration || 'Yes',
    pdpaPolicy: Boolean(form.pdpaPolicy),
    infoIsTrueAndComplete: Boolean(form.infoIsTrueAndComplete),
    acknowledgeNonRefundableAdmissionFee: Boolean(form.acknowledgeNonRefundableAdmissionFee),
  };

  if (form.convictedOfAnyCriminalOffence === 'Yes' && form.criminalConvictionDetails?.trim()) {
    payload.criminalConvictionDetails = form.criminalConvictionDetails.trim();
  }
  if (form.bankruptcy === 'Yes' && form.bankruptcyDetails?.trim()) {
    payload.bankruptcyDetails = form.bankruptcyDetails.trim();
  }
  if (form.subjectOfAnyInvestigation === 'Yes' && form.investigationDetails?.trim()) {
    payload.investigationDetails = form.investigationDetails.trim();
  }
  if (
    form.refusedEntryToAnyProfessionalBody === 'Yes'
    && form.refusedEntryProfessionalBodyDetails?.trim()
  ) {
    payload.refusedEntryProfessionalBodyDetails = form.refusedEntryProfessionalBodyDetails.trim();
  }
  if (form.memberOfISCAPreviously === 'Yes' && form.previousISCAembershipDetails?.trim()) {
    payload.previousISCAembershipDetails = form.previousISCAembershipDetails.trim();
  }
  if (form.cpeComplianceDeclaration === 'No' && form.reasonForNonComplianceOther?.trim()) {
    payload.reasonForNonComplianceOther = form.reasonForNonComplianceOther.trim();
  }

  return payload;
}

export function validateDeclarationBeforeSubmit(form, applicationId) {
  if (!applicationId?.trim()) {
    return 'Application ID is required. Submit the Application tab first.';
  }

  if (form.convictedOfAnyCriminalOffence === 'Yes' && !form.criminalConvictionDetails?.trim()) {
    return 'Please provide criminal conviction details.';
  }
  if (form.bankruptcy === 'Yes' && !form.bankruptcyDetails?.trim()) {
    return 'Please provide bankruptcy details.';
  }
  if (form.subjectOfAnyInvestigation === 'Yes' && !form.investigationDetails?.trim()) {
    return 'Please provide investigation details.';
  }
  if (
    form.refusedEntryToAnyProfessionalBody === 'Yes'
    && !form.refusedEntryProfessionalBodyDetails?.trim()
  ) {
    return 'Please provide refused entry details.';
  }
  if (form.memberOfISCAPreviously === 'Yes' && !form.previousISCAembershipDetails?.trim()) {
    return 'Please provide previous ISCA membership details.';
  }
  if (form.cpeComplianceDeclaration === 'No' && !form.reasonForNonComplianceOther?.trim()) {
    return 'Please provide reason for non-compliance.';
  }

  if (!form.pdpaPolicy) {
    return 'You must agree to the PDPA policy.';
  }
  if (!form.infoIsTrueAndComplete) {
    return 'You must confirm the information is true and complete.';
  }
  if (!form.acknowledgeNonRefundableAdmissionFee) {
    return 'You must acknowledge the non-refundable admission fee.';
  }

  return '';
}
