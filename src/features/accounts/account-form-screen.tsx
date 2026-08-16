import { Ionicons } from '@expo/vector-icons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  accountsWithBalanceQuery,
  archiveAccount,
  createAccount,
  unarchiveAccount,
  updateAccount,
  type AccountWithBalance,
} from '@/src/db/queries/accounts';
import { createTransaction } from '@/src/db/queries/transactions';
import type { AccountType } from '@/src/db/schema';
import { ACCOUNT_NAME_OPTIONS } from '@/src/features/accounts/account-catalog';
import { isSameAccount } from '@/src/features/accounts/account-identity';
import { AccountNamePicker } from '@/src/features/accounts/account-name-picker';
import { accountIcon } from '@/src/features/accounts/account-presentation';
import { formatAmountInput } from '@/src/features/transactions/transaction-draft';
import { formatMoney, parseMoney } from '@/src/utils/money';

const ACCOUNT_TYPES: { value: AccountType; label: string; description: string }[] = [
  { value: 'cash', label: 'Tunai', description: 'Dompet dan uang kas' },
  { value: 'bank', label: 'Bank', description: 'Rekening bank' },
  { value: 'ewallet', label: 'E-wallet', description: 'Dompet digital' },
];

export function AccountFormScreen({ accountId }: { accountId?: number }) {
  const accountsQuery = useLiveQuery(accountsWithBalanceQuery(true));
  const account = accountId === undefined
    ? undefined
    : accountsQuery.data?.find((item) => item.id === accountId);

  if (accountsQuery.data === undefined) {
    return <LoadingAccount />;
  }
  if (accountId !== undefined && !account) {
    return <MissingAccount />;
  }

  return (
    <AccountForm
      key={account?.id ?? 'new'}
      account={account}
      accounts={accountsQuery.data}
    />
  );
}

function AccountForm({ account, accounts }: {
  account?: AccountWithBalance;
  accounts: AccountWithBalance[];
}) {
  const editing = Boolean(account);
  const [type, setType] = useState<AccountType>(account?.type ?? 'cash');
  const initialOptions = ACCOUNT_NAME_OPTIONS[account?.type ?? 'cash'];
  const initialIsCustom = Boolean(account && !initialOptions.includes(account.name));
  const [selectedName, setSelectedName] = useState(
    initialIsCustom ? initialOptions[0] : account?.name ?? initialOptions[0],
  );
  const [customName, setCustomName] = useState(initialIsCustom ? account?.name ?? '' : '');
  const [usesCustomName, setUsesCustomName] = useState(initialIsCustom);
  const [initialBalanceText, setInitialBalanceText] = useState(
    account ? formatBalanceInput(String(account.initialBalance)) : '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const name = usesCustomName ? customName : selectedName;
  const duplicate = accounts.find((item) => (
    item.id !== account?.id && isSameAccount(item, { name, type })
  ));

  function changeType(nextType: AccountType) {
    const firstOption = ACCOUNT_NAME_OPTIONS[nextType][0];
    setType(nextType);
    setSelectedName(firstOption);
    setCustomName('');
    setUsesCustomName(false);
    setError(null);
  }

  async function save() {
    const cleanName = name.trim();
    const initialBalance = initialBalanceText ? parseMoney(initialBalanceText) : 0;
    if (!cleanName) {
      setError('Masukkan nama akun.');
      return;
    }
    if (initialBalance === null || !Number.isInteger(initialBalance)) {
      setError('Saldo awal harus berupa angka yang valid.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (account) {
        await updateAccount(account.id, { name: cleanName, type, initialBalance });
      } else if (duplicate) {
        if (initialBalance <= 0) {
          setError(`${duplicate.name} sudah ada. Isi nominal untuk menambah saldo.`);
          setSubmitting(false);
          return;
        }
        if (duplicate.archivedAt) await unarchiveAccount(duplicate.id);
        await createTransaction({
          accountId: duplicate.id,
          type: 'income',
          amount: initialBalance,
          date: new Date(),
          note: 'Penambahan saldo akun',
        });
      } else {
        await createAccount({ name: cleanName, type, initialBalance });
      }
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Akun belum dapat disimpan.');
      setSubmitting(false);
    }
  }

  function confirmArchive() {
    if (!account) return;
    Alert.alert(
      'Arsipkan akun?',
      `${account.name} tidak akan muncul saat memilih akun untuk transaksi baru. Riwayatnya tetap aman.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Arsipkan',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await archiveAccount(account.id);
              router.back();
            } catch (archiveError) {
              setError(archiveError instanceof Error ? archiveError.message : 'Akun belum dapat diarsipkan.');
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#334039" />
          </Pressable>
          <Text style={styles.headerTitle}>{editing ? 'Edit akun' : 'Akun baru'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {account ? (
            <View style={styles.balanceCard}>
              <View style={styles.balanceIcon}>
                <Ionicons name={accountIcon(account.type)} size={20} color="#31584c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceCardLabel}>SALDO BERJALAN</Text>
                <Text style={[styles.balanceCardValue, Number(account.balance) < 0 && styles.balanceCardNegative]}>
                  {formatMoney(Number(account.balance ?? 0))}
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.label}>JENIS AKUN</Text>
          <View style={styles.typeList}>
            {ACCOUNT_TYPES.map((item) => {
              const selected = item.value === type;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => changeType(item.value)}
                  style={[styles.typeOption, selected && styles.typeOptionSelected]}>
                  <View style={[styles.typeIcon, selected && styles.typeIconSelected]}>
                    <Ionicons name={accountIcon(item.value)} size={21} color={selected ? '#31584c' : '#818b85'} />
                  </View>
                  <View style={styles.typeCopy}>
                    <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{item.label}</Text>
                    <Text style={styles.typeDescription}>{item.description}</Text>
                  </View>
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? '#477e63' : '#b1b7b3'} />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>NAMA AKUN</Text>
          <AccountNamePicker
            options={ACCOUNT_NAME_OPTIONS[type]}
            value={usesCustomName ? 'Lainnya' : selectedName}
            onChange={(nextName) => {
              setSelectedName(nextName);
              setUsesCustomName(false);
              setError(null);
            }}
            onChooseOther={() => {
              setUsesCustomName(true);
              setError(null);
            }}
          />
          {usesCustomName ? (
            <TextInput
              autoFocus
              maxLength={40}
              onChangeText={setCustomName}
              placeholder="Ketik nama akun"
              placeholderTextColor="#a0a8a2"
              returnKeyType="next"
              style={[styles.input, styles.customInput]}
              value={customName}
            />
          ) : null}
          {duplicate ? (
            <View style={styles.duplicateNotice}>
              <Ionicons name="information-circle-outline" size={17} color="#8a6840" />
              <Text style={styles.duplicateText}>
                {editing
                  ? `${duplicate.name} sudah ada. Pilih nama lain untuk akun ini.`
                  : `${duplicate.name} sudah ada. Akun baru tidak akan dibuat; nominal di bawah akan ditambahkan sebagai pemasukan.`}
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>{duplicate && !editing ? 'TAMBAH SALDO' : 'SALDO AWAL'}</Text>
          <View style={styles.balanceInputWrap}>
            <Text style={styles.currency}>Rp</Text>
            <TextInput
              keyboardType="numeric"
              maxLength={19}
              onChangeText={(value) => setInitialBalanceText(formatBalanceInput(value))}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180)}
              placeholder="0"
              placeholderTextColor="#a0a8a2"
              style={styles.balanceInput}
              value={initialBalanceText}
            />
          </View>
          <Text style={styles.helper}>
            {duplicate && !editing
              ? 'Tambahan saldo dicatat sebagai pemasukan agar riwayat akun tetap jelas.'
              : 'Saldo berjalan dihitung otomatis dari saldo awal, pemasukan, dan pengeluaran akun ini.'}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={submitting}
            onPress={save}
            style={({ pressed }) => [styles.saveButton, submitting && styles.disabled, pressed && styles.pressed]}>
            <Text style={styles.saveText}>
              {submitting ? 'Menyimpan…' : editing ? 'Simpan perubahan' : duplicate ? `Tambah saldo ke ${duplicate.name}` : 'Tambah akun'}
            </Text>
            {!submitting ? <Ionicons name="checkmark" size={20} color="#fff" /> : null}
          </Pressable>

          {editing && !account?.archivedAt ? (
            <Pressable disabled={submitting} onPress={confirmArchive} style={styles.archiveButton}>
              <Ionicons name="archive-outline" size={18} color="#b35f50" />
              <Text style={styles.archiveText}>Arsipkan akun</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatBalanceInput(input: string) {
  const negative = input.trimStart().startsWith('-');
  const formatted = formatAmountInput(input);
  return negative && formatted ? `-${formatted}` : formatted;
}

function LoadingAccount() {
  return <SafeAreaView style={styles.center}><Text style={styles.centerText}>Memuat akun…</Text></SafeAreaView>;
}

function MissingAccount() {
  return (
    <SafeAreaView style={styles.center}>
      <Ionicons name="alert-circle-outline" size={30} color="#ad5444" />
      <Text style={styles.centerText}>Akun tidak ditemukan.</Text>
      <Pressable onPress={() => router.back()}><Text style={styles.backText}>Kembali</Text></Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f1' },
  header: { height: 66, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dde1dc' },
  closeButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8ece6' },
  headerTitle: { color: '#26322b', fontSize: 15, fontWeight: '700' },
  headerSpacer: { width: 42 },
  scroll: { padding: 20, paddingBottom: 42 },
  label: { color: '#667169', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 18, marginBottom: 9 },
  input: { height: 56, borderRadius: 17, borderWidth: 1.5, borderColor: '#d7dcd7', backgroundColor: '#fff', color: '#243029', fontSize: 15, fontWeight: '600', paddingHorizontal: 16 },
  customInput: { marginTop: 9 },
  duplicateNotice: { marginTop: 10, padding: 12, borderRadius: 14, flexDirection: 'row', gap: 8, backgroundColor: '#f4ecdf' },
  duplicateText: { flex: 1, color: '#80623e', fontSize: 9, lineHeight: 14 },
  balanceCard: { marginTop: 4, padding: 15, borderRadius: 18, backgroundColor: '#eaf0e9', flexDirection: 'row', alignItems: 'center', gap: 12 },
  balanceIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbe7d7' },
  balanceCardLabel: { color: '#6b786f', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  balanceCardValue: { color: '#26332c', fontSize: 20, fontWeight: '800', marginTop: 4 },
  balanceCardNegative: { color: '#b35f50' },
  typeList: { gap: 9 },
  typeOption: { minHeight: 68, padding: 11, borderRadius: 18, borderWidth: 1, borderColor: '#e0e3df', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeOptionSelected: { borderColor: '#6c9583', backgroundColor: '#edf3ec' },
  typeIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef0ed' },
  typeIconSelected: { backgroundColor: '#dce9dd' },
  typeCopy: { flex: 1 },
  typeLabel: { color: '#303934', fontSize: 13, fontWeight: '700' },
  typeLabelSelected: { color: '#31584c' },
  typeDescription: { color: '#929994', fontSize: 9, marginTop: 3 },
  balanceInputWrap: { height: 64, paddingHorizontal: 17, borderRadius: 18, borderWidth: 1.5, borderColor: '#d7dcd7', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' },
  currency: { color: '#477e63', fontSize: 18, fontWeight: '700', marginRight: 8 },
  balanceInput: { flex: 1, color: '#243029', fontSize: 25, fontWeight: '800', paddingVertical: 8 },
  helper: { color: '#7d8881', fontSize: 9, lineHeight: 14, marginTop: 9 },
  error: { color: '#ad5444', fontSize: 10, marginTop: 14 },
  saveButton: { height: 57, borderRadius: 19, marginTop: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#31584c' },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  archiveButton: { height: 48, marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  archiveText: { color: '#b35f50', fontSize: 11, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#f7f7f1' },
  centerText: { color: '#56615b', fontSize: 12 },
  backText: { color: '#31584c', fontSize: 11, fontWeight: '700', marginTop: 8 },
});
