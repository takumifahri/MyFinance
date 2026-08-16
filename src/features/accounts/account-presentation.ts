import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { AccountType } from '@/src/db/schema';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Satu sumber tampilan akun supaya ikon/warna tidak berbeda antar layar. */
export const ACCOUNT_PRESENTATION: Record<AccountType, {
  label: string;
  icon: IoniconName;
  color: string;
}> = {
  bank: { label: 'BANK', icon: 'business-outline', color: '#5272aa' },
  ewallet: { label: 'E-WALLET', icon: 'phone-portrait-outline', color: '#4b9a7a' },
  cash: { label: 'CASH', icon: 'cash-outline', color: '#d58a45' },
};

export function accountIcon(type: AccountType): IoniconName {
  return ACCOUNT_PRESENTATION[type].icon;
}
