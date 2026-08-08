import axios from 'src/utils/axios';

function transformIntlUser(row = {}) {
  return {
    id: row.id,
    email: row.email || '',
    username: row.username || '',
    salutation: row.salutation || '',
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    contactNumber: row.contactNumber || '',
    company: row.company || '',
    companyCode: row.companyCode || '',
    jobFunction: row.jobFunction || '',
    jobFunctionOther: row.jobFunctionOther || '',
    yearsOfExperience: row.yearsOfExperience || '',
    countryOfResidence: row.countryOfResidence || '',
    countryCode: row.countryCode || '',
    currency: row.currency || '',
    promoCode: row.promoCode || '',
    paymentStatus: row.paymentStatus || '',
    authProvider: row.authProvider || '',
    avatarUrl: row.avatarUrl || '',
    isVerified: Boolean(row.isVerified),
    status: row.status || '',
    createdAt: row.createdAt || null,
  };
}

export const intlUsersService = {
  async getUsers(params = {}) {
    const response = await axios.get('/intl-auth/users', {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        search: params.search || undefined,
        status: params.status && params.status !== 'all' ? params.status : undefined,
        paymentStatus:
          params.paymentStatus && params.paymentStatus !== 'all'
            ? params.paymentStatus
            : undefined,
      },
    });
    const payload = response.data || {};
    const rows = Array.isArray(payload.data) ? payload.data : [];
    return {
      data: rows.map(transformIntlUser),
      pagination: payload.pagination || {
        page: 1,
        limit: rows.length,
        total: rows.length,
        totalPages: 1,
      },
    };
  },

  async getUser(id) {
    const response = await axios.get(`/intl-auth/users/${id}`);
    return transformIntlUser(response.data?.user || {});
  },

  async deleteUser(id) {
    const response = await axios.delete(`/intl-auth/users/${id}`);
    return response.data;
  },

  async getUserPayments(userId) {
    const response = await axios.get(`/intl-payments/users/${userId}`);
    return {
      latest: response.data?.latest || null,
      payments: Array.isArray(response.data?.payments) ? response.data.payments : [],
    };
  },
};
