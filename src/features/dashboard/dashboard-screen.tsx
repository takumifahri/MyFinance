import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { accountsWithBalanceQuery } from '@/src/db/queries/accounts';
import {
  dailyTrendQuery,
  periodSummaryQuery,
  spendingByCategoryQuery,
  transactionsQuery,
} from '@/src/db/queries/transactions';
import { categoryGlyph } from '@/src/features/categories/category-icons';
import { formatDate, monthPeriod } from '@/src/utils/date';
import { formatMoney, formatSignedMoney } from '@/src/utils/money';
import { useOwnerName } from '@/src/features/onboarding/startup-flow';

type TransactionIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Dipakai untuk transfer dan transaksi tanpa kategori — sisanya pakai ikon kategori. */
const TYPE_ICON: Record<string, TransactionIcon> = {
  income: 'cash-plus',
  expense: 'receipt-text-outline',
  transfer_in: 'swap-horizontal',
  transfer_out: 'swap-horizontal',
};

function previousMonthPeriod(now: Date) {
  return monthPeriod(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function compactMoney(amount: number) {
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (amount >= 1_000) return `Rp${Math.round(amount / 1_000).toLocaleString('id-ID')} rb`;
  return formatMoney(amount);
}

function Section({ children, action }: { children: ReactNode; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
      <View style={[styles.quickIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function FlowMetric({
  label,
  value,
  change,
  color,
}: {
  label: string;
  value: number;
  change: number | null;
  color: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.inline}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{compactMoney(value)}</Text>
      <Text style={[styles.metricDelta, { color }]}>
        {change === null ? 'Belum ada pembanding' : `${change >= 0 ? '+' : ''}${change.toFixed(1).replace('.', ',')}% dari bulan lalu`}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const ownerName = useOwnerName();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const now = useMemo(() => new Date(), []);
  const period = useMemo(() => monthPeriod(now), [now]);
  const previousPeriod = useMemo(() => previousMonthPeriod(now), [now]);

  const accounts = useLiveQuery(accountsWithBalanceQuery()).data ?? [];
  const currentRows = useLiveQuery(periodSummaryQuery(period), [period.from, period.to]).data ?? [];
  const previousRows = useLiveQuery(periodSummaryQuery(previousPeriod), [previousPeriod.from, previousPeriod.to]).data ?? [];
  const spending = useLiveQuery(spendingByCategoryQuery(period), [period.from, period.to]);
  const trend = useLiveQuery(dailyTrendQuery(period), [period.from, period.to]);
  const recent = useLiveQuery(transactionsQuery({}, 4)).data ?? [];

  const totalBalance = accounts.reduce((total, account) => total + Number(account.balance ?? 0), 0);
  const current = {
    income: Number(currentRows[0]?.income ?? 0),
    expense: Number(currentRows[0]?.expense ?? 0),
  };
  const previous = {
    income: Number(previousRows[0]?.income ?? 0),
    expense: Number(previousRows[0]?.expense ?? 0),
  };
  const net = current.income - current.expense;
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now);
  const topSpending = (spending.data ?? []).slice(0, 3);
  const largestSpending = Math.max(1, ...topSpending.map((item) => Number(item.total)));
  const trendValues = (trend.data ?? []).slice(-7).map((item) => Number(item.income) - Number(item.expense));
  const sparkValues = trendValues.length ? trendValues : [0, 0, 0, 0, 0, 0, 0];
  const sparkMax = Math.max(1, ...sparkValues.map((value) => Math.abs(value)));
  const queryError = spending.error ?? trend.error;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greetingFor(now)},</Text>
            <Text style={styles.name}>{ownerName}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Pengaturan" onPress={() => router.push('/settings')} style={styles.roundButton}>
              <Ionicons name="notifications-outline" size={20} color="#31584c" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Buka pengaturan" onPress={() => router.push('/settings')} style={styles.avatar}>
              <Ionicons name="person-outline" size={19} color="#31584c" />
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.between}>
            <Text style={styles.heroLabel}>TOTAL SALDO · {accounts.length} AKUN</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={balanceVisible ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
              accessibilityValue={{ text: balanceVisible ? 'Saldo terlihat' : 'Saldo tersembunyi' }}
              hitSlop={10}
              onPress={() => setBalanceVisible((visible) => !visible)}
              style={({ pressed }) => pressed && styles.eyePressed}>
              <Ionicons name={balanceVisible ? 'eye-outline' : 'eye-off-outline'} color="#b8d3c7" size={20} />
            </Pressable>
          </View>
          <Text style={styles.balance}>{balanceVisible ? formatMoney(totalBalance) : 'Rp •••••••'}</Text>
          <View style={styles.heroFooter}>
            <View>
              <Text style={styles.heroMeta}>Arus bersih bulan ini</Text>
              <Text style={[styles.heroTrend, net < 0 && styles.heroTrendNegative]}>
                {balanceVisible ? formatSignedMoney(Math.abs(net), net >= 0 ? 'in' : 'out') : '•••••••'}
              </Text>
            </View>
            <View style={styles.spark} accessibilityLabel="Tren arus kas tujuh hari transaksi terakhir">
              {sparkValues.map((value, index) => (
                <View key={index} style={[styles.sparkBar, { height: 10 + Math.round((Math.abs(value) / sparkMax) * 28), opacity: value === 0 ? 0.3 : 1 }]} />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.quickRow}>
          <QuickAction icon="arrow-down" label="Pemasukan" color="#477e63" onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'income' } })} />
          <QuickAction icon="arrow-up" label="Pengeluaran" color="#cc705e" onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'expense' } })} />
          <QuickAction icon="swap-horizontal" label="Transfer" color="#5f70a8" onPress={() => router.push('/transactions')} />
          <QuickAction icon="ellipsis-horizontal" label="Lainnya" color="#6a706d" onPress={() => router.push('/settings')} />
        </View>

        {queryError ? <Text style={styles.errorText}>Sebagian ringkasan belum dapat dimuat: {queryError.message}</Text> : null}

        <Section action={monthLabel}>Arus kas</Section>
        <View style={styles.flowBox}>
          <FlowMetric label="Pemasukan" value={current.income} change={percentChange(current.income, previous.income)} color="#4c9670" />
          <View style={styles.divider} />
          <FlowMetric label="Pengeluaran" value={current.expense} change={percentChange(current.expense, previous.expense)} color="#dc765f" />
        </View>

        <Section action={topSpending.length ? 'Bulan ini' : undefined}>Pengeluaran terbesar</Section>
        <View style={styles.categoryBox}>
          {topSpending.length ? topSpending.map((item) => {
            const total = Number(item.total);
            const color = item.color ?? '#64748b';
            return (
              <View key={item.categoryId ?? item.categoryName} style={styles.spendingRow}>
                <View style={styles.between}>
                  <View style={styles.inline}>
                    <View style={[styles.spendIcon, { backgroundColor: `${color}1f` }]}>
                      <MaterialCommunityIcons
                        name={categoryGlyph({ icon: item.icon, name: item.categoryName, type: 'expense' })}
                        size={14}
                        color={color}
                      />
                    </View>
                    <Text style={styles.spendLabel}>{item.categoryName}</Text>
                  </View>
                  <Text style={styles.spendValue}>{compactMoney(total)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(8, (total / largestSpending) * 100)}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          }) : <EmptyState icon="pie-chart-outline" text="Belum ada pengeluaran bulan ini." />}
        </View>

        <Section action={recent.length ? 'Terbaru' : undefined}>Transaksi terbaru</Section>
        <View style={styles.transactionBox}>
          {recent.length ? recent.map((item, index) => {
            const incoming = item.type === 'income' || item.type === 'transfer_in';
            const color = item.categoryColor ?? (incoming ? '#4c9670' : '#7188cc');
            const glyph = item.categoryId
              ? categoryGlyph({
                  icon: item.categoryIcon,
                  name: item.categoryName,
                  type: incoming ? 'income' : 'expense',
                })
              : TYPE_ICON[item.type] ?? 'receipt-text-outline';
            return (
              <View key={item.id} style={[styles.transaction, index < recent.length - 1 && styles.transactionBorder]}>
                <View style={[styles.txIcon, { backgroundColor: `${color}20` }]}>
                  <MaterialCommunityIcons name={glyph} size={20} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txName}>{item.note || item.categoryName || 'Transfer akun'}</Text>
                  <Text style={styles.txMeta}>{item.accountName} · {formatDate(item.date)}</Text>
                </View>
                <Text style={[styles.txAmount, incoming && styles.txIncome]}>{formatSignedMoney(item.amount, incoming ? 'in' : 'out')}</Text>
              </View>
            );
          }) : <EmptyState icon="receipt-outline" text="Belum ada transaksi. Catat transaksi pertamamu." />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function EmptyState({ icon, text }: { icon: ComponentProps<typeof Ionicons>['name']; text: string }) {
  return <View style={styles.empty}><Ionicons name={icon} size={24} color="#9ba49e" /><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f1' },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { color: '#858b84', fontSize: 12 },
  name: { color: '#213129', fontSize: 23, fontWeight: '800', marginTop: 2 },
  roundButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8ede4' },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbe7d7' },
  hero: { backgroundColor: '#31584c', borderRadius: 28, padding: 22, shadowColor: '#31584c', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: '#aec7bd', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  balance: { color: '#fffdf7', fontSize: 31, fontWeight: '800', letterSpacing: -1, marginTop: 10 },
  heroFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 24 },
  heroMeta: { color: '#aec7bd', fontSize: 10 },
  heroTrend: { color: '#d8f3c4', fontSize: 12, fontWeight: '700', marginTop: 3 },
  heroTrendNegative: { color: '#ffc2b4' },
  spark: { flexDirection: 'row', gap: 4, height: 42, alignItems: 'flex-end' },
  sparkBar: { width: 5, borderRadius: 4, backgroundColor: '#b8e19f' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  quickItem: { width: '24%', alignItems: 'center' },
  pressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  eyePressed: { opacity: 0.55, transform: [{ scale: 0.92 }] },
  quickIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: '#505750', fontSize: 10, fontWeight: '600', marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 13 },
  sectionTitle: { color: '#202522', fontSize: 18, fontWeight: '700' },
  sectionAction: { color: '#467561', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  flowBox: { flexDirection: 'row', padding: 18, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ebebe5' },
  divider: { width: 1, backgroundColor: '#ecece7', marginHorizontal: 15 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  metricLabel: { color: '#7c837d', fontSize: 11 },
  metricValue: { color: '#283029', fontSize: 18, fontWeight: '800', marginTop: 8 },
  metricDelta: { fontSize: 9, fontWeight: '600', marginTop: 5 },
  categoryBox: { backgroundColor: '#fff', padding: 18, paddingBottom: 2, borderRadius: 20, borderWidth: 1, borderColor: '#ebebe5' },
  spendingRow: { marginBottom: 17 },
  spendIcon: { width: 24, height: 24, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  spendLabel: { color: '#4d544e', fontSize: 12, fontWeight: '600' },
  spendValue: { color: '#4d544e', fontSize: 11, fontWeight: '700' },
  track: { height: 6, borderRadius: 4, backgroundColor: '#eeeee9', marginTop: 9, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 4 },
  transactionBox: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#ebebe5', overflow: 'hidden' },
  transaction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 12 },
  transactionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e7e8e3' },
  txIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txName: { color: '#252925', fontSize: 14, fontWeight: '700' },
  txMeta: { color: '#8b908c', fontSize: 10, marginTop: 3 },
  txAmount: { color: '#343834', fontSize: 12, fontWeight: '700' },
  txIncome: { color: '#2e8b57' },
  empty: { minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: '#858e88', fontSize: 11, textAlign: 'center' },
  errorText: { marginTop: 18, borderRadius: 12, backgroundColor: '#fff0ec', padding: 12, color: '#a44d3d', fontSize: 10 },
});
