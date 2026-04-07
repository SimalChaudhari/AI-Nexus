import axios from 'axios';

import { CONFIG } from 'src/config-global';
import { STORAGE_KEY } from 'src/auth/context/jwt/constant';
import { apiLoading } from 'src/utils/api-loading';

// ----------------------------------------------------------------------
// GET deduplication: same GET (non-auth) in flight = one network call (user panel only)

const AUTH_PATH_PATTERN = /\/api\/auth\//;
const inFlightGet = new Map();

function getDedupKey(url, params) {
  const paramStr = params && typeof params === 'object' && Object.keys(params).length
    ? JSON.stringify(params)
    : '';
  return `${url}${paramStr}`;
}

function isAuthUrl(url) {
  if (typeof url !== 'string') return true;
  return AUTH_PATH_PATTERN.test(url);
}

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: CONFIG.site.serverUrl });

const originalGet = axiosInstance.get.bind(axiosInstance);

axiosInstance.get = function deduplicatedGet(url, config = {}) {
  const skipDedupe = config.deduplicate === false || isAuthUrl(url);
  if (skipDedupe) {
    return originalGet(url, config);
  }
  const key = getDedupKey(url, config.params);
  const existing = inFlightGet.get(key);
  if (existing) {
    return existing.then(
      (res) => ({ ...res, data: res.data }),
      (err) => Promise.reject(err)
    );
  }
  const promise = originalGet(url, config)
    .then((res) => {
      inFlightGet.delete(key);
      return res;
    })
    .catch((err) => {
      inFlightGet.delete(key);
      throw err;
    });
  inFlightGet.set(key, promise);
  return promise;
};

// Request interceptor to add JWT token and track loading (for admin overlay — only mutations, not GET)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem(STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const method = (config.method || 'get').toLowerCase();
    const isMutation = method !== 'get';
    if (isMutation && config.skipApiLoading !== true) {
      apiLoading.increment();
    }
    return config;
  },
  (error) => {
    apiLoading.decrement();
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and loading tracking
axiosInstance.interceptors.response.use(
  (response) => {
    const method = (response.config?.method || 'get').toLowerCase();
    if (method !== 'get' && response.config?.skipApiLoading !== true) {
      apiLoading.decrement();
    }
    return response;
  },
  (error) => {
    const method = (error.config?.method || 'get').toLowerCase();
    if (method !== 'get' && error.config?.skipApiLoading !== true) {
      apiLoading.decrement();
    }
    // Handle connection refused errors
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
      const connectionError = new Error('Unable to connect to server. Please make sure the backend server is running on http://localhost:3000');
      connectionError.code = 'ECONNREFUSED';
      return Promise.reject(connectionError);
    }

    // Handle network errors
    if (error.message === 'Network Error' || !error.response) {
      const networkError = new Error('Network error. Please check your internet connection and ensure the server is running.');
      networkError.code = 'NETWORK_ERROR';
      return Promise.reject(networkError);
    }

    // On 401 Unauthorized, redirect to login with returnTo so user can come back after signing in
    if (error.response?.status === 401) {
      const isAuthRequest = /\/auth\/|\/sign-in|\/login/.test(error.config?.url || '');
      if (!isAuthRequest && typeof window !== 'undefined') {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        const base = (CONFIG.site.basePath || '').replace(/\/$/, '');
        window.location.replace(`${base}${CONFIG.auth.redirectPath}?returnTo=${returnTo}`);
        return Promise.reject(error);
      }
    }

    // Handle other errors: prefer message from API body (e.g. NestJS { message, error, statusCode })
    const data = error.response?.data;
    let message = error.message || 'Something went wrong!';
    if (data) {
      const { message: dataMessage } = data;
      if (typeof dataMessage === 'string') message = dataMessage;
      else if (typeof data === 'string') message = data;
      else if (data instanceof Error) message = dataMessage;
      else if (typeof data === 'object') message = dataMessage ?? JSON.stringify(data);
    }
    const finalError = error instanceof Error && error.message === message ? error : new Error(message);
    return Promise.reject(finalError);
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args) => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args];

    const res = await axiosInstance.get(url, { ...config });

    return res.data;
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  auth: {
    me: '/api/auth/me',
    signIn: '/api/auth/sign-in',
    signUp: '/api/auth/sign-up',
    google: {
      redirect: '/api/auth/google/redirect'
    }
  },
};
