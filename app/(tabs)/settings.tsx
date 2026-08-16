import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, DevSettings, StyleSheet, Text, View } from 'react-native';

import { FinanceScreen, ListRow, SectionTitle, financeStyles } from '@/src/components/finance-screen';
import { resetDatabase } from '@/src/db/client';

/**
 * Hanya ada di build dev. DevSettings.reload() memang tidak tersedia di produksi,
 * dan menghapus seluruh data pengguna tanpa backup bukan fitur yang pantas dirilis.
 */
function confirmFreshMigrate() {
  Alert.alert(
    'Migrate fresh?',
    'Semua akun, kategori, dan transaksi dihapus. Database dibuat ulang dari migrasi terbaru lalu diisi data bawaan. Tidak bisa dibatalkan.',
    [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus & buat ulang',
        style: 'destructive',
        onPress: async () => {
          try {
            await resetDatabase();
            DevSettings.reload();
          } catch (error) {
            Alert.alert('Gagal reset', error instanceof Error ? error.message : String(error));
          }
        },
      },
    ],
  );
}

export default function SettingsScreen() {
  return (
    <FinanceScreen title="Pengaturan" subtitle="Preferensi dan keamanan data lokal">
      <SectionTitle title="Personalisasi" />
      <View style={financeStyles.card}>
        <ListRow icon="shape-outline" color="#a66a9d" title="Kategori" meta="Kelola kategori pemasukan & pengeluaran" onPress={() => router.push('/categories')} />
        <ListRow icon="theme-light-dark" color="#5677a7" title="Tampilan" meta="Ikuti sistem" />
        <ListRow icon="currency-usd" color="#4f8b69" title="Mata uang" meta="IDR · Rupiah Indonesia" />
      </View>
      <SectionTitle title="Data milikmu" />
      <View style={styles.backupCard}>
        <View style={styles.backupIcon}><Ionicons name="shield-checkmark" size={25} color="#31584c"/></View>
        <Text style={styles.backupTitle}>Tersimpan privat di HP ini</Text>
        <Text style={styles.backupCopy}>Tidak ada akun online atau server. Buat backup rutin agar datamu aman saat berganti perangkat.</Text>
        <View style={styles.backupStatus}><View><Text style={styles.statusLabel}>BACKUP TERAKHIR</Text><Text style={styles.statusValue}>4 Agustus 2026</Text></View><View style={styles.backupButton}><Ionicons name="cloud-upload-outline" size={17} color="#fff"/><Text style={styles.backupButtonText}>Backup</Text></View></View>
      </View>
      <View style={[financeStyles.card, { marginTop: 12 }]}>
        <ListRow icon="file-import-outline" color="#557ca2" title="Pulihkan backup" meta="Timpa data dari file JSON" />
        <ListRow icon="information-outline" color="#7b817d" title="Tentang Keuanganku" meta="Versi 1.0 · Local-first" />
      </View>
      {__DEV__ ? (
        <>
          <SectionTitle title="Developer" />
          <View style={financeStyles.card}>
            <ListRow
              icon="database-refresh"
              color="#b35f50"
              title="Migrate fresh"
              meta="Hapus database, jalankan ulang migrasi + seed"
              onPress={confirmFreshMigrate}
            />
          </View>
        </>
      ) : null}
      <View style={{ height: 100 }} >
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>© 2026 Keuanganku by Link Github Takumifahri</Text>
      </View>
    </FinanceScreen>
  );
}

const styles = StyleSheet.create({
  backupCard: { padding: 19, borderRadius: 21, backgroundColor: '#e7eee5', borderWidth: 1, borderColor: '#d9e3d7' }, backupIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7faf6' }, backupTitle: { color: '#26352d', fontSize: 16, fontWeight: '800', marginTop: 15 }, backupCopy: { color: '#6d7a73', fontSize: 10, lineHeight: 16, marginTop: 7 }, backupStatus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#cad8c8' }, statusLabel: { color: '#87938c', fontSize: 8, fontWeight: '800', letterSpacing: 1 }, statusValue: { color: '#405149', fontSize: 11, fontWeight: '700', marginTop: 4 }, backupButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 13, backgroundColor: '#31584c' }, backupButtonText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
