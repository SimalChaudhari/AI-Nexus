/**
 * WooshPay configuration and request/response types.
 * Env: PAYMENT_SECRET_KEY, PAYMENT_WEBHOOK_SECRET (or WOOSHPay_API_KEY, WOOSHPay_WEBHOOK_SECRET).
 */

export interface WooshPayConfig {
  baseUrl: string;
  secretKey: string;
  testMode: boolean;
  webhookSecret?: string;
}

export interface WooshPayBillingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface WooshPayShippingDetails {
  name?: string;
  phone?: string;
  carrier?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface WooshPayCheckoutSessionData {
  cancel_url: string;
  success_url: string;
  mode: 'payment';
  customer?: string;
  line_items: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; description?: string };
    };
    quantity: number;
  }>;
  metadata?: Record<string, string>;
  client_reference_id?: string;
  billing_address_collection?: 'required' | 'auto';
  shipping_address_collection?: { allowed_countries: string[] };
  payment_method_types?: string[];
  payment_intent_data?: {
    billing_details?: WooshPayBillingDetails;
    shipping?: WooshPayShippingDetails;
  };
}

export interface WooshPayCustomerData {
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  address?: {
    city?: string;
    country?: string;
    line1?: string;
    line2?: string;
    postal_code?: string;
    state?: string;
  };
  metadata?: Record<string, string>;
}
