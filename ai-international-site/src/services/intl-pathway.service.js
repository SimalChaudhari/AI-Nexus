import axios from 'src/utils/axios';

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export const intlPathwayService = {
  async getPlannerCatalog() {
    const response = await axios.get('/intl-pathway/planner');
    return unwrap(response) || { modules: [], roles: [] };
  },

  async getModules() {
    const response = await axios.get('/intl-pathway/modules');
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  async getRoles() {
    const response = await axios.get('/intl-pathway/roles');
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },
};
