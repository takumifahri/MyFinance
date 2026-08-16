# PRD — FinTrack (Aplikasi Manajemen Keuangan, Local-First)

> **Project:** `keuangan-mobile`
> **Working title:** FinTrack — silakan ganti.
> **Arsitektur:** Local-first (Expo/React Native), data disimpan di HP (SQLite), **tanpa backend/server**.
> **Stack:** Expo (React Native) + TypeScript (SDK 54), expo-sqlite + Drizzle ORM.
> **Status:** Draft v1 (MVP)

---

## 1. Ringkasan & Tujuan

FinTrack adalah aplikasi manajemen keuangan pribadi berbasis mobile yang menyimpan **seluruh data di perangkat pengguna** (on-device SQLite). Tidak ada server, tidak ada akun online, tidak ada koneksi internet yang dibutuhkan untuk fungsi inti.

Aplikasi mencatat pemasukan/pengeluaran, mengelola beberapa akun (kas, bank, e-wallet), mengkategorikan transaksi, dan menampilkan ringkasan lewat dashboard.

### Kenapa Local-First
- **Privat & aman dari serangan jarak jauh:** tidak ada server yang bisa dibobol — data hanya ada di HP pengguna, di storage privat yang di-sandbox OS.
- **Simpel & gratis:** tanpa hosting, tanpa domain, tanpa biaya server.
- **Offline penuh:** jalan tanpa internet.

### Tujuan Frontend
- UI mobile ringan & cepat untuk input transaksi harian.
- Data layer lokal yang rapi (Drizzle ORM di atas SQLite) dengan query reaktif.
- Fitur **backup/export & import** untuk menutup kelemahan utama local-first (risiko kehilangan data).

> **Catatan lingkup:** belajar backend (NestJS) sengaja **tidak** dilakukan di project ini — akan dikerjakan di project terpisah agar tiap project fokus dan tidak overwhelm.

---

## 2. Konteks Produk

- **Pengguna:** individu, satu pengguna per perangkat (single-user, no login).
- **Mata uang default:** IDR.
- **Penyimpanan:** SQLite lokal (`expo-sqlite`), diakses via Drizzle ORM.
- **Entitas inti:** Account, Category, Transaction (+ Settings). Tidak ada entitas User (implisit = pemilik HP).
- **Aturan wajib uang:** nominal = **bilangan bulat satuan terkecil** (IDR = rupiah), disimpan sebagai `INTEGER`. **Jangan** `float`/`REAL` untuk uang. Format hanya saat tampilan.

---

## 3. Batasan Cakupan (Scope)

### In Scope — MVP (v1)
- CRUD Akun (cash / bank / e-wallet), tampil saldo per akun.
- CRUD Kategori (income / expense).
- CRUD Transaksi (income / expense) dengan filter (rentang tanggal, akun, kategori, tipe).
- Dashboard ringkasan: total saldo, pemasukan & pengeluaran periode berjalan, grafik.
- Format angka IDR untuk tampilan.
- **Backup/Export & Import** data (file JSON) — fitur wajib, bukan opsional.
- Berjalan di HP via Expo Go (dev) dan sebagai APK (distribusi).

### Should Have
- Transfer antar akun.
- Dark mode.
- Pull-to-refresh & empty/loading state rapi.
- Pengaturan (mata uang, tema) tersimpan lokal.

### Out of Scope (v1 — ditunda)
- Backend/server, akun online, login.
- Sinkronisasi antar perangkat / multi-user / sharing.
- Budget & target tabungan.
- Recurring transaction, notifikasi/reminder.
- Lampiran struk (kamera), OCR.
- Multi-currency & konversi kurs.
- PIN/biometrik lock (kandidat kuat fase berikutnya).

---

## 4. Ranah / Domain

Domain = **pencatatan keuangan pribadi**.

| Entitas | Peran di UI |
|---------|-------------|
| **Account** | Dompet/akun (kas, bank, e-wallet); nama, tipe, saldo. |
| **Category** | Label transaksi (Gaji, Makan, dst.); bertipe income/expense. |
| **Transaction** | Catatan mutasi uang; nominal, tanggal, akun, kategori, catatan. |
| **Settings** | Preferensi lokal (tema, mata uang). |

Saldo & laporan **dihitung di perangkat** dari data transaksi (tidak ada server). Detail perhitungan & skema ada di `SCHEMA.md`.

---

## 5. Persona & Alur Utama

**Persona:** individu yang mencatat keuangan pribadi dari HP, mengutamakan kesederhanaan & privasi.

**Alur inti:**
1. Buka app (langsung siap pakai — tanpa register/login).
2. Buat minimal satu Akun + beberapa Kategori (bisa disediakan kategori default saat pertama jalan).
3. Catat transaksi harian lewat tombol tambah cepat.
4. Lihat Dashboard (ringkasan + grafik).
5. Sesekali **backup** data ke file (mis. simpan ke Drive/kirim ke diri sendiri).

---

## 6. Fitur (rincian)

Prioritas: **M** = Must, **S** = Should, **C** = Could.

| # | Fitur | Prioritas | Catatan |
|---|-------|-----------|---------|
| F1 | Daftar & form Akun | M | List akun + saldo; tambah-edit-hapus. |
| F2 | Daftar & form Kategori | M | Pisah income vs expense; seed kategori default. |
| F3 | Daftar transaksi + filter | M | FlatList; filter tanggal/akun/kategori/tipe. |
| F4 | Form transaksi (tambah/edit/hapus) | M | Keyboard numerik nominal; date picker. |
| F5 | Dashboard ringkasan | M | Kartu total saldo, pemasukan, pengeluaran; pilih periode. |
| F6 | Grafik | M | Pengeluaran per kategori (pie/bar) & tren income vs expense (line). |
| F7 | Backup/Export ke file JSON | M | Ekspor seluruh data ke satu file yang bisa dibagikan/disimpan. |
| F8 | Import/Restore dari file JSON | M | Muat kembali data dari file backup (timpa / gabung). |
| F9 | Transfer antar akun | S | Akun asal, tujuan, nominal. |
| F10 | Dark mode | S | Tema terang/gelap, tersimpan di Settings. |
| F11 | Empty/loading/error state | S | Tiap list punya state jelas. |

---

## 7. Navigasi & Struktur Layar

Pakai **Expo Router** (file-based, default template SDK 54). Tanpa grup auth (tak ada login).

| Layar | Isi |
|-------|-----|
| Tab **Dashboard** | Ringkasan + grafik |
| Tab **Transaksi** | Daftar & kelola transaksi |
| Tab **Akun** | Daftar & kelola akun |
| Tab **Pengaturan** | Kategori, tema, backup/import, tentang |
| `transaction/new` | Form tambah (modal) |
| `transaction/[id]` | Detail/edit transaksi |

---

## 8. Komponen (React Native)

Dibangun dari nol. Komponen khas FinTrack:
- `TransactionForm`, `TransactionList` (FlatList), `TransactionRow`
- `AccountCard`, `AccountForm`
- `CategoryPill`, `CategoryForm`
- `SummaryCard`, `CategoryChart`, `TrendChart`
- `MoneyText` (format integer → IDR)
- `PeriodSelector`, `DateField`
- `Screen`/`Container` (safe-area + padding konsisten)

**Styling:** `StyleSheet` bawaan (nol setup) untuk v1; opsi NativeWind bila mau gaya Tailwind.
**Chart:** `react-native-gifted-charts` (ramah pemula) atau `victory-native`.

---

## 9. Data Layer & State

- **Database:** `expo-sqlite` (SQLite tertanam di app).
- **ORM:** **Drizzle** — skema & query TypeScript type-safe. Detail di `SCHEMA.md`.
- **Query reaktif:** `useLiveQuery` dari `drizzle-orm/expo-sqlite` — UI otomatis update saat data berubah (tanpa perlu refetch manual).
- **Money:** simpan & proses sebagai integer; format saat render pakai `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })` (didukung Hermes SDK 54).
- **UI state:** React state lokal + Context (tema).

---

## 10. Non-Functional

- **Keamanan data:** data di storage privat app (sandbox OS). Tidak ada paparan jaringan. (Enkripsi at-rest & app-lock = fase berikut.)
- **Ketahanan data:** backup/export wajib ada agar data tak hilang saat ganti/uninstall HP.
- **Performa list:** `FlatList` (virtualized) untuk transaksi.
- **UX mobile:** safe area, keyboard handling, ukuran sentuh memadai.
- **Migrasi DB:** dikelola via Drizzle migrations (lihat `ARCHITECTURE.md`).

---

## 11. Distribusi

- **Dev:** Expo Go — `npx expo start`, scan QR, hot reload.
- **APK (demo/portofolio):** EAS Build — `eas build -p android --profile preview`.
- **Portofolio:** halaman project di web portfolio (screenshot/demo + link APK/QR).

---

## 12. Rencana Fase Berikutnya

Lihat `ROADMAP.md`. Ringkas: transfer, dark mode, PIN/biometrik lock, enkripsi at-rest, backup ke cloud, budget, recurring, rilis Play Store.

---

*Dokumen terkait: `SCHEMA.md` (model data & Drizzle), `ARCHITECTURE.md` (struktur & keputusan teknis), `ROADMAP.md` (milestone), `README.md` (setup & run).*
