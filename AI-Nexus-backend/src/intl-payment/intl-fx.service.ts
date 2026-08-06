import { Injectable, Logger } from '@nestjs/common';

type RateCache = {
  fetchedAt: number;
  base: string;
  rates: Record<string, number>;
};

/** Currencies where the minor unit is not used (Stripe/WooshPay style). */
const ZERO_DECIMAL = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

@Injectable()
export class IntlFxService {
  private readonly logger = new Logger(IntlFxService.name);
  private cache: RateCache | null = null;
  private readonly ttlMs = 6 * 60 * 60 * 1000;

  async getRatesFromSgd(): Promise<Record<string, number>> {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.ttlMs) {
      return this.cache.rates;
    }

    try {
      const res = await fetch('https://open.er-api.com/v6/latest/SGD', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`FX API HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        result?: string;
        rates?: Record<string, number>;
      };
      if (data?.result !== 'success' || !data.rates) {
        throw new Error('FX API returned an invalid payload');
      }
      this.cache = {
        fetchedAt: Date.now(),
        base: 'SGD',
        rates: { SGD: 1, ...data.rates },
      };
      return this.cache.rates;
    } catch (error) {
      this.logger.warn(
        `FX fetch failed: ${error instanceof Error ? error.message : error}`,
      );
      if (this.cache?.rates) return this.cache.rates;
      return { SGD: 1, USD: 0.78, INR: 74, EUR: 0.68, GBP: 0.58 };
    }
  }

  async convertFromSgd(amountSgd: number, targetCurrency: string): Promise<{
    currency: string;
    amount: number;
    amountCents: number;
    rate: number;
    baseAmountSgd: number;
  }> {
    const currency = String(targetCurrency || 'SGD').trim().toUpperCase() || 'SGD';
    const rates = await this.getRatesFromSgd();
    const rate = Number(rates[currency]);
    const safeRate = Number.isFinite(rate) && rate > 0 ? rate : Number(rates.USD) || 0.78;
    const usedCurrency = Number.isFinite(rate) && rate > 0 ? currency : 'USD';
    const raw = Number(amountSgd) * safeRate;
    const amount = ZERO_DECIMAL.has(usedCurrency)
      ? Math.round(raw)
      : Number(raw.toFixed(2));
    const amountCents = ZERO_DECIMAL.has(usedCurrency)
      ? Math.round(amount)
      : Math.round(amount * 100);

    return {
      currency: usedCurrency,
      amount,
      amountCents,
      rate: safeRate,
      baseAmountSgd: Number(amountSgd),
    };
  }
}
