import { DEFAULT_CURRENCY, DEFAULT_MINOR_UNITS } from '../utils/money';
import { db } from './client';
import { SETTING_KEYS, getSetting, setSetting } from './queries/settings';
import { accounts, categories, type NewCategory } from './schema';

const DEFAULT_CATEGORIES: NewCategory[] = [
  { name: 'Makan & Minum', type: 'expense', color: '#F97316', icon: 'makan', isDefault: true },
  { name: 'Transport', type: 'expense', color: '#0EA5E9', icon: 'transport', isDefault: true },
  { name: 'Belanja', type: 'expense', color: '#A855F7', icon: 'belanja', isDefault: true },
  { name: 'Tagihan', type: 'expense', color: '#EF4444', icon: 'tagihan', isDefault: true },
  { name: 'Hiburan', type: 'expense', color: '#EC4899', icon: 'hiburan', isDefault: true },
  { name: 'Kesehatan', type: 'expense', color: '#14B8A6', icon: 'kesehatan', isDefault: true },
  { name: 'Lainnya', type: 'expense', color: '#64748B', icon: 'lainnya', isDefault: true },
  { name: 'Gaji', type: 'income', color: '#22C55E', icon: 'gaji', isDefault: true },
  { name: 'Bonus', type: 'income', color: '#84CC16', icon: 'bonus', isDefault: true },
  { name: 'Lainnya', type: 'income', color: '#64748B', icon: 'lainnya', isDefault: true },
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
