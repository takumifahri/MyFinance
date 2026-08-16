# FinTrack — `keuangan-mobile`

Aplikasi manajemen keuangan pribadi berbasis mobile. **Local-first**: semua data disimpan di perangkat (SQLite), tanpa server, tanpa akun online, jalan offline.

> Working title "FinTrack" — silakan ganti.

## Fitur (v1)
- Kelola akun (kas, bank, e-wallet) & kategori.
- Catat pemasukan/pengeluaran, filter & telusuri transaksi.
- Dashboard ringkasan + grafik.
- Backup/export & import data (file JSON).

## Stack
- Expo (React Native) + TypeScript — SDK 54
- Expo Router (navigasi)
- expo-sqlite + Drizzle ORM (data lokal)
- react-native-gifted-charts (grafik)

## Prasyarat
- Node.js (disarankan lewat version manager seperti **fnm**; hindari npm 12 yang bikin `create-expo-app` error — pakai npm 10/11).
- Aplikasi **Expo Go** di HP (dari Play Store / App Store).

## Setup
```bash
# install dependency
npm install

# generate migrasi DB (hanya perlu diulang tiap src/db/schema.ts berubah)
npm run db:generate

# jalankan
npx expo start
```
Migrasi diterapkan otomatis saat app start lewat `DatabaseProvider` (`src/db/provider.tsx`),
dilanjutkan seed kategori & akun default pada instalasi baru.
Lalu scan QR dengan Expo Go — app jalan di HP dengan hot reload.

## Script
| Perintah | Fungsi |
|----------|--------|
| `npx expo start` | Jalankan dev server |
| `npm run db:generate` | Generate migrasi dari `src/db/schema.ts` |
| `npm run typecheck` | Cek TypeScript tanpa emit |
| `eas build -p android --profile preview` | Build APK (butuh akun Expo) |

## Struktur Project
Ringkas: rute di `app/` (Expo Router), data & query di `src/db/`, komponen di `src/components/`, util di `src/utils/`. Detail di **`ARCHITECTURE.md`**.

## Dokumentasi
- **`PRD.md`** — kebutuhan produk, cakupan, fitur.
- **`SCHEMA.md`** — model data & skema Drizzle.
- **`ARCHITECTURE.md`** — struktur, data layer, migrasi, keputusan teknis.
- **`ROADMAP.md`** — milestone bertahap.

## Catatan
- Nominal uang disimpan sebagai **integer** (satuan terkecil), bukan float.
- Data hanya ada di perangkat — **gunakan fitur backup** agar tidak hilang saat ganti/uninstall HP.
- Backend (NestJS) **tidak** bagian dari project ini; dipelajari terpisah.
