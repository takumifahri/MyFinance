import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';

const icons = {
  index: ['grid-outline', 'grid'] as const,
  transactions: ['receipt-outline', 'receipt'] as const,
  accounts: ['wallet-outline', 'wallet'] as const,
  settings: ['settings-outline', 'settings'] as const,
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#31584c',
        tabBarInactiveTintColor: '#949b96',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        tabBarStyle: { height: 72, paddingTop: 7, paddingBottom: 10, borderTopColor: '#e7e9e5', backgroundColor: '#fff' },
      }}>
      {Object.entries({ index: 'Dashboard', transactions: 'Transaksi', accounts: 'Akun', settings: 'Pengaturan' }).map(([name, title]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => <Ionicons name={icons[name as keyof typeof icons][focused ? 1 : 0]} size={21} color={color} />,
          }}
        />
      ))}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
