import axios from 'src/utils/axios';

// ----------------------------------------------------------------------

export async function getCorporateOverview(companyCode) {
  const response = await axios.get('/corporate/overview', {
    params: companyCode ? { companyCode } : undefined,
  });
  return response.data?.data ?? response.data;
}

export async function getCorporateLearner(userId, companyCode) {
  const response = await axios.get(`/corporate/learners/${encodeURIComponent(userId)}`, {
    params: companyCode ? { companyCode } : undefined,
  });
  return response.data?.data ?? response.data;
}

export async function getCorporateLearners({ companyCode, q, status, page, limit } = {}) {
  const response = await axios.get('/corporate/learners', {
    params: {
      ...(companyCode ? { companyCode } : {}),
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      ...(page ? { page } : {}),
      ...(limit != null ? { limit } : {}),
    },
  });
  return response.data;
}

export async function exportCorporateLearnersCsv({ companyCode, q, status } = {}) {
  try {
    const response = await axios.get('/corporate/learners/export', {
      params: {
        ...(companyCode ? { companyCode } : {}),
        ...(q ? { q } : {}),
        ...(status ? { status } : {}),
      },
      responseType: 'blob',
      skipApiLoading: true,
      deduplicate: false,
    });

    const raw = response.data;
    const contentType = String(response.headers?.['content-type'] || raw?.type || '');
    if (contentType.includes('application/json')) {
      const text = await raw.text();
      let message = 'CSV export failed';
      try {
        const parsed = JSON.parse(text);
        message = parsed?.message || parsed?.error || message;
      } catch {
        // keep default
      }
      throw new Error(message);
    }

    const disposition = String(response.headers?.['content-disposition'] || '');
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = match?.[1] || 'corporate-learner-progress.csv';
    const blob =
      raw?.type && String(raw.type).includes('csv')
        ? raw
        : new Blob([raw], { type: 'text/csv;charset=utf-8' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (err) {
    // Axios may pack API errors as blob when responseType=blob.
    const data = err?.response?.data;
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed?.message || parsed?.error || 'CSV export failed');
      } catch (inner) {
        if (inner instanceof Error && inner.message !== 'CSV export failed') throw inner;
      }
    }
    throw err instanceof Error ? err : new Error(err?.message || 'CSV export failed');
  }
}

export async function nudgeCorporateLearner(userId, companyCode) {
  const response = await axios.post(
    `/corporate/learners/${encodeURIComponent(userId)}/nudge`,
    null,
    {
      params: companyCode ? { companyCode } : undefined,
    },
  );
  return response.data;
}

export async function previewCorporateNudgeCampaign(companyCode) {
  const response = await axios.get('/corporate/nudge-campaigns/preview', {
    params: companyCode ? { companyCode } : undefined,
  });
  return response.data?.data ?? response.data;
}

export async function createCorporateNudgeCampaign(companyCode) {
  const response = await axios.post('/corporate/nudge-campaigns', null, {
    params: companyCode ? { companyCode } : undefined,
  });
  return response.data;
}

export async function getCorporateNudgeCampaigns({ companyCode, page, limit } = {}) {
  const response = await axios.get('/corporate/nudge-campaigns', {
    params: {
      ...(companyCode ? { companyCode } : {}),
      ...(page ? { page } : {}),
      ...(limit != null ? { limit } : {}),
    },
  });
  return response.data;
}

export async function getCorporateNudgeEmailLogs({
  companyCode,
  campaignId,
  q,
  status,
  source,
  page,
  limit,
} = {}) {
  const response = await axios.get('/corporate/nudge-email-logs', {
    params: {
      ...(companyCode ? { companyCode } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(q ? { q } : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(source && source !== 'all' ? { source } : {}),
      ...(page ? { page } : {}),
      ...(limit != null ? { limit } : {}),
    },
  });
  return response.data;
}

export async function getCorporateCertificates({
  companyCode,
  page,
  limit,
  availableOnly,
} = {}) {
  const response = await axios.get('/corporate/certificates', {
    params: {
      ...(companyCode ? { companyCode } : {}),
      ...(page ? { page } : {}),
      ...(limit != null ? { limit } : {}),
      ...(availableOnly ? { availableOnly: true } : {}),
    },
  });
  return response.data;
}

export async function downloadCorporateCertificatePdf(certificateId, companyCode) {
  const response = await axios.get(`/corporate/certificates/${certificateId}/pdf`, {
    params: companyCode ? { companyCode } : undefined,
    responseType: 'blob',
    skipApiLoading: true,
    deduplicate: false,
  });

  const data = response.data;
  const contentType = String(response.headers?.['content-type'] || data?.type || '');

  if (contentType.includes('application/json')) {
    const text = await data.text();
    let message = 'Certificate download failed';
    try {
      const parsed = JSON.parse(text);
      message = parsed?.message || parsed?.error || message;
    } catch {
      // keep default
    }
    throw new Error(message);
  }

  return data;
}

export async function downloadCorporateCertificateFile(certificateId, { companyCode, fileName } = {}) {
  const blob = await downloadCorporateCertificatePdf(certificateId, companyCode);
  const pdfBlob =
    blob?.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  const name = fileName || `Certificate-${certificateId}.pdf`;

  // Defer DOM work so the click paints first and the table does not hitch.
  await new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function uploadCorporateBulkEnrolmentZip(files, companyCode) {
  const list = Array.isArray(files) ? files : files ? [files] : [];
  const formData = new FormData();
  list.forEach((file) => formData.append('files', file));

  const response = await axios.post('/corporate/bulk-enrolment/upload', formData, {
    params: companyCode ? { companyCode } : undefined,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return response.data?.data ?? response.data;
}

export async function getCorporateBulkEnrolmentUploads({ companyCode, page, limit } = {}) {
  const response = await axios.get('/corporate/bulk-enrolment/uploads', {
    params: {
      ...(companyCode ? { companyCode } : {}),
      ...(page ? { page } : {}),
      ...(limit != null ? { limit } : {}),
    },
  });
  return response.data;
}

export async function getMyCorporateBulkEnrolmentUploads({ companyCode, page, limit } = {}) {
  const response = await axios.get('/corporate/bulk-enrolment/my-uploads', {
    params: {
      ...(companyCode ? { companyCode } : {}),
      ...(page ? { page } : {}),
      ...(limit != null ? { limit } : {}),
    },
  });
  return response.data;
}

export async function deleteCorporateBulkEnrolmentZip(uploadId) {
  const response = await axios.delete(
    `/corporate/bulk-enrolment/uploads/${encodeURIComponent(uploadId)}`,
  );
  return response.data;
}

export async function downloadCorporateBulkEnrolmentZip(uploadId, { fileName } = {}) {
  const response = await axios.get(
    `/corporate/bulk-enrolment/uploads/${encodeURIComponent(uploadId)}/download`,
    {
      responseType: 'blob',
      skipApiLoading: true,
      deduplicate: false,
    },
  );

  const raw = response.data;
  const contentType = String(response.headers?.['content-type'] || raw?.type || '');
  if (contentType.includes('application/json')) {
    const text = await raw.text();
    let message = 'ZIP download failed';
    try {
      const parsed = JSON.parse(text);
      message = parsed?.message || parsed?.error || message;
    } catch {
      // keep default
    }
    throw new Error(message);
  }

  const disposition = String(response.headers?.['content-disposition'] || '');
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const name = fileName || match?.[1] || 'bulk-enrolment.zip';
  const blob =
    raw?.type && String(raw.type).includes('zip')
      ? raw
      : new Blob([raw], { type: 'application/zip' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
