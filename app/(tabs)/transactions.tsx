import { Text, View } from 'react-native';

import { FinanceScreen, ListRow, SearchBox, SectionTitle, financeStyles } from '@/src/components/finance-screen';

export default function TransactionsScreen() {
  return (
    <FinanceScreen title="Transaksi" subtitle="Semua arus uangmu, tanpa yang terlewat" action="add">
      <SearchBox label="Cari catatan atau kategori" />
      <View style={financeStyles.pillRow}>
        {['Semua', 'Pemasukan', 'Pengeluaran'].map((label, index) => <View key={label} style={[financeStyles.pill, index === 0 && financeStyles.pillActive]}><Text style={[financeStyles.pillText, index === 0 && financeStyles.pillTextActive]}>{label}</Text></View>)}
      </View>
      <SectionTitle title="Hari ini" action="16 Agustus" />
      <View style={financeStyles.card}>
        <ListRow icon="food-outline" color="#ed9b4b" title="Makan siang" meta="Makan · GoPay · 12:43" value="-Rp42.000" />
        <ListRow icon="car-outline" color="#7188cc" title="Transport" meta="Transport · BCA · 08:15" value="-Rp28.500" />
      </View>
      <SectionTitle title="Kemarin" action="15 Agustus" />
      <View style={financeStyles.card}>
        <ListRow icon="cash-plus" color="#4c9670" title="Gaji Agustus" meta="Gaji · BCA" value="+Rp8.500.000" positive />
        <ListRow icon="cart-outline" color="#ca7188" title="Belanja mingguan" meta="Belanja · BCA" value="-Rp286.000" />
        <ListRow icon="swap-horizontal" color="#6282a8" title="Isi saldo GoPay" meta="Transfer · BCA → GoPay" value="Rp300.000" />
      </View>
    </FinanceScreen>
  );
}
