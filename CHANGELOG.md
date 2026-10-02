# CHANGELOG — Jadwal Mengajar Guru SMP ABBS
# File: /storage/emulated/0/Hermes Project/jadwal-guru/CHANGELOG.md

## v5.9.4 — Pergantian guru: Mr Afriyan → Ms Arvara (putri)
- **Data guru diganti** (pergantian personel): **Mr Afriyan** (Afriyan Moneter Pratama, guru
  Olahraga/Sprt) → **Ms Arvara** (perempuan). Jadwal identik berpindah: 22 jam/5 hari, kelas 7A–9F
  (putra & putri), mapel Sprt — tidak ada perubahan jam/kelas.
- Yang diubah: entri `order`, kunci `teachers`, `nickname`, `fullname`. Gender otomatis terbaca
  **putri** via prefix "Ms" (`guruGender`) — berpengaruh benar pada filter segender Cari Guru
  Longgar & tier T1/T2 blok Leadership. Afriyan bukan anggota tim Leadership & tidak punya piket,
  jadi tidak ada dampak lain. Jumlah guru tetap 36.
- Verifikasi: `test_pg_lead.mjs` 439 pass (berjalan di DATA asli — aturan gender teruji ulang dgn
  nama baru), `test_pg_ui.mjs` 21 pass, sintaks OK, `www/index.html` identik.
- Catatan: bila nama lengkap resminya lebih dari "Ms Arvara", cukup kabari — satu baris perubahan.
- APK: `JadwalGuru-v5.9.4.apk`. Rilis via tag `v5.9.4`.

## v5.9.3 — Fix: guru yang libur total membuat tombol Lanjut buntu + aturan mainnya diperjelas
- **Bug (dilaporkan user)**: memilih guru yang di hari itu **tidak mengajar sama sekali** membuat
  langkah "pilih jam" buntu — tombol Lanjut tidak pernah bisa diklik (tidak ada blok yang bisa
  dicentang, sementara Lanjut mensyaratkan ≥1 blok terpilih).
- **Perbaikan dua lapis**:
  1. **Polaritas ternary tombol Lanjut terbalik (bug penyuntingan)**: saat refactor v5.9.0,
     `(sel&&lengkap?'':' disabled')` diganti `(kurang?'':' disabled')` tanpa membalik cabang —
     padahal `kurang` berpolaritas sebaliknya dari `sel&&lengkap`. Efeknya Lanjut justru MATI saat
     semua tercentang dan AKTIF saat ada yang kosong — kebalikan semestinya. Kini
     `(kurang?' disabled':'')`. Terdeteksi oleh harness UI (assertion "Lanjut aktif"), diselidiki
     sampai string h mentah, bukan tebakan.
  2. **Guru libur kini ditangani eksplisit**: di picker muncul catatan "<guru> libur / tidak
     mengajar <hari> — dilewati otomatis"; guru libur tidak ikut mensyaratkan Lanjut; saat Lanjut
     ia dikeluarkan dari daftar berhalangan (tidak muncul di rekap/teks WA) + pesan penjelas;
     jika SEMUA guru libur, tombol jalan keluar (Ganti guru / Ganti hari / Mulai ulang) tampil
     langsung di pesan picker.
- **Jalur AI ikut rapi**: rekomendasi AI utk guru yang tidak mengajar kini menyatakan "LIBUR /
  tidak perlu pengganti" (sebelumnya "0 blok" kosong) — di FAKTA maupun kartu HTML.
- Verifikasi: `test_pg_ui.mjs` +2 skenario (mengajar+libur campur; semua libur) → **21 pass,
  0 fail**; `test_pg_lead.mjs` tetap 439 pass; sintaks OK; `www/index.html` identik.
- APK: `JadwalGuru-v5.9.3.apk`. Rilis GitHub via tag `v5.9.3` (alur terkoreksi sejak v5.9.2).

## v5.9.2 — AI Jadwal memahami aturan pengganti terbaru (T2 sibuk + absen parsial)
- **Fitur "Tanya AI" diselaraskan dengan aturan yang disepakati beberapa hari terakhir** — 5 titik
  tempat penanaman, supaya LLM selalu berpegang pada aturan resmi saat menjawab/merekomendasikan:
  1. `aiKB` (pengetahuan bersama kedua jalur AI): seksi baru "ATURAN REKOMENDASI GURU PENGGANTI" —
     definisi blok, tier T1/T2a/T2b/T3 utk blok KBM biasa, aturan blok Leadership (T2 tim angkatan
     selalu tampil, "(sibuk)" = koordinasi dulu, wajib segender), guru absen SEHARI PENUH tidak
     pernah jadi kandidat, guru absen SEBAGIAN jam boleh jadi kandidat utk guru lain di jam
     kosongnya (syarat longgar semua jam & belum terpakai di jam sama), dan langkah "pilih jam"
     (absen parsial) di modul Cari Guru Pengganti.
  2. Prompt jalur langsung (`aiSYS`) + 3. prompt jalur tool (`aiSYS_A`): aturan ringkas absen
     penuh vs parsial ditambahkan di dekat instruksi "(sibuk)".
  4. FAKTA `rekomendasi_pengganti` (`aiFactsPengganti`, dipakai jalur langsung & tool): baris
     "Aturan kandidat" selalu disertakan, jadi jawaban AI ter-grounding per permintaan.
  5. Legenda kartu rekomendasi AI (`aiPenggantiHtml`): + "guru absen sebagian boleh jadi kandidat
     di jam kosongnya".
- Verifikasi: `test_pg_lead.mjs` 439 pass, `test_pg_ui.mjs` 11 pass, sintaks script inline OK,
  `www/index.html` identik.
- APK: `JadwalGuru-v5.9.2.apk`.

## v5.9.1 — Fix: picker "pilih jam" kosong setelah Ganti hari / Ganti jam
- **Bug (dilaporkan user, langsung setelah v5.9.0 dipakai)**: ketika alur sudah berjalan lalu user
  memilih chip **"Ganti hari"** (atau "Ganti jam"), langkah "pilih jam" tidak muncul lagi dan alur
  tidak bisa lanjut ke pemilihan pengganti.
- **Penyebab**: pesan picker lama (berisi `<div id="pgPick">`) tetap tertinggal di riwayat chat.
  Saat picker baru dibuat, `document.getElementById('pgPick')` mengambil div LAMA yang terkubur di
  atas → isi picker ter-render ke pesan lama, sementara pesan baru yang terlihat kosong (id ganda
  di DOM). Modul hasil rekomendasi sudah lama pakai pola anti-id-ganda (`pgRHasil` menghapus pesan
  lama), picker belum.
- **Perbaikan**: `pgShowPilihJam` kini membuang SEMUA pesan picker lama lewat query DOM
  (`.pg-pick-wrap`) sebelum membuat yang baru — berlaku untuk semua jalur (Ganti hari, Ganti jam,
  Ganti guru) tanpa bergantung pada referensi tersimpan.
- **Verifikasi**: harness UI baru `scripts/test_pg_ui.mjs` (jsdom, alur nyata: pilih guru → pilih
  hari → uncentang blok → lanjut → Ganti jam → Ganti hari) — **11 pass, 0 fail**; di kode lama uji
  yang sama GAGAL dan demo langsung menunjukkan `[id=pgPick]` menjadi 2 buah setelah "Ganti jam".
  Regresi logika `test_pg_lead.mjs` tetap **439 pass, 0 fail**. jsdom dipasang sebagai
  devDependency. Sintaks script inline OK, `www/index.html` identik.
- APK: `JadwalGuru-v5.9.1.apk`.

## v5.9.0 — Ganti sebagian jam saja (absen parsial) + guru hadir-sebagian jadi kandidat
- **Langkah baru "pilih jam"**: setelah memilih hari, asisten menampilkan daftar blok jam per guru
  (mis. "Jam 1–2 · 7A · Matematika · 07.00–08.20") — semua tercentang default (= perilaku lama, sehari
  penuh). Hilangkan centang blok yang tidak perlu diganti, lalu Lanjut. Tombol **"Sehari penuh ✓"**
  untuk konfirmasi cepat. Hanya blok terpilih yang masuk tabel rekomendasi, dihitung di status
  "x/y blok", muncul di rekap & teks WA. Tombol chip **"Ganti jam"** ditambahkan untuk membuka ulang
  pemilihan.
- **Guru absen yang HADIR SEBAGIAN kini bisa jadi kandidat pengganti** (permintaan user): contoh —
  Mr Febri hanya perlu digantikan jam 1–2 → di jam kosongnya (tidak mengajar) dia ikut muncul di list
  kandidat untuk guru berhalangan lain. Aturannya: guru absen boleh jadi kandidat hanya jika absennya
  parsial (masih ada bloknya yang tidak dipilih → dia hadir di sekolah) DAN longgar semua jam blok
  yang ditawarkan, plus tidak sedang terpakai di jam sama (reservasi tetap berlaku). Guru yang absen
  SEHARI PENUH tetap dikeluarkan dari semua list (memang tidak di sekolah) — perilaku lama terjaga.
- **Tim Leadership absen parsial**: anggota tim yang hadir sebagian tetap tampil di T2 (aturan
  v5.8.1), kecuali absennya mencakup semua jam blok rapat itu (sedang pergi). Anggota yang absen
  sehari penuh tetap dikecualikan.
- Kartu guru menampilkan "1/5 jam" saat absen parsial; legenda kartu biasa menambah keterangan bahwa
  guru berhalangan yang hadir sebagian ikut jadi kandidat di jam longgarnya.
- Verifikasi: harness `scripts/test_pg_lead.mjs` — **439 pass, 0 fail** (424 lama + 15 baru): fixture
  absen-parsial (masuk kandidat saat parsial, keluar saat penuh & saat jamnya mengajar), reservasi
  lintas-guru untuk sub parsial, T2 Leadership 3 kondisi absen anggota tim (penuh/parsial-non-rapat/
  parsial-di-jam-rapat). Sintaks seluruh script inline diperiksa.
- APK: `JadwalGuru-v5.9.0.apk`.

## v5.8.1 — Fix aturan rekomendasi Leadership: T2 (tim angkatan) kini selalu tampil
- **Bug ditemukan lewat pertanyaan user**: tier T2 (guru Leadership jenjang sama) praktis TIDAK PERNAH
  aktif — aturan lamanya mensyaratkan calon longgar, padahal 100% anggota tim sedang hadir rapat di jam
  itu sendiri (diverifikasi: 45/45 kasus anggota tim sibuk). Efeknya bertingkat: T2 mati terus, dan
  begitu kandidat T1 yang sedikit itu (2–5 orang) ikut absen di batch yang sama, list pengganti blok
  Leadership jadi KOSONG TOTAL tanpa penjelasan (contoh nyata: Senin, 6 guru putra absen bersamaan →
  3 guru Leadership 7 tanpa satu pun rekomendasi).
- **Aturan baru (opsi A, pilihan user)**: T2 = tim Leadership angkatan itu **SELALU ditampilkan** walau
  semua sedang rapat/mengajar — mereka memang orang paling pas mengambil alih. Yang longgar diurut di
  atas; yang sibuk diberi badge merah "**· sibuk**" (piket yang koordinasi melepasnya). List blok
  Leadership kini mustahil kosong. Syarat gender & pengecualian sesama guru absen tetap berlaku.
- **Keterangan tier (permintaan user)**: legenda tiap kartu guru kini spesifik — kartu Leadership
  menjelaskan T1/T2 dan arti ✓ vs · sibuk; kartu biasa tetap T1 KBM/T2a mapel/T2b rumpun/T3.
- **Kualitas ✓ jadi akurat per blok**: dulu ✓ menghitung dari SEMUA jam mengajar guru absen di hari itu
  (bisa menyesatkan di baris blok tertentu), sekarang dihitung dari jam blok yang bersangkutan.
- **Ikut disesuaikan — jalur AI chat**: kartu rekomendasi HTML + FAKTA untuk LLM + 2 prompt sistem
  sekarang mengenal tanda "(sibuk)" pada anggota T2 dan mengingatkan koordinasi dulu; keterangan tier
  Leadership ditampilkan saat ada blok Leadership.
- Verifikasi: harness Node baru `scripts/test_pg_lead.mjs` (fungsi asli + data asli) — **424 pass,
  0 fail**: 45 kasus absen tunggal (T2 selalu terisi, gender & self-exclusion benar, sort longgar-dulu),
  batch 6 guru (dulu kosong, kini ada T2), chip sibuk/longgar, reservasi lintas-guru, regresi blok KBM
  biasa & self-exclusion batch, aiTierText (sibuk), chip kartu emas.
- APK: `JadwalGuru-v5.8.1.apk`.

## v5.8.0 — Ingatan antar-sesi AI aktif di produksi (Vercel KV)
- **Fitur "ingatan antar-sesi" AI kini berfungsi penuh di produksi**: database Vercel KV (Upstash
  Redis) sudah dibuat & disambungkan ke project, env-nya otomatis ter-inject (`KV_REST_API_URL` /
  `KV_REST_API_TOKEN`). `api/mem.js` diperbaiki supaya membaca nama env tersebut (dgn fallback nama
  lama `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`). Aktivasi fitur ini pakai password
  `MEMORY_PASSWORD` yang diset di env Vercel.
- Menutup catatan v5.7.0 yang menyebut ingatan "masih butuh Vercel KV" — sekarang sudah menyala.
- APK: `JadwalGuru-v5.8.0.apk`.

## v5.7.0 — AI Jadwal live di web + update APK tanpa uninstall
- **AI Jadwal kini berfungsi penuh di web produksi**: server `/api/ai` memakai `GOOGLE_API_KEY` /
  `OPENROUTER_API_KEY` yang didaftarkan sebagai env Vercel (key tidak pernah disimpan di repo —
  hanya placeholder di `.env.example`). Sebelumnya key hanya ada di `.env` lokal, jadi AI cuma jalan
  di `vercel dev`; di `jadwalguruabbs.vercel.app` endpoint menjawab "Server AI belum dikonfigurasi".
- **Signature APK stabil (permanen)**: build tidak lagi memakai debug keystore acak per build
  (cache workflow lama selalu miss). Sekarang workflow memakai keystore permanen dari GitHub
  secret (`ANDROID_KEYSTORE_B64`/`ANDROID_KEYSTORE_PASS`, alias `jadwalguru`, PKCS12), disuntik ke
  `android/app/build.gradle` oleh `scripts/set_stable_signing.py`; `versionCode` naik otomatis
  dari run number. Efek: **update APK berikutnya langsung menimpa tanpa uninstall** (catatan:
  migrasi pertama dari APK lama tetap uninstall sekali karena signature-nya berbeda).
- Catatan: fitur "ingatan antar-sesi" AI masih butuh Vercel KV (`UPSTASH_REDIS_REST_URL/TOKEN`)
  untuk menyala di produksi; di lokal jalan via file.

## v5.6.0 — Cari Guru Pengganti: banyak guru sekaligus, 2 bug data nyata diperbaiki
- **Pilih beberapa guru absen sekaligus** (bukan cuma satu): strip guru di langkah 1 sekarang toggle
  multi-pilih + tombol "Lanjut (N)". Satu hari yang sama dipilih untuk seluruh guru dalam batch (skenario
  intinya: beberapa guru absen di hari yang sama, bukan pencarian berturut-turut).
- **BARU — cegah bentrok lintas-guru**: begitu seorang guru pengganti dipilih untuk 1 blok, dia otomatis
  hilang dari daftar kandidat blok manapun (guru absen manapun) yang jamnya tumpang tindih — bukan cuma
  ditandai. Direservasi lewat `pgReservedMap`, dihitung ulang langsung dari pilihan yang sudah dibuat
  (tidak ada state terpisah yang bisa basi).
- **Bug data nyata #1 (ditemukan &amp; diperbaiki sebelum rilis)**: percobaan pertama menyimpan reservasi
  per-jam-saja (1 slot per jam) — padahal 1 jam bisa sah-sah saja ditutup oleh 2 pengganti berbeda untuk
  2 guru absen berbeda (kelas beda, guru pengganti beda). Ketahuan lewat mockup interaktif berbasis data
  Sabtu sungguhan (Mr Hang + Mr Sharih, sama-sama ngajar Jam 1-2): pilihan guru kedua diam-diam menimpa
  catatan guru pertama. Diperbaiki: reservasi sekarang per (jam, nama pengganti), bukan per jam saja.
- **Bug data nyata #2 (ditemukan &amp; diperbaiki sebelum rilis)**: sebelum ada perbaikan ini, guru yang
  sendiri sedang absen bisa muncul sebagai rekomendasi pengganti untuk guru absen LAINNYA (mesin cuma
  cek "jadwalnya kosong", bukan cek "dia sendiri lagi absen"). Bukti nyata: Mr Hang (absen) sempat
  muncul sebagai kandidat T2a utk kelas Mr Sharih (juga absen), hari Sabtu yang sama. Diperbaiki: sesama
  anggota batch guru absen sekarang saling di-skip dari rekomendasi satu sama lain.
- **Kartu emas "Satu guru utk semua jam"** tetap ada per guru absen (hanya muncul kalau guru itu punya
  2+ blok), sekarang otomatis menghormati reservasi dari guru absen lain di batch yang sama.
- **Rekap**: format per-guru-absen tidak berubah, ditambah kartu baru "Rekap per Guru Pengganti" yang
  mengelompokkan berdasarkan siapa penggantinya — supaya piket bisa lihat total beban baru tiap
  pengganti sekali lihat. Berlaku juga di teks hasil salin (📋).
- Tombol back Android **tidak disentuh sama sekali** (diverifikasi lewat diff) — fix v5.4 tetap berlaku.
- Verifikasi: 21 skenario diuji langsung terhadap fungsi asli (data Sabtu sungguhan: Mr Hang, Mr Sharih,
  Ms Fitri dkk, termasuk jalur Leadership nyata) + 22 skenario klik-sungguhan lewat DOM asli (jsdom) —
  cover bentrok lintas-guru, batch self-exclusion, kartu emas, toggle-off, regresi N=1, dan rekap.
- APK: `JadwalGuru-v5.6.0.apk`.

## v5.5.0 — Fitur baru: Cari Guru Pengganti (panel ke-5)
- **Panel ke-5 "Cari Guru Pengganti"** di landing: pilih guru berhalangan → hari → rekomendasi pengganti.
- Alur CHAT (seperti AI tanpa AI), state machine; ketik manual + auto-search/auto-correct nama guru + strip guru horizontal swipe (dot gender) + opsi hari gaya pilihan ganda (A–F).
- Rekomendasi: kartu emas ★ "Satu guru utk semua jam" (bila ada) + TABEL 3 kolom `Jam | Kelas·Mapel | Rekomendasi`.
- Prioritas tier: T1 Piket KBM (wajib dicek longgar dulu) → T2a mapel sama → T2b rumpun sama → T3 lain; max 2 tier tampil (tier terisi pertama + 1 di bawahnya).
- Blok 2 jam: gabung jadi 1 baris HANYA jika mapel & kelas sama (pengganti 1 guru longgar di kedua jam, rekap 1 baris "Jam 4-5", waktu = jam-awal s/d jam-akhir).
- Leadership: T1 = guru sesuai gender longgar, T2 = sesuai gender + mengajar Leadership sama; khusus Leadership saja, mapel lain aturan umum; label "T1 · ♀/♂" & "T2 · Leadership X".
- Alur seleksi: klik nama kandidat pilih per blok / klik kartu emas utk semua-blok; status dock "X/Y blok" + tombol OK · Rekap (aktif saat semua blok terisi); Kartu Rekap + tombol 📋 Salin Teks (execCommand→clipboard→manual fallback).
- Integrasi: modul mandiri `pg*` (prefix), reuse `DATA`/`PIKET`/`order`, CSS di-scope `#panel-pengganti`, dikerjakan identik di `index.html` & `www/index.html`.
- Versi package.json: 5.5.0 → APK akan dinamai `JadwalGuru-v5.5.0.apk`.
- Verifikasi: JS syntax OK + test integrasi 16 PASS + regresi engine 1383 PASS + back-handler (panel ikut pola `.tab-panel`).

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
