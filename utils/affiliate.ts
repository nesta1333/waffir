import { PLATFORMS } from '../constants/platforms';

export function buildAffiliateUrl(baseUrl: string, platformId: string): string {
  const platform = PLATFORMS[platformId];
  if (!platform?.affiliateParam) return baseUrl;

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${platform.affiliateParam}`;
}

export function trackClick(platformId: string, productId: string): void {
  // TODO: implement POST to /api/track when analytics endpoint is ready
  // Do not log in production — affiliate tags are business-sensitive
  if (__DEV__) {
    console.log('[affiliate] click', { platformId, productId });
  }
}
