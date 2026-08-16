import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MIN_NOTABLE_AMOUNT,
  dailyAverage,
  evaluateSpendingAlert,
  type SpendingSignal,
} from './spending-alert.ts';

/** Pengeluaran wajar: saldo tebal, sesuai kebiasaan, bulan masih surplus. */
function signal(overrides: Partial<SpendingSignal> = {}): SpendingSignal {
  return {
    amount: 50_000,
    accountName: 'Dompet',
    accountBalance: 2_000_000,
    monthIncome: 5_000_000,
    monthExpense: 1_000_000,
    baselineTotal: 900_000,
    baselineDays: 20, // rata-rata Rp45.000 per hari belanja
    ...overrides,
  };
}

test('transaksi wajar tidak memicu peringatan', () => {
  assert.equal(evaluateSpendingAlert(signal()), null);
});

test('saldo kurang memicu peringatan overdraft dengan selisihnya', () => {
  const alert = evaluateSpendingAlert(signal({ amount: 300_000, accountBalance: 250_000 }));
  assert.equal(alert?.rule, 'overdraft');
  assert.equal(alert?.level, 'stop');
  assert.match(alert!.message, /kurang Rp50\.000/);
});

test('overdraft tetap diperingatkan walau nominalnya kecil', () => {
  const alert = evaluateSpendingAlert(signal({ amount: 5_000, accountBalance: 1_000 }));
  assert.equal(alert?.rule, 'overdraft');
});

test('nominal kecil tidak pernah dianggap boros selama saldo cukup', () => {
  const alert = evaluateSpendingAlert(
    signal({ amount: MIN_NOTABLE_AMOUNT - 1, accountBalance: MIN_NOTABLE_AMOUNT, baselineDays: 30 }),
  );
  assert.equal(alert, null);
});

test('memakai separuh saldo akun memicu peringatan porsi saldo', () => {
  const alert = evaluateSpendingAlert(signal({ amount: 500_000, accountBalance: 900_000 }));
  assert.equal(alert?.rule, 'balance-share');
  assert.match(alert!.message, /Sisanya nanti Rp400\.000/);
});

test('tiga kali lipat kebiasaan memicu peringatan kebiasaan', () => {
  const alert = evaluateSpendingAlert(signal({ amount: 150_000 }));
  assert.equal(alert?.rule, 'above-habit');
  assert.match(alert!.message, /Rp45\.000 per hari/);
});

test('riwayat kurang dari tujuh hari tidak dipakai sebagai pembanding', () => {
  const alert = evaluateSpendingAlert(
    signal({ amount: 150_000, baselineTotal: 270_000, baselineDays: 6 }),
  );
  assert.equal(alert, null);
});

test('defisit bulan berjalan diperingatkan setelah aturan lain lewat', () => {
  const alert = evaluateSpendingAlert(
    signal({ amount: 150_000, monthIncome: 1_000_000, monthExpense: 950_000, baselineDays: 0 }),
  );
  assert.equal(alert?.rule, 'month-deficit');
  assert.match(alert!.message, /Rp100\.000 lebih besar/);
});

test('tanpa pemasukan tercatat, defisit tidak dihitung', () => {
  const alert = evaluateSpendingAlert(
    signal({ amount: 150_000, monthIncome: 0, monthExpense: 950_000, baselineDays: 0 }),
  );
  assert.equal(alert, null);
});

test('hanya satu peringatan: overdraft menang atas aturan lain', () => {
  const alert = evaluateSpendingAlert(
    signal({ amount: 900_000, accountBalance: 500_000, monthIncome: 100_000, monthExpense: 100_000 }),
  );
  assert.equal(alert?.rule, 'overdraft');
});

test('rata-rata harian memakai hari aktif, dan nol saat belum ada data', () => {
  assert.equal(dailyAverage({ baselineTotal: 900_000, baselineDays: 20 }), 45_000);
  assert.equal(dailyAverage({ baselineTotal: 0, baselineDays: 0 }), 0);
});

test('nominal tidak valid diabaikan', () => {
  assert.equal(evaluateSpendingAlert(signal({ amount: 0 })), null);
  assert.equal(evaluateSpendingAlert(signal({ amount: Number.NaN })), null);
});
