/**
 * Uang selalu berupa INTEGER dalam satuan terkecil.
 * IDR punya 0 desimal, jadi 1 unit = Rp1. Jangan pernah pakai float untuk uang.
 */

export const DEFAULT_CURRENCY = 'IDR';
export const DEFAULT_MINOR_UNITS = 0;

export type MoneyOptions = {
  currency?: string;
  minorUnits?: number;
  locale?: string;
  /** Tampilkan simbol mata uang. Matikan untuk input field. */
  withSymbol?: boolean;
};

/** 150000 → "Rp150.000" */
export function formatMoney(amount: number, options: MoneyOptions = {}): string {
  const {
    currency = DEFAULT_CURRENCY,
    minorUnits = DEFAULT_MINOR_UNITS,
    locale = 'id-ID',
    withSymbol = true,
  } = options;

  const value = minorUnits === 0 ? amount : amount / 10 ** minorUnits;

  return new Intl.NumberFormat(locale, {
    style: withSymbol ? 'currency' : 'decimal',
    currency,
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: minorUnits,
  }).format(value);
}

/** Sama seperti formatMoney tapi diberi tanda arah: "+Rp150.000" / "−Rp20.000". */
export function formatSignedMoney(amount: number, direction: 'in' | 'out', options?: MoneyOptions) {
  return `${direction === 'in' ? '+' : '−'}${formatMoney(amount, options)}`;
}

/**
 * Teks input user → integer satuan terkecil.
 * Menerima "150.000", "150000", "1.500,50". Mengembalikan null bila tidak valid.
 */
export function parseMoney(input: string, minorUnits = DEFAULT_MINOR_UNITS): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;

  // Pemisah desimal di id-ID adalah koma; titik adalah pemisah ribuan.
  const [whole, fraction = ''] = cleaned.replace(/\./g, '').split(',');
  const digits = whole.replace(/[^\d-]/g, '');
  if (!digits || Number.isNaN(Number(digits))) return null;

  if (minorUnits === 0) return Number(digits);

  const paddedFraction = fraction.padEnd(minorUnits, '0').slice(0, minorUnits);
  return Number(digits) * 10 ** minorUnits + Number(paddedFraction || 0);
}

/** Validasi nominal sebelum disimpan: harus bilangan bulat positif. */
export function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}
