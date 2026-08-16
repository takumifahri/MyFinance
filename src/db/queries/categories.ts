import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { db, type DBOrTx } from '../client';
import { categories, transactions, type Category, type CategoryType } from '../schema';

export function categoriesQuery(type?: CategoryType, includeArchived = false) {
  const filters = [
    type ? eq(categories.type, type) : undefined,
    includeArchived ? undefined : isNull(categories.archivedAt),
  ].filter(Boolean);

  return db
    .select()
    .from(categories)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(categories.type), asc(categories.name));
}

export async function getCategory(id: number, tx: DBOrTx = db): Promise<Category | undefined> {
  const [row] = await tx.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row;
}

export type CreateCategoryInput = {
  name: string;
  type: CategoryType;
  color?: string | null;
  icon?: string | null;
};

export async function createCategory(
  input: CreateCategoryInput,
  tx: DBOrTx = db,
): Promise<Category> {
  const name = input.name.trim();
  if (!name) throw new Error('Nama kategori tidak boleh kosong.');

  const [row] = await tx
    .insert(categories)
    .values({ ...input, name })
    .returning();
  return row;
}

export async function updateCategory(
  id: number,
  patch: Partial<CreateCategoryInput>,
  tx: DBOrTx = db,
): Promise<void> {
  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) throw new Error('Nama kategori tidak boleh kosong.');

  await tx
    .update(categories)
    .set({ ...patch, ...(name ? { name } : {}), updatedAt: new Date() })
    .where(eq(categories.id, id));
}

export async function archiveCategory(id: number, tx: DBOrTx = db): Promise<void> {
  await tx
    .update(categories)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(categories.id, id));
}

export async function unarchiveCategory(id: number, tx: DBOrTx = db): Promise<void> {
  await tx
    .update(categories)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(categories.id, id));
}

/**
 * Menghapus kategori membuat transaksi lamanya jadi "tanpa kategori" (FK set null),
 * jadi transaksinya tetap utuh. Tetap tawarkan arsip sebagai default di UI.
 */
export async function deleteCategory(id: number, tx: DBOrTx = db): Promise<void> {
  await tx.delete(categories).where(eq(categories.id, id));
}

export async function countTransactions(categoryId: number, tx: DBOrTx = db): Promise<number> {
  const [row] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId));
  return Number(row?.count ?? 0);
}
