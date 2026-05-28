const USD_TO_AED = 3.67;
const AED_TO_SAR = 1.02;

export function usdToAed(usd: number): number {
  return Math.round(usd * USD_TO_AED);
}

export function aedToSar(aed: number): number {
  return Math.round(aed * AED_TO_SAR);
}

export function formatPrice(amount: number, currency: 'AED' | 'SAR'): string {
  const symbol = currency === 'AED' ? 'د.إ' : 'ر.س';
  return `${amount.toLocaleString('ar-AE')} ${symbol}`;
}

export function formatPriceShort(amount: number, currency: 'AED' | 'SAR'): string {
  const symbol = currency === 'AED' ? 'د.إ' : 'ر.س';
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k ${symbol}`;
  }
  return `${amount} ${symbol}`;
}

export function convertCurrency(amount: number, from: 'AED' | 'SAR', to: 'AED' | 'SAR'): number {
  if (from === to) return amount;
  return from === 'AED' ? aedToSar(amount) : Math.round(amount / AED_TO_SAR);
}

export function savingsPercent(original: number, discounted: number): number {
  return Math.round(((original - discounted) / original) * 100);
}
