import { Ionicons } from '@expo/vector-icons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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

import { accountsWithBalanceQuery } from '@/src/db/queries/accounts';
import { categoriesQuery } from '@/src/db/queries/categories';
import { createTransaction } from '@/src/db/queries/transactions';
import { formatAmountInput, prepareTransactionDraft } from '@/src/features/transactions/transaction-draft';
import { formatDate } from '@/src/utils/date';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const [type, setType] = useState<'income' | 'expense'>(params.type === 'income' ? 'income' : 'expense');
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const date = useState(() => new Date())[0];
  const scrollRef = useRef<ScrollView>(null);

  const accountsResult = useLiveQuery(accountsWithBalanceQuery());
  const categoriesResult = useLiveQuery(categoriesQuery(type), [type]);
  const accounts = accountsResult.data ?? [];
  const categories = categoriesResult.data ?? [];

  useEffect(() => {
    const firstAccount = accountsResult.data?.[0];
    if (accountId === null && firstAccount) setAccountId(firstAccount.id);
  }, [accountId, accountsResult.data]);

  useEffect(() => {
    setCategoryId(categoriesResult.data?.[0]?.id ?? null);
  }, [categoriesResult.data, type]);

  function changeType(nextType: 'income' | 'expense') {
    setType(nextType);
    setError(null);
  }

  async function submit() {
    const prepared = prepareTransactionDraft({ type, amountText, accountId, categoryId, note, date });
    if (!prepared.ok) {
      setError(prepared.error);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createTransaction(prepared.value);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Transaksi belum dapat disimpan.');
      setSubmitting(false);
    }
  }

  const accent = type === 'income' ? '#477e63' : '#cc705e';

  function revealBottomField() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#334039" />
          </Pressable>
          <View style={{ alignItems: 'center' }}><Text style={styles.headerTitle}>Transaksi baru</Text><Text style={styles.headerDate}>{formatDate(date)}</Text></View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.typeSwitch}>
            {(['expense', 'income'] as const).map((item) => (
              <Pressable key={item} onPress={() => changeType(item)} style={[styles.typeButton, type === item && { backgroundColor: item === 'income' ? '#477e63' : '#cc705e' }]}>
                <Ionicons name={item === 'income' ? 'arrow-down' : 'arrow-up'} size={17} color={type === item ? '#fff' : '#7b847e'} />
                <Text style={[styles.typeText, type === item && styles.typeTextActive]}>{item === 'income' ? 'Pemasukan' : 'Pengeluaran'}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.amountLabel}>NOMINAL</Text>
          <View style={[styles.amountWrap, { borderBottomColor: accent }]}>
            <Text style={[styles.currency, { color: accent }]}>Rp</Text>
            <TextInput
              autoFocus
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={19}
              onChangeText={(value) => setAmountText(formatAmountInput(value))}
              placeholder="0"
              placeholderTextColor="#c4c9c5"
              style={styles.amountInput}
              value={amountText}
            />
          </View>

          <FieldLabel icon="wallet-outline" text="Pilih akun" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
            {accounts.map((account) => (
              <Pressable key={account.id} onPress={() => setAccountId(account.id)} style={[styles.choicePill, accountId === account.id && { borderColor: accent, backgroundColor: `${accent}12` }]}>
                <Ionicons name={account.type === 'cash' ? 'cash-outline' : account.type === 'bank' ? 'business-outline' : 'phone-portrait-outline'} size={17} color={accountId === account.id ? accent : '#77817b'} />
                <Text style={[styles.choiceText, accountId === account.id && { color: accent }]}>{account.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <FieldLabel icon="pricetag-outline" text="Kategori" />
          <View style={styles.categoryGrid}>
            {categories.map((category) => {
              const selected = categoryId === category.id;
              const color = category.color ?? accent;
              return (
                <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.category, selected && { borderColor: color, backgroundColor: `${color}12` }]}>
                  <View style={[styles.categoryDot, { backgroundColor: color }]} />
                  <Text numberOfLines={1} style={[styles.categoryText, selected && { color }]}>{category.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <FieldLabel icon="create-outline" text="Catatan (opsional)" />
          <TextInput
            maxLength={120}
            multiline
            onChangeText={setNote}
            onFocus={revealBottomField}
            placeholder="Untuk apa transaksi ini?"
            placeholderTextColor="#a1a7a3"
            style={styles.noteInput}
            textAlignVertical="top"
            value={note}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable disabled={submitting} onPress={submit} style={({ pressed }) => [styles.saveButton, { backgroundColor: accent }, submitting && styles.disabled, pressed && styles.pressed]}>
            <Text style={styles.saveText}>{submitting ? 'Menyimpan…' : `Simpan ${type === 'income' ? 'pemasukan' : 'pengeluaran'}`}</Text>
            {!submitting ? <Ionicons name="checkmark" size={20} color="#fff" /> : null}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return <View style={styles.fieldLabel}><Ionicons name={icon} size={16} color="#66736b" /><Text style={styles.fieldLabelText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f1' },
  header: { height: 66, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dde1dc' },
  closeButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8ece6' },
  headerSpacer: { width: 42 }, headerTitle: { color: '#26322b', fontSize: 15, fontWeight: '700' }, headerDate: { color: '#8a928d', fontSize: 9, marginTop: 3 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 44 },
  typeSwitch: { height: 48, padding: 4, borderRadius: 17, flexDirection: 'row', backgroundColor: '#e9ece7' },
  typeButton: { flex: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  typeText: { color: '#7b847e', fontSize: 11, fontWeight: '700' }, typeTextActive: { color: '#fff' },
  amountLabel: { color: '#89918c', fontSize: 9, fontWeight: '800', letterSpacing: 1.3, textAlign: 'center', marginTop: 30 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderBottomWidth: 1.5, marginTop: 7, minWidth: 180, maxWidth: '90%' },
  currency: { fontSize: 20, fontWeight: '700', marginRight: 6 }, amountInput: { color: '#26312b', fontSize: 38, fontWeight: '800', letterSpacing: -1.5, minWidth: 100, maxWidth: 260, paddingVertical: 6 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 29, marginBottom: 11 }, fieldLabelText: { color: '#59645d', fontSize: 11, fontWeight: '700' },
  choiceRow: { gap: 9 }, choicePill: { height: 43, borderRadius: 15, borderWidth: 1, borderColor: '#dfe3de', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13 }, choiceText: { color: '#69736d', fontSize: 11, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, category: { width: '48%', minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: '#e0e4df', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }, categoryDot: { width: 8, height: 8, borderRadius: 4 }, categoryText: { flex: 1, color: '#657069', fontSize: 10, fontWeight: '600' },
  noteInput: { minHeight: 82, borderRadius: 17, borderWidth: 1, borderColor: '#dfe3de', backgroundColor: '#fff', color: '#303a34', fontSize: 12, lineHeight: 18, padding: 14 },
  error: { color: '#ad5444', fontSize: 10, marginTop: 10 },
  footer: { padding: 16, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#dde1dc', backgroundColor: '#f7f7f1' },
  saveButton: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, saveText: { color: '#fff', fontSize: 12, fontWeight: '700' }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
