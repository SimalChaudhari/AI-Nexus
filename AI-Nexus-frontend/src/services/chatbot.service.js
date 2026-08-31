import axios from 'src/utils/axios';

export const chatbotService = {
  async sendMessage({ message } = {}) {
    const response = await axios.post('/chatbot/message', {
      message,
    });
    return response.data?.data || response.data;
  },
};
