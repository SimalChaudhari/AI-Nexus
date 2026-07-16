import { CONFIG } from 'src/config-global';
import { resolveFlowiseApiBaseUrl } from 'src/utils/flowise-public-url';

function resolveFlowiseHost() {
  return resolveFlowiseApiBaseUrl() || '';
}

export const flowiseService = {
  async predict(question, { chatflowId } = {}) {
    const host = resolveFlowiseHost();
    const flowId = chatflowId || CONFIG.flowise.chatflowId;

    if (!host || !flowId) {
      throw new Error('Flowise host/chatflow is not configured');
    }

    const response = await fetch(`${host.replace(/\/$/, '')}/api/v1/prediction/${flowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Flowise API failed (${response.status})`);
    }

    return response.json();
  },
};

