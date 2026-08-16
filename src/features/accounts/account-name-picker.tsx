import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AccountNamePicker({
  options,
  value,
  onChange,
  onChooseOther,
}: {
  options: readonly string[];
  value: string;
  onChange: (name: string) => void;
  onChooseOther: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('id-ID');
    return keyword
      ? options.filter((name) => name.toLocaleLowerCase('id-ID').includes(keyword))
      : options;
  }, [options, search]);

  function close() {
    setVisible(false);
    setSearch('');
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pilih nama akun"
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.select, pressed && styles.pressed]}>
        <Text style={styles.selectText}>{value}</Text>
        <Ionicons name="chevron-down" size={19} color="#607068" />
      </Pressable>

      <Modal animationType="slide" onRequestClose={close} presentationStyle="pageSheet" visible={visible}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Pilih akun</Text>
              <Text style={styles.subtitle}>{options.length} pilihan tersedia</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup pilihan" onPress={close} style={styles.close}>
              <Ionicons name="close" size={21} color="#334039" />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#87918b" />
            <TextInput
              autoFocus
              autoCorrect={false}
              onChangeText={setSearch}
              placeholder="Cari nama bank atau e-wallet"
              placeholderTextColor="#9da49f"
              style={styles.search}
              value={search}
            />
          </View>

          <FlatList
            data={filtered}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>Tidak ditemukan. Pilih Lainnya untuk mengetik manual.</Text>}
            renderItem={({ item }) => {
              const selected = item === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item);
                    close();
                  }}
                  style={[styles.option, selected && styles.optionSelected]}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item}</Text>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color="#477e63" /> : null}
                </Pressable>
              );
            }}
            ListFooterComponent={(
              <Pressable
                onPress={() => {
                  onChooseOther();
                  close();
                }}
                style={[styles.option, styles.other]}>
                <View>
                  <Text style={styles.optionText}>Lainnya</Text>
                  <Text style={styles.otherCopy}>Ketik nama akun secara manual</Text>
                </View>
                <Ionicons name="create-outline" size={20} color="#477e63" />
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  select: { height: 56, borderRadius: 17, borderWidth: 1.5, borderColor: '#d7dcd7', backgroundColor: '#fff', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { color: '#243029', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  modalSafe: { flex: 1, backgroundColor: '#f7f7f1' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#26322b', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#89918c', fontSize: 10, marginTop: 4 },
  close: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8ece6' },
  searchWrap: { height: 52, marginHorizontal: 20, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe3de' },
  search: { flex: 1, color: '#26322b', fontSize: 13 },
  list: { padding: 20, paddingBottom: 35, gap: 8 },
  option: { minHeight: 54, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e7e2' },
  optionSelected: { borderColor: '#79a08f', backgroundColor: '#edf3ec' },
  optionText: { color: '#303934', fontSize: 12, fontWeight: '700' },
  optionTextSelected: { color: '#31584c' },
  other: { marginTop: 8, borderColor: '#9bb3a7', borderStyle: 'dashed' },
  otherCopy: { color: '#8d9690', fontSize: 9, marginTop: 3 },
  empty: { color: '#89918c', fontSize: 11, lineHeight: 17, textAlign: 'center', padding: 24 },
});
