// Mock data for development only. Replace with live API integration.
import { PlatformPrice, PricePoint } from '../constants/mockData';

export type Currency = 'AED' | 'SAR' | 'KWD' | 'QAR' | 'BHD' | 'OMR';

export type BuyDecision =
  | 'buy_now'
  | 'wait'
  | 'avoid'
  | 'rare_deal'
  | 'check_seller'
  | 'better_alternative';

export const BUY_DECISION_LABELS: Record<BuyDecision, { ar: string; en: string; color: string }> = {
  buy_now:            { ar: 'اشترِ الآن',        en: 'Buy Now',                  color: '#2DD36F' },
  wait:               { ar: 'انتظر',              en: 'Wait',                     color: '#e7c365' },
  avoid:              { ar: 'لا تشتري الآن',      en: 'Avoid',                    color: '#ffb4ab' },
  rare_deal:          { ar: 'فرصة نادرة',         en: 'Rare Deal',                color: '#CCFF00' },
  check_seller:       { ar: 'تحقق من البائع',     en: 'Check Seller',             color: '#e7c365' },
  better_alternative: { ar: 'يوجد بديل أفضل',    en: 'Better Alternative',       color: '#00F2FF' },
};

export type DiscountStatus =
  | 'real_discount'
  | 'normal_price'
  | 'fake_discount'
  | 'inflated_before_sale'
  | 'unknown';

export const DISCOUNT_LABELS: Record<DiscountStatus, { ar: string; en: string }> = {
  real_discount:       { ar: 'خصم حقيقي',                en: 'Real Discount' },
  normal_price:        { ar: 'سعر عادي',                  en: 'Normal Price' },
  fake_discount:       { ar: 'خصم وهمي',                  en: 'Fake Discount' },
  inflated_before_sale:{ ar: 'رُفع السعر قبل الخصم',     en: 'Price Inflated Before Sale' },
  unknown:             { ar: 'غير معروف',                 en: 'Unknown' },
};

export type SafetyLevel = 'safe' | 'medium_risk' | 'high_risk' | 'unknown';
export const SAFETY_LABELS: Record<SafetyLevel, { ar: string; en: string; color: string }> = {
  safe:        { ar: 'آمن',              en: 'Safe',        color: '#2DD36F' },
  medium_risk: { ar: 'مخاطرة متوسطة',   en: 'Medium Risk', color: '#e7c365' },
  high_risk:   { ar: 'مخاطرة عالية',    en: 'High Risk',   color: '#ffb4ab' },
  unknown:     { ar: 'غير معروف',        en: 'Unknown',     color: 'rgba(255,255,255,0.35)' },
};

export interface PriceStats {
  current: number;
  min: number;
  max: number;
  avg: number;
  avg30: number;
  avg90: number;
  lowestEver: number;
  changeFromAvg: number;   // percentage vs 30-day avg
  trend: 'up' | 'down' | 'stable';
}

export interface DiscountResult {
  status: DiscountStatus;
  confidence: number;       // 0–100
  messageAr: string;
  messageEn: string;
  evidence: string[];
  realDiscountPct: number;  // actual % off lowest reference
}

export interface BuyDecisionResult {
  decision: BuyDecision;
  confidence: number;
  titleAr: string;
  titleEn: string;
  explanationAr: string;
  explanationEn: string;
  reasonsAr: string[];
  reasonsEn: string[];
  estimatedSavingIfWait: number;
}

export interface SellerSafetyResult {
  score: number;
  level: SafetyLevel;
  flags: string[];
}

export interface FinalPriceOffer {
  platformId: string;
  productPrice: number;
  shipping: number;
  couponDiscount: number;
  cashback: number;
  finalPrice: number;
  deliveryDays: number;
  trustScore: number;
  returnPolicy: 'excellent' | 'good' | 'poor' | 'none';
  warranty: 'local' | 'international' | 'seller' | 'none';
  isBestChoice: boolean;
  currency: 'AED' | 'SAR';
}

// ─── calculatePriceStats ──────────────────────────────────────────────────────

export function calculatePriceStats(priceHistory: PricePoint[]): PriceStats {
  if (!priceHistory.length) {
    return { current: 0, min: 0, max: 0, avg: 0, avg30: 0, avg90: 0,
             lowestEver: 0, changeFromAvg: 0, trend: 'stable' };
  }

  const prices = priceHistory.map(p => p.price);
  const current = prices[prices.length - 1];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  const last30 = prices.slice(-30);
  const last90 = prices.slice(-90);
  const avg30 = Math.round(last30.reduce((a, b) => a + b, 0) / last30.length);
  const avg90 = Math.round(last90.reduce((a, b) => a + b, 0) / last90.length);

  const changeFromAvg = avg30 > 0 ? Math.round(((current - avg30) / avg30) * 100) : 0;
  const recentSlice = prices.slice(-5);
  const trend: 'up' | 'down' | 'stable' =
    recentSlice[recentSlice.length - 1] > recentSlice[0] * 1.02 ? 'up'
    : recentSlice[recentSlice.length - 1] < recentSlice[0] * 0.98 ? 'down'
    : 'stable';

  return { current, min, max, avg, avg30, avg90, lowestEver: min, changeFromAvg, trend };
}

// ─── detectDiscountQuality ────────────────────────────────────────────────────

export function detectDiscountQuality(
  priceHistory: PricePoint[],
  currentPrice: number,
  listedOriginalPrice?: number,
): DiscountResult {
  const stats = calculatePriceStats(priceHistory);
  const evidence: string[] = [];

  if (!listedOriginalPrice || listedOriginalPrice <= currentPrice) {
    return {
      status: 'normal_price',
      confidence: 60,
      messageAr: 'لا يوجد خصم معلن',
      messageEn: 'No listed discount',
      evidence: [],
      realDiscountPct: 0,
    };
  }

  const listedPct = Math.round(((listedOriginalPrice - currentPrice) / listedOriginalPrice) * 100);

  // Was price inflated before sale?
  const priceWeekAgo = priceHistory.length >= 7
    ? priceHistory[priceHistory.length - 7]?.price : null;
  const price30Ago = priceHistory.length >= 30
    ? priceHistory[priceHistory.length - 30]?.price : null;

  if (priceWeekAgo && priceWeekAgo < currentPrice * 1.05) {
    evidence.push('السعر كان قريباً من هذا المستوى قبل أسبوع');
  }

  // Current vs lowest ever
  const vsLowest = stats.lowestEver > 0
    ? Math.round(((currentPrice - stats.lowestEver) / stats.lowestEver) * 100)
    : 0;
  if (vsLowest < 5) evidence.push('قريب من أدنى سعر تاريخي');
  if (vsLowest > 20) evidence.push(`أعلى من أدنى سعر بـ ${vsLowest}%`);

  // Current vs 30-day avg
  const vsAvg = stats.avg30 > 0
    ? Math.round(((currentPrice - stats.avg30) / stats.avg30) * 100) : 0;
  if (vsAvg > 8) evidence.push(`أعلى من متوسط الشهر الماضي بـ ${vsAvg}%`);
  if (vsAvg < -10) evidence.push(`أقل من متوسط الشهر الماضي بـ ${Math.abs(vsAvg)}%`);

  // Determine status
  let status: DiscountStatus = 'unknown';
  let confidence = 50;

  if (priceWeekAgo && priceWeekAgo > listedOriginalPrice * 0.95) {
    // price was near "original" recently — could be real
    status = listedPct > 10 ? 'real_discount' : 'normal_price';
    confidence = 75;
  } else if (price30Ago && price30Ago < currentPrice * 1.05) {
    status = 'inflated_before_sale';
    confidence = 72;
    evidence.push('السعر ارتفع قبل إعلان الخصم');
  } else if (vsLowest < 3 && listedPct > 15) {
    status = 'real_discount';
    confidence = 88;
    evidence.push('قريب جداً من أدنى سعر تاريخي مع خصم مرتفع');
  } else if (stats.avg30 > 0 && listedOriginalPrice > stats.avg30 * 1.25) {
    status = 'fake_discount';
    confidence = 80;
    evidence.push('السعر الأصلي المعلن أعلى بكثير من متوسط السوق');
  } else if (listedPct >= 10 && vsAvg < 0) {
    status = 'real_discount';
    confidence = 70;
  } else {
    status = 'normal_price';
    confidence = 55;
  }

  const realDiscountPct = stats.avg30 > 0
    ? Math.max(0, Math.round(((stats.avg30 - currentPrice) / stats.avg30) * 100))
    : listedPct;

  const messages: Record<DiscountStatus, { ar: string; en: string }> = {
    real_discount:        { ar: `خصم حقيقي ${listedPct}% — السعر أدنى من متوسط السوق`, en: `Real ${listedPct}% discount — below market average` },
    fake_discount:        { ar: 'تنبيه: هذا الخصم قد يكون وهمياً. السعر كان قريباً من هذا المستوى قبل العرض', en: 'Warning: Discount may be fake — price was near this level before the sale' },
    inflated_before_sale: { ar: 'تحذير: رُفع السعر قبل إعلان الخصم', en: 'Caution: Price was raised before the discount was applied' },
    normal_price:         { ar: 'هذا سعر عادي، لا يوجد خصم فعلي', en: 'This is the regular price, no real discount' },
    unknown:              { ar: 'بيانات غير كافية لتحليل الخصم', en: 'Not enough data to analyze discount' },
  };

  return {
    status,
    confidence,
    messageAr: messages[status].ar,
    messageEn: messages[status].en,
    evidence,
    realDiscountPct,
  };
}

// ─── calculateSellerSafetyScore ───────────────────────────────────────────────

export function calculateSellerSafetyScore(price: PlatformPrice): SellerSafetyResult {
  const flags: string[] = [];
  let score = 60;

  // Platform trust (from PLATFORMS constant if available, else use shipsFromChina)
  if (price.shipsFromChina) {
    score -= 15;
    flags.push('شحن من الصين — تأخر محتمل وضمان غير واضح');
  } else {
    score += 15;
  }

  if (price.warning) {
    score -= 20;
    flags.push(price.warning);
  }

  if (!price.inStock) {
    score -= 10;
    flags.push('غير متوفر حالياً');
  }

  if (price.deliveryDays <= 2) {
    score += 10;
  } else if (price.deliveryDays > 14) {
    score -= 8;
    flags.push(`وقت التسليم طويل: ${price.deliveryDays} يوم`);
  }

  if (price.shipping === 0) score += 5;

  score = Math.max(0, Math.min(100, score));

  const level: SafetyLevel =
    score >= 75 ? 'safe'
    : score >= 50 ? 'medium_risk'
    : score >= 25 ? 'high_risk'
    : 'unknown';

  return { score, level, flags };
}

// ─── calculateFinalPrice ──────────────────────────────────────────────────────

export function calculateFinalPrice(price: PlatformPrice): number {
  return price.price + price.shipping;
}

// ─── calculateBestOffer ───────────────────────────────────────────────────────

export function calculateBestOffer(prices: PlatformPrice[]): PlatformPrice | null {
  if (!prices.length) return null;

  const scored = prices
    .filter(p => p.inStock)
    .map(p => {
      const safety = calculateSellerSafetyScore(p);
      const finalPrice = calculateFinalPrice(p);
      // Score: lower final price = better, but trust matters too
      const priceScore = 100 - (finalPrice / Math.max(...prices.map(x => x.total))) * 60;
      const trustScore = (safety.score / 100) * 30;
      const deliveryScore = p.deliveryDays <= 2 ? 10 : p.deliveryDays <= 5 ? 5 : 0;
      return { price: p, total: priceScore + trustScore + deliveryScore };
    });

  scored.sort((a, b) => b.total - a.total);
  return scored[0]?.price ?? null;
}

// ─── generateBuyDecision ──────────────────────────────────────────────────────

export function generateBuyDecision(
  prices: PlatformPrice[],
  priceHistory: PricePoint[],
): BuyDecisionResult {
  const stats = calculatePriceStats(priceHistory);
  const bestOffer = calculateBestOffer(prices);
  if (!bestOffer || !prices.length) {
    return {
      decision: 'avoid',
      confidence: 40,
      titleAr: BUY_DECISION_LABELS.avoid.ar,
      titleEn: BUY_DECISION_LABELS.avoid.en,
      explanationAr: 'لا توجد عروض متاحة حالياً',
      explanationEn: 'No available offers at the moment',
      reasonsAr: [],
      reasonsEn: [],
      estimatedSavingIfWait: 0,
    };
  }

  const currentBest = bestOffer.total;
  const reasonsAr: string[] = [];
  const reasonsEn: string[] = [];
  let decision: BuyDecision = 'wait';
  let confidence = 60;

  // Rare deal: within 3% of all-time low
  if (stats.lowestEver > 0 && currentBest <= stats.lowestEver * 1.03) {
    decision = 'rare_deal';
    confidence = 90;
    reasonsAr.push('أقرب سعر من أدنى سعر تاريخي');
    reasonsEn.push('Closest to all-time low price');
  }
  // Buy now: at or below avg and trending down or stable
  else if (stats.avg30 > 0 && currentBest <= stats.avg30 * 0.97 && stats.trend !== 'up') {
    decision = 'buy_now';
    confidence = 80;
    reasonsAr.push(`أقل من متوسط الشهر الماضي بـ ${Math.abs(stats.changeFromAvg)}%`);
    reasonsEn.push(`${Math.abs(stats.changeFromAvg)}% below 30-day average`);
  }
  // Wait: price above avg
  else if (stats.avg30 > 0 && currentBest > stats.avg30 * 1.06) {
    decision = 'wait';
    confidence = 72;
    reasonsAr.push(`السعر الحالي أعلى من متوسط آخر 30 يوم بـ ${stats.changeFromAvg}%`);
    reasonsEn.push(`Price is ${stats.changeFromAvg}% above 30-day average`);
  }
  // Check seller if trust is low
  else if (bestOffer.shipsFromChina || bestOffer.warning) {
    decision = 'check_seller';
    confidence = 65;
    reasonsAr.push('البائع الأرخص لديه مخاطر محتملة');
    reasonsEn.push('Cheapest seller carries potential risks');
  }
  // Buy now if trending down
  else if (stats.trend === 'down') {
    decision = 'buy_now';
    confidence = 68;
    reasonsAr.push('السعر في منحنى انخفاض');
    reasonsEn.push('Price is on a downward trend');
  } else {
    decision = 'buy_now';
    confidence = 55;
  }

  // Availability check
  const inStockCount = prices.filter(p => p.inStock).length;
  if (inStockCount === 1) {
    reasonsAr.push('منصة واحدة فقط لديها المنتج');
    reasonsEn.push('Only one platform has stock');
    if (decision === 'buy_now') confidence = Math.min(confidence + 8, 95);
  }

  const estimatedSavingIfWait = decision === 'wait' && stats.avg30 > 0
    ? Math.round((currentBest - stats.avg30) * 0.8)
    : 0;

  return {
    decision,
    confidence,
    titleAr: BUY_DECISION_LABELS[decision].ar,
    titleEn: BUY_DECISION_LABELS[decision].en,
    explanationAr: buildExplanationAr(decision, stats, currentBest),
    explanationEn: buildExplanationEn(decision, stats, currentBest),
    reasonsAr,
    reasonsEn,
    estimatedSavingIfWait,
  };
}

function buildExplanationAr(decision: BuyDecision, stats: PriceStats, current: number): string {
  switch (decision) {
    case 'rare_deal':   return `فرصة نادرة — السعر قريب من أدنى مستوى تاريخي (${stats.lowestEver.toLocaleString('ar-AE')})`;
    case 'buy_now':     return `السعر الحالي مناسب — أقل من أو قريب من متوسط السوق`;
    case 'wait':        return `السعر الحالي أعلى من متوسط آخر 30 يوم بنسبة ${stats.changeFromAvg}%. غالباً توجد فرصة أفضل قريباً`;
    case 'avoid':       return `لا توجد عروض موثوقة متاحة حالياً`;
    case 'check_seller':return `أفضل سعر متاح من بائع يستحق مراجعة تفاصيله`;
    default:            return `يوجد بديل أفضل قيمةً في هذه الفئة`;
  }
}

function buildExplanationEn(decision: BuyDecision, stats: PriceStats, current: number): string {
  switch (decision) {
    case 'rare_deal':   return `Rare deal — price near all-time low (${stats.lowestEver.toLocaleString()})`;
    case 'buy_now':     return `Good price — at or below market average`;
    case 'wait':        return `Price is ${stats.changeFromAvg}% above 30-day average. A better deal may be available soon`;
    case 'avoid':       return `No reliable offers available right now`;
    case 'check_seller':return `Best price is from a seller worth reviewing before purchase`;
    default:            return `A better value alternative exists in this category`;
  }
}

// ─── estimateSavings ──────────────────────────────────────────────────────────

export function estimateSavings(
  currentPrice: number,
  historicalAverage: number,
  bestHistoricalPrice: number,
): { vsAverage: number; vsBestEver: number; pctVsAverage: number } {
  const vsAverage = Math.max(0, historicalAverage - currentPrice);
  const vsBestEver = Math.max(0, currentPrice - bestHistoricalPrice);
  const pctVsAverage = historicalAverage > 0
    ? Math.round((vsAverage / historicalAverage) * 100) : 0;
  return { vsAverage, vsBestEver, pctVsAverage };
}

// ─── detectProductMismatch ────────────────────────────────────────────────────

export interface MismatchWarning {
  hasMismatch: boolean;
  warnings: string[];
}

export function detectProductMismatch(prices: PlatformPrice[]): MismatchWarning {
  const warnings: string[] = [];

  const chinaOffers = prices.filter(p => p.shipsFromChina);
  const localOffers = prices.filter(p => !p.shipsFromChina);

  if (chinaOffers.length > 0 && localOffers.length > 0) {
    const cheapest = chinaOffers.reduce((a, b) => a.total < b.total ? a : b);
    const localCheapest = localOffers.reduce((a, b) => a.total < b.total ? a : b);
    const diff = Math.round(((localCheapest.total - cheapest.total) / localCheapest.total) * 100);
    if (diff > 25) {
      warnings.push(`تحذير: الفرق الكبير في السعر (${diff}%) قد يعني اختلافاً في المواصفات أو الضمان أو الإصدار`);
    }
  }

  if (chinaOffers.length > 0) {
    warnings.push('بعض العروض شحن من الصين — قد يختلف الإصدار أو الضمان عن النسخة الإقليمية');
  }

  const warnedOffers = prices.filter(p => p.warning);
  warnedOffers.forEach(p => {
    if (!warnings.some(w => w.includes(p.warning!))) {
      warnings.push(`تنبيه ${p.platformId}: ${p.warning}`);
    }
  });

  return { hasMismatch: warnings.length > 0, warnings };
}
