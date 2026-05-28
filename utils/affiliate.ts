import { PLATFORMS } from '../constants/platforms';

export function buildAffiliateUrl(baseUrl: string, platformId: string): string {
  const platform = PLATFORMS[platformId];
  if (!platform?.affiliateParam) return baseUrl;

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${platform.affiliateParam}`;
}

export function trackClick(platformId: string, productId: string): void {
  // Fire analytics event — in production this posts to /api/track
  console.log('[affiliate]', { platformId, productId, ts: Date.now() });
}
