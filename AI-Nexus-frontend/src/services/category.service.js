import axios from 'src/utils/axios';
import { resolveAssetUrl } from 'src/utils/asset-url';
import { buildPaginationParams, mapPaginatedResponse } from 'src/utils/pagination-service';

// Transform backend category data to frontend format
const transformCategory = (category) => ({
  id: category._id || category.id,
  title: category.title || '',
  slug: category.slug || '',
  description: category.description ?? '',
  image: resolveAssetUrl(category.image ?? ''),
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

  async createCategory(categoryData, imageFile = null) {
    try {
      const formData = new FormData();
      if (categoryData.title !== undefined) formData.append('title', categoryData.title);
      if (categoryData.slug !== undefined) formData.append('slug', categoryData.slug);
      if (categoryData.description !== undefined) formData.append('description', categoryData.description);
      if (categoryData.icon !== undefined) formData.append('icon', categoryData.icon);
      if (categoryData.status !== undefined) formData.append('status', categoryData.status);
      if (imageFile instanceof File) {
        formData.append('image', imageFile);
      } else if (categoryData.image !== undefined) {
        formData.append('image', categoryData.image);
      }
      const response = await axios.post('/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const category = response.data?.category || response.data?.data || response.data;
      return transformCategory(category);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  async updateCategory(id, categoryData, imageFile = null) {
    try {
      const formData = new FormData();
      if (categoryData.title !== undefined) formData.append('title', categoryData.title);
      if (categoryData.slug !== undefined) formData.append('slug', categoryData.slug);
      if (categoryData.description !== undefined) formData.append('description', categoryData.description);
      if (categoryData.icon !== undefined) formData.append('icon', categoryData.icon);
      if (categoryData.status !== undefined) formData.append('status', categoryData.status);
      if (categoryData.image === '') formData.append('image', '');
      if (imageFile instanceof File) {
        formData.append('image', imageFile);
      }
      const response = await axios.put(`/categories/update/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
