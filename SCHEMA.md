# SCHEMA — FinTrack (Local-First, SQLite + Drizzle)

Model data untuk penyimpanan **lokal di perangkat** (`expo-sqlite`) diakses lewat **Drizzle ORM**. Semua tipe TypeScript, type-safe.

---

## 1. Prinsip

- **Uang = `INTEGER`** dalam satuan terkecil (IDR = rupiah). **Tidak pernah** `REAL`/float untuk uang.
- **Nominal transaksi selalu positif**; arah uang ditentukan oleh `type` (income menambah saldo, expense mengurangi).
- **Tanggal = `INTEGER` (timestamp)**, disimpan via Drizzle `{ mode: 'timestamp' }` → dapat objek `Date` di TypeScript.
- **Tanpa entitas User** (single-user per perangkat). PK memakai `INTEGER autoincrement` (sederhana; cukup untuk local-first tanpa sync).

---

## 2. Diagram Relasi (ringkas)

```
accounts (1) ─────< (N) transactions >───── (N?) categories (1)
                          │
                          └─ setiap transaksi milik 1 account,
                             boleh punya 1 category (nullable)
settings: tabel key–value untuk preferensi app
```

- **account** 1 — N **transaction**
- **category** 1 — N **transaction** (categoryId nullable, mis. untuk transfer)

---

## 3. Tabel

### `accounts`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK auto | |
| name | TEXT not null | mis. "Dompet", "BCA" |
| type | TEXT not null | `cash` \| `bank` \| `ewallet` |
| currency | TEXT default `'IDR'` | |
| initialBalance | INTEGER default 0 | saldo awal (satuan terkecil) |
| createdAt | INTEGER (timestamp) | |

### `categories`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK auto | |
| name | TEXT not null | mis. "Makan", "Gaji" |
| type | TEXT not null | `income` \| `expense` |
| color | TEXT null | untuk label/chart |
| createdAt | INTEGER (timestamp) | |

### `transactions`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK auto | |
| accountId | INTEGER not null → accounts.id | on delete cascade |
| categoryId | INTEGER null → categories.id | on delete set null |
| type | TEXT not null | `income` \| `expense` |
| amount | INTEGER not null | positif, satuan terkecil |
| note | TEXT null | |
| date | INTEGER (timestamp) not null | tanggal transaksi |
| createdAt | INTEGER (timestamp) | |

Index: `(date)`, `(accountId)`, `(categoryId)`.

### `settings`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| key | TEXT PK | mis. `theme`, `currency` |
| value | TEXT | |

---

## 4. Skema Drizzle (`src/db/schema.ts`)

```ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['cash', 'bank', 'ewallet'] }).notNull().default('cash'),
  currency: text('currency').notNull().default('IDR'),
  initialBalance: integer('initial_balance').notNull().default(0), // satuan terkecil
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  color: text('color'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: integer('amount').notNull(), // positif, satuan terkecil
  note: text('note'),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Tipe hasil inferensi Drizzle — dipakai di seluruh app
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
```

---

## 5. Perhitungan Saldo (di perangkat)

Saldo sebuah akun:

```
saldo(account) = initialBalance
              + Σ amount transaksi income di account
              − Σ amount transaksi expense di account
```

Dihitung on-the-fly via query agregasi Drizzle (mis. `SUM(CASE WHEN type='income' ...)`). Untuk v1 cukup dihitung saat dibutuhkan; jika daftar akun terasa berat nanti, bisa di-cache.

---

## 6. Format Backup/Export (JSON)

Ekspor seluruh isi DB ke satu file agar data tak hilang saat ganti HP:

```json
{
  "version": 1,
  "exportedAt": "2026-08-16T09:00:00.000Z",
  "accounts":   [ /* baris accounts */ ],
  "categories": [ /* baris categories */ ],
  "transactions": [ /* baris transactions */ ],
  "settings":   [ /* baris settings */ ]
}
```

- **Export:** baca semua tabel → tulis file → bagikan (share sheet) via `expo-file-system` + `expo-sharing`.
- **Import:** baca file → validasi `version` → tulis ke DB (opsi **timpa** atau **gabung**). Bungkus dalam satu transaksi DB agar atomik.
- Sertakan `version` agar format bisa berkembang tanpa merusak backup lama.

---

*Setup migrasi (drizzle-kit + `useMigrations`) dijelaskan di `ARCHITECTURE.md`.*
