import { isValidAmount, parseMoney } from '../../utils/money.ts';

import type { CreateTransactionInput } from '../../db/queries/transactions.ts';

export type TransactionDraft = {
  type: 'income' | 'expense';
  amountText: string;
  accountId: number | null;
  categoryId: number | null;
  note: string;
  date: Date;
};

export type PreparedTransaction =
  | { ok: true; value: CreateTransactionInput }
  | { ok: false; error: string };

/** Tampilan input IDR tanpa mengubah aturan domain: hanya digit + pemisah ribuan. */
export function formatAmountInput(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function prepareTransactionDraft(draft: TransactionDraft): PreparedTransaction {
  const amount = parseMoney(draft.amountText);
  if (!isValidAmount(amount ?? 0)) return { ok: false, error: 'Masukkan nominal yang valid.' };
  if (draft.accountId === null) return { ok: false, error: 'Pilih akun transaksi.' };

  return {
    ok: true,
    value: {
      type: draft.type,
      amount: amount!,
      accountId: draft.accountId,
      categoryId: draft.categoryId,
      note: draft.note.trim() || null,
      date: draft.date,
    },
  };
}
