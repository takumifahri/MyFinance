import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useState } from 'react';
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
  archiveCategory,
  categoriesQuery,
  createCategory,
  updateCategory,
} from '@/src/db/queries/categories';
import type { Category, CategoryType } from '@/src/db/schema';
import {
  CATEGORY_ICONS,
  categoryGlyph,
  guessCategoryIconKey,
  isCategoryIconKey,
  type CategoryIconKey,
} from '@/src/features/categories/category-icons';

const COLORS = [
  '#F97316',
  '#EF4444',
  '#EC4899',
  '#A855F7',
  '#64748B',
  '#0EA5E9',
  '#14B8A6',
  '#22C55E',
  '#84CC16',
  '#EAB308',
] as const;

export function CategoryFormScreen({
  categoryId,
  initialType = 'expense',
}: {
  categoryId?: number;
  initialType?: CategoryType;
}) {
  const query = useLiveQuery(categoriesQuery(undefined, true));
  const category = categoryId === undefined
    ? undefined
    : query.data?.find((item) => item.id === categoryId);

  if (query.data === undefined) return <LoadingCategory />;
  if (categoryId !== undefined && !category) return <MissingCategory />;

  return <CategoryForm key={category?.id ?? 'new'} category={category} initialType={initialType} />;
}

function CategoryForm({ category, initialType }: { category?: Category; initialType: CategoryType }) {
  const editing = Boolean(category);
  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<CategoryType>(category?.type ?? initialType);
  const [color, setColor] = useState(category?.color ?? COLORS[0]);
  const [icon, setIcon] = useState<CategoryIconKey>(initialIconKey(category));
  // Selama user belum memilih ikon sendiri, ikon mengikuti tebakan dari nama.
  const [iconPickedManually, setIconPickedManually] = useState(
    isCategoryIconKey(category?.icon),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Masukkan nama kategori.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (category) {
        await updateCategory(category.id, { name: cleanName, type, color, icon });
      } else {
        await createCategory({ name: cleanName, type, color, icon });
      }
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Kategori belum dapat disimpan.');
      setSubmitting(false);
    }
  }

  function confirmArchive() {
    if (!category) return;
    Alert.alert(
      'Arsipkan kategori?',
      `${category.name} tidak akan muncul untuk transaksi baru. Transaksi lama tetap utuh.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Arsipkan',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await archiveCategory(category.id);
              router.back();
            } catch (archiveError) {
              setError(archiveError instanceof Error ? archiveError.message : 'Kategori belum dapat diarsipkan.');
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#334039" />
          </Pressable>
          <Text style={styles.headerTitle}>{editing ? 'Edit kategori' : 'Kategori baru'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>NAMA KATEGORI</Text>
          <TextInput
            autoFocus={!editing}
            maxLength={40}
            onChangeText={(value) => {
              setName(value);
              setError(null);
              if (!iconPickedManually) {
                const suggestion = guessCategoryIconKey(value);
                if (suggestion) setIcon(suggestion);
              }
            }}
            onSubmitEditing={save}
            placeholder="Contoh: Pendidikan, Peliharaan"
            placeholderTextColor="#a0a8a2"
            returnKeyType="done"
            style={styles.input}
            value={name}
          />

          <Text style={styles.label}>JENIS KATEGORI</Text>
          <View style={styles.typeRow}>
            {([['expense', 'Pengeluaran', 'arrow-up'], ['income', 'Pemasukan', 'arrow-down']] as const).map(([value, label, icon]) => {
              const selected = value === type;
              return (
                <Pressable key={value} onPress={() => setType(value)} style={[styles.typeOption, selected && styles.typeSelected]}>
                  <Ionicons name={icon} size={19} color={selected ? '#fff' : '#6e7872'} />
                  <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>WARNA</Text>
          <View style={styles.colorGrid}>
            {COLORS.map((item) => {
              const selected = item === color;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityLabel={`Pilih warna ${item}`}
                  accessibilityState={{ checked: selected }}
                  onPress={() => setColor(item)}
                  style={[styles.colorOption, { backgroundColor: item }, selected && styles.colorSelected]}>
                  {selected ? <Ionicons name="checkmark" size={19} color="#fff" /> : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>IKON</Text>
          <View style={styles.iconGrid}>
            {CATEGORY_ICONS.map((item) => {
              const selected = item.key === icon;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="radio"
                  accessibilityLabel={`Pilih ikon ${item.label}`}
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    setIcon(item.key);
                    setIconPickedManually(true);
                  }}
                  style={[
                    styles.iconOption,
                    selected && { borderColor: color, backgroundColor: `${color}1a` },
                  ]}>
                  <MaterialCommunityIcons
                    name={item.glyph}
                    size={21}
                    color={selected ? color : '#7c857f'}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.preview}>
            <View style={[styles.previewIcon, { backgroundColor: `${color}1f` }]}>
              <MaterialCommunityIcons name={categoryGlyph({ icon, name, type })} size={22} color={color} />
            </View>
            <View>
              <Text style={styles.previewName}>{name.trim() || 'Nama kategori'}</Text>
              <Text style={styles.previewMeta}>{type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</Text>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={submitting} onPress={save} style={({ pressed }) => [styles.saveButton, submitting && styles.disabled, pressed && styles.pressed]}>
            <Text style={styles.saveText}>{submitting ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Tambah kategori'}</Text>
            {!submitting ? <Ionicons name="checkmark" size={20} color="#fff" /> : null}
          </Pressable>

          {editing && !category?.archivedAt ? (
            <Pressable disabled={submitting} onPress={confirmArchive} style={styles.archiveButton}>
              <Ionicons name="archive-outline" size={18} color="#b35f50" />
              <Text style={styles.archiveText}>Arsipkan kategori</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function initialIconKey(category?: Category): CategoryIconKey {
  if (isCategoryIconKey(category?.icon)) return category.icon;
  return (category?.name ? guessCategoryIconKey(category.name) : null) ?? 'lainnya';
}

function LoadingCategory() {
  return <SafeAreaView style={styles.center}><Text style={styles.centerText}>Memuat kategori…</Text></SafeAreaView>;
}

function MissingCategory() {
  return (
    <SafeAreaView style={styles.center}>
      <Ionicons name="alert-circle-outline" size={30} color="#ad5444" />
      <Text style={styles.centerText}>Kategori tidak ditemukan.</Text>
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
  label: { color: '#667169', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 20, marginBottom: 9 },
  input: { height: 57, borderRadius: 17, borderWidth: 1.5, borderColor: '#d7dcd7', backgroundColor: '#fff', color: '#243029', fontSize: 15, fontWeight: '600', paddingHorizontal: 16 },
  typeRow: { flexDirection: 'row', gap: 9 },
  typeOption: { flex: 1, height: 55, borderRadius: 17, borderWidth: 1, borderColor: '#dde1dd', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  typeSelected: { borderColor: '#477e63', backgroundColor: '#477e63' },
  typeText: { color: '#59635d', fontSize: 11, fontWeight: '700' },
  typeTextSelected: { color: '#fff' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorOption: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorSelected: { borderWidth: 3, borderColor: '#fff', outlineColor: '#6c7972', outlineWidth: 2 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  iconOption: { width: 46, height: 46, borderRadius: 16, borderWidth: 1.5, borderColor: '#e0e4df', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  preview: { minHeight: 68, marginTop: 25, padding: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e4df' },
  previewIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  previewName: { color: '#2c332f', fontSize: 13, fontWeight: '700' },
  previewMeta: { color: '#929994', fontSize: 9, marginTop: 3 },
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
