# CHANGELOG — Jadwal Mengajar Guru SMP ABBS
# File: /storage/emulated/0/Hermes Project/jadwal-guru/CHANGELOG.md

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
