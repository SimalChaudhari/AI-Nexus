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

  async getCourseTree() {
    const response = await axios.get('/intl-pathway/course-tree');
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  async getCourseLessons() {
    const response = await axios.get('/intl-pathway/course-lessons');
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  async syncModulesFromCourses() {
    const response = await axios.post('/intl-pathway/modules/sync-from-courses');
    return response.data;
  },

  async reseedFromDesign() {
    const response = await axios.post('/intl-pathway/reseed-design');
    return response.data;
  },

  async getModuleById(id) {
    const response = await axios.get(`/intl-pathway/modules/${id}`);
    return unwrap(response);
  },

  async createModule(payload) {
    const response = await axios.post('/intl-pathway/modules', payload);
    return response.data;
  },

  async updateModule(id, payload) {
    const response = await axios.put(`/intl-pathway/modules/update/${id}`, payload);
    return response.data;
  },

  async deleteModule(id) {
    const response = await axios.delete(`/intl-pathway/modules/delete/${id}`);
    return response.data;
  },

  async getRoles() {
    const response = await axios.get('/intl-pathway/roles');
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  async getRoleById(id) {
    const response = await axios.get(`/intl-pathway/roles/${id}`);
    return unwrap(response);
  },

  async createRole(payload) {
    const response = await axios.post('/intl-pathway/roles', payload);
    return response.data;
  },

  async updateRole(id, payload) {
    const response = await axios.put(`/intl-pathway/roles/update/${id}`, payload);
    return response.data;
  },

  async deleteRole(id) {
    const response = await axios.delete(`/intl-pathway/roles/delete/${id}`);
    return response.data;
  },
};
