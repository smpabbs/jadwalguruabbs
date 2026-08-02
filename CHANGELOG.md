# CHANGELOG — Jadwal Mengajar Guru SMP ABBS
# File: /storage/emulated/0/Hermes Project/jadwal-guru/CHANGELOG.md

## v5.4.1 — Hapus overlay debug (fix back v5.4 sudah dikonfirmasi normal di device)
- Overlay debug (kotak hijau kiri-bawah + `backDebugInit/backDebugLog/backEventCount`) dihapus total
  dari `index.html` dan `www/index.html` — user konfirmasi perilaku tombol back sudah normal.
- Back handler v5.4 tetap utuh: single listener tanpa retry + navigasi dari DOM (`activePanel()`)
  + cooldown 700ms. Hanya logging yang dibuang, logika tidak berubah.
- APK: `JadwalGuru-v5.4.1.apk`.

## v5.4 — Tombol back: single listener + navigasi dari DOM + cooldown
- **Registrasi listener back SATU kali saja** — `setTimeout(setupBackHandler, 1000)` (retry) dihapus total.
  Capacitor di APK selalu sudah siap sejak `<head>`, jadi retry yang menjadi sumber listener dobel
  (akar bug v5.3) tidak pernah diperlukan. Mengikuti pola yang sudah terbukti di aplikasi Quran.
- **navStack dihapus** — back target ditentukan dari kondisi DOM (`.tab-panel.active`):
  sub-panel aktif → kembali ke landing; di landing → `exitApp()`. Tidak ada lagi array riwayat
  yang bisa korup/reset.
- **Cooldown 700ms** — event back kedua dalam 700ms dibuang. Sekalipun perangkat memuntahkan 2 event
  dalam satu tekan (quirk OEM/predictive-back), satu tekan = satu aksi; pola "balik lalu langsung
  keluar" dalam satu tick menjadi mustahil.
- **Browser/PWA**: pakai pola guard history (sama seperti quran-apk) — tombol back browser menutup
  panel ke landing dulu, bukan langsung meninggalkan halaman.
- Overlay debug dipertahankan di rilis ini (bukti visual: kotak hijau muncul saat startup + 1 baris
  `#N` per tekan back). Rencana dihapus setelah konfirmasi di device.
- Nama APK/artifact otomatis mengikuti versi `package.json` → `JadwalGuru-v5.4.apk`.
- Verifikasi: syntax check + 13 simulasi node (landing→exit, panel→landing, event ganda→cooldown) lulus semua.

## v5.3 — Fix akar masalah asli tombol back: listener terdaftar dobel
- User konfirmasi setelah tes v5.2 di device: bug masih persis sama (kembali ke menu utama lalu langsung
  keluar sendiri). Kedua kandidat sebelumnya (signing v5.1, predictive-back-gesture v5.2) gugur.
- **Akar masalah sebenarnya, ketemu lewat baca ulang `setupBackHandler()`**: fungsi ini dipanggil 2x —
  sekali langsung, sekali lagi lewat `setTimeout(..., 1000)` untuk jaga-jaga kalau Capacitor telat load.
  Tapi begitu `window.Capacitor.Plugins.App` sudah tersedia di panggilan pertama (selalu terjadi di APK
  native), kedua panggilan itu **sama-sama berhasil mendaftarkan listener `backButton` sendiri-sendiri** —
  jadi 2 listener aktif, bukan 1.
- Satu kali tekan tombol back fisik → event terkirim ke kedua listener berurutan dalam tick yang sama:
  listener pertama pop `navStack` (2→1) dan pindah ke menu utama (tampak seperti "navigasi back berhasil"),
  listener kedua langsung jalan sesudahnya dengan `navStack` yang sudah panjang 1 → masuk cabang exit →
  `App.exitApp()` terpanggil. Ini persis cocok dengan gejala yang dilaporkan dari awal.
- Fix: flag `backHandlerRegistered` supaya pemanggilan kedua (dari `setTimeout`) langsung `return` tanpa
  mendaftarkan listener baru. Diterapkan sama persis di `index.html` dan `www/index.html`.
- Overlay debug on-screen (ditambah setelah v5.2) **sengaja belum dihapus** — dipakai untuk konfirmasi
  visual di rilis ini: seharusnya cuma muncul 1 baris `#1 backButton fired` per satu tekan tombol back, tidak
  ada lagi `#2` yang langsung menyusul.

## v5.2 — Fix tombol back kembali lalu keluar sendiri
- Setelah fix signing (v5.1) tombol back sudah bisa navigasi mundur, tapi aplikasi lalu keluar sendiri
  sesaat setelahnya. Ternyata ini gejala yang sudah didokumentasikan tim Capacitor sendiri: fitur
  **Predictive Back Gesture** Android 13+ (swipe dari tepi layar) membuat back-handling `@capacitor/app`
  tidak konsisten pada sebagian device/versi Android.
- Fix: matikan predictive back di `AndroidManifest.xml` (`android:enableOnBackInvokedCallback="false"`)
  lewat patch otomatis di CI setelah `cap add android`, supaya sistem selalu pakai dispatch back klasik
  yang jadi target desain `setupBackHandler()` sejak awal.
- Rilis ini juga tetap butuh uninstall dulu sebelum install (perubahan level native/manifest).

## v5.1 — Cari Guru Longgar tanpa batas jam, fix signing APK
- **Cari Guru Longgar**: batas maksimal 3 jam yang bisa dipilih sekaligus dihapus — sekarang semua 9 jam bisa dipilih bersamaan
- **Fix CI**: debug keystore Android sekarang di-cache antar-build (sebelumnya di-generate ulang acak tiap build, bikin sertifikat APK beda-beda tiap rilis sehingga update di HP bisa gagal/nyangkut tanpa uninstall dulu — kandidat kuat penyebab laporan tombol back "rusak lagi" padahal kodenya tidak berubah). Mulai rilis ini seterusnya update APK seharusnya bisa pasang menimpa versi lama tanpa perlu uninstall — **kecuali untuk rilis ini sendiri**, yang tetap perlu uninstall dulu karena sertifikatnya beda dari APK v5 sebelumnya.
- Fix nama file APK/artifact di GitHub Actions yang masih hardcode "v3" sejak rilis v4 & v5

## v5 — Jadwal per Kelas, SOP Piket, tema terang
- **Tab baru "Jadwal per Kelas"**: jadwal mingguan per kelas (7A-9F), sel tabel tampilkan mapel (nama guru dipindah ke ringkasan "Mapel → Guru" di bawah grid, termasuk team-teaching Quran)
- **5 mapel tanpa guru ditambahkan** ke Jadwal per Kelas: Homeroom Teacher (HT), Leadership, Self Development, SBK, Scout — sebelumnya tidak diproses sama sekali
- Sel "off" (Jumat jam6, Sabtu jam7-9) diganti jadi blank hitam polos
- **SOP Piket** ditambahkan di tab Jadwal Piket — 6 kartu prosedur per lokasi, sekaligus perbaikan nama lokasi "Piket Gang Alfamart" → **"Piket Gang Bu Tum"** (salah nama sejak awal)
- Fix: strip guru tidak ikut auto-scroll ke guru aktif saat navigasi prev/next (bug regresi dari versi lama sebelum redesain mobile)
- **Rombak total ke tema terang**: latar krem hangat, kartu putih, teks espresso — seluruh 23 warna diaudit kontras WCAG (bukan cuma dibalik dari tema gelap), semua pasangan teks+latar lolos standar AA
- APK: `JadwalGuru-v5.apk`

## v4 — Jam Leadership, Jadwal Piket, perbaikan desktop & tombol back
- **Data pipeline disatukan** dengan project jadwal internal (satu sumber data, `scripts/gen_guru_data.py` + `scripts/gen_jadwal_supervisi.py`)
- **Jam Leadership** (rapat kepemimpinan per angkatan) yang sebelumnya hilang total dari jadwal sekarang tampil benar ("Leadership 7/8/9") — memperbaiki juga fitur Cari Guru Longgar yang sempat salah merekomendasikan guru yang sedang rapat
- **Tab baru "Jadwal Piket"**: rekap piket semua guru dalam 1 tabel (lokasi × hari), klik nama langsung ke jadwalnya
- **Cari Guru Longgar**: tambah keterangan jam mengajar guru itu di hari yang dicari
- **Perbaikan tampilan desktop**: lebar kolom & tinggi baris tabel jadwal sekarang benar-benar tetap (tidak bergeser lagi antar guru), chrome (nama guru, search+navigasi) dirapikan jadi 1 baris supaya tabel dapat ruang lebih lega
- **Perbaikan tombol back Android**: `www/index.html` (sumber APK) sempat ketinggalan 1 versi dari perbaikan back-button terakhir (plugin @capacitor/app) — sekarang disamakan persis dengan versi web, tombol back kembali ke halaman sebelumnya, bukan langsung keluar aplikasi
- APK: `JadwalGuru-v4.apk`

## v3 — Landing Page + Cari Guru Longgar
- Landing page: 2 tombol (Jadwal Guru / Cari Guru Longgar)
- Fitur "Cari Guru Longgar":
  - Pilih hari, pilih jam (max 3), filter mapel & gender
  - Hasil diurutkan dari guru paling longgar
  - Klik hasil → langsung ke jadwal guru terkait
- Full-width di HP & web (max-width: 480px dihapus)
- APK: `JadwalGuru-v3.apk`

## v2 — Mobile Redesign
- Flex-based layout (bukan tabel HTML)
- No vertical scroll — cukup geser ke samping
- Kontrol UI lebih besar (search, nav, strip)
- Piket bar (muncul otomatis untuk guru piket, data dari Excel)
- Font: nama 20px, kelas 13px, mapel 10px, chip 12px
- APK: `JadwalGuru-v2.apk`

## v1 — Initial Release
- Tabel HTML mingguan, 36 guru
- Warm dark theme (#1a1511 espresso + #d4a857 gold)
- Grid lines tebal (2px horizontal, 1.5px vertical)
- Row height fixed 46px
- Search, navigasi, teacher strip di bottom bar
- GitHub Actions APK build via Capacitor Android
- Deploy Vercel: jadwalguruabbs.vercel.app
- Aturan:
  - Urutan guru by mapel: Math → IPA → ICT → Indo → English → Social → Civic → PAI → Quran
  - Kelas gabungan ICT/TCP → "7C" (kecuali mapel ICT & Quran)
  - Jam istirahat putra/putri beda
  - Jumat libur P6 (Jumatan), durasi 40'/JP
  - Sabtu durasi 30'/JP
