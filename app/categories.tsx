import { Ionicons } from '@expo/vector-icons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { categoriesQuery } from '@/src/db/queries/categories';
import type { CategoryType } from '@/src/db/schema';

export default function CategoriesScreen() {
  const [type, setType] = useState<CategoryType>('expense');
  const query = useLiveQuery(categoriesQuery(type), [type]);
  const categories = query.data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={21} color="#334039" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Kategori</Text>
          <Text style={styles.subtitle}>{categories.length} kategori aktif</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tambah kategori"
          onPress={() => router.push({ pathname: '/category/new', params: { type } })}
          style={styles.headerButton}>
          <Ionicons name="add" size={23} color="#31584c" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.tabs}>
          {([['expense', 'Pengeluaran'], ['income', 'Pemasukan']] as const).map(([value, label]) => (
            <Pressable key={value} onPress={() => setType(value)} style={[styles.tab, type === value && styles.tabActive]}>
              <Ionicons name={value === 'expense' ? 'arrow-up' : 'arrow-down'} size={17} color={type === value ? '#fff' : '#7b847e'} />
              <Text style={[styles.tabText, type === value && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{type === 'expense' ? 'Kategori pengeluaran' : 'Kategori pemasukan'}</Text>
          <Text style={styles.sectionMeta}>Tekan untuk edit</Text>
        </View>

        <View style={styles.list}>
          {categories.length ? categories.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={`Edit kategori ${category.name}`}
              onPress={() => router.push(`/category/${category.id}`)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={[styles.colorDot, { backgroundColor: category.color ?? '#64748B' }]} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowName}>{category.name}</Text>
                <Text style={styles.rowMeta}>{category.isDefault ? 'Kategori bawaan' : 'Kategori buatanmu'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#a9afab" />
            </Pressable>
          )) : (
            <View style={styles.empty}>
              <Ionicons name="pricetags-outline" size={28} color="#89938d" />
              <Text style={styles.emptyTitle}>Belum ada kategori</Text>
              <Text style={styles.emptyCopy}>Tambahkan kategori yang sesuai dengan kebutuhanmu.</Text>
            </View>
          )}
        </View>
        {query.error ? <Text style={styles.error}>Kategori belum dapat dimuat: {query.error.message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f1' },
  header: { height: 72, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dde1dc' },
  headerButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8ece6' },
  headerCopy: { flex: 1, alignItems: 'center' },
  title: { color: '#26322b', fontSize: 17, fontWeight: '800' },
  subtitle: { color: '#929994', fontSize: 9, marginTop: 3 },
  scroll: { padding: 20, paddingBottom: 45 },
  tabs: { height: 50, padding: 4, borderRadius: 17, flexDirection: 'row', backgroundColor: '#e9ece7' },
  tab: { flex: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabActive: { backgroundColor: '#477e63' },
  tabText: { color: '#7b847e', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  sectionHeader: { marginTop: 25, marginBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#29302b', fontSize: 15, fontWeight: '700' },
  sectionMeta: { color: '#8d9690', fontSize: 9 },
  list: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8eae6' },
  row: { minHeight: 66, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8eae6' },
  pressed: { opacity: 0.65, backgroundColor: '#f4f6f2' },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  rowCopy: { flex: 1 },
  rowName: { color: '#2c332f', fontSize: 13, fontWeight: '700' },
  rowMeta: { color: '#929994', fontSize: 9, marginTop: 3 },
  empty: { minHeight: 220, padding: 30, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#39433d', fontSize: 14, fontWeight: '700', marginTop: 12 },
  emptyCopy: { color: '#89928c', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 5 },
  error: { color: '#ad5444', fontSize: 10, marginTop: 12 },
});
