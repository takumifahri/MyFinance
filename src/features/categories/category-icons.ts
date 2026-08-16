import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { CategoryType } from '@/src/db/schema';

export type CategoryGlyph = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * `categories.icon` menyimpan KUNCI katalog ('makan'), bukan nama glyph pustaka ikon.
 * Dengan begitu mengganti pustaka ikon cukup mengubah tabel di bawah, tanpa migrasi data.
 * Nilai tak dikenal (mis. dari versi app lebih baru) jatuh ke fallback, bukan crash.
 */
export type CategoryIconKey = (typeof CATEGORY_ICONS)[number]['key'];

export const CATEGORY_ICONS = [
  { key: 'makan', glyph: 'silverware-fork-knife', label: 'Makan' },
  { key: 'jajan', glyph: 'hamburger', label: 'Jajan' },
  { key: 'kopi', glyph: 'coffee', label: 'Kopi' },
  { key: 'belanja', glyph: 'cart', label: 'Belanja' },
  { key: 'pakaian', glyph: 'tshirt-crew', label: 'Pakaian' },
  { key: 'transport', glyph: 'bus', label: 'Transport' },
  { key: 'kendaraan', glyph: 'motorbike', label: 'Kendaraan' },
  { key: 'bensin', glyph: 'fuel', label: 'Bensin' },
  { key: 'perjalanan', glyph: 'airplane', label: 'Perjalanan' },
  { key: 'rumah', glyph: 'home', label: 'Rumah' },
  { key: 'listrik', glyph: 'lightning-bolt', label: 'Listrik' },
  { key: 'air', glyph: 'water', label: 'Air' },
  { key: 'internet', glyph: 'wifi', label: 'Internet' },
  { key: 'pulsa', glyph: 'cellphone', label: 'Pulsa' },
  { key: 'tagihan', glyph: 'receipt', label: 'Tagihan' },
  { key: 'hiburan', glyph: 'movie-open', label: 'Hiburan' },
  { key: 'game', glyph: 'gamepad-variant', label: 'Game' },
  { key: 'musik', glyph: 'music', label: 'Musik' },
  { key: 'kesehatan', glyph: 'heart-pulse', label: 'Kesehatan' },
  { key: 'obat', glyph: 'pill', label: 'Obat' },
  { key: 'olahraga', glyph: 'dumbbell', label: 'Olahraga' },
  { key: 'perawatan', glyph: 'spa', label: 'Perawatan' },
  { key: 'pendidikan', glyph: 'school', label: 'Pendidikan' },
  { key: 'buku', glyph: 'book-open-variant', label: 'Buku' },
  { key: 'anak', glyph: 'baby-carriage', label: 'Anak' },
  { key: 'peliharaan', glyph: 'paw', label: 'Peliharaan' },
  { key: 'hadiah', glyph: 'gift', label: 'Hadiah' },
  { key: 'donasi', glyph: 'handshake', label: 'Donasi' },
  { key: 'perbaikan', glyph: 'tools', label: 'Perbaikan' },
  { key: 'gaji', glyph: 'cash-multiple', label: 'Gaji' },
  { key: 'bonus', glyph: 'star-four-points', label: 'Bonus' },
  { key: 'usaha', glyph: 'briefcase', label: 'Usaha' },
  { key: 'freelance', glyph: 'laptop', label: 'Freelance' },
  { key: 'investasi', glyph: 'chart-line', label: 'Investasi' },
  { key: 'bunga-bank', glyph: 'bank', label: 'Bunga bank' },
  { key: 'tabungan', glyph: 'piggy-bank', label: 'Tabungan' },
  { key: 'penjualan', glyph: 'sale', label: 'Penjualan' },
  { key: 'lainnya', glyph: 'dots-horizontal', label: 'Lainnya' },
] as const satisfies readonly { key: string; glyph: CategoryGlyph; label: string }[];

const GLYPH_BY_KEY = new Map<string, CategoryGlyph>(
  CATEGORY_ICONS.map((icon) => [icon.key, icon.glyph]),
);

const FALLBACK_GLYPH: Record<CategoryType, CategoryGlyph> = {
  expense: 'receipt',
  income: 'cash-plus',
};

/**
 * Tebakan untuk kategori lama yang dibuat sebelum kolom icon dipakai — supaya
 * pengguna lama langsung melihat ikon yang masuk akal tanpa harus mengedit ulang.
 */
const KEY_BY_KEYWORD: readonly (readonly [RegExp, CategoryIconKey])[] = [
  [/makan|minum|kuliner|resto/i, 'makan'],
  [/jajan|snack/i, 'jajan'],
  [/kopi|cafe|kafe/i, 'kopi'],
  [/belanja|groceri|grocery|pasar/i, 'belanja'],
  [/baju|pakaian|fashion/i, 'pakaian'],
  [/transport|ojek|angkot|bus|kereta/i, 'transport'],
  [/bensin|bbm|pertalite|pertamax/i, 'bensin'],
  [/motor|mobil|kendaraan/i, 'kendaraan'],
  [/liburan|traveling|travel|jalan-jalan/i, 'perjalanan'],
  [/rumah|kos|sewa|kontrakan/i, 'rumah'],
  [/listrik|pln/i, 'listrik'],
  [/\bair\b|pdam/i, 'air'],
  [/internet|wifi|indihome/i, 'internet'],
  [/pulsa|kuota/i, 'pulsa'],
  [/tagihan|bill|cicilan/i, 'tagihan'],
  [/hiburan|film|bioskop|nonton/i, 'hiburan'],
  [/game|gim/i, 'game'],
  [/musik|spotify/i, 'musik'],
  [/sehat|dokter|rumah sakit|klinik/i, 'kesehatan'],
  [/obat|apotek/i, 'obat'],
  [/olahraga|gym|fitness/i, 'olahraga'],
  [/salon|skincare|perawatan/i, 'perawatan'],
  [/pendidikan|sekolah|kuliah|kursus/i, 'pendidikan'],
  [/buku/i, 'buku'],
  [/anak|bayi/i, 'anak'],
  [/peliharaan|kucing|anjing|pet/i, 'peliharaan'],
  [/hadiah|kado|gift/i, 'hadiah'],
  [/donasi|zakat|sedekah|infaq/i, 'donasi'],
  [/servis|service|perbaikan|reparasi/i, 'perbaikan'],
  [/gaji|salary|upah/i, 'gaji'],
  [/bonus|thr|insentif/i, 'bonus'],
  [/usaha|bisnis|dagang/i, 'usaha'],
  [/freelance|proyek|project/i, 'freelance'],
  [/investasi|saham|reksadana|crypto/i, 'investasi'],
  [/bunga|deposito/i, 'bunga-bank'],
  [/tabungan|nabung/i, 'tabungan'],
  [/jual|penjualan/i, 'penjualan'],
];

export function isCategoryIconKey(value: unknown): value is CategoryIconKey {
  return typeof value === 'string' && GLYPH_BY_KEY.has(value);
}

/** Kunci tebakan dari nama kategori; `null` bila tidak ada yang cocok. */
export function guessCategoryIconKey(name: string): CategoryIconKey | null {
  return KEY_BY_KEYWORD.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

/**
 * Glyph yang siap dirender: ikon tersimpan → tebakan dari nama → default per tipe.
 * Selalu mengembalikan glyph valid, jadi pemanggil tidak perlu menangani null.
 */
export function categoryGlyph(
  category: { icon?: string | null; name?: string | null; type?: CategoryType | null },
  fallbackType: CategoryType = 'expense',
): CategoryGlyph {
  const stored = category.icon ? GLYPH_BY_KEY.get(category.icon) : undefined;
  if (stored) return stored;

  const guessed = category.name ? guessCategoryIconKey(category.name) : null;
  if (guessed) return GLYPH_BY_KEY.get(guessed)!;

  return FALLBACK_GLYPH[category.type ?? fallbackType];
}
