import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Aturan yang berlaku di seluruh skema (lihat SCHEMA.v2.md):
 * - Uang = INTEGER satuan terkecil (IDR = rupiah), SELALU positif.
 *   Arah uang ditentukan oleh `type`, bukan tanda minus.
 * - Tanggal disimpan dua kali: `date` (timestamp) untuk urutan waktu,
 *   `dateKey` ('YYYY-MM-DD' waktu lokal) untuk semua filter & grouping.
 * - Akun/kategori diarsipkan, tidak dihapus permanen bila sudah dipakai.
 */

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
};

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['cash', 'bank', 'ewallet'] })
    .notNull()
    .default('cash'),
  /** Saldo awal; boleh negatif (mis. kartu kredit). */
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
    /** Selalu > 0. */
    amount: integer('amount').notNull(),
    note: text('note'),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    /** 'YYYY-MM-DD' menurut zona waktu perangkat — sumber kebenaran untuk filter periode. */
    dateKey: text('date_key').notNull(),
    /** UUID; sama untuk pasangan transfer_out/transfer_in. NULL untuk income/expense. */
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
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type AccountType = Account['type'];
export type CategoryType = Category['type'];
export type TransactionType = Transaction['type'];

/**
 * Tipe yang boleh masuk laporan pemasukan/pengeluaran.
 * Transfer SELALU dikecualikan — kalau tidak, pengeluaran jadi menggelembung.
 */
export const CASH_FLOW_TYPES = ['income', 'expense'] as const;
export const TRANSFER_TYPES = ['transfer_in', 'transfer_out'] as const;
