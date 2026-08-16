import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';

import { db, type DBOrTx } from '../client';
import { accounts, transactions, type Account, type AccountType } from '../schema';

/**
 * Ekspresi saldo: initialBalance + (masuk) − (keluar).
 * Bentuk ini seragam untuk semua tipe karena transfer disimpan sebagai dua baris
 * (transfer_out di akun asal, transfer_in di akun tujuan).
 */
const balanceExpr = sql<number>`${accounts.initialBalance} + COALESCE(SUM(
  CASE WHEN ${transactions.type} IN ('income','transfer_in')
       THEN ${transactions.amount}
       ELSE -${transactions.amount} END
), 0)`;

export type AccountWithBalance = Account & { balance: number };

/** Query saldo semua akun. Bisa dipakai langsung di useLiveQuery. */
export function accountsWithBalanceQuery(includeArchived = false) {
  const query = db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      initialBalance: accounts.initialBalance,
      sortOrder: accounts.sortOrder,
      archivedAt: accounts.archivedAt,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
      balance: balanceExpr,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .groupBy(accounts.id)
    .orderBy(asc(accounts.sortOrder), asc(accounts.id))
    .$dynamic();

  return includeArchived ? query : query.where(isNull(accounts.archivedAt));
}

export async function listAccountsWithBalance(includeArchived = false) {
  return accountsWithBalanceQuery(includeArchived);
}

export async function getAccount(id: number, tx: DBOrTx = db): Promise<Account | undefined> {
  const [row] = await tx.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return row;
}

/** Total saldo seluruh akun aktif — angka utama di Dashboard. */
export async function getTotalBalance(tx: DBOrTx = db): Promise<number> {
  const rows = await tx
    .select({ balance: balanceExpr })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(isNull(accounts.archivedAt))
    .groupBy(accounts.id);

  return rows.reduce((total, row) => total + Number(row.balance ?? 0), 0);
}

export type CreateAccountInput = {
  name: string;
  type: AccountType;
  initialBalance?: number;
  sortOrder?: number;
};

async function assertUniqueAccountIdentity(
  name: string,
  type: AccountType,
  excludeId?: number,
  tx: DBOrTx = db,
) {
  const identity = and(
    eq(accounts.type, type),
    sql`lower(trim(${accounts.name})) = lower(trim(${name}))`,
    excludeId === undefined ? undefined : ne(accounts.id, excludeId),
  );
  const [existing] = await tx
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(identity)
    .limit(1);
  if (existing) {
    throw new Error(`Akun ${existing.name} sudah ada. Tambahkan saldo ke akun tersebut.`);
  }
}

export async function createAccount(input: CreateAccountInput, tx: DBOrTx = db): Promise<Account> {
  const name = input.name.trim();
  if (!name) throw new Error('Nama akun tidak boleh kosong.');
  if (!Number.isInteger(input.initialBalance ?? 0)) {
    throw new Error('Saldo awal harus bilangan bulat (satuan terkecil).');
  }

  await assertUniqueAccountIdentity(name, input.type, undefined, tx);
  const [row] = await tx.insert(accounts).values({ ...input, name }).returning();
  return row;
}

export async function updateAccount(
  id: number,
  patch: Partial<CreateAccountInput>,
  tx: DBOrTx = db,
): Promise<void> {
  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) throw new Error('Nama akun tidak boleh kosong.');
  if (patch.initialBalance !== undefined && !Number.isInteger(patch.initialBalance)) {
    throw new Error('Saldo awal harus bilangan bulat (satuan terkecil).');
  }

  const current = await getAccount(id, tx);
  if (!current) throw new Error('Akun tidak ditemukan.');
  await assertUniqueAccountIdentity(
    name ?? current.name,
    patch.type ?? current.type,
    id,
    tx,
  );

  await tx
    .update(accounts)
    .set({ ...patch, ...(name ? { name } : {}), updatedAt: new Date() })
    .where(eq(accounts.id, id));
}

export async function countTransactions(accountId: number, tx: DBOrTx = db): Promise<number> {
  const [row] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));
  return Number(row?.count ?? 0);
}

/** Sembunyikan akun tanpa menghilangkan riwayatnya. */
export async function archiveAccount(id: number, tx: DBOrTx = db): Promise<void> {
  await tx
    .update(accounts)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(accounts.id, id));
}

export async function unarchiveAccount(id: number, tx: DBOrTx = db): Promise<void> {
  await tx.update(accounts).set({ archivedAt: null, updatedAt: new Date() }).where(eq(accounts.id, id));
}

/**
 * Hard delete hanya untuk akun yang belum pernah dipakai.
 * Akun bertransaksi harus diarsipkan — menghapusnya = melenyapkan riwayat keuangan.
 */
export async function deleteAccount(id: number): Promise<void> {
  await db.transaction(async (tx) => {
    const used = await countTransactions(id, tx);
    if (used > 0) {
      throw new Error(
        `Akun masih punya ${used} transaksi. Arsipkan akun ini alih-alih menghapusnya.`,
      );
    }
    await tx.delete(accounts).where(eq(accounts.id, id));
  });
}
