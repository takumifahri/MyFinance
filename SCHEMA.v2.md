# SCHEMA v2 (draft) — FinTrack

Rancangan ulang layer data. Menutup 5 lubang desain dari review: transfer, import-merge, cascade delete, timezone, dan multi-currency.

> Status: draft usulan. Kalau disetujui, file ini menggantikan `SCHEMA.md`.

---

## 1. Keputusan Dasar

| # | Keputusan | Alasan |
|---|-----------|--------|
| D1 | Uang = `INTEGER` satuan terkecil, **selalu positif** | Hindari galat float. Arah uang ditentukan `type`, bukan tanda minus. |
| D2 | Satu mata uang untuk seluruh app (di `settings`), **bukan** per akun | Multi-currency out of scope; kolom `currency` per akun bikin "total saldo" salah jumlah. |
| D3 | Transfer = **dua baris** `transfer_out` + `transfer_in` yang dipasangkan `transferGroupId` | Matematika saldo tetap seragam (tiap baris milik 1 akun); daftar transaksi per akun otomatis benar. |
| D4 | Akun & kategori **di-arsip**, tidak dihapus permanen bila punya transaksi | Hard-delete akun = riwayat keuangan hilang tanpa undo. |
| D5 | Tanggal disimpan `date` (timestamp) **+** `dateKey` (`'YYYY-MM-DD'` lokal) | Semua filter/grouping berbasis hari lokal. `dateKey` bikin query bulanan murah & bebas jebakan timezone. |
| D6 | PK `INTEGER autoincrement`; import v1 **restore-only (timpa)** | Tanpa sync, integer PK cukup. Mode "gabung" dicoret dari v1 karena tabrakan id. Escape hatch di §8. |
| D7 | Semua tabel punya `createdAt` + `updatedAt` | Murah sekarang, wajib kalau kelak ada sync/audit/debug. |

---

## 2. Diagram Relasi

```
                    ┌─────────────┐
                    │  accounts   │ archivedAt (soft delete)
                    └──────┬──────┘
                           │ 1
                           │
                           │ N
┌─────────────┐  1     N ┌─┴────────────┐
│ categories  ├──────────┤ transactions │
└─────────────┘          └──────┬───────┘
  archivedAt                    │
  categoryId nullable           │ transferGroupId (TEXT, nullable)
                                └── memasangkan 2 baris transfer_out/transfer_in

settings : key–value (tema, mata uang, versi skema, dll.)
```

---

## 3. Invarian Domain

Aturan yang **harus** selalu benar. Yang bisa dijaga SQLite → `CHECK`. Sisanya dijaga di `src/db/queries/*` (jangan di UI).

| Invarian | Ditegakkan di |
|---|---|
| `amount > 0` selalu | `CHECK` |
| `type ∈ {income, expense, transfer_in, transfer_out}` | `CHECK` (enum Drizzle) |
| `dateKey` cocok pola `YYYY-MM-DD` | `CHECK` (panjang 10) |
| Transaksi `income`/`expense` **wajib** punah `transferGroupId = NULL` | `CHECK` |
| Transaksi transfer **wajib** punya `transferGroupId` **dan** `categoryId = NULL` | `CHECK` |
| Tepat 2 baris per `transferGroupId`, beda akun, `amount` sama | kode (`db.transaction`) |
| `category.type` harus cocok dengan `transaction.type` (kategori "Gaji" tak boleh dipakai di expense) | kode + validasi form |
| Akun dengan ≥1 transaksi tak boleh hard-delete | kode |
| Laporan pemasukan/pengeluaran **mengabaikan** baris transfer | kode (helper query wajib) |

> **PRAGMA wajib.** expo-sqlite tidak menegakkan foreign key kecuali dinyalakan. Jalankan `PRAGMA foreign_keys = ON;` sekali saat membuka DB (lihat §7), kalau tidak `onDelete` dan FK-mu cuma dekorasi.

---

## 4. Tabel

### `accounts`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK auto | |
| name | TEXT not null | "Dompet", "BCA" |
| type | TEXT not null | `cash` \| `bank` \| `ewallet` |
| initialBalance | INTEGER not null default 0 | satuan terkecil, boleh negatif (mis. kartu kredit) |
| sortOrder | INTEGER not null default 0 | urutan tampil di UI |
| archivedAt | INTEGER null | terisi = disembunyikan dari picker & total saldo |
| createdAt / updatedAt | INTEGER (timestamp) | |

Catatan: **tidak ada** kolom `currency` (D2).

### `categories`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK auto | |
| name | TEXT not null | |
| type | TEXT not null | `income` \| `expense` |
| color | TEXT null | hex untuk chart/label |
| icon | TEXT null | nama ikon (opsional) |
| isDefault | INTEGER (bool) not null default 0 | hasil seed; jangan ikut ter-hapus saat reset user data |
| archivedAt | INTEGER null | |
| createdAt / updatedAt | INTEGER | |

Unique: `(name, type)` — cegah dua kategori "Makan" bertipe expense.

### `transactions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK auto | |
| accountId | INTEGER not null → accounts.id | `onDelete: restrict` (D4) |
| categoryId | INTEGER null → categories.id | `onDelete: set null`; selalu NULL untuk transfer |
| type | TEXT not null | `income` \| `expense` \| `transfer_in` \| `transfer_out` |
| amount | INTEGER not null | > 0 |
| note | TEXT null | |
| date | INTEGER (timestamp) not null | waktu transaksi |
| dateKey | TEXT not null | `'2026-08-16'` — hari **lokal**, sumber kebenaran untuk filter/grouping |
| transferGroupId | TEXT null | UUID; sama untuk pasangan out/in |
| createdAt / updatedAt | INTEGER | |

Index: `(dateKey)`, `(accountId, dateKey)`, `(categoryId)`, `(transferGroupId)`.

### `settings`
Key–value. Key yang dipakai v1:

| key | contoh value | Keterangan |
|---|---|---|
| `currency` | `IDR` | mata uang tunggal app |
| `currencyMinorUnits` | `0` | IDR = 0 desimal; USD = 2 |
| `theme` | `system` \| `light` \| `dark` | |
| `ownerName` | `Takumi` | nama panggilan lokal untuk personalisasi; bukan entitas User |
| `firstRunAt` | ISO string | penanda seed sudah jalan |
| `lastBackupAt` | ISO string | untuk pengingat backup di Pengaturan |
| `dataVersion` | `1` | versi format data logis (≠ versi migrasi Drizzle) |

---

## 5. Skema Drizzle (`src/db/schema.ts`)

```ts
import { sqliteTable, integer, text, index, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
};

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['cash', 'bank', 'ewallet'] }).notNull().default('cash'),
  initialBalance: integer('initial_balance').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  ...timestamps,
});

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    color: text('color'),
    icon: text('icon'),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    archivedAt: integer('archived_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('uq_categories_name_type').on(t.name, t.type)],
);

export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    type: text('type', {
      enum: ['income', 'expense', 'transfer_in', 'transfer_out'],
    }).notNull(),
    amount: integer('amount').notNull(),
    note: text('note'),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    dateKey: text('date_key').notNull(),          // 'YYYY-MM-DD' lokal
    transferGroupId: text('transfer_group_id'),
    ...timestamps,
  },
  (t) => [
    index('idx_tx_date_key').on(t.dateKey),
    index('idx_tx_account_date').on(t.accountId, t.dateKey),
    index('idx_tx_category').on(t.categoryId),
    index('idx_tx_transfer_group').on(t.transferGroupId),
    check('ck_tx_amount_positive', sql`${t.amount} > 0`),
    check('ck_tx_date_key_shape', sql`length(${t.dateKey}) = 10`),
    check(
      'ck_tx_transfer_consistency',
      sql`(${t.type} IN ('income','expense') AND ${t.transferGroupId} IS NULL)
          OR (${t.type} IN ('transfer_in','transfer_out')
              AND ${t.transferGroupId} IS NOT NULL
              AND ${t.categoryId} IS NULL)`,
    ),
  ],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export const CASH_FLOW_TYPES = ['income', 'expense'] as const;   // dipakai semua query laporan
```

> Versi Drizzle lawas memakai `(t) => ({ ... })` (object) alih-alih array untuk konfigurasi tabel kedua, dan belum punya `check()`. Cek versi terpasang; kalau `check` tidak ada, tulis constraint-nya manual di file migrasi SQL hasil generate.

---

## 6. Query Inti

**Saldo per akun** — seragam berkat D3, satu agregasi saja:

```ts
const balances = db
  .select({
    accountId: accounts.id,
    balance: sql<number>`${accounts.initialBalance} + COALESCE(SUM(
      CASE WHEN ${transactions.type} IN ('income','transfer_in')
           THEN ${transactions.amount} ELSE -${transactions.amount} END
    ), 0)`,
  })
  .from(accounts)
  .leftJoin(transactions, eq(transactions.accountId, accounts.id))
  .where(isNull(accounts.archivedAt))
  .groupBy(accounts.id);
```

**Ringkasan periode** — wajib buang transfer, kalau tidak pengeluaran jadi menggelembung:

```ts
.where(and(
  inArray(transactions.type, CASH_FLOW_TYPES),   // ← jangan pernah lupa
  gte(transactions.dateKey, '2026-08-01'),
  lte(transactions.dateKey, '2026-08-31'),
))
```

Karena `dateKey` string `YYYY-MM-DD`, perbandingan leksikografis = perbandingan tanggal. Filter bulan cukup `LIKE '2026-08%'`.

**Transfer (tulis)** — satu `db.transaction`, dua baris, satu `transferGroupId`:

```ts
await db.transaction(async (tx) => {
  const gid = Crypto.randomUUID();               // expo-crypto
  const base = { amount, date, dateKey, transferGroupId: gid, note };
  await tx.insert(transactions).values([
    { ...base, accountId: fromId, type: 'transfer_out' },
    { ...base, accountId: toId,   type: 'transfer_in'  },
  ]);
});
```
Edit/hapus transfer **selalu** lewat `transferGroupId`, tidak pernah per-`id`.

---

## 7. Inisialisasi & Seed

```ts
const expoDb = openDatabaseSync('finance.db', { enableChangeListener: true });
expoDb.execSync('PRAGMA foreign_keys = ON;');    // wajib — lihat §3
export const db = drizzle(expoDb, { schema });
```

Seed dijalankan sekali setelah migrasi sukses, dijaga `settings.firstRunAt` (bukan "cek tabel kosong" — user yang sengaja menghapus semua kategori tak boleh kebanjiran seed lagi):
kategori default expense (Makan, Transport, Belanja, Tagihan, Hiburan, Kesehatan, Lainnya) + income (Gaji, Bonus, Lainnya), plus satu akun "Dompet" bertipe `cash`.

---

## 8. Backup / Restore (format v2)

```json
{
  "format": "fintrack-backup",
  "version": 2,
  "exportedAt": "2026-08-16T09:00:00.000Z",
  "app": { "version": "1.0.0", "dataVersion": 1 },
  "counts": { "accounts": 3, "categories": 12, "transactions": 480 },
  "data": {
    "accounts": [], "categories": [], "transactions": [], "settings": []
  }
}
```

- **Export:** baca semua tabel → tulis JSON → share sheet (`expo-file-system` + `expo-sharing`). Simpan `lastBackupAt`.
- **Restore (satu-satunya mode di v1):** validasi `format` + `version` → **timpa total** dalam satu `db.transaction` (delete semua → insert semua, urut accounts → categories → transactions → settings). Atomik: gagal di tengah = DB kembali seperti semula.
- Wajib tampilkan konfirmasi keras sebelum restore ("data saat ini akan diganti"), plus tawarkan auto-export dulu.
- `counts` dipakai untuk sanity check setelah import.
- Backup v1 (kalau sempat ada) dibaca lewat adapter: isi `dateKey` dari `date`, `transferGroupId = null`.

**Escape hatch untuk mode "gabung"/sync di masa depan:** tambahkan kolom `uid TEXT UNIQUE` (UUID) ke tiap tabel, backfill sekali, lalu pakai `uid` sebagai kunci dedup saat merge — id integer tetap dipakai internal. Tidak dikerjakan di v1.

---

## 9. Dampak ke Dokumen Lain

- `PRD.md` §3: hapus "gabung" dari F8; tambahkan transfer (F9) ke MVP karena sudah masuk skema.
- `PRD.md` §6 F5/F6: catat bahwa semua angka laporan mengecualikan transfer.
- `ARCHITECTURE.md` §4: tambahkan `PRAGMA foreign_keys = ON`.
- `ARCHITECTURE.md` §5: tambahkan langkah `babel-plugin-inline-import` untuk file `.sql`.
- `ARCHITECTURE.md` §7: ADR "PK integer" perlu alasan baru — *import restore-only*, bukan sekadar "tak ada sync".
- `ROADMAP.md` M2: pindahkan transfer ke sini (schema sudah siap), sisakan polish di M5.

---

## 10. Sengaja Belum Ada

`budgets`, `recurring_rules`, `attachments`, `tags`, `accounts.currency`. Semuanya bisa ditambah sebagai tabel baru tanpa mengubah tiga tabel inti — itulah alasan bentuk di atas dipilih.
