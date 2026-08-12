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
 * Non-card WooshPay checkout methods.
 * Card is intentionally excluded. WooshPay only shows methods also enabled on the merchant account.
 * Optional override: PAYMENT_METHOD_TYPES=paynow,gcash,googlepay,... (comma-separated; `card` is always dropped).
 *
 * Keep this list to methods known to work on the merchant account. Extra unknown types can make
 * live checkout fail — override via env in production if needed.
 */
export function getWooshPayCheckoutPaymentMethods(): string[] {
  const fromEnv = String(process.env.PAYMENT_METHOD_TYPES || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value && value !== 'card');
  if (fromEnv.length) return [...new Set(fromEnv)];

  return [
    'googlepay',
    'applepay',
    'alipay',
    'alipay_hk',
    'dana',
    'boost',
    'gcash',
    'paynow',
    'bpi',
    'unionpay',
  ];
}

/** True when a WooshPay session still allows card (must recreate for no-card checkout). */
export function wooshPaySessionAllowsCard(session?: {
  payment_method_types?: string[] | null;
} | null): boolean {
  const types = Array.isArray(session?.payment_method_types)
    ? session!.payment_method_types!.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean)
    : [];
  // Empty / missing list often means account defaults (includes card) — treat as unsafe to reuse.
  if (!types.length) return true;
  return types.includes('card');
}

@Injectable()
export class WooshPayService {
  /** Checkout methods for AINEXUS + international (never includes card). */
  getCheckoutPaymentMethodTypes(): string[] {
    return getWooshPayCheckoutPaymentMethods();
  }

  /** Whether an existing session still offers card (should not be reused). */
  sessionAllowsCard(session?: { payment_method_types?: string[] | null } | null): boolean {
    return wooshPaySessionAllowsCard(session);
  }

  /**
   * Get WooshPay config from env. One env var per setting (see .env).
   */
  getConfig(): WooshPayConfig {
    const secretKey = process.env.PAYMENT_SECRET_KEY?.trim() ?? '';
    const testMode =
      process.env.PAYMENT_TEST_MODE === 'true' ||
      (!!secretKey && secretKey.startsWith('sk_test_'));
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
    const paymentMethodTypes = Array.isArray(params.payment_method_types)
      ? [...new Set(
          params.payment_method_types
            .map((value) => String(value || '').trim().toLowerCase())
            .filter((value) => value && value !== 'card'),
        )]
      : this.getCheckoutPaymentMethodTypes();

    const body: Record<string, unknown> = {
      mode: params.mode || 'payment',
      success_url: params.success_url,
      cancel_url: params.cancel_url,
      line_items: params.line_items,
      ...(params.client_reference_id && { client_reference_id: params.client_reference_id }),
      ...(paymentMethodTypes.length && { payment_method_types: paymentMethodTypes }),
      ...(params.expires_at != null && { expires_at: params.expires_at }),
      ...(params.customer_email && { customer_email: params.customer_email }),
      ...(params.payment_intent_data && { payment_intent_data: params.payment_intent_data }),
    };
    console.log(
      '[WooshPay] API call: create checkout session | methods=',
      paymentMethodTypes.join(',') || '(none)',
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
    payment_intent?: string;
    payment_method_types?: string[];
  }> {
    return this.makeApiRequest<any>('GET', `/v1/checkout/sessions/${sessionId}`);
  }

  async getPaymentIntent(paymentIntentId: string): Promise<{
    id: string;
    status?: string;
    amount?: number;
    currency?: string;
  }> {
    const id = String(paymentIntentId || '').trim();
    if (!id) {
      throw new Error('paymentIntentId is required');
    }
    return this.makeApiRequest<any>('GET', `/v1/payment_intents/${id}`);
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
