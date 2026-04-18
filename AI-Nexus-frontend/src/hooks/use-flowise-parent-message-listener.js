import { useEffect } from 'react';

import { registerFlowiseParentMessageListeners } from 'src/utils/flowise-embed-nav';

/** Listens for postMessage from embedded Flowise or flowise-bridge iframes (cross-origin escape). */
export function useFlowiseParentMessageListener() {
  useEffect(() => registerFlowiseParentMessageListeners(), []);
}
