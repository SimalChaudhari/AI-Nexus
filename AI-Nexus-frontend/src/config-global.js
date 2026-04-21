import { paths } from 'src/routes/paths';

import packageJson from '../package.json';

// ----------------------------------------------------------------------

export const CONFIG = {
  site: {
    name: 'AI Nexus',
    serverUrl: (import.meta.env.VITE_SERVER_URL || '').trim() || 'http://localhost:5000/api',
    assetURL: import.meta.env.VITE_ASSET_URL ?? '',
    basePath: import.meta.env.VITE_BASE_PATH ?? '',
    version: packageJson.version,
  },
  /**
   * Auth
   * @method jwt | amplify | firebase | supabase | auth0
   */
  auth: {
    method: 'simple',
    skip: false,
    redirectPath: paths.auth.simple.signIn,
  },
  /**
   * Mapbox
   */
  mapbox: {
    apiKey: import.meta.env.VITE_MAPBOX_API_KEY ?? '',
  },
  /**
   * Firebase
   */
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APPID ?? '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
  },
  /**
   * Amplify
   */
  amplify: {
    userPoolId: import.meta.env.VITE_AWS_AMPLIFY_USER_POOL_ID ?? '',
    userPoolWebClientId: import.meta.env.VITE_AWS_AMPLIFY_USER_POOL_WEB_CLIENT_ID ?? '',
    region: import.meta.env.VITE_AWS_AMPLIFY_REGION ?? '',
  },
  /**
   * Auth0
   */
  auth0: {
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? '',
    domain: import.meta.env.VITE_AUTH0_DOMAIN ?? '',
    callbackUrl: import.meta.env.VITE_AUTH0_CALLBACK_URL ?? '',
  },
  /**
   * Supabase
   */
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  },
  /**
   * Payment (e.g. WooshPay) – public key only; safe for frontend / JS SDK.
   * - Not required for current flow: backend creates session and returns redirect URL.
   * - Use CONFIG.payment.publicKey when adding WooshPay JS SDK (embedded checkout on your page).
   * Secret key must stay on backend only (backend .env).
   */
  payment: {
    publicKey: import.meta.env.VITE_PAYMENT_PUBLIC_KEY ?? '',
  },
  flowise: {
    apiHost: (import.meta.env.VITE_FLOWISE_API_HOST || '').trim(),
    chatflowId: (import.meta.env.VITE_FLOWISE_CHATFLOW_ID || '').trim(),
    /** Prefer resolveFlowisePublicBaseUrl() in the browser for proxy-relative installs. */
    publicBaseUrl: (import.meta.env.VITE_FLOWISE_URL || '').trim(),
    relativePublicPath: (import.meta.env.VITE_FLOWISE_RELATIVE_PATH || '').trim(),
  },
};
