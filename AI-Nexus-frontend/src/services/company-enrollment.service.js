import axios from 'src/utils/axios';

/**
 * @param {{ page?: number, limit?: number, search?: string }} [params]
 */
export async function listCompanyEnrollmentInvites(params = {}) {
  const response = await axios.get('/company-enrollment', {
    params: {
      page: params.page || 1,
      limit: params.limit || 10,
      search: params.search?.trim() || undefined,
    },
  });
  const payload = response.data;
  // Paginated API: { data, pagination }
  if (payload && Array.isArray(payload.data) && payload.pagination) {
    return payload;
  }
  // Legacy fallback: bare array / { data: [] }
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  return {
    data: rows,
    pagination: {
      page: 1,
      limit: rows.length || 10,
      totalItems: rows.length,
      totalPages: 1,
    },
  };
}

export async function getCompanyEnrollmentInvite(id) {
  const response = await axios.get(`/company-enrollment/${id}`);
  return response.data?.data || response.data;
}

export async function getMyCompanyEnrollmentInvite(companyCode) {
  const response = await axios.get('/company-enrollment/mine', {
    params: companyCode ? { companyCode } : undefined,
  });
  return response.data?.data || response.data;
}

export async function updateMyCompanyEnrollmentInvite(payload, companyCode) {
  const response = await axios.put('/company-enrollment/mine', payload || {}, {
    params: companyCode ? { companyCode } : undefined,
  });
  return response.data?.data || response.data;
}

export async function createCompanyEnrollmentInvite(payload) {
  const response = await axios.post('/company-enrollment', payload || {});
  return response.data?.data || response.data;
}

export async function updateCompanyEnrollmentInvite(id, payload) {
  const response = await axios.put(`/company-enrollment/${id}`, payload || {});
  return response.data?.data || response.data;
}

export async function deleteCompanyEnrollmentInvite(id) {
  const response = await axios.delete(`/company-enrollment/${id}`);
  return response.data?.data || response.data;
}

/**
 * Public validation for company code / QR enrollment.
 * @param {{ companyCode: string, viaQr?: boolean }} payload
 */
export async function validateCompanyEnrollment(payload) {
  const response = await axios.post('/company-enrollment/validate', {
    companyCode: String(payload?.companyCode || '').trim(),
    viaQr: payload?.viaQr === true,
  });
  return response.data;
}
