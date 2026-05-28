// Mock data for development only. Replace with live API integration.

export interface PlatformPrice {
  platformId: string;
  price: number;
  shipping: number;
  total: number;
  currency: 'AED' | 'SAR';
  url: string;
  inStock: boolean;
  deliveryDays: number;
  originalPrice?: number;
  discount?: number;
  shipsFromChina?: boolean;
  warning?: string;
  couponCode?: string;
  couponDiscount?: number;
  cashback?: number;
  condition?: 'new' | 'renewed' | 'used';
  sellerRating?: number;
  reviewCount?: number;
}

export interface PricePoint {
  date: string;
  price: number;
  platformId: string;
}

export interface AlternativeProduct {
  id: string;
  nameAr: string;
  name: string;
  imageUrl: string;
  bestPrice: number;
  currency: 'AED' | 'SAR';
  bestPlatformId: string;
  reasonAr: string;
  reasonEn: string;
  savingPct: number;
  tradeoffAr: string;
  rating: number;
}

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  brand: string;
  category: string;
  imageUrl: string;
  prices: PlatformPrice[];
  priceHistory: PricePoint[];
  lastUpdated: string;
  alternatives?: AlternativeProduct[];
  modelNumber?: string;
  barcode?: string;
  specs?: Record<string, string>;
}

export interface DealEvent {
  id: string;
  nameAr: string;
  nameEn: string;
  startMonth: number;
  endMonth: number;
  icon: string;
  categories: string[];
  tipAr: string;
  tipEn: string;
  avgDiscountPct: number;
}

export interface DailyDeal {
  productId: string;
  platformId: string;
  price: number;
  originalPrice: number;
  currency: 'AED' | 'SAR';
  realDiscountScore: number;
  category: string;
  isFreeShipping: boolean;
}

function generatePriceHistory(basePrice: number, platformId: string, days = 90): PricePoint[] {
  const history: PricePoint[] = [];
  const now = new Date();
  let price = basePrice * 1.08;
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    price = price + (Math.random() - 0.52) * basePrice * 0.03;
    price = Math.max(basePrice * 0.85, Math.min(basePrice * 1.15, price));
    history.push({ date: d.toISOString().split('T')[0], price: Math.round(price), platformId });
  }
  return history;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Samsung Galaxy S25 Ultra 512GB',
    nameAr: 'سامسونج جالاكسي S25 ألترا 512 جيجا',
    brand: 'Samsung',
    category: 'Electronics',
    imageUrl: 'https://picsum.photos/seed/galaxy/400/400',
    modelNumber: 'SM-S938B',
    barcode: '8806095336855',
    specs: { Storage: '512GB', RAM: '12GB', Screen: '6.9"', Battery: '5000mAh' },
    prices: [
      { platformId: 'amazon',   price: 4299, shipping: 0,   total: 4299, currency: 'AED', url: 'https://amazon.ae', inStock: true,  deliveryDays: 1, sellerRating: 4.8, reviewCount: 3241, condition: 'new' },
      { platformId: 'noon',     price: 4199, shipping: 0,   total: 4199, currency: 'AED', url: 'https://noon.com',  inStock: true,  deliveryDays: 1, originalPrice: 4699, discount: 11, sellerRating: 4.7, reviewCount: 1820, condition: 'new', couponCode: 'NOON10', couponDiscount: 100 },
      { platformId: 'sharafDG', price: 4349, shipping: 0,   total: 4349, currency: 'AED', url: 'https://sharafdg.com', inStock: true, deliveryDays: 2, condition: 'new' },
      { platformId: 'aliexpress', price: 3380, shipping: 85, total: 3465, currency: 'AED', url: 'https://aliexpress.com', inStock: true, deliveryDays: 14, shipsFromChina: true, condition: 'new', warning: 'تحقق من الضمان — إصدار دولي محتمل' },
      { platformId: 'temu',     price: 3100, shipping: 150, total: 3250, currency: 'AED', url: 'https://temu.com',  inStock: true,  deliveryDays: 18, shipsFromChina: true, warning: 'تحقق من الضمان', condition: 'new' },
    ],
    priceHistory: generatePriceHistory(4199, 'noon'),
    lastUpdated: new Date().toISOString(),
    alternatives: [
      { id: 'p2-alt', nameAr: 'آيفون 16 برو 256 جيجا', name: 'iPhone 16 Pro 256GB', imageUrl: 'https://picsum.photos/seed/iphone/400/400', bestPrice: 4099, currency: 'AED', bestPlatformId: 'noon', reasonAr: 'نظام iOS أكثر سلاسة وتحديثات أطول', reasonEn: 'Smoother iOS and longer software support', savingPct: 5, tradeoffAr: 'سعة تخزين أقل', rating: 4.9 },
      { id: 'alt2', nameAr: 'بيكسل 9 برو 256 جيجا', name: 'Pixel 9 Pro 256GB', imageUrl: 'https://picsum.photos/seed/pixel/400/400', bestPrice: 3299, currency: 'AED', bestPlatformId: 'amazon', reasonAr: 'توفير 23% مع كاميرا احترافية وذكاء اصطناعي متقدم', reasonEn: 'Save 23% with pro camera and advanced AI', savingPct: 23, tradeoffAr: 'بدون قلم S-Pen', rating: 4.7 },
    ],
  },
  {
    id: 'p2',
    name: 'Sony WH-1000XM5 Headphones',
    nameAr: 'سوني WH-1000XM5 سماعات لاسلكية',
    brand: 'Sony',
    category: 'Electronics',
    imageUrl: 'https://picsum.photos/seed/sony/400/400',
    modelNumber: 'WH-1000XM5',
    specs: { Type: 'Over-Ear', ANC: 'Yes', Battery: '30h', Connectivity: 'Bluetooth 5.2' },
    prices: [
      { platformId: 'amazon',   price: 1299, shipping: 0,  total: 1299, currency: 'AED', url: 'https://amazon.ae', inStock: true,  deliveryDays: 1, cashback: 30 },
      { platformId: 'noon',     price: 1349, shipping: 0,  total: 1349, currency: 'AED', url: 'https://noon.com',  inStock: true,  deliveryDays: 1 },
      { platformId: 'sharafDG', price: 1320, shipping: 0,  total: 1320, currency: 'AED', url: 'https://sharafdg.com', inStock: true, deliveryDays: 2, originalPrice: 1499, discount: 12 },
      { platformId: 'aliexpress', price: 940, shipping: 45, total: 985, currency: 'AED', url: 'https://aliexpress.com', inStock: true, deliveryDays: 12, shipsFromChina: true },
      { platformId: 'temu',     price: 870, shipping: 120, total: 990,  currency: 'AED', url: 'https://temu.com',  inStock: false, deliveryDays: 20, shipsFromChina: true, warning: 'قد يكون غير أصلي' },
    ],
    priceHistory: generatePriceHistory(1299, 'amazon'),
    lastUpdated: new Date().toISOString(),
    alternatives: [
      { id: 'bose-alt', nameAr: 'بوز QC45 للضوضاء', name: 'Bose QC45', imageUrl: 'https://picsum.photos/seed/bose/400/400', bestPrice: 1099, currency: 'AED', bestPlatformId: 'amazon', reasonAr: 'يوفر 15% مع عزل صوت ممتاز', reasonEn: 'Save 15% with excellent noise cancelling', savingPct: 15, tradeoffAr: 'بطارية أقل قليلاً', rating: 4.6 },
    ],
  },
  {
    id: 'p3',
    name: 'Nike Air Max 270',
    nameAr: 'نايك إير ماكس 270',
    brand: 'Nike',
    category: 'Fashion',
    imageUrl: 'https://picsum.photos/seed/nike/400/400',
    prices: [
      { platformId: 'amazon',   price: 579, shipping: 0,  total: 579,  currency: 'AED', url: 'https://amazon.ae', inStock: true, deliveryDays: 2 },
      { platformId: 'noon',     price: 549, shipping: 0,  total: 549,  currency: 'AED', url: 'https://noon.com',  inStock: true, deliveryDays: 1 },
      { platformId: 'namshi',   price: 449, shipping: 0,  total: 449,  currency: 'AED', url: 'https://namshi.com', inStock: true, deliveryDays: 2, originalPrice: 699, discount: 36, couponCode: 'NAMSHI15' },
      { platformId: 'aliexpress', price: 360, shipping: 35, total: 395, currency: 'AED', url: 'https://aliexpress.com', inStock: true, deliveryDays: 10, shipsFromChina: true },
      { platformId: 'temu',     price: 290, shipping: 80, total: 370,  currency: 'AED', url: 'https://temu.com',  inStock: true, deliveryDays: 16, shipsFromChina: true, warning: 'تحقق من الأصالة' },
    ],
    priceHistory: generatePriceHistory(499, 'namshi'),
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'p4',
    name: 'Dyson V15 Detect Vacuum',
    nameAr: 'ديسون V15 ديتكت مكنسة كهربائية',
    brand: 'Dyson',
    category: 'Home',
    imageUrl: 'https://picsum.photos/seed/dyson/400/400',
    prices: [
      { platformId: 'amazon',   price: 2799, shipping: 0,  total: 2799, currency: 'AED', url: 'https://amazon.ae', inStock: true, deliveryDays: 1 },
      { platformId: 'noon',     price: 2899, shipping: 0,  total: 2899, currency: 'AED', url: 'https://noon.com',  inStock: true, deliveryDays: 2 },
      { platformId: 'carrefour', price: 2749, shipping: 0, total: 2749, currency: 'AED', url: 'https://carrefouruae.com', inStock: true, deliveryDays: 3, originalPrice: 2999, discount: 8 },
      { platformId: 'lulu',     price: 2699, shipping: 0,  total: 2699, currency: 'AED', url: 'https://luluhypermarket.com', inStock: true, deliveryDays: 3 },
      { platformId: 'aliexpress', price: 2180, shipping: 100, total: 2280, currency: 'AED', url: 'https://aliexpress.com', inStock: true, deliveryDays: 16, shipsFromChina: true },
    ],
    priceHistory: generatePriceHistory(2799, 'amazon'),
    lastUpdated: new Date().toISOString(),
    alternatives: [
      { id: 'v12-alt', nameAr: 'ديسون V12 ديتكت سليم', name: 'Dyson V12 Detect Slim', imageUrl: 'https://picsum.photos/seed/dysonv12/400/400', bestPrice: 1999, currency: 'AED', bestPlatformId: 'amazon', reasonAr: 'يوفر 28% مع قوة شفط كافية لمعظم المنازل', reasonEn: 'Save 28% with suction sufficient for most homes', savingPct: 28, tradeoffAr: 'مدة البطارية أقل قليلاً', rating: 4.5 },
    ],
  },
  {
    id: 'p5',
    name: 'Apple AirPods Pro 2',
    nameAr: 'آبل إيربودز برو 2',
    brand: 'Apple',
    category: 'Electronics',
    imageUrl: 'https://picsum.photos/seed/airpods/400/400',
    modelNumber: 'MTJV3',
    specs: { ANC: 'Yes', Battery: '6h', ChargingCase: 'MagSafe', Connectivity: 'H2 Chip' },
    prices: [
      { platformId: 'amazon',   price: 949, shipping: 0,  total: 949, currency: 'AED', url: 'https://amazon.ae', inStock: true, deliveryDays: 1 },
      { platformId: 'noon',     price: 929, shipping: 0,  total: 929, currency: 'AED', url: 'https://noon.com',  inStock: true, deliveryDays: 1, couponCode: 'NOON5', couponDiscount: 50 },
      { platformId: 'sharafDG', price: 969, shipping: 0,  total: 969, currency: 'AED', url: 'https://sharafdg.com', inStock: true, deliveryDays: 2 },
      { platformId: 'carrefour', price: 959, shipping: 0, total: 959, currency: 'AED', url: 'https://carrefouruae.com', inStock: true, deliveryDays: 3 },
      { platformId: 'aliexpress', price: 720, shipping: 45, total: 765, currency: 'AED', url: 'https://aliexpress.com', inStock: true, deliveryDays: 12, shipsFromChina: true },
      { platformId: 'temu',     price: 650, shipping: 100, total: 750, currency: 'AED', url: 'https://temu.com',  inStock: true, deliveryDays: 18, shipsFromChina: true, warning: 'قد يكون غير أصلي' },
    ],
    priceHistory: generatePriceHistory(929, 'noon'),
    lastUpdated: new Date().toISOString(),
  },
];

export const MOCK_TRENDING = MOCK_PRODUCTS.map(p => {
  const sorted = [...p.prices].sort((a, b) => a.total - b.total);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const savingsPct = Math.round(((worst.total - best.total) / worst.total) * 100);
  return {
    id: p.id,
    nameAr: p.nameAr,
    name: p.name,
    imageUrl: p.imageUrl,
    bestPrice: best.total,
    bestPlatformId: best.platformId,
    savingsPct,
    currency: best.currency,
  };
});

export const MOCK_RECENT_SEARCHES = [
  'آيفون 16 برو',
  'سماعات سوني',
  'نايك 2024',
  'ديسون',
];

// Gulf Deals Calendar — Mock data for development only.
export const GULF_DEALS_CALENDAR: DealEvent[] = [
  { id: 'ramadan', nameAr: 'رمضان', nameEn: 'Ramadan', startMonth: 3, endMonth: 4, icon: '🌙', categories: ['Electronics', 'Home', 'Fashion'], tipAr: 'خصومات تصل إلى 70% على الإلكترونيات والأزياء', tipEn: 'Up to 70% off electronics and fashion', avgDiscountPct: 40 },
  { id: 'eid-fitr', nameAr: 'عيد الفطر', nameEn: 'Eid Al Fitr', startMonth: 4, endMonth: 4, icon: '🎉', categories: ['Fashion', 'Gifts', 'Kids'], tipAr: 'أفضل وقت لشراء الملابس والهدايا', tipEn: 'Best time for clothing and gifts', avgDiscountPct: 35 },
  { id: 'back-school', nameAr: 'العودة للمدارس', nameEn: 'Back to School', startMonth: 8, endMonth: 9, icon: '📚', categories: ['Electronics', 'School', 'Kids'], tipAr: 'خصومات على اللابتوب والأدوات المدرسية', tipEn: 'Discounts on laptops and school supplies', avgDiscountPct: 25 },
  { id: 'white-friday', nameAr: 'الجمعة البيضاء', nameEn: 'White Friday', startMonth: 11, endMonth: 11, icon: '⚡', categories: ['Electronics', 'Home', 'Fashion', 'Gifts'], tipAr: 'أضخم حدث تسوق في الشرق الأوسط — خطط مسبقاً', tipEn: 'Biggest shopping event in the Middle East — plan ahead', avgDiscountPct: 55 },
  { id: 'year-end', nameAr: 'نهاية العام', nameEn: 'Year End', startMonth: 12, endMonth: 12, icon: '🎊', categories: ['Electronics', 'Home', 'Travel'], tipAr: 'خصومات ممتازة على الإلكترونيات والسفر', tipEn: 'Excellent deals on electronics and travel', avgDiscountPct: 30 },
  { id: 'national-day', nameAr: 'اليوم الوطني', nameEn: 'National Day UAE', startMonth: 12, endMonth: 12, icon: '🇦🇪', categories: ['Electronics', 'Fashion', 'Home'], tipAr: 'عروض خاصة من المتاجر المحلية الإماراتية', tipEn: 'Special offers from UAE local retailers', avgDiscountPct: 20 },
  { id: 'summer', nameAr: 'عروض الصيف', nameEn: 'Summer Sale', startMonth: 6, endMonth: 8, icon: '☀️', categories: ['Fashion', 'Travel', 'Kids'], tipAr: 'تصفيات الصيف — ملابس وسفر بأسعار منخفضة', tipEn: 'Summer clearance — clothing and travel deals', avgDiscountPct: 30 },
  { id: 'eid-adha', nameAr: 'عيد الأضحى', nameEn: 'Eid Al Adha', startMonth: 6, endMonth: 6, icon: '🐑', categories: ['Home', 'Fashion', 'Gifts'], tipAr: 'فرصة للأجهزة المنزلية والهدايا العائلية', tipEn: 'Great time for home appliances and family gifts', avgDiscountPct: 30 },
];

// Daily deals feed — Mock data for development only.
export const MOCK_DAILY_DEALS: DailyDeal[] = [
  { productId: 'p5', platformId: 'noon', price: 879, originalPrice: 1049, currency: 'AED', realDiscountScore: 85, category: 'Electronics', isFreeShipping: true },
  { productId: 'p3', platformId: 'namshi', price: 449, originalPrice: 699, currency: 'AED', realDiscountScore: 78, category: 'Fashion', isFreeShipping: true },
  { productId: 'p4', platformId: 'lulu',  price: 2699, originalPrice: 2999, currency: 'AED', realDiscountScore: 62, category: 'Home', isFreeShipping: true },
  { productId: 'p1', platformId: 'noon',  price: 4099, originalPrice: 4699, currency: 'AED', realDiscountScore: 55, category: 'Electronics', isFreeShipping: true },
  { productId: 'p2', platformId: 'sharafDG', price: 1199, originalPrice: 1499, currency: 'AED', realDiscountScore: 80, category: 'Electronics', isFreeShipping: false },
];

// Re-exported above as interfaces; no duplicate export needed
