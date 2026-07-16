import axios from 'axios';

import { CONFIG } from 'src/config-global';
import { attachAuthAxiosInterceptors } from 'src/auth/context/jwt/axios-interceptors';

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

const axiosInstance = axios.create({
  baseURL: CONFIG.site.serverUrl,
  withCredentials: true,
});

attachAuthAxiosInterceptors(axiosInstance);

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
    refresh: '/api/auth/refresh',
    signIn: '/api/auth/sign-in',
    signUp: '/api/auth/sign-up',
    google: {
      redirect: '/api/auth/google/redirect',
    },
  },
};
