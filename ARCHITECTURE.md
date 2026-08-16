# ARCHITECTURE — FinTrack (Local-First)

Keputusan teknis & struktur untuk `keuangan-mobile`.

---

## 1. Gambaran Besar

App **local-first**: seluruh logika & data ada di dalam aplikasi mobile. Tidak ada server.

```
┌──────────────────────────────────────────┐
│                Aplikasi (HP)              │
│                                           │
│   UI (React Native / Expo Router)         │
│            │                              │
│   Data hooks / queries (Drizzle)          │
│            │                              │
│   SQLite (expo-sqlite) ── file DB privat  │
│                                           │
│   Backup/Import ── file JSON (share)      │
└──────────────────────────────────────────┘
```

---

## 2. Stack & Library

| Kebutuhan | Pilihan |
|-----------|---------|
| Framework | Expo (React Native) + TypeScript, SDK 54 |
| Navigasi | Expo Router (file-based) |
| Database | expo-sqlite |
| ORM & migrasi | drizzle-orm + drizzle-kit |
| Query reaktif | `useLiveQuery` (drizzle-orm/expo-sqlite) |
| Styling | StyleSheet (v1); opsi NativeWind |
| Chart | react-native-gifted-charts / victory-native |
| Tanggal | dayjs (opsional) |
| Backup file | expo-file-system + expo-sharing + expo-document-picker |

---

## 3. Struktur Folder

```
keuangan-mobile/
├── app/                          # rute (Expo Router)
│   ├── _layout.tsx               # root: provider (Theme), init DB & migrasi
│   ├── (tabs)/
│   │   ├── _layout.tsx           # tab bar
│   │   ├── index.tsx             # Dashboard
│   │   ├── transactions.tsx
│   │   ├── accounts.tsx
│   │   └── settings.tsx
│   └── transaction/
│       ├── new.tsx
│       └── [id].tsx
├── src/
│   ├── db/
│   │   ├── schema.ts             # skema Drizzle (lihat SCHEMA.md)
│   │   ├── client.ts             # buka SQLite + instance drizzle
│   │   ├── seed.ts               # kategori default saat pertama jalan
│   │   └── queries/              # fungsi query per domain
│   │       ├── accounts.ts
│   │       ├── categories.ts
│   │       └── transactions.ts
│   ├── features/                 # logika UI per domain
│   ├── components/               # komponen reusable
│   ├── hooks/
│   ├── theme/                    # token warna, dark/light
│   └── utils/
│       ├── money.ts              # format/parse IDR
│       ├── date.ts
│       └── backup.ts             # export/import JSON
├── drizzle/                      # migrasi hasil generate (jangan diedit tangan)
├── drizzle.config.ts
├── metro.config.js
├── app.json
└── package.json
```

**Prinsip:** UI tidak query SQLite langsung — selalu lewat `src/db/queries/*`. Ini memisahkan tampilan dari data, memudahkan test & perubahan.

---

## 4. Inisialisasi Database (`src/db/client.ts`)

```ts
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const expoDb = openDatabaseSync('finance.db', { enableChangeListener: true }); // untuk useLiveQuery
export const db = drizzle(expoDb, { schema });
```

`enableChangeListener: true` diperlukan agar `useLiveQuery` reaktif.

---

## 5. Migrasi (Drizzle + Expo)

1. **Konfigurasi** `drizzle.config.ts`:
   ```ts
   import type { Config } from 'drizzle-kit';
   export default {
     schema: './src/db/schema.ts',
     out: './drizzle',
     dialect: 'sqlite',
     driver: 'expo',
   } satisfies Config;
   ```
2. **Generate** migrasi tiap kali skema berubah:
   ```bash
   npx drizzle-kit generate
   ```
   Ini menulis SQL + `drizzle/migrations.js`.
3. **Metro** perlu tahu cara meng-import file migrasi. Di `metro.config.js`, tambahkan `sql` ke `resolver.sourceExts` (mengikuti panduan Drizzle x Expo terbaru).
4. **Terapkan saat app start** dengan hook `useMigrations` di root layout:
   ```ts
   import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
   import migrations from '../drizzle/migrations';
   import { db } from '../src/db/client';

   const { success, error } = useMigrations(db, migrations);
   // tampilkan loading sampai success; tampilkan pesan bila error
   ```

> Setup Drizzle+Expo kadang berubah antar versi — kalau ada langkah yang beda, ikuti dok resmi Drizzle "Expo SQLite" untuk versi yang terpasang.

---

## 6. Pola Query & Reaktivitas

- **Baca (reaktif):** pakai `useLiveQuery` agar UI auto-update saat data berubah.
  ```ts
  import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
  const { data } = useLiveQuery(db.select().from(transactions));
  ```
- **Tulis:** panggil fungsi di `src/db/queries/*` (insert/update/delete). Operasi multi-langkah (mis. transfer, import) dibungkus `db.transaction(...)` agar atomik.

---

## 7. Keputusan Teknis (ADR ringkas)

| Keputusan | Alasan |
|-----------|--------|
| Local-first, tanpa backend | Privasi, simpel, gratis, offline; sesuai kebutuhan app pribadi. Menutup risiko serangan server dari jarak jauh. |
| NestJS **dipisah** ke project lain | Agar app ini cepat kelar & tak overwhelm; belajar backend tetap jalan di tempat yang memang butuh server. |
| SQLite + Drizzle | Drizzle type-safe & ergonomis di TS; SQLite tertanam & andal untuk on-device. |
| Uang sebagai INTEGER | Menghindari galat presisi floating point pada nominal uang. |
| PK integer autoincrement | Sederhana; tak butuh UUID karena tak ada sync antar perangkat. |
| Backup/Import JSON | Menutup kelemahan utama local-first: data hilang saat ganti/uninstall HP. |

---

## 8. Batas & Risiko yang Disadari

- **Data hanya di satu perangkat** → mitigasi: fitur backup/export (wajib di v1).
- **Belum ada enkripsi at-rest / app-lock** → fase berikutnya (mis. SQLCipher / expo-secure-store untuk kunci, PIN/biometrik).
- **Tidak ada sinkronisasi** → memang di luar cakupan; bila kelak dibutuhkan, itu perubahan arsitektur besar (dan saat itulah backend jadi relevan).
