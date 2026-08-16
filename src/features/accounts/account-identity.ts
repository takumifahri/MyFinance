import type { AccountType } from '@/src/db/schema';

export type AccountIdentity = { name: string; type: AccountType };

export function normalizeAccountName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
}

export function isSameAccount(left: AccountIdentity, right: AccountIdentity) {
  return left.type === right.type
    && normalizeAccountName(left.name) === normalizeAccountName(right.name);
}
