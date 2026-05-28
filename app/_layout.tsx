import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
} from '@expo-google-fonts/almarai';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import '../global.css';

// Import background task module so TaskManager.defineTask() runs at load time
import '../services/backgroundCheck';

import {
  requestNotificationPermission,
  addNotificationResponseListener,
} from '../services/notifications';
import { registerBackgroundPriceCheck } from '../services/backgroundCheck';
import NetworkBanner from '../components/ui/NetworkBanner';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // ── Initialise notifications + background task once fonts load ──
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    SplashScreen.hideAsync();

    (async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        await registerBackgroundPriceCheck();
      }
    })();
  }, [fontsLoaded, fontError]);

  // ── Notification tap handler (e.g. open relevant product screen) ──
  useEffect(() => {
    const sub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      // Future: navigate to product detail when tapped
      if (__DEV__) {
        console.log('[notification tapped]', data);
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <NetworkBanner />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
