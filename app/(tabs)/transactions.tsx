import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FinanceScreen, ListRow, SectionTitle, financeStyles } from '@/src/components/finance-screen';
import { transactionsQuery } from '@/src/db/queries/transactions';
import { formatDate } from '@/src/utils/date';
import { formatSignedMoney } from '@/src/utils/money';

type Filter = 'all' | 'income' | 'expense';
type RowIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, RowIcon> = {
  income: 'cash-plus',
  expense: 'receipt-text-outline',
  transfer_in: 'swap-horizontal',
  transfer_out: 'swap-horizontal',
};

export default function TransactionsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const types = filter === 'all' ? undefined : [filter] as const;
  const query = useLiveQuery(transactionsQuery({ types }), [filter]);
  const rows = query.data ?? [];

  return (
    <FinanceScreen
      title="Transaksi"
      subtitle={`${rows.length} catatan tersimpan di perangkat`}
      action="add"
      onAction={() => router.push('/transaction/new')}>
      <View style={financeStyles.pillRow}>
        {([
          ['all', 'Semua'],
          ['income', 'Pemasukan'],
          ['expense', 'Pengeluaran'],
        ] as const).map(([value, label]) => (
          <Pressable key={value} onPress={() => setFilter(value)} style={[financeStyles.pill, filter === value && financeStyles.pillActive]}>
            <Text style={[financeStyles.pillText, filter === value && financeStyles.pillTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Riwayat" action={rows.length ? 'Terbaru dulu' : undefined} />
      <View style={financeStyles.card}>
        {rows.length ? rows.map((item) => {
          const incoming = item.type === 'income' || item.type === 'transfer_in';
          const color = item.categoryColor ?? (incoming ? '#4c9670' : '#7188cc');
          return (
            <ListRow
              key={item.id}
              icon={ICONS[item.type] ?? 'receipt-text-outline'}
              color={color}
              title={item.note || item.categoryName || 'Transfer akun'}
              meta={`${item.accountName} · ${formatDate(item.date)}`}
              value={formatSignedMoney(item.amount, incoming ? 'in' : 'out')}
              positive={incoming}
            />
          );
        }) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={28} color="#77867d" /></View>
            <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
            <Text style={styles.emptyCopy}>Catat pemasukan atau pengeluaran pertamamu.</Text>
            <Pressable onPress={() => router.push('/transaction/new')} style={styles.emptyButton}><Ionicons name="add" size={17} color="#fff" /><Text style={styles.emptyButtonText}>Tambah transaksi</Text></Pressable>
          </View>
        )}
      </View>
      {query.error ? <Text style={styles.error}>Riwayat belum dapat dimuat: {query.error.message}</Text> : null}
    </FinanceScreen>
  );
}

const styles = StyleSheet.create({
  empty: { minHeight: 250, padding: 28, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 60, height: 60, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8eee7' },
  emptyTitle: { color: '#303a34', fontSize: 16, fontWeight: '700', marginTop: 16 },
  emptyCopy: { color: '#87908a', fontSize: 10, marginTop: 6, textAlign: 'center' },
  emptyButton: { height: 42, marginTop: 18, paddingHorizontal: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#31584c' },
  emptyButtonText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  error: { color: '#ad5444', fontSize: 10, marginTop: 12 },
});
