import type { PaymentRecord } from '../types';
import type { Rates } from '../hooks/useExchangeRates';

// Creem keeps a processing fee on each foreign-currency sale: a $2.99 charge
// pays out $2.47 net. Applied as a ratio to every non-UAH (Creem) payment.
export const CREEM_NET_RATIO = 2.47 / 2.99;

// Ukrainian single-tax (єдиний податок) levied on turnover.
export const TAX_RATE = 0.05;

export function paymentCurrency(p: PaymentRecord): keyof Rates {
  if (p.currency) return p.currency;
  // Legacy records without an explicit currency: infer from locale.
  if (p.locale === 'pl') return 'PLN';
  if (p.locale === 'en') return 'USD';
  return 'UAH';
}

// Net payout of one payment in its own currency (after Creem's fee on foreign sales).
export function paymentNet(p: PaymentRecord): number {
  const amount = Number(p.amount || 0);
  // Domestic (WayForPay) UAH sales are counted in full.
  if (paymentCurrency(p) === 'UAH') return amount;
  return amount * CREEM_NET_RATIO;
}

// Net revenue of one payment expressed in UAH.
export function paymentNetUah(p: PaymentRecord, rates: Rates): number {
  return paymentNet(p) * rates[paymentCurrency(p)];
}

// Net revenue of one payment expressed in an arbitrary target currency.
export function paymentNetIn(p: PaymentRecord, target: keyof Rates, rates: Rates): number {
  return paymentNetUah(p, rates) / rates[target];
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
