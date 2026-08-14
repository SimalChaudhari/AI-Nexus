import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import type {
  WooshPayConfig,
  WooshPayCheckoutSessionData,
  WooshPayCustomerData,
} from './wooshpay-config.interface';

export interface CreateCheckoutLineItem {
  price_data: {
    currency: string;
    unit_amount: number;
    product_data: { name: string; description?: string };
  };
  quantity: number;
}

export interface CreateCheckoutParams {
  line_items: CreateCheckoutLineItem[];
  success_url: string;
  cancel_url: string;
  mode?: string;
  client_reference_id?: string;
  payment_method_types?: string[];
  /** Unix timestamp (seconds) when the checkout session expires */
  expires_at?: number;
  /** Pre-fill customer email on WooshPay payment page */
  customer_email?: string;
  /** Pre-fill billing details (name, email) on WooshPay payment page */
  payment_intent_data?: {
    billing_details?: { name?: string; email?: string; phone?: string };
  };
}

export interface WooshPayCheckoutSession {
  id: string;
  url: string;
  status?: string;
  payment_status?: string;
  client_secret?: string;
}

/**
 * Checkout does not send a specific method list. WooshPay shows whatever is
 * enabled (active) on the merchant account, including card if that is active.
 */
export function getWooshPayCheckoutPaymentMethods(): string[] {
  return [];
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  google_pay: 'Google Pay',
  googlepay: 'Google Pay',
  apple_pay: 'Apple Pay',
  applepay: 'Apple Pay',
  link: 'Link',
  alipay: 'Alipay',
  wechat_pay: 'WeChat Pay',
  wechatpay: 'WeChat Pay',
  grabpay: 'GrabPay',
  grab_pay: 'GrabPay',
  paynow: 'PayNow',
  fpx: 'FPX',
  card: 'Card',
};

function pushPaymentMethodHint(hints: string[], value: unknown) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (raw) hints.push(raw);
}

function collectUsedPaymentMethodHints(source: unknown, walletHints: string[], typeHints: string[]) {
  if (!source || typeof source !== 'object') return;
  const row = source as Record<string, any>;
  // Wallet actually used on the charge / payment method — never session payment_method_types.
  pushPaymentMethodHint(walletHints, row?.charges?.data?.[0]?.payment_method_details?.card?.wallet?.type);
  pushPaymentMethodHint(walletHints, row?.latest_charge?.payment_method_details?.card?.wallet?.type);
  pushPaymentMethodHint(walletHints, row?.payment_method_details?.card?.wallet?.type);
  pushPaymentMethodHint(walletHints, row?.payment_method_details?.wallet?.type);
  pushPaymentMethodHint(walletHints, row?.card?.wallet?.type);
  pushPaymentMethodHint(walletHints, row?.wallet?.type);

  pushPaymentMethodHint(typeHints, row?.charges?.data?.[0]?.payment_method_details?.type);
  pushPaymentMethodHint(typeHints, row?.latest_charge?.payment_method_details?.type);
  pushPaymentMethodHint(typeHints, row?.payment_method_details?.type);
  if (row?.object === 'payment_method' || row?.card) {
    pushPaymentMethodHint(typeHints, row?.type);
  }
}

/**
 * Label for the method the customer actually paid with.
 * Ignores checkout `payment_method_types` (those are enabled options, not the used wallet).
 */
export function formatWooshPayPaymentMethodLabel(...sources: unknown[]): string {
  const walletHints: string[] = [];
  const typeHints: string[] = [];
  sources.forEach((source) => collectUsedPaymentMethodHints(source, walletHints, typeHints));
  for (const hint of walletHints) {
    if (PAYMENT_METHOD_LABELS[hint]) return PAYMENT_METHOD_LABELS[hint];
  }
  for (const hint of typeHints) {
    if (PAYMENT_METHOD_LABELS[hint]) return PAYMENT_METHOD_LABELS[hint];
  }
  return 'Online payment';
}

@Injectable()
export class WooshPayService {
  /** Empty = omit payment_method_types so WooshPay uses merchant-account defaults. */
  getCheckoutPaymentMethodTypes(): string[] {
    return getWooshPayCheckoutPaymentMethods();
  }

  /**
   * Get WooshPay config from env. One env var per setting (see .env).
   */
  getConfig(): WooshPayConfig {
    const secretKey = process.env.PAYMENT_SECRET_KEY?.trim() ?? '';
    // Key prefix wins: sk_live_ always uses live API even if PAYMENT_TEST_MODE is still true.
    const testMode = secretKey.startsWith('sk_live_')
      ? false
      : secretKey.startsWith('sk_test_')
        ? true
        : process.env.PAYMENT_TEST_MODE === 'true';
    const baseUrl = testMode
      ? (process.env.PAYMENT_API_TEST_URL?.trim() ?? 'https://apitest.wooshpay.com')
      : (process.env.PAYMENT_API_LIVE_URL?.trim() ?? 'https://api.wooshpay.com');
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
    return {
      baseUrl: baseUrl.replace(/\/$/, ''),
      secretKey,
      testMode,
      webhookSecret,
    };
  }

  private getSecretKey(): string {
    const config = this.getConfig();
    if (!config.secretKey) {
      throw new Error('PAYMENT_SECRET_KEY is not set in environment');
    }
    const secret = config.secretKey;
    if (secret.startsWith('pk_test_') || secret.startsWith('pk_live_')) {
      throw new Error(
        'Use secret key (sk_test_ or sk_live_), not public key (pk_). Get from WooshPay Dashboard → API Keys.'
      );
    }
    if (!secret.startsWith('sk_test_') && !secret.startsWith('sk_live_')) {
      throw new Error(
        'PAYMENT_SECRET_KEY should start with sk_test_ or sk_live_. Check WooshPay Dashboard.'
      );
    }
    return secret;
  }


  private getAuthHeader(): string {
    const secret = this.getSecretKey();
    const encoded = Buffer.from(`${secret}:`, 'utf-8').toString('base64');
    return `Basic ${encoded}`;
  }

  private async makeApiRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const config = this.getConfig();
    const url = `${config.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      Accept: 'application/json',
    };
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, {
      method,
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try {
        const parsed = JSON.parse(text) as { message?: string; error?: { message?: string } };
        msg = parsed?.message ?? parsed?.error?.message ?? text;
      } catch {
        // keep msg
      }
      throw new Error(`WooshPay API ${res.status}: ${(msg as string).substring(0, 300)}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  /**
   * Verify webhook signature. Supports Stripe-style t=timestamp,v1=sig and plain HMAC-SHA256(payload); hex or base64.
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const config = this.getConfig();
    const webhookSecret = config.webhookSecret;
    if (!webhookSecret) return true;
    const raw = (signature || '').trim();
    if (!raw) return false;
    try {
      const tMatch = raw.match(/\bt=(\d+)/);
      const v1Match = raw.match(/\bv1=([a-zA-Z0-9+/=_-]+)/);
      const timestamp = tMatch ? tMatch[1] : null;
      let providedSig = v1Match ? v1Match[1] : raw.replace(/^sha256=/, '').replace(/^v1=/, '').trim();
      if (!providedSig) return false;
      let providedBuf = Buffer.from(providedSig, 'hex');
      if (providedBuf.length === 0 && providedSig.length > 0) {
        try {
          const base64 = providedSig.replace(/-/g, '+').replace(/_/g, '/');
          providedBuf = Buffer.from(base64, 'base64');
        } catch {
          /* keep */
        }
      }
      const tryVerify = (signedPayload: string): boolean => {
        const expectedHex = crypto
          .createHmac('sha256', webhookSecret)
          .update(signedPayload)
          .digest('hex');
        const expectedBuf = Buffer.from(expectedHex, 'hex');
        if (expectedBuf.length !== providedBuf.length) return false;
        return crypto.timingSafeEqual(expectedBuf, providedBuf);
      };
      if (timestamp) {
        if (tryVerify(`${timestamp}.${payload}`)) return true;
        if (tryVerify(payload)) return true;
        return false;
      }
      return tryVerify(payload);
    } catch {
      return false;
    }
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<WooshPayCheckoutSession> {
    const body: Record<string, unknown> = {
      mode: params.mode || 'payment',
      success_url: params.success_url,
      cancel_url: params.cancel_url,
      line_items: params.line_items,
      ...(params.client_reference_id && { client_reference_id: params.client_reference_id }),
      ...(params.expires_at != null && { expires_at: params.expires_at }),
      ...(params.customer_email && { customer_email: params.customer_email }),
      ...(params.payment_intent_data && { payment_intent_data: params.payment_intent_data }),
    };
    console.log(
      '[WooshPay] API call: create checkout session | methods=merchant-account-defaults',
    );
    const data = await this.makeApiRequest<WooshPayCheckoutSession & { url?: string }>(
      'POST',
      '/v1/checkout/sessions',
      body
    );
    if (!data?.url) {
      throw new Error('WooshPay did not return a checkout URL');
    }
    return {
      id: data.id,
      url: data.url,
      status: data.status,
      payment_status: data.payment_status,
      client_secret: data.client_secret,
    };
  }

  /** Create checkout session with full options (billing, shipping, metadata). */
  async createCheckoutSessionFull(data: WooshPayCheckoutSessionData): Promise<any> {
    return this.makeApiRequest<any>('POST', '/v1/checkout/sessions', data);
  }

  async getSession(sessionId: string): Promise<{
    id: string;
    url?: string;
    client_reference_id?: string;
    payment_status?: string;
    status?: string;
    amount_total?: number;
    amount_subtotal?: number;
    currency?: string;
    payment_intent?: string | Record<string, unknown>;
    payment_method_types?: string[];
  }> {
    return this.makeApiRequest<any>('GET', `/v1/checkout/sessions/${sessionId}`);
  }

  async getPaymentIntent(paymentIntentId: string): Promise<{
    id: string;
    status?: string;
    amount?: number;
    currency?: string;
    payment_method?: string | Record<string, unknown>;
    payment_method_types?: string[];
    charges?: { data?: Array<Record<string, unknown>> };
    latest_charge?: Record<string, unknown> | string;
  }> {
    const id = String(paymentIntentId || '').trim();
    if (!id) {
      throw new Error('paymentIntentId is required');
    }
    return this.makeApiRequest<any>('GET', `/v1/payment_intents/${id}`);
  }

  /** Best-effort label such as Google Pay / Apple Pay / Card. Never throws. */
  async resolveCheckoutPaymentMethodLabel(session?: {
    payment_intent?: string | Record<string, unknown>;
    payment_method?: string | Record<string, unknown>;
    payment_method_types?: string[];
    payment_method_details?: Record<string, unknown>;
  } | null): Promise<string> {
    try {
      let paymentIntent =
        session?.payment_intent && typeof session.payment_intent === 'object'
          ? session.payment_intent
          : null;
      const paymentIntentId =
        typeof session?.payment_intent === 'string'
          ? session.payment_intent
          : String((paymentIntent as { id?: string } | null)?.id || '').trim();
      if (!paymentIntent && paymentIntentId) {
        paymentIntent = await this.getPaymentIntent(paymentIntentId);
      }

      let paymentMethod =
        paymentIntent && typeof (paymentIntent as { payment_method?: unknown }).payment_method === 'object'
          ? ((paymentIntent as { payment_method?: Record<string, unknown> }).payment_method ?? null)
          : session?.payment_method && typeof session.payment_method === 'object'
            ? session.payment_method
            : null;
      const paymentMethodId =
        typeof (paymentIntent as { payment_method?: unknown } | null)?.payment_method === 'string'
          ? String((paymentIntent as { payment_method?: string }).payment_method)
          : typeof session?.payment_method === 'string'
            ? session.payment_method
            : '';
      if (!paymentMethod && paymentMethodId) {
        try {
          paymentMethod = await this.getPaymentMethod(paymentMethodId);
        } catch {
          paymentMethod = null;
        }
      }

      return formatWooshPayPaymentMethodLabel(session, paymentIntent, paymentMethod);
    } catch {
      return formatWooshPayPaymentMethodLabel(session);
    }
  }

  async expireCheckoutSession(sessionId: string): Promise<any> {
    return this.makeApiRequest<any>('POST', `/v1/checkout/sessions/${sessionId}/expire`);
  }

  async listCheckoutSessions(params?: { limit?: number }): Promise<any> {
    const query = params?.limit != null ? `?limit=${params.limit}` : '';
    return this.makeApiRequest<any>('GET', `/v1/checkout/sessions${query}`);
  }

  async createCustomer(customerData: WooshPayCustomerData): Promise<any> {
    return this.makeApiRequest<any>('POST', '/v1/customers', customerData);
  }

  async getCustomer(customerId: string): Promise<any> {
    return this.makeApiRequest<any>('GET', `/v1/customers/${customerId}`);
  }

  async createPaymentMethod(data: {
    type: 'card';
    card: { number: string; exp_month: number; exp_year: number; cvc: string };
    billing_details?: { name?: string; email?: string; phone?: string; address?: any };
    metadata?: Record<string, string>;
  }): Promise<any> {
    return this.makeApiRequest<any>('POST', '/v1/payment_methods', data);
  }

  async getPaymentMethod(paymentMethodId: string): Promise<any> {
    return this.makeApiRequest<any>('GET', `/v1/payment_methods/${paymentMethodId}`);
  }

  async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<any> {
    return this.makeApiRequest<any>('POST', `/v1/payment_methods/${paymentMethodId}/attach`, {
      customer: customerId,
    });
  }

  async detachPaymentMethodFromCustomer(paymentMethodId: string): Promise<any> {
    return this.makeApiRequest<any>('POST', `/v1/payment_methods/${paymentMethodId}/detach`);
  }
}
