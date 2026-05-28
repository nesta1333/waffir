/**
 * Anonymous device ID — persisted in AsyncStorage.
 *
 * Uses expo-crypto (backed by the device's native CSPRNG via
 * Android Keystore / iOS SecRandomCopyBytes) instead of Math.random()
 * which is not cryptographically secure.
 *
 * The device ID is the sole authentication credential for anonymous
 * alert and purchase operations — entropy matters.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const STORAGE_KEY = 'waffir_device_id';
let _cached: string | null = null;

/** Returns a stable anonymous device ID, persisted in AsyncStorage. */
export async function getDeviceId(): Promise<string> {
  if (_cached) return _cached;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      _cached = stored;
      return stored;
    }
    // expo-crypto uses the platform CSPRNG (not Math.random)
    const id = Crypto.randomUUID();
    await AsyncStorage.setItem(STORAGE_KEY, id);
    _cached = id;
    return id;
  } catch {
    // Ephemeral fallback if storage fails — still CSPRNG backed
    return Crypto.randomUUID();
  }
}
