import axios from 'src/utils/axios';

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
    phoneNumber: user.phoneNumber || user.mobile || '',
    company: user.company || '-',
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
    isVerified: user.isVerified || false,
    authProvider: user.authProvider || 'LOCAL',
    createdAt: user.createdAt || null,
    avatarUrl: null, // No images as per requirement
  };
};

export const userService = {
  async getAllUsers() {
    try {
      const response = await axios.get('/users');
      const users = response.data?.data || response.data || [];
      return users.map(transformUser);
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
      const response = await axios.post('/users', userData);
      const payload = response.data;
      const user = payload?.user || payload?.data || payload;
      return {
        user: transformUser(user),
        message: payload?.message,
        temporaryPasswordEmailSent: payload?.temporaryPasswordEmailSent,
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
      const response = await axios.put(`/users/update/${id}`, userData);
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
      const response = await axios.put('/users/profile', userData);
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
      const response = await axios.put('/admin/profile', userData);
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
};

