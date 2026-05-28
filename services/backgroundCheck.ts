/**
 * Background price-check task.
 *
 * Strategy:
 *   On wake-up, read active alerts from AsyncStorage, send them to the
 *   server-side /api/monitor/check endpoint (which does the actual price
 *   lookup using the agent pool), and fire local notifications for any
 *   alerts whose price has dropped to or below the user's target.
 *
 *   Falls back to a local search if the server is unreachable.
 *
 * iOS note: Background fetch may be throttled by the OS to ~15 min minimum
 * and may be paused entirely when battery saver is active. This is expected
 * behaviour and beyond our control.
 */
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { checkServerAlerts, searchProducts } from './api';
import { schedulePriceDropNotification } from './notifications';
import { Config } from '../constants/config';
import type { PriceAlert } from '../store/useStore';

export const PRICE_CHECK_TASK = 'WAFFIR_PRICE_CHECK';

// ─── Task definition ─────────────────────────────────────────────────────────
// MUST be at module top level — TaskManager requires it to be defined before
// the app registers it.
TaskManager.defineTask(PRICE_CHECK_TASK, async (): Promise<BackgroundFetch.BackgroundFetchResult> => {
  try {
    const raw = await AsyncStorage.getItem('waffir-store');
    if (!raw) return BackgroundFetch.BackgroundFetchResult.NoData;

    const stored = JSON.parse(raw);
    const alerts: PriceAlert[] = stored?.state?.priceAlerts ?? [];

    if (!alerts.length) return BackgroundFetch.BackgroundFetchResult.NoData;

    const checkItems = alerts.map((a) => ({
      product_name_ar: a.productNameAr,
      target_price: a.targetPrice,
      currency: a.currency,
    }));

    let triggered: Array<{ product_name_ar: string; target_price: number; current_price: number; currency: 'AED' | 'SAR' }> = [];

    try {
      // Prefer server-side check (runs all agents in parallel on the server)
      triggered = await checkServerAlerts(checkItems);
    } catch {
      // Server unreachable — do a local fallback search for each alert
      const currency: 'AED' | 'SAR' = stored?.state?.currency ?? 'AED';
      for (const alert of alerts) {
        try {
          const results = await searchProducts(alert.productNameAr, currency);
          if (!results.length) continue;
          const best = [...(results[0].prices ?? [])].sort((a, b) => a.total - b.total)[0];
          if (best && best.total <= alert.targetPrice * Config.ALERT_SLACK_FACTOR) {
            triggered.push({
              product_name_ar: alert.productNameAr,
              target_price: alert.targetPrice,
              current_price: best.total,
              currency: alert.currency,
            });
          }
        } catch {
          // Individual alert failure is non-fatal
        }
      }
    }

    for (const hit of triggered) {
      await schedulePriceDropNotification({
        productNameAr: hit.product_name_ar,
        targetPrice: hit.target_price,
        currentPrice: hit.current_price,
        currency: hit.currency,
      });
    }

    return triggered.length > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Registration helpers ─────────────────────────────────────────────────────

/** Register the background task. Safe to call multiple times — idempotent. */
export async function registerBackgroundPriceCheck(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(PRICE_CHECK_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(PRICE_CHECK_TASK, {
      minimumInterval: Config.BACKGROUND_CHECK_INTERVAL_S,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err: any) {
    if (!err?.message?.includes('already')) {
      console.warn('[backgroundCheck] registration failed:', err?.message);
    }
  }
}

/** Unregister (e.g. when user disables notifications in settings). */
export async function unregisterBackgroundPriceCheck(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(PRICE_CHECK_TASK);
  } catch {
    // Not registered — no-op
  }
}
