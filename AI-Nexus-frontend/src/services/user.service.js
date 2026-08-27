import axios from 'src/utils/axios';
import { buildPaginationParams, mapPaginatedResponse } from 'src/utils/pagination-service';
import { resolveAssetUrl } from 'src/utils/asset-url';

const isFileLike = (value) => typeof File !== 'undefined' && value instanceof File;

const toUserPayload = (userData = {}) => {
  const hasAvatarFile = isFileLike(userData.avatar);

  if (!hasAvatarFile) {
    const { avatar, ...rest } = userData;
    return rest;
  }

  const formData = new FormData();
  Object.entries(userData).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'avatar' && isFileLike(value)) {
      formData.append('avatar', value);
      return;
    }
    formData.append(key, value);
  });
  return formData;
};

const payloadConfig = (payload) =>
  payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;

// Transform backend user data to frontend format
const transformUser = (user) => {
  // Combine firstname and lastname to create name
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.name || '';

  // Capitalize status (backend returns lowercase "active", frontend expects "Active")
  const capitalizeStatus = (status) => {
    if (!status) return 'Active';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return {
    id: user._id || user.id,
    name: fullName,
    email: user.email || '',
    contactNumber: user.contactNumber || user.phoneNumber || user.mobile || '',
    company: user.companyName || user.company || '-',
    companyCode: user.companyCode || '',
    role: user.role || 'User',
    status: capitalizeStatus(user.status) || 'Active',
    address: user.address || '',
    city: user.city || '',
    state: user.state || '',
    country: user.country || '',
    zipCode: user.zipCode || user.pincode || '',
    username: user.username || '',
    firstname: user.firstname || '',
    lastname: user.lastname || '',
    persona: user.persona || '',
    aiExperienceLevel: user.aiExperienceLevel || '',
    aiLearningGoals: Array.isArray(user.aiLearningGoals) ? user.aiLearningGoals : [],
    aiUseAreas: Array.isArray(user.aiUseAreas) ? user.aiUseAreas : [],
    financeRole: user.financeRole || '',
    avatarUrl: resolveAssetUrl(user.avatarUrl || user.photoURL || ''),
    isVerified: user.isVerified || false,
    authProvider: user.authProvider || 'LOCAL',
    createdAt: user.createdAt || null,
    isSCAQCandidate: user.isSCAQCandidate ?? null,
    isAssociateMember: user.isAssociateMember ?? null,
    salesforceAccountId: user.salesforceAccountId || '',
    salesforceAccountType: user.salesforceAccountType || '',
    salesforceMemberClass: user.salesforceMemberClass || '',
    salesforceUsername: user.salesforceUsername || '',
    salesforceSyncedAt: user.salesforceSyncedAt || null,
    salesforceUserInfoRaw:
      user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
        ? user.salesforceUserInfoRaw
        : null,
    feeWaiverJobVerified: user.feeWaiverJobVerified ?? null,
    eligibilitySnapshot: user.eligibilitySnapshot || null,
  };
};

export const userService = {
  async getAllUsers(params = {}) {
    try {
      const queryParams = buildPaginationParams(params);
      const response = await axios.get('/users', { params: queryParams });
      return mapPaginatedResponse(response.data, transformUser, params);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Handle connection errors more gracefully
      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the backend server is running.');
      }
      // Handle network errors
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and ensure the server is running.');
      }
      throw error;
    }
  },

  async getUserById(id) {
    try {
      const response = await axios.get(`/users/${id}`);
      const user = response.data?.data || response.data;
      return transformUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the backend server is running.');
      }
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and ensure the server is running.');
      }
      throw error;
    }
  },

  async createUser(userData) {
    try {
      const requestPayload = toUserPayload(userData);
      const response = await axios.post('/users', requestPayload, payloadConfig(requestPayload));
      const responsePayload = response.data;
      const user = responsePayload?.user || responsePayload?.data || responsePayload;
      return {
        user: transformUser(user),
        message: responsePayload?.message,
        temporaryPasswordEmailSent: responsePayload?.temporaryPasswordEmailSent,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the backend server is running.');
      }
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and ensure the server is running.');
      }
      throw error;
    }
  },

  async updateUser(id, userData) {
    try {
      const payload = toUserPayload(userData);
      const response = await axios.put(`/users/update/${id}`, payload, payloadConfig(payload));
      const user = response.data?.user || response.data?.data || response.data;
      return transformUser(user);
    } catch (error) {
      console.error('Error updating user:', error);
      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the backend server is running.');
      }
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and ensure the server is running.');
      }
      throw error;
    }
  },

  async updateUserStatus(id, status) {
    try {
      // Status is already in backend format (Active, Inactive, Pending, Banned)
      const response = await axios.patch(`/users/status/${id}`, { status });
      const user = response.data?.data || response.data;
      return transformUser(user);
    } catch (error) {
      console.error('Error updating user status:', error);
      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the backend server is running.');
      }
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and ensure the server is running.');
      }
      throw error;
    }
  },

  async verifyFeeWaiverJobRole(id) {
    try {
      const response = await axios.put(`/users/fee-waiver-job-verify/${id}`);
      const user = response.data?.user || response.data?.data || response.data;
      return {
        user: transformUser(user),
        message: response.data?.message,
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Could not verify fee-waiver job role.';
      throw new Error(errorMessage);
    }
  },

  async rejectFeeWaiverJobRole(id, reason = '') {
    try {
      const response = await axios.put(`/users/fee-waiver-job-reject/${id}`, { reason });
      const user = response.data?.user || response.data?.data || response.data;
      return {
        user: transformUser(user),
        message: response.data?.message,
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Could not reject fee-waiver job role.';
      throw new Error(errorMessage);
    }
  },

  async resendFeeWaiverHrEmail(id, hrEmail) {
    try {
      const response = await axios.put(`/users/fee-waiver-resend-hr/${id}`, { hrEmail });
      return {
        message: response.data?.message,
        hrEmail: response.data?.hrEmail,
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Could not send HR verification email.';
      throw new Error(errorMessage);
    }
  },

  async deleteUser(id) {
    try {
      const response = await axios.delete(`/users/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        throw new Error('You do not have permission to access this resource. Admin role required.');
      }
      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the backend server is running.');
      }
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and ensure the server is running.');
      }
      throw error;
    }
  },

  async exportUsersCsv(params = {}) {
    try {
      const queryParams = buildPaginationParams({
        search: params.search,
        status: params.status,
        progressFilter: params.progressFilter,
        fields: params.fields,
        role: params.role,
      });
      const response = await axios.get('/users/export', {
        params: queryParams,
        responseType: 'blob',
        skipApiLoading: true,
        deduplicate: false,
      });

      const raw = response.data;
      const contentType = String(response.headers?.['content-type'] || raw?.type || '');
      if (contentType.includes('application/json')) {
        const text = await raw.text();
        let message = 'CSV export failed';
        try {
          const parsed = JSON.parse(text);
          message = parsed?.message || parsed?.error || message;
        } catch {
          // keep default
        }
        throw new Error(message);
      }

      const disposition = String(response.headers?.['content-disposition'] || '');
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const fileName = match?.[1] || 'admin-users-export.csv';
      const blob =
        raw?.type && String(raw.type).includes('csv')
          ? raw
          : new Blob([raw], { type: 'text/csv;charset=utf-8;' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to export users CSV';
      throw new Error(errorMessage);
    }
  },

  // Profile methods for User role
  async getUserProfile() {
    try {
      const response = await axios.get('/users/profile');
      const user = response.data?.data || response.data;
      return transformUser(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the backend server is running.');
      }
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and ensure the server is running.');
      }
      throw error;
    }
  },

  async updateUserProfile(userData) {
    try {
      const payload = toUserPayload(userData);
      const response = await axios.put('/users/profile', payload, payloadConfig(payload));
      const user = response.data?.user || response.data?.data || response.data;
      return transformUser(user);
    } catch (error) {
      console.error('Error updating user profile:', error);
      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the backend server is running.');
      }
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and ensure the server is running.');
      }
      throw error;
    }
  },

  // Profile methods for Admin role
  async getAdminProfile() {
    try {
      // Backend will reject if user is not Admin (403 Forbidden)
      const response = await axios.get('/admin/profile');
      const user = response.data?.data || response.data;
      return transformUser(user);
    } catch (error) {
      console.error('Error fetching admin profile:', error);

      // Handle 403 Forbidden - user doesn't have Admin role
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        throw new Error('You do not have permission to access this resource. Admin role required.');
      }

      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the backend server is running.');
      }
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and ensure the server is running.');
      }
      throw error;
    }
  },

  async updateAdminProfile(userData) {
    try {
      // Backend will reject if user is not Admin (403 Forbidden)
      const payload = toUserPayload(userData);
      const response = await axios.put('/admin/profile', payload, payloadConfig(payload));
      const user = response.data?.user || response.data?.data || response.data;
      return transformUser(user);
    } catch (error) {
      console.error('Error updating admin profile:', error);

      // Handle 403 Forbidden - user doesn't have Admin role
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        throw new Error('You do not have permission to access this resource. Admin role required.');
      }

      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the backend server is running.');
      }
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and ensure the server is running.');
      }
      throw error;
    }
  },

  async previewBulkEnrolment({ file, companyCode, companyName }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyCode', companyCode || '');
    formData.append('companyName', companyName || '');
    const response = await axios.post('/admin/enrolment/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    });
    return response.data?.data || response.data;
  },

  async applyBulkEnrolment({ companyCode, companyName, rows }) {
    const response = await axios.post(
      '/admin/enrolment/apply',
      { companyCode, companyName, rows },
      { timeout: 180000 },
    );
    return response.data?.data || response.data;
  },
};

