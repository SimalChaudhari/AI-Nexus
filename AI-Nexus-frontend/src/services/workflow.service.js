import axios from 'src/utils/axios';
import { resolveAssetUrl } from 'src/utils/asset-url';

// Transform backend workflow data to frontend format
const transformWorkflow = (workflow) => ({
  id: workflow._id || workflow.id,
  title: workflow.title || '',
  description: workflow.description || '',
  image: resolveAssetUrl(workflow.image || ''),
  label: workflow.label || null,
  labelId: workflow.labelId || workflow.label?.id || null,
  flowData:
    typeof workflow.flowData === 'string'
      ? (() => {
          try {
            return JSON.parse(workflow.flowData);
          } catch {
            return null;
          }
        })()
      : workflow.flowData || null,
  tags: workflow.tags || [],
  tagIds: workflow.tags?.map(tag => tag.id) || [],
  createdAt: workflow.createdAt || new Date(),
  updatedAt: workflow.updatedAt || new Date(),
});

export const workflowService = {
  async getAllWorkflows() {
    try {
      const response = await axios.get('/workflows');
      const workflows = response.data?.data || response.data || [];
      return workflows.map(transformWorkflow);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      throw error;
    }
  },

  async getWorkflowById(id) {
    try {
      const response = await axios.get(`/workflows/${id}`);
      const workflow = response.data?.data || response.data;
      return transformWorkflow(workflow);
    } catch (error) {
      console.error('Error fetching workflow:', error);
      throw error;
    }
  },

  async createWorkflow(workflowData, imageFile = null) {
    try {
      const formData = new FormData();

      // Append all workflow data fields
      formData.append('title', workflowData.title || '');
      if (workflowData.description) {
        formData.append('description', workflowData.description);
      }
      if (workflowData.labelId) {
        formData.append('labelId', workflowData.labelId);
      }
      if (workflowData.flowData) {
        formData.append('flowData', JSON.stringify(workflowData.flowData));
      }
      if (workflowData.tagIds && workflowData.tagIds.length > 0) {
        workflowData.tagIds.forEach(tagId => {
          formData.append('tagIds[]', tagId);
        });
      }
      if (workflowData.tagTitles && workflowData.tagTitles.length > 0) {
        workflowData.tagTitles.forEach(tagTitle => {
          formData.append('tagTitles[]', tagTitle);
        });
      }

      // Append image file if provided
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await axios.post('/workflows', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const workflow = response.data?.workflow || response.data?.data || response.data;
      return transformWorkflow(workflow);
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  },

  async updateWorkflow(id, workflowData, imageFile = null) {
    try {
      const formData = new FormData();

      // Append all workflow data fields
      if (workflowData.title !== undefined) {
        formData.append('title', workflowData.title);
      }
      if (workflowData.description !== undefined) {
        formData.append('description', workflowData.description);
      }
      if (workflowData.labelId !== undefined) {
        formData.append('labelId', workflowData.labelId || '');
      }
      if (workflowData.flowData !== undefined) {
        formData.append('flowData', JSON.stringify(workflowData.flowData || null));
      }
      if (workflowData.tagIds !== undefined) {
        if (workflowData.tagIds && workflowData.tagIds.length > 0) {
          workflowData.tagIds.forEach(tagId => {
            formData.append('tagIds[]', tagId);
          });
        }
      }
      if (workflowData.tagTitles !== undefined) {
        if (workflowData.tagTitles && workflowData.tagTitles.length > 0) {
          workflowData.tagTitles.forEach(tagTitle => {
            formData.append('tagTitles[]', tagTitle);
          });
        }
      }

      // Append image file if provided
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await axios.put(`/workflows/update/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const workflow = response.data?.workflow || response.data?.data || response.data;
      return transformWorkflow(workflow);
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  },

  async deleteWorkflow(id) {
    try {
      const response = await axios.delete(`/workflows/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  },
};

