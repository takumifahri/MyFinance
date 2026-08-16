# ROADMAP — FinTrack (Local-First)

Milestone bertahap. Tujuan urutan ini: **selalu ada sesuatu yang jalan** di tiap tahap, biar momentum kejaga dan nggak overwhelm. Selesaikan satu milestone sebelum lanjut.

---

## M0 — Setup (fondasi)
- [ ] `create-expo-app` (SDK 54), jalan di Expo Go.
- [ ] Pasang expo-sqlite + drizzle-orm + drizzle-kit.
- [ ] Buat `schema.ts` + `client.ts`, konfigurasi migrasi, `useMigrations` di root.
- [ ] Verifikasi: bisa insert 1 baris dummy & tampil di layar.

**Selesai jika:** app buka di HP, DB kebuat, satu data test tampil.

---

## M1 — Akun & Kategori (CRUD pertama)
- [ ] CRUD Akun (list + tambah/edit/hapus).
- [ ] CRUD Kategori (income/expense).
- [ ] Seed kategori default saat pertama jalan.

**Selesai jika:** bisa kelola akun & kategori sepenuhnya dari UI.

---

## M2 — Transaksi (inti aplikasi)
- [ ] Form tambah transaksi (tipe, akun, kategori, nominal, tanggal, catatan).
- [ ] Daftar transaksi (FlatList) + edit/hapus.
- [ ] Filter (rentang tanggal, akun, kategori, tipe).
- [ ] Perhitungan & tampil saldo per akun.

**Selesai jika:** bisa mencatat & menelusuri transaksi, saldo akun akurat.

---

## M3 — Dashboard & Grafik
- [ ] Kartu ringkasan (total saldo, pemasukan, pengeluaran periode berjalan).
- [ ] Grafik pengeluaran per kategori.
- [ ] Grafik tren income vs expense.
- [ ] Pemilih periode.

**Selesai jika:** dashboard memberi gambaran keuangan sekali lihat.

---

## M4 — Backup & Import (ketahanan data) — WAJIB
- [ ] Export seluruh data → file JSON (share sheet).
- [ ] Import/restore dari file JSON (timpa/gabung), dibungkus transaksi DB.
- [ ] Format backup ber-`version`.

**Selesai jika:** data bisa diselamatkan & dipulihkan lintas perangkat lewat file.

---

## M5 — Polish
- [ ] Dark mode + preferensi tersimpan.
- [ ] Empty/loading/error state di semua list.
- [ ] Pull-to-refresh, rapikan UX input (keyboard numerik, date picker).
- [ ] Transfer antar akun (opsional di sini).

**Selesai jika:** terasa "produk", bukan prototipe.

---

## M6 — Distribusi
- [ ] Ikon & splash.
- [ ] EAS Build → APK.
- [ ] Halaman project di portfolio (screenshot/demo + link APK).

---

## Backlog / Future (setelah v1)
- PIN / biometrik lock.
- Enkripsi at-rest (mis. SQLCipher).
- Backup ke cloud (Drive/iCloud).
- Budget & target tabungan per kategori.
- Recurring transaction & reminder.
- Lampiran struk (kamera).
- Multi-currency.
- Rilis ke Play Store.
- *(Terpisah dari project ini)* eksperimen backend NestJS untuk belajar server & sinkronisasi.
