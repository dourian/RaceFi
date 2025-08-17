import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'user.wallet_address';

export async function getStoredWalletAddress(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v ? v.trim() : null;
  } catch {
    return null;
  }
}

export async function setStoredWalletAddress(addr: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, addr.trim());
  } catch {}
}

export async function clearStoredWalletAddress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
