import { DEFAULT_CURRENCY, DEFAULT_MINOR_UNITS } from '../utils/money';
import { db } from './client';
import { SETTING_KEYS, getSetting, setSetting } from './queries/settings';
import { accounts, categories, type NewCategory } from './schema';

const DEFAULT_CATEGORIES: NewCategory[] = [
  { name: 'Makan & Minum', type: 'expense', color: '#F97316', isDefault: true },
  { name: 'Transport', type: 'expense', color: '#0EA5E9', isDefault: true },
  { name: 'Belanja', type: 'expense', color: '#A855F7', isDefault: true },
  { name: 'Tagihan', type: 'expense', color: '#EF4444', isDefault: true },
  { name: 'Hiburan', type: 'expense', color: '#EC4899', isDefault: true },
  { name: 'Kesehatan', type: 'expense', color: '#14B8A6', isDefault: true },
  { name: 'Lainnya', type: 'expense', color: '#64748B', isDefault: true },
  { name: 'Gaji', type: 'income', color: '#22C55E', isDefault: true },
  { name: 'Bonus', type: 'income', color: '#84CC16', isDefault: true },
  { name: 'Lainnya', type: 'income', color: '#64748B', isDefault: true },
];

/**
 * Dijalankan sekali seumur hidup instalasi, dijaga oleh settings.firstRunAt.
 * Sengaja BUKAN "cek tabel kosong": user yang sengaja menghapus semua kategori
 * tidak boleh kebanjiran kategori default lagi tiap buka app.
 */
export async function seedIfNeeded(): Promise<boolean> {
  const firstRunAt = await getSetting(SETTING_KEYS.firstRunAt);
  if (firstRunAt) return false;

  await db.transaction(async (tx) => {
    await tx.insert(categories).values(DEFAULT_CATEGORIES).onConflictDoNothing();
    await tx.insert(accounts).values({ name: 'Dompet', type: 'cash', initialBalance: 0 });

    await setSetting(SETTING_KEYS.currency, DEFAULT_CURRENCY, tx);
    await setSetting(SETTING_KEYS.currencyMinorUnits, String(DEFAULT_MINOR_UNITS), tx);
    await setSetting(SETTING_KEYS.theme, 'system', tx);
    await setSetting(SETTING_KEYS.dataVersion, '1', tx);
    await setSetting(SETTING_KEYS.firstRunAt, new Date().toISOString(), tx);
  });

  return true;
}
