# Keuangan Pribadi

Konteks ini mencatat posisi dan pergerakan uang pribadi yang disimpan di perangkat pengguna.

## Language

**Akun Keuangan**:
Satu tempat penyimpanan uang milik pengguna, dibedakan oleh jenis dan nama tampilannya. Dalam MVP, pasangan jenis dan nama yang sama dianggap akun yang sama.
_Avoid_: Akun pengguna, login

**Saldo Awal**:
Posisi uang ketika Akun Keuangan pertama kali didaftarkan. Penambahan uang setelah akun ada bukan perubahan Saldo Awal.
_Avoid_: Top-up, pemasukan

**Pemasukan**:
Pergerakan uang yang menambah saldo sebuah Akun Keuangan dan tercatat dalam riwayat.
_Avoid_: Mengubah saldo awal

**Pengeluaran**:
Pergerakan uang yang mengurangi saldo sebuah Akun Keuangan dan tercatat dalam riwayat.

**Saldo Berjalan**:
Posisi uang hasil Saldo Awal ditambah Pemasukan dan dikurangi Pengeluaran.
_Avoid_: Saldo tersimpan
