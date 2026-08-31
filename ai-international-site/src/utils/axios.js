import axios from 'axios';

import { getIntlAccessToken } from 'src/auth/intl-session';
import { CONFIG } from 'src/config-global';

const axiosInstance = axios.create({
  baseURL: CONFIG.site.serverUrl,
  withCredentials: false,
  timeout: 30000,
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;
  const token = getIntlAccessToken();
  if (!token) return config;
  const headers = config.headers || {};
  if (!headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  config.headers = headers;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      console.error(
        '[API]',
        error?.config?.method?.toUpperCase(),
        error?.config?.url,
        error?.response?.status || error?.message
      );
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
