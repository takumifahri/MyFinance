import { drizzle } from 'drizzle-orm/expo-sqlite';
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'finance.db';

function createDrizzle(client: SQLiteDatabase) {
  return drizzle(client, { schema });
}

export type DB = ReturnType<typeof createDrizzle>;
/** Tipe handle di dalam db.transaction(...) — dipakai fungsi query yang bisa ikut transaksi. */
export type DBOrTx = DB | Parameters<Parameters<DB['transaction']>[0]>[0];

let client: SQLiteDatabase | null = null;
let instance: DB | null = null;
let pending: Promise<DB> | null = null;

/**
 * Sengaja async, bukan openDatabaseSync.
 * Di web, operasi sync memblokir main thread sambil menunggu worker WASM yang justru
 * butuh main thread untuk yield — jadi selalu berakhir "Sync operation timeout".
 * API async bekerja di semua platform; native tidak dirugikan.
 *
 * Aman dipanggil berkali-kali: pemanggilan berikutnya memakai promise yang sama.
 */
export async function initDatabase(): Promise<DB> {
  if (instance) return instance;

  pending ??= (async () => {
    const opened = await openDatabaseAsync(DATABASE_NAME, { enableChangeListener: true });
    // expo-sqlite mematikan foreign key secara default: tanpa baris ini semua
    // onDelete ('restrict' / 'set null') tidak ditegakkan sama sekali.
    await opened.execAsync('PRAGMA foreign_keys = ON;');

    client = opened;
    instance = createDrizzle(opened);
    return instance;
  })();

  try {
    return await pending;
  } catch (error) {
    pending = null; // biarkan percobaan berikutnya mengulang dari awal
    throw error;
  }
}

export function getDb(): DB {
  if (!instance) {
    throw new Error(
      'Database belum siap. Pastikan komponen berada di dalam <DatabaseProvider>, ' +
        'atau panggil initDatabase() lebih dulu.',
    );
  }
  return instance;
}

/** Handle expo-sqlite mentah — dipakai fitur backup/import nanti. */
export function getClient(): SQLiteDatabase {
  if (!client) throw new Error('Database belum siap.');
  return client;
}

/**
 * "migrate:fresh" — menghapus file database beserta riwayat migrasinya.
 *
 * Sengaja membuang FILE-nya, bukan DROP TABLE satu per satu: tabel
 * `__drizzle_migrations` ikut lenyap, jadi saat app dibuka lagi seluruh migrasi
 * dijalankan dari nol dan `seedIfNeeded()` mengisi data awal (karena
 * settings.firstRunAt ikut hilang). DROP TABLE manual menyisakan riwayat
 * migrasi, sehingga migrasi TIDAK diulang dan skema jadi kosong permanen.
 *
 * MENGHAPUS SEMUA DATA. Pemanggil WAJIB memuat ulang app setelah ini —
 * modul ini tidak membuka koneksi baru; state di memori harus ikut dibuang.
 */
export async function resetDatabase(): Promise<void> {
  if (client) await client.closeAsync();
  client = null;
  instance = null;
  pending = null;
  await deleteDatabaseAsync(DATABASE_NAME);
}

/**
 * Fasad agar modul query bisa menulis `db.select()...` seperti biasa.
 * Resolusi terjadi saat dipakai, bukan saat file di-import — itulah yang mencegah
 * seluruh app mati hanya karena DB belum terbuka.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const target = getDb() as unknown as Record<string | symbol, unknown>;
    const value = target[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
