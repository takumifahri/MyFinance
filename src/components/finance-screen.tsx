import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function FinanceScreen({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ComponentProps<typeof Ionicons>['name']; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>{action ? <Pressable style={styles.headerButton}><Ionicons name={action} size={21} color="#31584c" /></Pressable> : null}</View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function SearchBox({ label }: { label: string }) {
  return <View style={styles.search}><Ionicons name="search" size={18} color="#8c948f"/><Text style={styles.searchText}>{label}</Text><Ionicons name="options-outline" size={18} color="#31584c"/></View>;
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Text style={styles.sectionAction}>{action}</Text> : null}</View>;
}

export function ListRow({ icon, color, title, meta, value, positive = false }: { icon: ComponentProps<typeof MaterialCommunityIcons>['name']; color: string; title: string; meta: string; value?: string; positive?: boolean }) {
  return <View style={styles.row}><View style={[styles.rowIcon, { backgroundColor: `${color}20` }]}><MaterialCommunityIcons name={icon} size={21} color={color}/></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowMeta}>{meta}</Text></View>{value ? <Text style={[styles.rowValue, positive && styles.positive]}>{value}</Text> : <Ionicons name="chevron-forward" size={17} color="#a9afab"/>}</View>;
}

export function FloatingAdd() {
  return <Pressable style={styles.fab}><Ionicons name="add" size={26} color="#fff" /></Pressable>;
}

export const financeStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e9ebe7', overflow: 'hidden' },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  pill: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#ecefe9' },
  pillActive: { backgroundColor: '#31584c' },
  pillText: { color: '#68706b', fontSize: 11, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f1' }, scroll: { padding: 20, paddingTop: 12, paddingBottom: 110 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, title: { color: '#202822', fontSize: 27, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: '#8b928d', fontSize: 11, marginTop: 4 }, headerButton: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e7ece4' },
  search: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7e9e5', gap: 10 }, searchText: { flex: 1, color: '#9ca29e', fontSize: 12 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 12 }, sectionTitle: { color: '#29302b', fontSize: 16, fontWeight: '700' }, sectionAction: { color: '#477461', fontSize: 11, fontWeight: '600' },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8eae6' }, rowIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, rowTitle: { color: '#292e2a', fontSize: 13, fontWeight: '700' }, rowMeta: { color: '#919792', fontSize: 10, marginTop: 4 }, rowValue: { color: '#333a35', fontSize: 12, fontWeight: '700' }, positive: { color: '#39805c' },
  fab: { position: 'absolute', right: 22, bottom: 22, width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#31584c', shadowColor: '#31584c', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
});
