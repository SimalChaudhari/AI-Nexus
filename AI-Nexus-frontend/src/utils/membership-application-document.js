const ACCEPTED_FILE_TYPES =
  '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const MEMBERSHIP_DOCUMENT_ACCEPT = ACCEPTED_FILE_TYPES;

export const EMPTY_DOCUMENT_UPLOAD_FORM = {
  entries: {},
};

export function normalizeDocumentTypesResponse(payload) {
  const list = payload?.documentTypes ?? payload?.data ?? payload?.salesforce?.data;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      value: String(item?.value || item?.label || '').trim(),
      label: String(item?.label || item?.value || '').trim(),
      isMandatory: Boolean(item?.isMandatory),
    }))
    .filter((item) => item.value);
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file.'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export function validateDocumentUploadBeforeSubmit(documentTypes, documentFiles) {
  if (!Array.isArray(documentTypes) || documentTypes.length === 0) {
    return 'Document types could not be loaded. Please refresh and try again.';
  }

  const missingMandatory = documentTypes
    .filter((type) => type.isMandatory)
    .filter((type) => !documentFiles[type.value])
    .map((type) => type.label || type.value);

  if (missingMandatory.length) {
    return `Please upload required documents: ${missingMandatory.join(', ')}.`;
  }

  const hasAnyFile = documentTypes.some((type) => documentFiles[type.value]);
  if (!hasAnyFile) {
    return 'Please upload at least one document.';
  }

  return null;
}

export function buildDocumentUploadApiPayload({
  applicationId,
  documentType,
  file,
  otherDetails,
  fileContent,
}) {
  return {
    applicationId,
    documentType,
    fileName: file.name,
    fileContent,
    fileSize: file.size,
    otherDetails: otherDetails?.trim() || '',
  };
}

export function getDocumentsToUpload(documentTypes, documentFiles) {
  if (!Array.isArray(documentTypes)) return [];
  return documentTypes.filter((type) => documentFiles[type.value]);
}
