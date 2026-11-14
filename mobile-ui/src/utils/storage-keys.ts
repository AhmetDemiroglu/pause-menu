import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage keys. The `pm-` prefix matches the web client (`pm-locale`).
 */
export const StorageKeys = {
  session: 'pm-session',
  locale: 'pm-locale',
  theme: 'pm-theme',
} as const;

/**
 * Keys written by app versions before 2.0. Read once on launch, copied to the new key
 * and deleted, so an update keeps the user's session, language and theme.
 */
export const LegacyStorageKeys = {
  session: 'gghub_session',
  locale: 'gghub-locale',
  theme: 'gghub_theme',
  // Pre-session-blob format (three separate keys).
  accessToken: 'gghub_access_token',
  refreshToken: 'gghub_refresh_token',
  user: 'gghub_user',
} as const;

/**
 * Returns the value under `key`. When it is empty, falls back to `legacyKey`, moves the
 * value to `key` and deletes the legacy entry. Never throws; a failed read returns null.
 */
export async function getItemMigrating(key: string, legacyKey: string): Promise<string | null> {
  try {
    const current = await SecureStore.getItemAsync(key);
    if (current != null) return current;
  } catch {
    // Fall through to the legacy key.
  }

  let legacy: string | null = null;
  try {
    legacy = await SecureStore.getItemAsync(legacyKey);
  } catch {
    return null;
  }
  if (legacy == null) return null;

  try {
    await SecureStore.setItemAsync(key, legacy);
    await SecureStore.deleteItemAsync(legacyKey);
  } catch {
    // The value is still returned; migration is retried on the next launch.
  }
  return legacy;
}
