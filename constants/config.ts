/**
 * Centralised runtime config.
 * All EXPO_PUBLIC_* vars must be set before `expo start` (they are baked into the JS bundle).
 */
export const Config = {
  /** FastAPI base URL. On Android emulator localhost = 10.0.2.2 */
  API_URL: (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000').replace(/\/$/, ''),

  /** Notification channel & scheduling */
  NOTIFICATION_CHANNEL_ID: 'price-alerts',
  NOTIFICATION_CHANNEL_NAME: 'تنبيهات الأسعار',

  /** Background price-check interval in seconds (iOS minimum ~15 min) */
  BACKGROUND_CHECK_INTERVAL_S: 15 * 60,

  /** Maximum recent search queries stored */
  MAX_RECENT_SEARCHES: 8,

  /** Alert is triggered when backend best price ≤ target × this factor */
  ALERT_SLACK_FACTOR: 1.0,

  /** Number of platform results to show per product in the sheet */
  MAX_PRICES_SHOWN: 3,
} as const;
