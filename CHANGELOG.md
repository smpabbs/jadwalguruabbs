# CHANGELOG — Jadwal Mengajar Guru SMP ABBS
# File: /storage/emulated/0/Hermes Project/jadwal-guru/CHANGELOG.md

## v5.1 — Cari Guru Longgar tanpa batas jam
- **Cari Guru Longgar**: batas maksimal 3 jam yang bisa dipilih sekaligus dihapus — sekarang semua 9 jam bisa dipilih bersamaan

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
