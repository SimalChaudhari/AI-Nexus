import axios from 'src/utils/axios';

// ----------------------------------------------------------------------

export async function getCorporateOverview(companyCode) {
  const response = await axios.get('/corporate/overview', {
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
      ...(limit ? { limit } : {}),
    },
  });
  return response.data;
}

export async function getCorporateCertificates(companyCode) {
  const response = await axios.get('/corporate/certificates', {
    params: companyCode ? { companyCode } : undefined,
  });
  return response.data?.data ?? response.data;
}
