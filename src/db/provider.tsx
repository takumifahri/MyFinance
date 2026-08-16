import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { initDatabase, type DB } from './client';
import { seedIfNeeded } from './seed';
import { useDbDevTools } from './use-db-devtools';

type Props = { children: ReactNode };

/**
 * Urutan penyiapan: buka DB (async) → jalankan migrasi → seed → baru render UI.
 * Anak komponen tidak pernah melihat database setengah jadi.
 */
export function DatabaseProvider({ children }: Props) {
  const [db, setDb] = useState<DB | null>(null);
  const [openError, setOpenError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    initDatabase()
      .then((ready) => !cancelled && setDb(ready))
      .catch((err: Error) => !cancelled && setOpenError(err));

    return () => {
      cancelled = true;
    };
  }, []);

  if (openError) return <Failure title="Gagal membuka database" error={openError} />;
  if (!db) return <Loading />;

  return <MigrationGate db={db}>{children}</MigrationGate>;
}

/** Dipisah agar useMigrations baru dipanggil setelah instance DB benar-benar ada. */
function MigrationGate({ db, children }: Props & { db: DB }) {
  useDbDevTools();
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) return;
    let cancelled = false;

    seedIfNeeded()
      .then(() => !cancelled && setSeeded(true))
      .catch((err: Error) => !cancelled && setSeedError(err));

    return () => {
      cancelled = true;
    };
  }, [success]);

  const failure = error ?? seedError;
  if (failure) return <Failure title="Gagal menyiapkan database" error={failure} />;
  if (!success || !seeded) return <Loading />;

  return <>{children}</>;
}

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  );
}

function Failure({ title, error }: { title: string; error: Error }) {
  useEffect(() => {
    if (Platform.OS !== 'web') SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{error.message}</Text>
      {Platform.OS === 'web' ? (
        <Text style={styles.hint}>
          Dukungan SQLite di web masih alpha. Jalankan di HP lewat Expo Go untuk hasil yang andal.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 16, fontWeight: '600' },
  message: { textAlign: 'center', opacity: 0.7 },
  hint: { textAlign: 'center', opacity: 0.5, fontSize: 12, marginTop: 8 },
});
