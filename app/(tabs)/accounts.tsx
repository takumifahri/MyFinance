import { Ionicons } from '@expo/vector-icons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FinanceScreen, SectionTitle } from '@/src/components/finance-screen';
import { accountsWithBalanceQuery } from '@/src/db/queries/accounts';
import { ACCOUNT_PRESENTATION } from '@/src/features/accounts/account-presentation';
import { formatMoney } from '@/src/utils/money';

export default function AccountsScreen() {
  const query = useLiveQuery(accountsWithBalanceQuery());
  const accounts = query.data ?? [];
  const totalBalance = accounts.reduce(
    (total, account) => total + Number(account.balance ?? 0),
    0,
  );

  return (
    <FinanceScreen
      title="Akun"
      subtitle={`${accounts.length} akun aktif`}
      action="add"
      onAction={() => router.push('/account/new')}>
      <View style={styles.total}>
        <Text style={styles.totalLabel}>TOTAL SEMUA AKUN</Text>
        <Text style={styles.totalValue}>{formatMoney(totalBalance)}</Text>
        <Text style={styles.totalNote}>Diperbarui otomatis dari semua transaksi</Text>
      </View>
      <SectionTitle title="Akun aktif" />
      {accounts.length ? (
        <View style={{ gap: 11 }}>
          {accounts.map((account) => {
            const presentation = ACCOUNT_PRESENTATION[account.type];
            return (
              <Pressable
                key={account.id}
                accessibilityRole="button"
                accessibilityLabel={`Buka akun ${account.name}`}
                onPress={() => router.push(`/account/${account.id}`)}
                style={({ pressed }) => [styles.account, pressed && styles.pressed]}>
                <View style={[styles.icon, { backgroundColor: `${presentation.color}18` }]}>
                  <Ionicons name={presentation.icon} size={23} color={presentation.color}/>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.type}>{presentation.label}</Text>
                  <Text style={styles.name}>{account.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.amount, account.balance < 0 && styles.negative]}>
                    {formatMoney(Number(account.balance ?? 0))}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#adb2ae" style={{ marginTop: 6 }}/>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={27} color="#77867d" />
          <Text style={styles.emptyTitle}>Belum ada akun aktif</Text>
        </View>
      )}
      {query.error ? <Text style={styles.error}>Saldo akun belum dapat dimuat: {query.error.message}</Text> : null}
      <View style={styles.hint}><Ionicons name="archive-outline" size={19} color="#6f7d76"/><Text style={styles.hintText}>Akun yang sudah punya transaksi akan diarsipkan, sehingga riwayat keuanganmu tetap utuh.</Text></View>
    </FinanceScreen>
  );
}

const styles = StyleSheet.create({
  total: { backgroundColor: '#31584c', borderRadius: 24, padding: 21 }, totalLabel: { color: '#aec7bd', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 }, totalValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 9 }, totalNote: { color: '#a9c2b8', fontSize: 9, marginTop: 10 },
  account: { minHeight: 84, padding: 15, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8eae6', flexDirection: 'row', alignItems: 'center', gap: 13 }, icon: { width: 49, height: 49, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, type: { color: '#a0a5a1', fontSize: 8, fontWeight: '800', letterSpacing: 1 }, name: { color: '#29302b', fontSize: 15, fontWeight: '700', marginTop: 4 }, amount: { color: '#2e3530', fontSize: 13, fontWeight: '700' }, negative: { color: '#bd5f50' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  empty: { minHeight: 150, borderRadius: 19, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8eae6' },
  emptyTitle: { color: '#77817b', fontSize: 11, fontWeight: '600' },
  error: { color: '#ad5444', fontSize: 10, marginTop: 12 },
  hint: { flexDirection: 'row', gap: 10, marginTop: 22, padding: 15, borderRadius: 16, backgroundColor: '#e9eee8' }, hintText: { flex: 1, color: '#6f7d76', fontSize: 10, lineHeight: 15 },
});
