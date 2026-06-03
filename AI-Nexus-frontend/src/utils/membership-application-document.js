const ACCEPTED_FILE_TYPES =
  '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const MEMBERSHIP_DOCUMENT_ACCEPT = ACCEPTED_FILE_TYPES;

export const EMPTY_DOCUMENT_UPLOAD_FORM = {
  entries: {},
};

function parseUploadedFlag(item) {
  if (item?.isUploaded === true || item?.uploaded === true || item?.alreadyUploaded === true) {
    return true;
  }

  const status = String(item?.status || item?.uploadStatus || '').toLowerCase();
  if (status.includes('upload') && !status.includes('not')) {
    return true;
  }

  const uploadedFileName = String(item?.fileName || item?.documentFileName || item?.uploadedFileName || '').trim();
  return Boolean(uploadedFileName);
}

export function normalizeDocumentTypesResponse(payload) {
  const list = payload?.documentTypes ?? payload?.data ?? payload?.salesforce?.data;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const value = String(item?.value || item?.label || '').trim();
      const label = String(item?.label || item?.value || '').trim();
      const isUploaded = parseUploadedFlag(item);
      const uploadedFileName = String(
        item?.fileName || item?.documentFileName || item?.uploadedFileName || ''
      ).trim();

      return {
        value,
        label,
        isMandatory: Boolean(item?.isMandatory),
        isUploaded,
        uploadedFileName,
      };
    })
    .filter((item) => item.value);
}

export function isDocumentTypeFulfilled(type, documentFiles, documentEntries = {}) {
  if (documentFiles?.[type.value]) return true;
  if (type?.isUploaded) return true;

  const entry = documentEntries?.[type.value];
  return Boolean(entry?.uploadedToSalesforce);
}

export function isDuplicateDocumentUploadError(error) {
  const message = String(
    error?.response?.data?.message || error?.response?.data?.error || error?.message || ''
  ).toLowerCase();

  if (!message) return false;

  return (
    message.includes('duplicate')
    || message.includes('already been uploaded')
    || message.includes('already uploaded')
  );
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

export function validateDocumentUploadBeforeSubmit(documentTypes, documentFiles, documentEntries = {}) {
  if (!Array.isArray(documentTypes) || documentTypes.length === 0) {
    return 'Document types could not be loaded. Please refresh and try again.';
  }

  const missingMandatory = documentTypes
    .filter((type) => type.isMandatory)
    .filter((type) => !isDocumentTypeFulfilled(type, documentFiles, documentEntries))
    .map((type) => type.label || type.value);

  if (missingMandatory.length) {
    return `Please upload required documents: ${missingMandatory.join(', ')}.`;
  }

  const hasAnyFulfillment = documentTypes.some((type) =>
    isDocumentTypeFulfilled(type, documentFiles, documentEntries)
  );
  if (!hasAnyFulfillment) {
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

export function getDocumentsToUpload(documentTypes, documentFiles, documentEntries = {}) {
  if (!Array.isArray(documentTypes)) return [];
  return documentTypes.filter((type) => {
    if (!documentFiles?.[type.value]) return false;
    if (type?.isUploaded) return false;
    if (documentEntries?.[type.value]?.uploadedToSalesforce) return false;
    return true;
  });
}

export function buildUploadedDocumentEntry(fileName, existingEntry = {}) {
  const name = String(fileName || '').trim() || 'Uploaded to ISCA eServices';
  return {
    ...existingEntry,
    uploadedToSalesforce: true,
    uploadedFileName: name,
    fileName: name,
  };
}

export function syncUploadedDocumentTypesToEntries(documentTypes, entries = {}) {
  const nextEntries = { ...entries };
  let changed = false;

  documentTypes.forEach((type) => {
    if (!type?.isUploaded) return;
    const existing = nextEntries[type.value] || {};
    if (existing.uploadedToSalesforce) return;

    nextEntries[type.value] = buildUploadedDocumentEntry(
      type.uploadedFileName || existing.uploadedFileName || existing.fileName,
      existing
    );
    changed = true;
  });

  return changed ? nextEntries : entries;
}
