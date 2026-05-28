import type { Product, PlatformPrice, PricePoint } from '../constants/mockData';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000').replace(/\/$/, '');
const TIMEOUT_MS = 15_000;

// ── Mappers: snake_case (backend) → camelCase (frontend) ──

function mapPrice(raw: Record<string, any>): PlatformPrice {
  return {
    platformId: raw.platform_id,
    price: raw.price,
    shipping: raw.shipping ?? 0,
    total: raw.total,
    currency: raw.currency ?? 'AED',
    url: raw.url,
    inStock: raw.in_stock ?? true,
    deliveryDays: raw.delivery_days ?? 3,
    originalPrice: raw.original_price,
    discount: raw.discount_pct,
    shipsFromChina: raw.ships_from_china ?? false,
    warning: raw.warning,
  };
}

function mapPricePoint(raw: Record<string, any>): PricePoint {
  return {
    date: raw.date,
    price: raw.price,
    platformId: raw.platform_id,
  };
}

function mapProduct(raw: Record<string, any>): Product {
  return {
    id: raw.id,
    name: raw.name ?? '',
    nameAr: raw.name_ar ?? raw.name ?? '',
    brand: raw.brand ?? '',
    category: raw.category ?? '',
    imageUrl: raw.image_url ?? '',
    prices: (raw.prices ?? []).map(mapPrice),
    priceHistory: (raw.price_history ?? []).map(mapPricePoint),
    lastUpdated: raw.last_updated ?? new Date().toISOString(),
  };
}

// ── Fetch with timeout ──

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

// ── Endpoints ──

export async function searchProducts(
  query: string,
  currency: 'AED' | 'SAR' = 'AED'
): Promise<Product[]> {
  const resp = await fetchWithTimeout(`${BASE_URL}/api/search/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, currency }),
  });
  if (!resp.ok) throw new Error(`search HTTP ${resp.status}`);
  const data = await resp.json();
  return (data.results ?? []).map(mapProduct);
}

export async function getProduct(id: string): Promise<Product | null> {
  const resp = await fetchWithTimeout(`${BASE_URL}/api/products/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`product HTTP ${resp.status}`);
  const data = await resp.json();
  return mapProduct(data);
}

export async function createAlert(
  payload: {
    product_id: string;
    product_name_ar: string;
    target_price: number;
    currency: string;
  },
  deviceId: string,
): Promise<void> {
  const resp = await fetchWithTimeout(`${BASE_URL}/api/alerts/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': deviceId,
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`alert HTTP ${resp.status}`);
}

export async function deleteAlert(alertId: string, deviceId: string): Promise<void> {
  const resp = await fetchWithTimeout(`${BASE_URL}/api/alerts/${alertId}`, {
    method: 'DELETE',
    headers: { 'X-Device-ID': deviceId },
  });
  if (!resp.ok && resp.status !== 404) throw new Error(`delete alert HTTP ${resp.status}`);
}

// ── Auth endpoints ──

export interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
  language: string;
  currency: string;
  is_premium: boolean;
  created_at: string;
}

export async function sendOtp(phone: string): Promise<void> {
  const resp = await fetchWithTimeout(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail ?? `send-otp HTTP ${resp.status}`);
  }
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ access_token: string; user_id: string; is_new_user: boolean }> {
  const resp = await fetchWithTimeout(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail ?? `verify-otp HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function getMe(token: string): Promise<AuthUser> {
  const resp = await fetchWithTimeout(`${BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`get-me HTTP ${resp.status}`);
  return resp.json();
}

export async function syncAlerts(
  token: string,
  alerts: Array<{ product_name_ar: string; target_price: number; currency: string }>
): Promise<{ synced: number; skipped: number }> {
  const resp = await fetchWithTimeout(`${BASE_URL}/api/auth/sync-alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ alerts }),
  });
  if (!resp.ok) throw new Error(`sync-alerts HTTP ${resp.status}`);
  return resp.json();
}

// ── Purchases ──

export interface PurchasePayload {
  device_id: string;
  product_name_ar: string;
  platform_id: string;
  price_paid: number;
  market_avg?: number;
  best_price?: number;
  currency?: 'AED' | 'SAR';
  image_url?: string;
}

export interface PurchaseResult {
  id: string;
  saved_amount: number;
  message: string;
}

export interface PurchaseStats {
  total_saved: number;
  purchase_count: number;
  this_month_saved: number;
  avg_saving_pct: number;
  best_deal: {
    product_name_ar: string;
    saved_amount: number;
    currency: string;
    created_at: string;
  } | null;
}

export async function recordPurchase(payload: PurchasePayload): Promise<PurchaseResult> {
  const { device_id, ...body } = payload;
  const resp = await fetchWithTimeout(`${BASE_URL}/api/purchases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': device_id,
    },
    // Never send device_id in the body — server reads it from header only
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`purchase HTTP ${resp.status}`);
  return resp.json();
}

export async function getPurchaseStats(deviceId: string): Promise<PurchaseStats> {
  // device_id sent as header, not query param (prevents URL logging exposure)
  const resp = await fetchWithTimeout(`${BASE_URL}/api/purchases/stats`, {
    method: 'GET',
    headers: { 'X-Device-ID': deviceId },
  });
  if (!resp.ok) throw new Error(`stats HTTP ${resp.status}`);
  return resp.json();
}

// ── Monitor: server-side alert check ──

export interface AlertCheckItem {
  product_name_ar: string;
  target_price: number;
  currency: 'AED' | 'SAR';
}

export interface TriggeredAlert extends AlertCheckItem {
  current_price: number;
}

export async function checkServerAlerts(
  alerts: AlertCheckItem[]
): Promise<TriggeredAlert[]> {
  if (!alerts.length) return [];
  const resp = await fetchWithTimeout(`${BASE_URL}/api/monitor/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alerts }),
  });
  if (!resp.ok) throw new Error(`monitor HTTP ${resp.status}`);
  const data = await resp.json();
  return data.triggered ?? [];
}
