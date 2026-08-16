const MAX_OWNER_NAME_LENGTH = 40;

/** Nilai kanonis yang ditampilkan di seluruh aplikasi dan disimpan ke settings. */
export function normalizeOwnerName(input: string): string | null {
  const normalized = input.trim().replace(/\s+/g, ' ').slice(0, MAX_OWNER_NAME_LENGTH).trim();
  return normalized || null;
}
