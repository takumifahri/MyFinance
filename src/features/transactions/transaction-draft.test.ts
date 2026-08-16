import assert from 'node:assert/strict';
import test from 'node:test';

import { formatAmountInput, prepareTransactionDraft } from './transaction-draft.ts';

test('nominal diberi pemisah ribuan selama pengguna mengetik', () => {
  assert.equal(formatAmountInput('1000'), '1.000');
  assert.equal(formatAmountInput('10000'), '10.000');
  assert.equal(formatAmountInput('1.000.000'), '1.000.000');
});

test('draft pengeluaran valid menjadi perintah transaksi dengan nominal integer', () => {
  const date = new Date(2026, 7, 16, 10, 30);
  const result = prepareTransactionDraft({
    type: 'expense',
    amountText: 'Rp 125.000',
    accountId: 2,
    categoryId: 4,
    note: '  Belanja mingguan  ',
    date,
  });

  assert.deepEqual(result, {
    ok: true,
    value: {
      type: 'expense',
      amount: 125000,
      accountId: 2,
      categoryId: 4,
      note: 'Belanja mingguan',
      date,
    },
  });
});
