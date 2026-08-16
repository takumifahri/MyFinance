import { eq } from 'drizzle-orm';

import { db, type DBOrTx } from '../client';
import { settings } from '../schema';

export const SETTING_KEYS = {
  currency: 'currency',
  currencyMinorUnits: 'currencyMinorUnits',
  theme: 'theme',
  firstRunAt: 'firstRunAt',
  lastBackupAt: 'lastBackupAt',
  dataVersion: 'dataVersion',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export async function getSetting(key: SettingKey, tx: DBOrTx = db): Promise<string | null> {
  const [row] = await tx.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row?.value ?? null;
}

export async function setSetting(key: SettingKey, value: string, tx: DBOrTx = db): Promise<void> {
  await tx
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getAllSettings(tx: DBOrTx = db): Promise<Record<string, string>> {
  const rows = await tx.select().from(settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
