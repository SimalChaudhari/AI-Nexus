import axios from 'src/utils/axios';
import { flowiseService } from 'src/services/flowise.service';

export const chatbotService = {
  async sendMessage({ message, provider } = {}) {
    if ((provider || '').toLowerCase() === 'flowise') {
      const response = await flowiseService.predict(message);
      const reply =
        typeof response === 'string'
          ? response
          : response?.text || response?.answer || response?.response || JSON.stringify(response);

      return {
        reply,
        provider: 'flowise',
        timestamp: new Date().toISOString(),
      };
    }

    const response = await axios.post('/chatbot/message', {
      message,
      provider,
    });
    return response.data?.data || response.data;
  },
};

