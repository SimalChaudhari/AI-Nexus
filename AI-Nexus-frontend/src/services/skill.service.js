import axios from 'src/utils/axios';
import { buildPaginationParams, mapPaginatedResponse } from 'src/utils/pagination-service';

const transformSkill = (skill) => ({
  id: skill._id || skill.id,
  name: skill.name || '',
  title: skill.title || '',
  description: skill.description || '',
  license: skill.license || '',
  sourceUrl: skill.sourceUrl || '',
  content: skill.content || '',
  extraFields: Array.isArray(skill.extraFields) ? skill.extraFields : [],
  sortOrder: skill.sortOrder ?? 0,
  isActive: skill.isActive !== false,
  createdAt: skill.createdAt || new Date(),
  updatedAt: skill.updatedAt || new Date(),
});

export const skillService = {
  async getAllSkills(params = {}) {
    const { includeInactive, ...rest } = params;
    const queryParams = buildPaginationParams(rest);
    const path = includeInactive ? '/skills/admin' : '/skills';
    const response = await axios.get(path, { params: queryParams });
    return mapPaginatedResponse(response.data, transformSkill, rest);
  },

  async getPublicSkills() {
    const response = await axios.get('/skills');
    const items = response.data?.data || response.data || [];
    return items.map(transformSkill);
  },

  async getSkillById(id, params = {}) {
    const path = params.includeInactive ? `/skills/admin/${id}` : `/skills/${id}`;
    const response = await axios.get(path);
    const skill = response.data?.data || response.data;
    return transformSkill(skill);
  },

  async createSkill(skillData) {
    const response = await axios.post('/skills', skillData);
    const skill = response.data?.skill || response.data?.data || response.data;
    return transformSkill(skill);
  },

  async updateSkill(id, skillData) {
    const response = await axios.put(`/skills/update/${id}`, skillData);
    const skill = response.data?.skill || response.data?.data || response.data;
    return transformSkill(skill);
  },

  async deleteSkill(id) {
    const response = await axios.delete(`/skills/delete/${id}`);
    return response.data;
  },
};
