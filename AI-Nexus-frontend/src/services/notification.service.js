import axios from 'src/utils/axios';

const transformNotification = (item) => ({
  id: item.id,
  type: item.type || 'announcement',
  title: item.title || '',
  body: item.body || '',
  link: item.link || '/announcements',
  referenceId: item.referenceId || null,
  category: item.type === 'announcement' ? 'Announcement' : 'General',
  isUnRead: item.isRead === false || item.isRead === 0,
  createdAt: item.createdAt,
});

export const notificationService = {
  async getNotifications(params = {}) {
    const response = await axios.get('/notifications', { params });
    const data = (response.data?.data || []).map(transformNotification);
    return {
      data,
      pagination: response.data?.pagination || null,
    };
  },

  async getUnreadCount() {
    const response = await axios.get('/notifications/unread-count');
    return Number(response.data?.count || 0);
  },

  async markAsRead(id) {
    const response = await axios.post(`/notifications/${id}/read`);
    return transformNotification(response.data?.data || response.data);
  },

  async markAllAsRead() {
    const response = await axios.post('/notifications/read-all');
    return response.data;
  },

  async getVapidPublicKey() {
    const response = await axios.get('/notifications/vapid-public-key');
    return response.data;
  },

  async subscribePush(subscription) {
    const response = await axios.post('/notifications/push/subscribe', { subscription });
    return response.data;
  },

  async unsubscribePush(endpoint) {
    const response = await axios.post('/notifications/push/unsubscribe', { endpoint });
    return response.data;
  },
};
