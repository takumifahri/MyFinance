import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';

import { getClient } from './client';

/**
 * Menyambungkan DB di perangkat ke Drizzle Studio (Expo DevTools).
 * Buka lewat terminal Expo: tekan `shift + m` → pilih expo-drizzle-studio-plugin.
 *
 * Hanya aktif saat dev. Di web tergantikan oleh use-db-devtools.web.ts (no-op),
 * karena plugin ini bicara ke DB di perangkat, bukan OPFS browser.
 */
export function useDbDevTools() {
  useDrizzleStudio(__DEV__ ? getClient() : null);
}
