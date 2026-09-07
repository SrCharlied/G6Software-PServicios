import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const STORAGE_KEYS = {
  token: 'servigt_token',
  user: 'servigt_user',
};

const PRIVATE_KEYS = [
  STORAGE_KEYS.token,
  STORAGE_KEYS.user,
];

const PRIVATE_PREFIXES = [
  'chat_',
];

const getWebStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const webAdapter = {
  async getItem(key) {
    try {
      return getWebStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    // Riesgo residual web: el bearer queda accesible a JavaScript mientras
    // web mantenga localStorage; native usa AsyncStorage detras del adapter.
    try {
      getWebStorage()?.setItem(key, value);
    } catch { /* storage no disponible */ }
  },
  async removeItem(key) {
    try {
      getWebStorage()?.removeItem(key);
    } catch { /* storage no disponible */ }
  },
  async getAllKeys() {
    try {
      const store = getWebStorage();
      if (!store) return [];
      return Array.from({ length: store.length }, (_, index) => store.key(index)).filter(Boolean);
    } catch {
      return [];
    }
  },
};

const nativeAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
  getAllKeys: () => AsyncStorage.getAllKeys(),
};

export const sessionStorage = Platform.OS === 'web' ? webAdapter : nativeAdapter;

export const migrateLegacySession = async () => {
  // La branch ya usaba servigt_token/servigt_user; la migracion queda idempotente.
  return false;
};

export const clearPrivateSessionStorage = async () => {
  const keys = await sessionStorage.getAllKeys();
  const privateKeys = new Set(PRIVATE_KEYS);

  await Promise.all(
    keys
      .filter((key) => privateKeys.has(key) || PRIVATE_PREFIXES.some((prefix) => key.startsWith(prefix)))
      .map((key) => sessionStorage.removeItem(key))
  );
};
