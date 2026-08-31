import axios from 'src/utils/axios';

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export const intlPathwayProgressService = {
  async listProgress() {
    const response = await axios.get('/intl-pathway/progress');
    return unwrap(response) || {};
  },

  async getModuleProgress(code) {
    const response = await axios.get(`/intl-pathway/modules/${encodeURIComponent(code)}/progress`);
    return unwrap(response);
  },

  async saveModuleProgress(code, payload) {
    const response = await axios.put(
      `/intl-pathway/modules/${encodeURIComponent(code)}/progress`,
      payload,
    );
    return unwrap(response);
  },

  async listCertificates() {
    const response = await axios.get('/intl-pathway/certificates/my');
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  async issueCertificate() {
    const response = await axios.post('/intl-pathway/certificates/issue');
    return unwrap(response);
  },

  async downloadCertificatePdf(id) {
    const response = await axios.get(`/intl-pathway/certificates/${encodeURIComponent(id)}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
