/**
 * Deteksi "boros" saat menyimpan pengeluaran.
 *
 * Prinsip yang dipakai supaya peringatan tidak meleset:
 * 1. HANYA pengeluaran. Pemasukan tidak pernah diperingatkan.
 * 2. Ada AMBANG NOMINAL (`MIN_NOTABLE_AMOUNT`). Belanja Rp5.000 tidak pernah
 *    dianggap boros walau saldo tinggal Rp8.000 — peringatan receh bikin user
 *    berhenti membaca peringatan sama sekali.
 * 3. Ada AMBANG DATA (`MIN_OBSERVED_DAYS`). Aturan "di atas kebiasaan" baru
 *    hidup setelah ada cukup riwayat; app yang baru dipasang tidak punya
 *    kebiasaan untuk dibandingkan.
 * 4. Rata-rata dihitung per HARI YANG ADA TRANSAKSINYA, bukan dibagi 30.
 *    Membagi 30 membuat rata-rata user yang jarang mencatat jadi sangat kecil,
 *    sehingga semua transaksi tampak "boros".
 * 5. SATU peringatan saja per simpan — aturan pertama yang cocok menurut urutan
 *    prioritas di bawah. Menumpuk peringatan membuatnya terasa seperti error.
 * 6. Peringatan TIDAK PERNAH memblokir. Semua hanya konfirmasi; user tetap
 *    boleh menyimpan karena hanya dia yang tahu konteks pengeluarannya.
 */

/** Di bawah ini transaksi dianggap terlalu kecil untuk diperingatkan. */
export const MIN_NOTABLE_AMOUNT = 25_000;

/** Minimal jumlah hari bertransaksi sebelum "kebiasaan" boleh dipakai sebagai pembanding. */
export const MIN_OBSERVED_DAYS = 7;

/** Sekali transaksi memakai ≥ 50% saldo akun. */
export const BALANCE_SHARE_LIMIT = 0.5;

/** Transaksi ≥ 3× rata-rata pengeluaran harian. */
export const HABIT_MULTIPLIER = 3;

export type SpendingSignal = {
  /** Nominal pengeluaran yang akan disimpan (positif, satuan terkecil). */
  amount: number;
  /** Nama akun untuk pesan. */
  accountName: string;
  /** Saldo akun SEBELUM transaksi ini. */
  accountBalance: number;
  /** Pemasukan bulan berjalan. */
  monthIncome: number;
  /** Pengeluaran bulan berjalan, BELUM termasuk transaksi ini. */
  monthExpense: number;
  /** Total pengeluaran pada jendela pembanding (mis. 30 hari terakhir). */
  baselineTotal: number;
  /** Banyaknya hari berbeda yang punya pengeluaran di jendela itu. */
  baselineDays: number;
};

export type SpendingAlert = {
  /** 'stop' = saldo tidak cukup; 'warn' = boleh jalan tapi perlu sadar. */
  level: 'stop' | 'warn';
  /** Kode aturan — memudahkan tes dan penelusuran. */
  rule: 'overdraft' | 'balance-share' | 'above-habit' | 'month-deficit';
  title: string;
  message: string;
};

/** Rata-rata pengeluaran per hari aktif; 0 bila belum ada data. */
export function dailyAverage(signal: Pick<SpendingSignal, 'baselineTotal' | 'baselineDays'>): number {
  if (signal.baselineDays <= 0) return 0;
  return Math.round(signal.baselineTotal / signal.baselineDays);
}

const rupiah = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

/**
 * Mengembalikan satu peringatan, atau `null` bila transaksi ini wajar.
 * Fungsi murni: seluruh input datang dari `signal`, tidak menyentuh DB atau UI.
 */
export function evaluateSpendingAlert(signal: SpendingSignal): SpendingAlert | null {
  const { amount, accountBalance, accountName } = signal;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // 1. Saldo tidak cukup — satu-satunya aturan yang berlaku pada nominal berapa pun,
  //    karena ini fakta tentang akun, bukan penilaian atas gaya belanja.
  if (amount > accountBalance) {
    const shortfall = amount - accountBalance;
    return {
      level: 'stop',
      rule: 'overdraft',
      title: `Saldo ${accountName} tidak cukup`,
      message: `Saldo tinggal ${rupiah(accountBalance)}, kurang ${rupiah(shortfall)}. Kalau tetap disimpan, saldo akun ini jadi minus.`,
    };
  }

  if (amount < MIN_NOTABLE_AMOUNT) return null;

  // 2. Menghabiskan sebagian besar saldo akun sekaligus.
  if (accountBalance > 0 && amount >= accountBalance * BALANCE_SHARE_LIMIT) {
    const share = Math.round((amount / accountBalance) * 100);
    return {
      level: 'warn',
      rule: 'balance-share',
      title: 'Sekali pakai, saldo tinggal sedikit',
      message: `Transaksi ini memakai ${share}% saldo ${accountName}. Sisanya nanti ${rupiah(accountBalance - amount)}.`,
    };
  }

  // 3. Jauh di atas kebiasaan belanja sendiri.
  const average = dailyAverage(signal);
  if (signal.baselineDays >= MIN_OBSERVED_DAYS && average > 0 && amount >= average * HABIT_MULTIPLIER) {
    const times = (amount / average).toFixed(1).replace('.', ',');
    return {
      level: 'warn',
      rule: 'above-habit',
      title: 'Jauh di atas kebiasaanmu',
      message: `Biasanya kamu keluar ${rupiah(average)} per hari belanja. Transaksi ini ${times}× lipat dari itu.`,
    };
  }

  // 4. Bulan ini berubah jadi defisit. Butuh pemasukan tercatat sebagai pembanding,
  //    kalau tidak, semua pengeluaran di awal bulan akan selalu "defisit".
  if (signal.monthIncome > 0) {
    const totalExpense = signal.monthExpense + amount;
    if (totalExpense > signal.monthIncome) {
      const over = totalExpense - signal.monthIncome;
      return {
        level: 'warn',
        rule: 'month-deficit',
        title: 'Pengeluaran bulan ini lewat pemasukan',
        message: `Setelah transaksi ini, pengeluaran bulan ini ${rupiah(totalExpense)} — ${rupiah(over)} lebih besar dari pemasukan ${rupiah(signal.monthIncome)}.`,
      };
    }
  }

  return null;
}
