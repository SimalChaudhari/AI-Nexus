import axios from 'src/utils/axios';

// Transform backend label data to frontend format
const transformLabel = (label) => ({
  id: label._id || label.id,
  title: label.title || '',
  name: label.title || label.name || '', // Support both for compatibility
  createdAt: label.createdAt || new Date(),
  updatedAt: label.updatedAt || new Date(),
});

export const labelService = {
  async getAllLabels() {
    try {
      const response = await axios.get('/labels');
      const labels = response.data?.data || response.data || [];
      return labels.map(transformLabel);
    } catch (error) {
      console.error('Error fetching labels:', error);
      throw error;
    }
  },

  async getLabelById(id) {
    try {
      const response = await axios.get(`/labels/${id}`);
      const label = response.data?.data || response.data;
      return transformLabel(label);
    } catch (error) {
      console.error('Error fetching label:', error);
      throw error;
    }
  },

  async createLabel(labelData) {
    try {
      const response = await axios.post('/labels', labelData);
      const label = response.data?.label || response.data?.data || response.data;
      return transformLabel(label);
    } catch (error) {
      console.error('Error creating label:', error);
      throw error;
    }
  },

  async updateLabel(id, labelData) {
    try {
      const response = await axios.put(`/labels/update/${id}`, labelData);
      const label = response.data?.label || response.data?.data || response.data;
      return transformLabel(label);
    } catch (error) {
      console.error('Error updating label:', error);
      throw error;
    }
  },

  async deleteLabel(id) {
    try {
      const response = await axios.delete(`/labels/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting label:', error);
      throw error;
    }
  },
};

