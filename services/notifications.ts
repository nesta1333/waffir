import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Config } from '../constants/config';

// Configure how notifications are presented while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Request OS-level notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  // Simulators / web environments don't support notifications
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  // Android requires an explicit channel with a name + importance level
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(Config.NOTIFICATION_CHANNEL_ID, {
      name: Config.NOTIFICATION_CHANNEL_NAME,
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00F2FF',
    });
  }

  return true;
}

/**
 * Fire an immediate local notification announcing a price drop.
 * Called by the background checker when current price ≤ target price.
 */
export async function schedulePriceDropNotification(opts: {
  productNameAr: string;
  targetPrice: number;
  currentPrice: number;
  currency: 'AED' | 'SAR';
}): Promise<void> {
  const sym = opts.currency === 'AED' ? 'د.إ' : 'ر.س';
  const current = opts.currentPrice.toLocaleString('ar-AE');
  const target  = opts.targetPrice.toLocaleString('ar-AE');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 انخفض السعر!',
      body: `${opts.productNameAr}\nالسعر الآن ${current} ${sym}  ·  هدفك ${target} ${sym}`,
      data: { type: 'price_drop', productNameAr: opts.productNameAr },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: Config.NOTIFICATION_CHANNEL_ID } : {}),
    },
    trigger: null, // fire immediately
  });
}

/** Register a listener that is called whenever the user taps a notification. */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
