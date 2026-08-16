import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { isValidAmount } from '../../utils/money';
import { toDateKey, type DateKey, type Period } from '../../utils/date';
import { db, type DBOrTx } from '../client';
import {
  CASH_FLOW_TYPES,
  accounts,
  categories,
  transactions,
  type Transaction,
  type TransactionType,
} from '../schema';

export type TransactionFilter = {
  period?: Period;
  accountId?: number;
  categoryId?: number;
  /** Default: semua tipe. Untuk laporan pakai CASH_FLOW_TYPES. */
  types?: readonly TransactionType[];
};

function buildFilters(filter: TransactionFilter) {
  const parts = [
    filter.period ? gte(transactions.dateKey, filter.period.from) : undefined,
    filter.period ? lte(transactions.dateKey, filter.period.to) : undefined,
    filter.accountId ? eq(transactions.accountId, filter.accountId) : undefined,
    filter.categoryId ? eq(transactions.categoryId, filter.categoryId) : undefined,
    filter.types?.length ? inArray(transactions.type, [...filter.types]) : undefined,
  ].filter(Boolean);

  return parts.length ? and(...parts) : undefined;
}

/** Daftar transaksi + nama akun/kategori, siap dipakai di FlatList & useLiveQuery. */
export function transactionsQuery(filter: TransactionFilter = {}, limit?: number) {
  const query = db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      note: transactions.note,
      date: transactions.date,
      dateKey: transactions.dateKey,
      transferGroupId: transactions.transferGroupId,
      accountId: transactions.accountId,
      accountName: accounts.name,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(buildFilters(filter))
    .orderBy(desc(transactions.dateKey), desc(transactions.id))
    .$dynamic();

  return limit ? query.limit(limit) : query;
}

export async function getTransaction(id: number, tx: DBOrTx = db): Promise<Transaction | undefined> {
  const [row] = await tx.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return row;
}

// ---------------------------------------------------------------- tulis

export type CreateTransactionInput = {
  accountId: number;
  categoryId?: number | null;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
  note?: string | null;
};

/**
 * Kategori "Gaji" (income) tidak boleh dipakai di transaksi expense.
 * DB tidak bisa menjaga aturan lintas tabel ini, jadi ditegakkan di sini.
 */
async function assertCategoryMatches(
  tx: DBOrTx,
  categoryId: number | null | undefined,
  type: 'income' | 'expense',
) {
  if (categoryId == null) return;
  const [row] = await tx.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!row) throw new Error('Kategori tidak ditemukan.');
  if (row.type !== type) {
    throw new Error(`Kategori "${row.name}" bertipe ${row.type}, tidak cocok untuk transaksi ${type}.`);
  }
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  if (!isValidAmount(input.amount)) {
    throw new Error('Nominal harus bilangan bulat lebih besar dari 0.');
  }

  // Satu insert tidak memerlukan transaction wrapper. Adapter Drizzle Expo memakai
  // transaksi sinkron, jadi callback async justru dapat commit sebelum await selesai.
  await assertCategoryMatches(db, input.categoryId, input.type);
  const [row] = await db
    .insert(transactions)
    .values({
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      type: input.type,
      amount: input.amount,
      note: input.note?.trim() || null,
      date: input.date,
      dateKey: toDateKey(input.date),
    })
    .returning();
  return row;
}

export async function updateTransaction(
  id: number,
  patch: Partial<CreateTransactionInput>,
): Promise<void> {
  if (patch.amount !== undefined && !isValidAmount(patch.amount)) {
    throw new Error('Nominal harus bilangan bulat lebih besar dari 0.');
  }

  await db.transaction(async (tx) => {
    const current = await getTransaction(id, tx);
    if (!current) throw new Error('Transaksi tidak ditemukan.');
    if (current.transferGroupId) {
      throw new Error('Transaksi transfer harus diubah lewat updateTransfer().');
    }

    const nextType = patch.type ?? (current.type as 'income' | 'expense');
    if (patch.categoryId !== undefined || patch.type !== undefined) {
      await assertCategoryMatches(tx, patch.categoryId ?? current.categoryId, nextType);
    }

    await tx
      .update(transactions)
      .set({
        ...patch,
        note: patch.note !== undefined ? patch.note?.trim() || null : undefined,
        ...(patch.date ? { dateKey: toDateKey(patch.date) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transaction(async (tx) => {
    const current = await getTransaction(id, tx);
    if (!current) return;

    // Menghapus satu kaki transfer akan meninggalkan uang menggantung — buang sepasang.
    if (current.transferGroupId) {
      await tx
        .delete(transactions)
        .where(eq(transactions.transferGroupId, current.transferGroupId));
      return;
    }
    await tx.delete(transactions).where(eq(transactions.id, id));
  });
}

// ------------------------------------------------------------- transfer

export type CreateTransferInput = {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  date: Date;
  note?: string | null;
};

/** Transfer = dua baris berpasangan dalam satu transaksi DB. */
export async function createTransfer(input: CreateTransferInput): Promise<string> {
  if (!isValidAmount(input.amount)) {
    throw new Error('Nominal harus bilangan bulat lebih besar dari 0.');
  }
  if (input.fromAccountId === input.toAccountId) {
    throw new Error('Akun asal dan tujuan tidak boleh sama.');
  }

  const transferGroupId = Crypto.randomUUID();
  const base = {
    amount: input.amount,
    date: input.date,
    dateKey: toDateKey(input.date),
    note: input.note?.trim() || null,
    categoryId: null,
    transferGroupId,
  };

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values([
      { ...base, accountId: input.fromAccountId, type: 'transfer_out' },
      { ...base, accountId: input.toAccountId, type: 'transfer_in' },
    ]);
  });

  return transferGroupId;
}

export async function getTransfer(transferGroupId: string, tx: DBOrTx = db) {
  const rows = await tx
    .select()
    .from(transactions)
    .where(eq(transactions.transferGroupId, transferGroupId));

  return {
    out: rows.find((r) => r.type === 'transfer_out'),
    in: rows.find((r) => r.type === 'transfer_in'),
  };
}

/** Ubah transfer sebagai satu kesatuan: hapus pasangan lama, tulis pasangan baru. */
export async function updateTransfer(
  transferGroupId: string,
  patch: Partial<CreateTransferInput>,
): Promise<void> {
  await db.transaction(async (tx) => {
    const { out, in: incoming } = await getTransfer(transferGroupId, tx);
    if (!out || !incoming) throw new Error('Transfer tidak lengkap atau tidak ditemukan.');

    const amount = patch.amount ?? out.amount;
    const date = patch.date ?? out.date;
    const fromAccountId = patch.fromAccountId ?? out.accountId;
    const toAccountId = patch.toAccountId ?? incoming.accountId;

    if (!isValidAmount(amount)) throw new Error('Nominal harus bilangan bulat lebih besar dari 0.');
    if (fromAccountId === toAccountId) throw new Error('Akun asal dan tujuan tidak boleh sama.');

    const shared = {
      amount,
      date,
      dateKey: toDateKey(date),
      note: patch.note !== undefined ? patch.note?.trim() || null : out.note,
      updatedAt: new Date(),
    };

    await tx
      .update(transactions)
      .set({ ...shared, accountId: fromAccountId })
      .where(eq(transactions.id, out.id));
    await tx
      .update(transactions)
      .set({ ...shared, accountId: toAccountId })
      .where(eq(transactions.id, incoming.id));
  });
}

export async function deleteTransfer(transferGroupId: string): Promise<void> {
  await db.delete(transactions).where(eq(transactions.transferGroupId, transferGroupId));
}

// ------------------------------------------------------------- laporan
// Semua fungsi di bawah SELALU mengecualikan transfer: uang yang cuma pindah
// dompet bukan pemasukan maupun pengeluaran.

export type PeriodSummary = { income: number; expense: number; net: number };

/** Query reaktif ringkasan periode — dipakai Dashboard lewat useLiveQuery. */
export function periodSummaryQuery(period: Period, accountId?: number) {
  return db
    .select({
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(buildFilters({ period, accountId, types: CASH_FLOW_TYPES }));
}

export async function getPeriodSummary(
  period: Period,
  accountId?: number,
  tx: DBOrTx = db,
): Promise<PeriodSummary> {
  const [row] = tx === db
    ? await periodSummaryQuery(period, accountId)
    : await tx
        .select({
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(buildFilters({ period, accountId, types: CASH_FLOW_TYPES }));

  const income = Number(row?.income ?? 0);
  const expense = Number(row?.expense ?? 0);
  return { income, expense, net: income - expense };
}

/** Pengeluaran per kategori — sumber data pie chart. */
export function spendingByCategoryQuery(period: Period) {
  return db
    .select({
      categoryId: transactions.categoryId,
      categoryName: sql<string>`COALESCE(${categories.name}, 'Tanpa kategori')`,
      color: categories.color,
      total: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.type, 'expense'),
        gte(transactions.dateKey, period.from),
        lte(transactions.dateKey, period.to),
      ),
    )
    .groupBy(transactions.categoryId)
    .orderBy(desc(sql`SUM(${transactions.amount})`));
}

/** Tren harian income vs expense — sumber data line chart. Hari kosong tidak muncul. */
export function dailyTrendQuery(period: Period) {
  return db
    .select({
      dateKey: transactions.dateKey,
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(
      and(
        inArray(transactions.type, [...CASH_FLOW_TYPES]),
        gte(transactions.dateKey, period.from),
        lte(transactions.dateKey, period.to),
      ),
    )
    .groupBy(transactions.dateKey)
    .orderBy(transactions.dateKey);
}

/** Sanity check integritas: transferGroupId yang tidak punya tepat 2 baris. */
export async function findBrokenTransfers(tx: DBOrTx = db): Promise<DateKey[]> {
  const rows = await tx
    .select({ groupId: transactions.transferGroupId, count: sql<number>`count(*)` })
    .from(transactions)
    .where(isNotNull(transactions.transferGroupId))
    .groupBy(transactions.transferGroupId)
    .having(sql`count(*) <> 2`);

  return rows.map((r) => r.groupId!).filter(Boolean);
}
