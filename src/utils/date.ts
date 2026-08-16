/**
 * Semua periode di app ini dihitung menurut **zona waktu perangkat**.
 * `dateKey` ('YYYY-MM-DD') adalah sumber kebenaran untuk filter & grouping:
 * karena formatnya fixed-width, perbandingan string = perbandingan tanggal.
 */

export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → 'YYYY-MM-DD' menurut waktu lokal (bukan UTC). */
export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' → Date pada tengah malam waktu lokal. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export type Period = { from: DateKey; to: DateKey };

/** Rentang satu bulan penuh yang memuat `date`. */
export function monthPeriod(date: Date = new Date()): Period {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: toDateKey(from), to: toDateKey(to) };
}

/** Rentang `days` hari terakhir termasuk hari ini. */
export function lastDaysPeriod(days: number, now: Date = new Date()): Period {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  return { from: toDateKey(from), to: toDateKey(now) };
}

export function yearPeriod(date: Date = new Date()): Period {
  return { from: `${date.getFullYear()}-01-01`, to: `${date.getFullYear()}-12-31` };
}

/** Deret dateKey berurutan dari `from` sampai `to` — untuk mengisi hari kosong di grafik tren. */
export function eachDateKey(period: Period): DateKey[] {
  const keys: DateKey[] = [];
  const end = fromDateKey(period.to);
  for (const cursor = fromDateKey(period.from); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    keys.push(toDateKey(cursor));
  }
  return keys;
}

export function formatDate(date: Date, locale = 'id-ID'): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    date,
  );
}
