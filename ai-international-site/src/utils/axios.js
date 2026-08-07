import axios from 'axios';

import { CONFIG } from 'src/config-global';

const axiosInstance = axios.create({
  baseURL: CONFIG.site.serverUrl,
  withCredentials: false,
  timeout: 30000,
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
