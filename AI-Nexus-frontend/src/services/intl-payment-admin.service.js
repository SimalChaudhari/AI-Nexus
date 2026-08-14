import axios from 'src/utils/axios';

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export const intlPaymentAdminService = {
  async getMembershipSettings() {
    const response = await axios.get('/intl-payments/membership-settings');
    return unwrap(response);
  },

  async getFxRates() {
    const response = await axios.get('/intl-payments/fx-rates');
    return unwrap(response);
  },

  async updateMembershipSettings(payload) {
    const response = await axios.put('/intl-payments/membership-settings', payload || {});
    return unwrap(response);
  },
};
