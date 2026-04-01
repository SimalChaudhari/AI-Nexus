import axios from 'src/utils/axios';

// Transform backend tag data to frontend format
const transformTag = (tag) => ({
  id: tag._id || tag.id,
  title: tag.title || '',
  createdAt: tag.createdAt || new Date(),
  updatedAt: tag.updatedAt || new Date(),
});

export const tagService = {
  async getAllTags() {
    try {
      const response = await axios.get('/tags');
      const tags = response.data?.data || response.data || [];
      return tags.map(transformTag);
    } catch (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }
  },

  async getTagById(id) {
    try {
      const response = await axios.get(`/tags/${id}`);
      const tag = response.data?.data || response.data;
      return transformTag(tag);
    } catch (error) {
      console.error('Error fetching tag:', error);
      throw error;
    }
  },

  async createTag(tagData) {
    try {
      const response = await axios.post('/tags', tagData);
      const tag = response.data?.tag || response.data?.data || response.data;
      return transformTag(tag);
    } catch (error) {
      console.error('Error creating tag:', error);
      throw error;
    }
  },

  async updateTag(id, tagData) {
    try {
      const response = await axios.put(`/tags/update/${id}`, tagData);
      const tag = response.data?.tag || response.data?.data || response.data;
      return transformTag(tag);
    } catch (error) {
      console.error('Error updating tag:', error);
      throw error;
    }
  },

  async deleteTag(id) {
    try {
      const response = await axios.delete(`/tags/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  },
};
