import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DatabaseProvider } from '@/src/db/provider';
import { StartupFlow } from '@/src/features/onboarding/startup-flow';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => undefined);
  if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
    SplashScreen.setOptions({ duration: 300, fade: true });
  }
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        <StartupFlow>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="account/new" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="account/[id]" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="categories" options={{ headerShown: false }} />
            <Stack.Screen name="category/new" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="category/[id]" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="transaction/new" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </StartupFlow>
      </DatabaseProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
