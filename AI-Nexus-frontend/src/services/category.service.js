import axios from 'src/utils/axios';
import { buildPaginationParams, mapPaginatedResponse } from 'src/utils/pagination-service';

// Transform backend category data to frontend format
const transformCategory = (category) => ({
  id: category._id || category.id,
  title: category.title || '',
  icon: category.icon || '',
  status: category.status || 'active',
  createdAt: category.createdAt || new Date(),
  updatedAt: category.updatedAt || new Date(),
});

export const categoryService = {
  async getAllCategories(params = {}) {
    try {
      const queryParams = buildPaginationParams(params);
      const response = await axios.get('/categories', { params: queryParams });
      return mapPaginatedResponse(response.data, transformCategory, params);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  async getCategoryById(id) {
    try {
      const response = await axios.get(`/categories/${id}`);
      const category = response.data?.data || response.data;
      return transformCategory(category);
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  },

  async createCategory(categoryData) {
    try {
      const response = await axios.post('/categories', categoryData);
      const category = response.data?.category || response.data?.data || response.data;
      return transformCategory(category);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  async updateCategory(id, categoryData) {
    try {
      const response = await axios.put(`/categories/update/${id}`, categoryData);
      const category = response.data?.category || response.data?.data || response.data;
      return transformCategory(category);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  async deleteCategory(id) {
    try {
      const response = await axios.delete(`/categories/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },
};
