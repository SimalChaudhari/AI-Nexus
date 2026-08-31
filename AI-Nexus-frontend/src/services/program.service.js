import axios from 'src/utils/axios';
import { buildPaginationParams, mapPaginatedResponse } from 'src/utils/pagination-service';

const transformProgram = (program) => ({
  id: program._id || program.id,
  title: program.title || '',
  description: program.description ?? '',
  status: program.status || 'active',
  linkedCourses: Array.isArray(program.linkedCourses) ? program.linkedCourses : [],
  createdAt: program.createdAt || new Date(),
  updatedAt: program.updatedAt || new Date(),
});

export const programService = {
  async getAllPrograms(params = {}) {
    const queryParams = buildPaginationParams(params);
    const response = await axios.get('/programs', { params: queryParams });
    return mapPaginatedResponse(response.data, transformProgram, params);
  },

  async getProgramById(id) {
    const response = await axios.get(`/programs/${id}`);
    return transformProgram(response.data?.data || response.data);
  },

  async getProgramByCourseId(courseId) {
    const response = await axios.get(`/programs/by-course/${courseId}`);
    const data = response.data?.data;
    return data ? transformProgram(data) : null;
  },

  async createProgram(programData) {
    const response = await axios.post('/programs', programData);
    return transformProgram(response.data?.program || response.data);
  },

  async updateProgram(id, programData) {
    const response = await axios.put(`/programs/update/${id}`, programData);
    return transformProgram(response.data?.program || response.data);
  },

  async deleteProgram(id) {
    const response = await axios.delete(`/programs/delete/${id}`);
    return response.data;
  },
};
