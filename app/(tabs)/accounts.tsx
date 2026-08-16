import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { FinanceScreen, SectionTitle } from '@/src/components/finance-screen';

const accounts = [
  { name: 'BCA', type: 'BANK', amount: 'Rp9.820.500', icon: 'business-outline' as const, color: '#5272aa' },
  { name: 'GoPay', type: 'E-WALLET', amount: 'Rp1.760.000', icon: 'phone-portrait-outline' as const, color: '#4b9a7a' },
  { name: 'Dompet', type: 'CASH', amount: 'Rp900.000', icon: 'cash-outline' as const, color: '#d58a45' },
];

export default function AccountsScreen() {
  return (
    <FinanceScreen title="Akun" subtitle="3 akun aktif" action="add">
      <View style={styles.total}><Text style={styles.totalLabel}>TOTAL SEMUA AKUN</Text><Text style={styles.totalValue}>Rp12.480.500</Text><Text style={styles.totalNote}>Diperbarui otomatis dari semua transaksi</Text></View>
      <SectionTitle title="Akun aktif" action="Atur urutan" />
      <View style={{ gap: 11 }}>
        {accounts.map((account) => <View key={account.name} style={styles.account}><View style={[styles.icon, { backgroundColor: `${account.color}18` }]}><Ionicons name={account.icon} size={23} color={account.color}/></View><View style={{ flex: 1 }}><Text style={styles.type}>{account.type}</Text><Text style={styles.name}>{account.name}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={styles.amount}>{account.amount}</Text><Ionicons name="chevron-forward" size={16} color="#adb2ae" style={{ marginTop: 6 }}/></View></View>)}
      </View>
      <View style={styles.hint}><Ionicons name="archive-outline" size={19} color="#6f7d76"/><Text style={styles.hintText}>Akun yang sudah punya transaksi akan diarsipkan, sehingga riwayat keuanganmu tetap utuh.</Text></View>
    </FinanceScreen>
  );
}

const styles = StyleSheet.create({
  total: { backgroundColor: '#31584c', borderRadius: 24, padding: 21 }, totalLabel: { color: '#aec7bd', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 }, totalValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 9 }, totalNote: { color: '#a9c2b8', fontSize: 9, marginTop: 10 },
  account: { minHeight: 84, padding: 15, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8eae6', flexDirection: 'row', alignItems: 'center', gap: 13 }, icon: { width: 49, height: 49, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, type: { color: '#a0a5a1', fontSize: 8, fontWeight: '800', letterSpacing: 1 }, name: { color: '#29302b', fontSize: 15, fontWeight: '700', marginTop: 4 }, amount: { color: '#2e3530', fontSize: 13, fontWeight: '700' },
  hint: { flexDirection: 'row', gap: 10, marginTop: 22, padding: 15, borderRadius: 16, backgroundColor: '#e9eee8' }, hintText: { flex: 1, color: '#6f7d76', fontSize: 10, lineHeight: 15 },
});
