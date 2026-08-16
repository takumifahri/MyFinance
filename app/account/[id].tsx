import { useLocalSearchParams } from 'expo-router';

import { AccountFormScreen } from '@/src/features/accounts/account-form-screen';

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);
  return <AccountFormScreen accountId={Number.isInteger(accountId) ? accountId : Number.NaN} />;
}
