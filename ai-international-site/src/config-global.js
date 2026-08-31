import { getClientApiBase, getServerApiBase } from 'src/lib/env';

export const CONFIG = {
  site: {
    name: 'AI Nexus International',
    serverUrl: typeof window !== 'undefined' ? getClientApiBase() : getServerApiBase(),
    assetURL: '',
    basePath: '',
    version: '0.1.0',
  },
};
